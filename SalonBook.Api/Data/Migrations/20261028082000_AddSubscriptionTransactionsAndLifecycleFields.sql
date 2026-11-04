USE [SalonBookDb];
GO

-- ============================================================================
-- Migration: AddSubscriptionTransactionsAndLifecycleFields
-- Database: SalonBookDb
-- Description: Adds subscription lifecycle tracking columns to dbo.Salons and
--              creates the dbo.SubscriptionTransactions table with indexes.
-- ============================================================================

-- 1. Add missing lifecycle columns to dbo.Salons
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'IsSuspendedByAdmin')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [IsSuspendedByAdmin] BIT NOT NULL CONSTRAINT [DF_Salons_IsSuspendedByAdmin] DEFAULT (0);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'DeactivationReason')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [DeactivationReason] NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'TrialEndsAtUtc')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [TrialEndsAtUtc] DATETIME2 NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Salons]') AND name = 'HasUsedTrial')
BEGIN
    ALTER TABLE [dbo].[Salons] ADD [HasUsedTrial] BIT NOT NULL CONSTRAINT [DF_Salons_HasUsedTrial] DEFAULT (0);
END
GO

-- 2. Create dbo.SubscriptionTransactions table
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
GO

-- 3. Create Indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SubscriptionTransactions_RazorpayOrderId' AND object_id = OBJECT_ID(N'[dbo].[SubscriptionTransactions]'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [IX_SubscriptionTransactions_RazorpayOrderId]
    ON [dbo].[SubscriptionTransactions] ([RazorpayOrderId] ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SubscriptionTransactions_RazorpayPaymentId' AND object_id = OBJECT_ID(N'[dbo].[SubscriptionTransactions]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_SubscriptionTransactions_RazorpayPaymentId]
    ON [dbo].[SubscriptionTransactions] ([RazorpayPaymentId] ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SubscriptionTransactions_SalonId_Status' AND object_id = OBJECT_ID(N'[dbo].[SubscriptionTransactions]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_SubscriptionTransactions_SalonId_Status]
    ON [dbo].[SubscriptionTransactions] ([SalonId] ASC, [Status] ASC);
END
GO

-- 4. Record migration in __EFMigrationsHistory
IF NOT EXISTS (SELECT 1 FROM [dbo].[__EFMigrationsHistory] WHERE [MigrationId] = '20261028082000_AddSubscriptionTransactionsAndLifecycleFields')
BEGIN
    INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES ('20261028082000_AddSubscriptionTransactionsAndLifecycleFields', '10.0.12');
END
GO
