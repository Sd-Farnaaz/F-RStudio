using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SalonBook.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSalonSubscriptionPlansAndBilling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SubscriptionBillingCycle",
                table: "Salons",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Monthly");

            migrationBuilder.AddColumn<decimal>(
                name: "SubscriptionPrice",
                table: "Salons",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0.00m);

            migrationBuilder.AddColumn<DateTime>(
                name: "SubscriptionRenewsAtUtc",
                table: "Salons",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SubscriptionStartedAtUtc",
                table: "Salons",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubscriptionStatus",
                table: "Salons",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Active");

            migrationBuilder.AddColumn<string>(
                name: "SubscriptionTier",
                table: "Salons",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Starter");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SubscriptionBillingCycle",
                table: "Salons");

            migrationBuilder.DropColumn(
                name: "SubscriptionPrice",
                table: "Salons");

            migrationBuilder.DropColumn(
                name: "SubscriptionRenewsAtUtc",
                table: "Salons");

            migrationBuilder.DropColumn(
                name: "SubscriptionStartedAtUtc",
                table: "Salons");

            migrationBuilder.DropColumn(
                name: "SubscriptionStatus",
                table: "Salons");

            migrationBuilder.DropColumn(
                name: "SubscriptionTier",
                table: "Salons");
        }
    }
}
