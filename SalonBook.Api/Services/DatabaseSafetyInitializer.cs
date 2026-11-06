using System.Data;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Data;

namespace SalonBook.Api.Services;

public interface IDatabaseSafetyInitializer
{
    bool HasExecuted { get; }
    bool IsSchemaSafe { get; }
    IReadOnlyList<string> MissingTables { get; }
    IReadOnlyList<string> MissingColumns { get; }
    IReadOnlyList<string> MissingIndexes { get; }
    IReadOnlyList<string> MissingForeignKeys { get; }
    IReadOnlyList<string> FailedSteps { get; }

    Task EnsureSchemaSafetyAsync(CancellationToken cancellationToken = default);
    Task ValidateSchemaStateAsync(CancellationToken cancellationToken = default);
}

public class DatabaseSafetyInitializer : IDatabaseSafetyInitializer
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DatabaseSafetyInitializer> _logger;
    private readonly object _stateLock = new();

    private bool _hasExecuted = false;
    private bool _isSchemaSafe = false;
    private readonly List<string> _missingTables = new();
    private readonly List<string> _missingColumns = new();
    private readonly List<string> _missingIndexes = new();
    private readonly List<string> _missingForeignKeys = new();
    private readonly List<string> _failedSteps = new();

    private static readonly string[] RequiredTables =
    {
        "Salons",
        "Users",
        "RefreshTokens",
        "Services",
        "Staff",
        "Appointments",
        "Reviews",
        "ClientConsultationCards",
        "ClientFormulaRecords",
        "VendorPayouts",
        "VendorComplianceLogs",
        "SalonOffPeakRules",
        "SubscriptionTransactions",
        "AppointmentReminders",
        "Notifications"
    };

    private static readonly (string Table, string Column)[] RequiredColumns =
    {
        ("Salons", "IsSuspendedByAdmin"),
        ("Salons", "DeactivationReason"),
        ("Salons", "TrialEndsAtUtc"),
        ("Salons", "HasUsedTrial"),
        ("Salons", "SubscriptionBillingCycle"),
        ("Salons", "SubscriptionPrice"),
        ("Salons", "SubscriptionRenewsAtUtc"),
        ("Salons", "SubscriptionStartedAtUtc"),
        ("Salons", "SubscriptionStatus"),
        ("Salons", "SubscriptionTier"),
        ("Salons", "IsEmailConfigured"),
        ("Salons", "SmtpHost"),
        ("Salons", "SmtpPort"),
        ("Salons", "SmtpUsername"),
        ("Salons", "SmtpPassword"),
        ("Salons", "SenderEmail"),
        ("Salons", "SenderName"),
        ("Salons", "SmtpEnableSsl"),
        ("Reviews", "SalonId"),
        ("Reviews", "CustomerId"),
        ("Reviews", "AppointmentId"),
        ("Reviews", "Rating"),
        ("Reviews", "Comment"),
        ("ClientConsultationCards", "SalonId"),
        ("ClientConsultationCards", "CustomerId"),
        ("ClientFormulaRecords", "SalonId"),
        ("ClientFormulaRecords", "CustomerId"),
        ("ClientFormulaRecords", "FormulaDetails"),
        ("VendorPayouts", "SalonId"),
        ("VendorPayouts", "EscrowTransactionId"),
        ("VendorPayouts", "NetAmount"),
        ("VendorComplianceLogs", "SalonId"),
        ("VendorComplianceLogs", "EventType"),
        ("SalonOffPeakRules", "SalonId"),
        ("SalonOffPeakRules", "DiscountPercentage"),
        ("SubscriptionTransactions", "SalonId"),
        ("SubscriptionTransactions", "RazorpayOrderId"),
        ("AppointmentReminders", "AppointmentId"),
        ("Notifications", "RecipientUserId")
    };

    private static readonly (string Table, string Index)[] RequiredIndexes =
    {
        ("Reviews", "IX_Reviews_SalonId"),
        ("Reviews", "IX_Reviews_AppointmentId"),
        ("ClientConsultationCards", "IX_ClientConsultationCards_SalonId_CustomerId"),
        ("VendorPayouts", "IX_VendorPayouts_EscrowTransactionId"),
        ("SalonOffPeakRules", "IX_SalonOffPeakRules_SalonId"),
        ("SubscriptionTransactions", "IX_SubscriptionTransactions_RazorpayOrderId")
    };

    private static readonly string[] RequiredForeignKeys =
    {
        "FK_Reviews_Salons_SalonId",
        "FK_Reviews_Appointments_AppointmentId",
        "FK_ClientConsultationCards_Salons_SalonId",
        "FK_ClientFormulaRecords_Salons_SalonId",
        "FK_VendorPayouts_Salons_SalonId",
        "FK_SubscriptionTransactions_Salons_SalonId"
    };

    public DatabaseSafetyInitializer(
        IServiceScopeFactory scopeFactory,
        ILogger<DatabaseSafetyInitializer> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public bool HasExecuted
    {
        get { lock (_stateLock) return _hasExecuted; }
    }

    public bool IsSchemaSafe
    {
        get { lock (_stateLock) return _isSchemaSafe; }
    }

    public IReadOnlyList<string> MissingTables
    {
        get { lock (_stateLock) return _missingTables.ToList().AsReadOnly(); }
    }

    public IReadOnlyList<string> MissingColumns
    {
        get { lock (_stateLock) return _missingColumns.ToList().AsReadOnly(); }
    }

    public IReadOnlyList<string> MissingIndexes
    {
        get { lock (_stateLock) return _missingIndexes.ToList().AsReadOnly(); }
    }

    public IReadOnlyList<string> MissingForeignKeys
    {
        get { lock (_stateLock) return _missingForeignKeys.ToList().AsReadOnly(); }
    }

    public IReadOnlyList<string> FailedSteps
    {
        get { lock (_stateLock) return _failedSteps.ToList().AsReadOnly(); }
    }

    public async Task EnsureSchemaSafetyAsync(CancellationToken cancellationToken = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        try
        {
            if (!await dbContext.Database.CanConnectAsync(cancellationToken))
            {
                _logger.LogWarning("Database connection unavailable during schema safety verification. Skipping initialization.");
                lock (_stateLock)
                {
                    _hasExecuted = true;
                    _isSchemaSafe = false;
                    _failedSteps.Add("Database connection unavailable at startup.");
                }
                return;
            }

            _logger.LogInformation("Starting idempotent database schema safety verification...");

            lock (_stateLock)
            {
                _failedSteps.Clear();
            }

            // 1. Ensure Reviews table and indexes exist
            // Foreign keys use NO ACTION (Restrict) to prevent SQL Server Error 1785 (cycles/multiple cascade paths).
            const string reviewsTableSql = @"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[Reviews]'))
BEGIN
    CREATE TABLE [dbo].[Reviews] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [SalonId] INT NOT NULL,
        [CustomerId] INT NOT NULL,
        [AppointmentId] INT NOT NULL,
        [StaffId] INT NULL,
        [Rating] INT NOT NULL,
        [CleanlinessRating] INT NULL,
        [StaffRating] INT NULL,
        [ValueRating] INT NULL,
        [Title] NVARCHAR(200) NULL,
        [Comment] NVARCHAR(2000) NOT NULL CONSTRAINT [DF_Reviews_Comment] DEFAULT (''),
        [PhotoUrlsJson] NVARCHAR(MAX) NULL,
        [IsVerifiedVisit] BIT NOT NULL CONSTRAINT [DF_Reviews_IsVerifiedVisit] DEFAULT (1),
        [OwnerReply] NVARCHAR(2000) NULL,
        [OwnerRepliedAtUtc] DATETIME2 NULL,
        [CreatedAtUtc] DATETIME2 NOT NULL,
        [UpdatedAtUtc] DATETIME2 NULL,
        CONSTRAINT [PK_Reviews] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Reviews_Salons_SalonId] FOREIGN KEY ([SalonId]) REFERENCES [dbo].[Salons] ([Id]),
        CONSTRAINT [FK_Reviews_Users_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Users] ([Id]),
        CONSTRAINT [FK_Reviews_Appointments_AppointmentId] FOREIGN KEY ([AppointmentId]) REFERENCES [dbo].[Appointments] ([Id]),
        CONSTRAINT [FK_Reviews_Staff_StaffId] FOREIGN KEY ([StaffId]) REFERENCES [dbo].[Staff] ([Id])
    );
END

IF EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[Reviews]'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reviews_SalonId' AND object_id = OBJECT_ID(N'[dbo].[Reviews]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Reviews_SalonId] ON [dbo].[Reviews] ([SalonId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reviews_CustomerId' AND object_id = OBJECT_ID(N'[dbo].[Reviews]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Reviews_CustomerId] ON [dbo].[Reviews] ([CustomerId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reviews_AppointmentId' AND object_id = OBJECT_ID(N'[dbo].[Reviews]'))
    BEGIN
        CREATE UNIQUE NONCLUSTERED INDEX [IX_Reviews_AppointmentId] ON [dbo].[Reviews] ([AppointmentId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reviews_StaffId' AND object_id = OBJECT_ID(N'[dbo].[Reviews]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Reviews_StaffId] ON [dbo].[Reviews] ([StaffId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reviews_SalonId_Rating' AND object_id = OBJECT_ID(N'[dbo].[Reviews]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Reviews_SalonId_Rating] ON [dbo].[Reviews] ([SalonId] ASC, [Rating] ASC);
    END
END";
            await ExecuteStepAsync(dbContext, "Reviews Table & Indexes", reviewsTableSql, cancellationToken);

            // 2. Ensure ClientConsultationCards table and indexes exist
            const string clientConsultationTableSql = @"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[ClientConsultationCards]'))
BEGIN
    CREATE TABLE [dbo].[ClientConsultationCards] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [SalonId] INT NOT NULL,
        [CustomerId] INT NOT NULL,
        [Allergies] NVARCHAR(1000) NULL,
        [SkinOrHairNotes] NVARCHAR(2000) NULL,
        [PrivateStaffNotes] NVARCHAR(3000) NULL,
        [IsPatchTested] BIT NOT NULL CONSTRAINT [DF_ClientConsultationCards_IsPatchTested] DEFAULT (0),
        [PatchTestDate] DATETIME2 NULL,
        [EmergencyContactName] NVARCHAR(150) NULL,
        [EmergencyContactPhone] NVARCHAR(50) NULL,
        [CreatedAtUtc] DATETIME2 NOT NULL,
        [UpdatedAtUtc] DATETIME2 NULL,
        CONSTRAINT [PK_ClientConsultationCards] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_ClientConsultationCards_Salons_SalonId] FOREIGN KEY ([SalonId]) REFERENCES [dbo].[Salons] ([Id]),
        CONSTRAINT [FK_ClientConsultationCards_Users_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Users] ([Id])
    );
END

IF EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[ClientConsultationCards]'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientConsultationCards_SalonId_CustomerId' AND object_id = OBJECT_ID(N'[dbo].[ClientConsultationCards]'))
    BEGIN
        CREATE UNIQUE NONCLUSTERED INDEX [IX_ClientConsultationCards_SalonId_CustomerId] ON [dbo].[ClientConsultationCards] ([SalonId] ASC, [CustomerId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientConsultationCards_CustomerId' AND object_id = OBJECT_ID(N'[dbo].[ClientConsultationCards]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_ClientConsultationCards_CustomerId] ON [dbo].[ClientConsultationCards] ([CustomerId] ASC);
    END
END";
            await ExecuteStepAsync(dbContext, "ClientConsultationCards Table & Indexes", clientConsultationTableSql, cancellationToken);

            // 3. Ensure ClientFormulaRecords table and indexes exist
            const string clientFormulaTableSql = @"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[ClientFormulaRecords]'))
BEGIN
    CREATE TABLE [dbo].[ClientFormulaRecords] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [SalonId] INT NOT NULL,
        [CustomerId] INT NOT NULL,
        [AppointmentId] INT NULL,
        [StaffId] INT NULL,
        [Category] NVARCHAR(50) NOT NULL,
        [FormulaDetails] NVARCHAR(2000) NOT NULL,
        [Developer] NVARCHAR(100) NULL,
        [ProcessingTimeMinutes] INT NULL,
        [Notes] NVARCHAR(2000) NULL,
        [CreatedByStaffName] NVARCHAR(150) NULL,
        [ServiceDateUtc] DATETIME2 NOT NULL,
        [CreatedAtUtc] DATETIME2 NOT NULL,
        CONSTRAINT [PK_ClientFormulaRecords] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_ClientFormulaRecords_Salons_SalonId] FOREIGN KEY ([SalonId]) REFERENCES [dbo].[Salons] ([Id]),
        CONSTRAINT [FK_ClientFormulaRecords_Users_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Users] ([Id]),
        CONSTRAINT [FK_ClientFormulaRecords_Appointments_AppointmentId] FOREIGN KEY ([AppointmentId]) REFERENCES [dbo].[Appointments] ([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_ClientFormulaRecords_Staff_StaffId] FOREIGN KEY ([StaffId]) REFERENCES [dbo].[Staff] ([Id]) ON DELETE SET NULL
    );
END

IF EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[ClientFormulaRecords]'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientFormulaRecords_SalonId_CustomerId' AND object_id = OBJECT_ID(N'[dbo].[ClientFormulaRecords]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_ClientFormulaRecords_SalonId_CustomerId] ON [dbo].[ClientFormulaRecords] ([SalonId] ASC, [CustomerId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientFormulaRecords_ServiceDateUtc' AND object_id = OBJECT_ID(N'[dbo].[ClientFormulaRecords]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_ClientFormulaRecords_ServiceDateUtc] ON [dbo].[ClientFormulaRecords] ([ServiceDateUtc] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientFormulaRecords_AppointmentId' AND object_id = OBJECT_ID(N'[dbo].[ClientFormulaRecords]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_ClientFormulaRecords_AppointmentId] ON [dbo].[ClientFormulaRecords] ([AppointmentId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientFormulaRecords_CustomerId' AND object_id = OBJECT_ID(N'[dbo].[ClientFormulaRecords]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_ClientFormulaRecords_CustomerId] ON [dbo].[ClientFormulaRecords] ([CustomerId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClientFormulaRecords_StaffId' AND object_id = OBJECT_ID(N'[dbo].[ClientFormulaRecords]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_ClientFormulaRecords_StaffId] ON [dbo].[ClientFormulaRecords] ([StaffId] ASC);
    END
END";
            await ExecuteStepAsync(dbContext, "ClientFormulaRecords Table & Indexes", clientFormulaTableSql, cancellationToken);

            // 4. Ensure VendorPayouts table and indexes exist
            const string vendorPayoutsTableSql = @"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[VendorPayouts]'))
BEGIN
    CREATE TABLE [dbo].[VendorPayouts] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [SalonId] INT NOT NULL,
        [EscrowTransactionId] NVARCHAR(100) NOT NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [CommissionAmount] DECIMAL(18,2) NOT NULL,
        [NetAmount] DECIMAL(18,2) NOT NULL,
        [CurrencyCode] NVARCHAR(3) NOT NULL CONSTRAINT [DF_VendorPayouts_CurrencyCode] DEFAULT ('INR'),
        [Status] NVARCHAR(30) NOT NULL CONSTRAINT [DF_VendorPayouts_Status] DEFAULT ('Pending'),
        [UtrNumber] NVARCHAR(100) NULL,
        [BankReleaseAtUtc] DATETIME2 NULL,
        [DisbursedAtUtc] DATETIME2 NULL,
        [Notes] NVARCHAR(500) NULL,
        [CreatedAtUtc] DATETIME2 NOT NULL,
        [UpdatedAtUtc] DATETIME2 NULL,
        CONSTRAINT [PK_VendorPayouts] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_VendorPayouts_Salons_SalonId] FOREIGN KEY ([SalonId]) REFERENCES [dbo].[Salons] ([Id])
    );
END

IF EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[VendorPayouts]'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_VendorPayouts_EscrowTransactionId' AND object_id = OBJECT_ID(N'[dbo].[VendorPayouts]'))
    BEGIN
        CREATE UNIQUE NONCLUSTERED INDEX [IX_VendorPayouts_EscrowTransactionId] ON [dbo].[VendorPayouts] ([EscrowTransactionId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_VendorPayouts_SalonId' AND object_id = OBJECT_ID(N'[dbo].[VendorPayouts]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_VendorPayouts_SalonId] ON [dbo].[VendorPayouts] ([SalonId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_VendorPayouts_SalonId_Status' AND object_id = OBJECT_ID(N'[dbo].[VendorPayouts]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_VendorPayouts_SalonId_Status] ON [dbo].[VendorPayouts] ([SalonId] ASC, [Status] ASC);
    END
END";
            await ExecuteStepAsync(dbContext, "VendorPayouts Table & Indexes", vendorPayoutsTableSql, cancellationToken);

            // 5. Ensure VendorComplianceLogs table and indexes exist
            const string vendorComplianceTableSql = @"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[VendorComplianceLogs]'))
BEGIN
    CREATE TABLE [dbo].[VendorComplianceLogs] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [SalonId] INT NOT NULL,
        [EventType] NVARCHAR(50) NOT NULL,
        [Status] NVARCHAR(50) NOT NULL,
        [RejectionReason] NVARCHAR(500) NULL,
        [DocumentType] NVARCHAR(100) NULL,
        [DocumentUrl] NVARCHAR(500) NULL,
        [ReviewedBy] NVARCHAR(150) NULL,
        [ReviewedAtUtc] DATETIME2 NULL,
        [DisputeDetails] NVARCHAR(1000) NULL,
        [CustomerIdentifier] NVARCHAR(150) NULL,
        [DisputedAmount] DECIMAL(18,2) NULL,
        [CreatedAtUtc] DATETIME2 NOT NULL,
        CONSTRAINT [PK_VendorComplianceLogs] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_VendorComplianceLogs_Salons_SalonId] FOREIGN KEY ([SalonId]) REFERENCES [dbo].[Salons] ([Id])
    );
END

IF EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[VendorComplianceLogs]'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_VendorComplianceLogs_SalonId' AND object_id = OBJECT_ID(N'[dbo].[VendorComplianceLogs]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_VendorComplianceLogs_SalonId] ON [dbo].[VendorComplianceLogs] ([SalonId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_VendorComplianceLogs_SalonId_EventType' AND object_id = OBJECT_ID(N'[dbo].[VendorComplianceLogs]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_VendorComplianceLogs_SalonId_EventType] ON [dbo].[VendorComplianceLogs] ([SalonId] ASC, [EventType] ASC);
    END
END";
            await ExecuteStepAsync(dbContext, "VendorComplianceLogs Table & Indexes", vendorComplianceTableSql, cancellationToken);

            // 6. Ensure SalonOffPeakRules table and indexes exist
            const string salonOffPeakRulesTableSql = @"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[SalonOffPeakRules]'))
BEGIN
    CREATE TABLE [dbo].[SalonOffPeakRules] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [SalonId] INT NOT NULL,
        [Name] NVARCHAR(150) NOT NULL,
        [DaysOfWeek] NVARCHAR(200) NOT NULL,
        [StartTime] NVARCHAR(10) NOT NULL,
        [EndTime] NVARCHAR(10) NOT NULL,
        [DiscountPercentage] DECIMAL(5,2) NOT NULL,
        [IsActive] BIT NOT NULL CONSTRAINT [DF_SalonOffPeakRules_IsActive] DEFAULT (1),
        [CreatedAtUtc] DATETIME2 NOT NULL CONSTRAINT [DF_SalonOffPeakRules_CreatedAtUtc] DEFAULT (GETUTCDATE()),
        [UpdatedAtUtc] DATETIME2 NULL,
        CONSTRAINT [PK_SalonOffPeakRules] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_SalonOffPeakRules_Salons_SalonId] FOREIGN KEY ([SalonId]) REFERENCES [dbo].[Salons] ([Id]) ON DELETE CASCADE
    );
END

IF EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[SalonOffPeakRules]'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SalonOffPeakRules_SalonId' AND object_id = OBJECT_ID(N'[dbo].[SalonOffPeakRules]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_SalonOffPeakRules_SalonId] ON [dbo].[SalonOffPeakRules] ([SalonId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SalonOffPeakRules_SalonId_IsActive' AND object_id = OBJECT_ID(N'[dbo].[SalonOffPeakRules]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_SalonOffPeakRules_SalonId_IsActive] ON [dbo].[SalonOffPeakRules] ([SalonId] ASC, [IsActive] ASC);
    END
END";
            await ExecuteStepAsync(dbContext, "SalonOffPeakRules Table & Indexes", salonOffPeakRulesTableSql, cancellationToken);

            // 7. Ensure SubscriptionTransactions table and indexes exist
            const string subscriptionTransactionsTableSql = @"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[SubscriptionTransactions]'))
BEGIN
    CREATE TABLE [dbo].[SubscriptionTransactions] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [SalonId] INT NOT NULL,
        [PlanTier] NVARCHAR(50) NOT NULL,
        [BillingCycle] NVARCHAR(20) NOT NULL CONSTRAINT [DF_SubscriptionTransactions_BillingCycle] DEFAULT ('Monthly'),
        [RazorpayOrderId] NVARCHAR(100) NOT NULL,
        [RazorpayPaymentId] NVARCHAR(100) NULL,
        [RazorpaySignature] NVARCHAR(255) NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [AmountInPaise] BIGINT NOT NULL,
        [Currency] NVARCHAR(10) NOT NULL CONSTRAINT [DF_SubscriptionTransactions_Currency] DEFAULT ('INR'),
        [Status] NVARCHAR(30) NOT NULL CONSTRAINT [DF_SubscriptionTransactions_Status] DEFAULT ('Pending'),
        [VerificationStatus] NVARCHAR(30) NOT NULL CONSTRAINT [DF_SubscriptionTransactions_VerificationStatus] DEFAULT ('Unverified'),
        [PaymentMethod] NVARCHAR(50) NULL,
        [FailureReason] NVARCHAR(500) NULL,
        [SubscriptionPeriodStartUtc] DATETIME2 NULL,
        [SubscriptionPeriodEndUtc] DATETIME2 NULL,
        [CreatedAtUtc] DATETIME2 NOT NULL,
        [VerifiedAtUtc] DATETIME2 NULL,
        [UpdatedAtUtc] DATETIME2 NULL,
        CONSTRAINT [PK_SubscriptionTransactions] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_SubscriptionTransactions_Salons_SalonId] FOREIGN KEY ([SalonId]) REFERENCES [dbo].[Salons] ([Id]) ON DELETE CASCADE
    );
END

IF EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[SubscriptionTransactions]'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SubscriptionTransactions_RazorpayOrderId' AND object_id = OBJECT_ID(N'[dbo].[SubscriptionTransactions]'))
    BEGIN
        CREATE UNIQUE NONCLUSTERED INDEX [IX_SubscriptionTransactions_RazorpayOrderId] ON [dbo].[SubscriptionTransactions] ([RazorpayOrderId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SubscriptionTransactions_RazorpayPaymentId' AND object_id = OBJECT_ID(N'[dbo].[SubscriptionTransactions]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_SubscriptionTransactions_RazorpayPaymentId] ON [dbo].[SubscriptionTransactions] ([RazorpayPaymentId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SubscriptionTransactions_SalonId_Status' AND object_id = OBJECT_ID(N'[dbo].[SubscriptionTransactions]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_SubscriptionTransactions_SalonId_Status] ON [dbo].[SubscriptionTransactions] ([SalonId] ASC, [Status] ASC);
    END
END";
            await ExecuteStepAsync(dbContext, "SubscriptionTransactions Table & Indexes", subscriptionTransactionsTableSql, cancellationToken);

            // 8. Ensure AppointmentReminders and Notifications tables and indexes exist
            const string notificationsAndRemindersSql = @"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[AppointmentReminders]'))
BEGIN
    CREATE TABLE [dbo].[AppointmentReminders] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [AppointmentId] INT NOT NULL,
        [ReminderType] NVARCHAR(30) NOT NULL,
        [ScheduledForUtc] DATETIME2 NOT NULL,
        [Status] NVARCHAR(30) NOT NULL CONSTRAINT [DF_AppointmentReminders_Status] DEFAULT ('Pending'),
        [ProcessedAtUtc] DATETIME2 NULL,
        [LastError] NVARCHAR(500) NULL,
        [CreatedAtUtc] DATETIME2 NOT NULL,
        CONSTRAINT [PK_AppointmentReminders] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_AppointmentReminders_Appointments_AppointmentId] FOREIGN KEY ([AppointmentId]) REFERENCES [dbo].[Appointments] ([Id]) ON DELETE CASCADE
    );
END

IF EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[AppointmentReminders]'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AppointmentReminders_AppointmentId_ReminderType' AND object_id = OBJECT_ID(N'[dbo].[AppointmentReminders]'))
    BEGIN
        CREATE UNIQUE NONCLUSTERED INDEX [IX_AppointmentReminders_AppointmentId_ReminderType] ON [dbo].[AppointmentReminders] ([AppointmentId] ASC, [ReminderType] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AppointmentReminders_Status_ScheduledForUtc' AND object_id = OBJECT_ID(N'[dbo].[AppointmentReminders]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_AppointmentReminders_Status_ScheduledForUtc] ON [dbo].[AppointmentReminders] ([Status] ASC, [ScheduledForUtc] ASC);
    END
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]'))
BEGIN
    CREATE TABLE [dbo].[Notifications] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [RecipientUserId] INT NOT NULL,
        [SalonId] INT NULL,
        [AppointmentId] INT NULL,
        [Type] NVARCHAR(50) NOT NULL,
        [Channel] NVARCHAR(20) NOT NULL CONSTRAINT [DF_Notifications_Channel] DEFAULT ('InApp'),
        [Subject] NVARCHAR(200) NOT NULL,
        [Message] NVARCHAR(2000) NOT NULL,
        [Status] NVARCHAR(30) NOT NULL CONSTRAINT [DF_Notifications_Status] DEFAULT ('Pending'),
        [IsRead] BIT NOT NULL CONSTRAINT [DF_Notifications_IsRead] DEFAULT (0),
        [ReadAtUtc] DATETIME2 NULL,
        [SentAtUtc] DATETIME2 NULL,
        [RetryCount] INT NOT NULL CONSTRAINT [DF_Notifications_RetryCount] DEFAULT (0),
        [NextAttemptAtUtc] DATETIME2 NULL,
        [LastErrorCode] NVARCHAR(50) NULL,
        [ErrorMessage] NVARCHAR(1000) NULL,
        [CreatedAtUtc] DATETIME2 NOT NULL,
        CONSTRAINT [PK_Notifications] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_Notifications_Users_RecipientUserId] FOREIGN KEY ([RecipientUserId]) REFERENCES [dbo].[Users] ([Id]),
        CONSTRAINT [FK_Notifications_Salons_SalonId] FOREIGN KEY ([SalonId]) REFERENCES [dbo].[Salons] ([Id]),
        CONSTRAINT [FK_Notifications_Appointments_AppointmentId] FOREIGN KEY ([AppointmentId]) REFERENCES [dbo].[Appointments] ([Id])
    );
END

IF EXISTS (SELECT 1 FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]'))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Notifications_Recipient_IsRead_CreatedAtUtc' AND object_id = OBJECT_ID(N'[dbo].[Notifications]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Notifications_Recipient_IsRead_CreatedAtUtc] ON [dbo].[Notifications] ([RecipientUserId] ASC, [IsRead] ASC, [CreatedAtUtc] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Notifications_SalonId_CreatedAtUtc' AND object_id = OBJECT_ID(N'[dbo].[Notifications]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Notifications_SalonId_CreatedAtUtc] ON [dbo].[Notifications] ([SalonId] ASC, [CreatedAtUtc] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Notifications_AppointmentId' AND object_id = OBJECT_ID(N'[dbo].[Notifications]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Notifications_AppointmentId] ON [dbo].[Notifications] ([AppointmentId] ASC);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Notifications_Status_NextAttemptAtUtc' AND object_id = OBJECT_ID(N'[dbo].[Notifications]'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Notifications_Status_NextAttemptAtUtc] ON [dbo].[Notifications] ([Status] ASC, [NextAttemptAtUtc] ASC);
    END
END";
            await ExecuteStepAsync(dbContext, "AppointmentReminders & Notifications", notificationsAndRemindersSql, cancellationToken);

            // 9. Ensure missing Salon lifecycle and subscription columns exist
            const string salonColumnsSql = @"
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'IsSuspendedByAdmin')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [IsSuspendedByAdmin] BIT NOT NULL CONSTRAINT [DF_Salons_IsSuspendedByAdmin] DEFAULT (0);
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'DeactivationReason')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [DeactivationReason] NVARCHAR(100) NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'TrialEndsAtUtc')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [TrialEndsAtUtc] DATETIME2 NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'HasUsedTrial')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [HasUsedTrial] BIT NOT NULL CONSTRAINT [DF_Salons_HasUsedTrial] DEFAULT (0);
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'SubscriptionBillingCycle')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [SubscriptionBillingCycle] NVARCHAR(20) NOT NULL CONSTRAINT [DF_Salons_SubscriptionBillingCycle] DEFAULT ('Monthly');
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'SubscriptionPrice')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [SubscriptionPrice] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_Salons_SubscriptionPrice] DEFAULT (0.00);
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'SubscriptionRenewsAtUtc')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [SubscriptionRenewsAtUtc] DATETIME2 NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'SubscriptionStartedAtUtc')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [SubscriptionStartedAtUtc] DATETIME2 NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'SubscriptionStatus')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [SubscriptionStatus] NVARCHAR(30) NOT NULL CONSTRAINT [DF_Salons_SubscriptionStatus] DEFAULT ('Active');
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'SubscriptionTier')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [SubscriptionTier] NVARCHAR(50) NOT NULL CONSTRAINT [DF_Salons_SubscriptionTier] DEFAULT ('Starter');
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'IsEmailConfigured')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [IsEmailConfigured] BIT NOT NULL CONSTRAINT [DF_Salons_IsEmailConfigured] DEFAULT (0);
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'SmtpHost')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [SmtpHost] NVARCHAR(255) NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'SmtpPort')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [SmtpPort] INT NOT NULL CONSTRAINT [DF_Salons_SmtpPort] DEFAULT (587);
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'SmtpUsername')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [SmtpUsername] NVARCHAR(255) NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'SmtpPassword')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [SmtpPassword] NVARCHAR(500) NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'SenderEmail')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [SenderEmail] NVARCHAR(255) NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'SenderName')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [SenderName] NVARCHAR(255) NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'SmtpEnableSsl')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [SmtpEnableSsl] BIT NOT NULL CONSTRAINT [DF_Salons_SmtpEnableSsl] DEFAULT (1);
END

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Salons' AND COLUMN_NAME = 'LogoUrl' AND (CHARACTER_MAXIMUM_LENGTH != -1 OR CHARACTER_MAXIMUM_LENGTH IS NULL))
BEGIN
    ALTER TABLE [dbo].[Salons] ALTER COLUMN [LogoUrl] NVARCHAR(MAX) NULL;
END

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Services' AND COLUMN_NAME = 'ImageUrl' AND (CHARACTER_MAXIMUM_LENGTH != -1 OR CHARACTER_MAXIMUM_LENGTH IS NULL))
BEGIN
    ALTER TABLE [dbo].[Services] ALTER COLUMN [ImageUrl] NVARCHAR(MAX) NULL;
END";
            await ExecuteStepAsync(dbContext, "Salons Lifecycle & Subscription Columns", salonColumnsSql, cancellationToken);

            // 10. Audit Table, Column, Index, and Foreign Key existence to confirm health
            await ValidateSchemaStateInternalAsync(dbContext, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred during database schema safety verification.");
            lock (_stateLock)
            {
                _hasExecuted = true;
                _isSchemaSafe = false;
                _failedSteps.Add($"Unexpected error: {ex.Message}");
            }
        }
    }

    public async Task ValidateSchemaStateAsync(CancellationToken cancellationToken = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await ValidateSchemaStateInternalAsync(dbContext, cancellationToken);
    }

    private async Task ExecuteStepAsync(
        ApplicationDbContext dbContext,
        string stepName,
        string sql,
        CancellationToken cancellationToken)
    {
        try
        {
            await dbContext.Database.ExecuteSqlRawAsync(sql, cancellationToken);
            _logger.LogInformation("Database safety step '{StepName}' completed successfully.", stepName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CRITICAL: Database safety step '{StepName}' failed.", stepName);
            lock (_stateLock)
            {
                _failedSteps.Add($"{stepName}: {ex.Message}");
            }
        }
    }

    private async Task ValidateSchemaStateInternalAsync(
        ApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        try
        {
            var existingTables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var existingColumns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var existingIndexes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var existingForeignKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var connection = dbContext.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync(cancellationToken);
            }

            // 1. Query existing tables
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'";
                using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                {
                    existingTables.Add(reader.GetString(0));
                }
            }

            // 2. Query existing columns
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo'";
                using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                {
                    existingColumns.Add($"{reader.GetString(0)}.{reader.GetString(1)}");
                }
            }

            // 3. Query existing indexes
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = @"
SELECT t.name AS TableName, i.name AS IndexName 
FROM sys.indexes i 
JOIN sys.tables t ON i.object_id = t.object_id 
WHERE i.name IS NOT NULL";
                using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                {
                    existingIndexes.Add($"{reader.GetString(0)}.{reader.GetString(1)}");
                }
            }

            // 4. Query existing foreign keys
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "SELECT name FROM sys.foreign_keys";
                using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                {
                    existingForeignKeys.Add(reader.GetString(0));
                }
            }

            // Evaluate missing items
            var missingTablesList = RequiredTables.Where(t => !existingTables.Contains(t)).ToList();
            var missingColumnsList = RequiredColumns.Where(c => !existingColumns.Contains($"{c.Table}.{c.Column}")).Select(c => $"{c.Table}.{c.Column}").ToList();
            var missingIndexesList = RequiredIndexes.Where(i => !existingIndexes.Contains($"{i.Table}.{i.Index}")).Select(i => $"{i.Table}.{i.Index}").ToList();
            var missingFksList = RequiredForeignKeys.Where(fk => !existingForeignKeys.Contains(fk)).ToList();

            lock (_stateLock)
            {
                _hasExecuted = true;
                _missingTables.Clear();
                _missingTables.AddRange(missingTablesList);

                _missingColumns.Clear();
                _missingColumns.AddRange(missingColumnsList);

                _missingIndexes.Clear();
                _missingIndexes.AddRange(missingIndexesList);

                _missingForeignKeys.Clear();
                _missingForeignKeys.AddRange(missingFksList);

                // IsSchemaSafe is ONLY true if 0 failed steps, 0 missing tables, 0 missing columns, 0 missing indexes, and 0 missing FKs
                _isSchemaSafe = _failedSteps.Count == 0 &&
                                _missingTables.Count == 0 &&
                                _missingColumns.Count == 0 &&
                                _missingIndexes.Count == 0 &&
                                _missingForeignKeys.Count == 0;
            }

            if (_isSchemaSafe)
            {
                _logger.LogInformation("Database schema safety validated successfully: 0 missing tables, 0 missing columns, 0 missing indexes, 0 missing foreign keys.");
            }
            else
            {
                _logger.LogError(
                    "Database schema safety validation FAILED. FailedSteps: {FailedCount}, MissingTables: {MissingTables}, MissingColumns: {MissingColumns}, MissingIndexes: {MissingIndexes}, MissingFKs: {MissingFKs}",
                    _failedSteps.Count,
                    string.Join(", ", missingTablesList),
                    string.Join(", ", missingColumnsList),
                    string.Join(", ", missingIndexesList),
                    string.Join(", ", missingFksList));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate database schema state.");
            lock (_stateLock)
            {
                _hasExecuted = true;
                _isSchemaSafe = false;
                _failedSteps.Add($"Validation error: {ex.Message}");
            }
        }
    }
}
