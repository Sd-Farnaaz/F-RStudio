using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Data;

namespace SalonBook.Api.Services;

public interface IDatabaseSafetyInitializer
{
    Task EnsureSchemaSafetyAsync(CancellationToken cancellationToken = default);
}

public class DatabaseSafetyInitializer : IDatabaseSafetyInitializer
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<DatabaseSafetyInitializer> _logger;

    public DatabaseSafetyInitializer(
        ApplicationDbContext dbContext,
        ILogger<DatabaseSafetyInitializer> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task EnsureSchemaSafetyAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (!await _dbContext.Database.CanConnectAsync(cancellationToken))
            {
                _logger.LogWarning("Database connection unavailable during schema safety verification. Skipping initialization.");
                return;
            }

            // 1. Ensure Reviews table exists
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
        CONSTRAINT [FK_Reviews_Salons_SalonId] FOREIGN KEY ([SalonId]) REFERENCES [dbo].[Salons] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_Reviews_Users_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Users] ([Id]),
        CONSTRAINT [FK_Reviews_Appointments_AppointmentId] FOREIGN KEY ([AppointmentId]) REFERENCES [dbo].[Appointments] ([Id]),
        CONSTRAINT [FK_Reviews_Staff_StaffId] FOREIGN KEY ([StaffId]) REFERENCES [dbo].[Staff] ([Id])
    );

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
END";
            await _dbContext.Database.ExecuteSqlRawAsync(reviewsTableSql, cancellationToken);

            // 2. Ensure ClientConsultationCards table exists
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
END";
            await _dbContext.Database.ExecuteSqlRawAsync(clientConsultationTableSql, cancellationToken);

            // 3. Ensure ClientFormulaRecords table exists
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
        CONSTRAINT [FK_ClientFormulaRecords_Users_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Users] ([Id])
    );
END";
            await _dbContext.Database.ExecuteSqlRawAsync(clientFormulaTableSql, cancellationToken);

            // 4. Ensure VendorPayouts table exists
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
END";
            await _dbContext.Database.ExecuteSqlRawAsync(vendorPayoutsTableSql, cancellationToken);

            // 5. Ensure missing Salon lifecycle columns exist
            const string salonLifecycleColumnsSql = @"
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
END";
            await _dbContext.Database.ExecuteSqlRawAsync(salonLifecycleColumnsSql, cancellationToken);

            // 6. Ensure SubscriptionTransactions table exists
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
END";
            await _dbContext.Database.ExecuteSqlRawAsync(subscriptionTransactionsTableSql, cancellationToken);

            _logger.LogInformation("Database schema safety checks completed successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Non-critical error occurred during database schema safety verification. Continuing startup.");
        }
    }
}
