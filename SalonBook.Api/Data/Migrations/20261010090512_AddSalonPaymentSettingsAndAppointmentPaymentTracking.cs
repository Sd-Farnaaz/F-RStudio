using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SalonBook.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSalonPaymentSettingsAndAppointmentPaymentTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdvancePaymentType",
                table: "Salons",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AdvancePaymentValue",
                table: "Salons",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAdvancePaymentRequired",
                table: "Salons",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "QrCodeImageUrl",
                table: "Salons",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpiId",
                table: "Salons",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AdvanceAmountRequired",
                table: "Appointments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0.00m);

            migrationBuilder.AddColumn<decimal>(
                name: "AmountPaid",
                table: "Appointments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0.00m);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethod",
                table: "Appointments",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentNotes",
                table: "Appointments",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentProofUrl",
                table: "Appointments",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentStatus",
                table: "Appointments",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "NotRequired");

            migrationBuilder.AddColumn<DateTime>(
                name: "PaymentSubmittedAtUtc",
                table: "Appointments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentTransactionReference",
                table: "Appointments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PaymentVerifiedAtUtc",
                table: "Appointments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PaymentVerifiedByUserId",
                table: "Appointments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_PaymentVerifiedByUserId",
                table: "Appointments",
                column: "PaymentVerifiedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_SalonId_PaymentStatus",
                table: "Appointments",
                columns: new[] { "SalonId", "PaymentStatus" });

            migrationBuilder.AddForeignKey(
                name: "FK_Appointments_Users_PaymentVerifiedByUserId",
                table: "Appointments",
                column: "PaymentVerifiedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appointments_Users_PaymentVerifiedByUserId",
                table: "Appointments");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_PaymentVerifiedByUserId",
                table: "Appointments");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_SalonId_PaymentStatus",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "AdvancePaymentType",
                table: "Salons");

            migrationBuilder.DropColumn(
                name: "AdvancePaymentValue",
                table: "Salons");

            migrationBuilder.DropColumn(
                name: "IsAdvancePaymentRequired",
                table: "Salons");

            migrationBuilder.DropColumn(
                name: "QrCodeImageUrl",
                table: "Salons");

            migrationBuilder.DropColumn(
                name: "UpiId",
                table: "Salons");

            migrationBuilder.DropColumn(
                name: "AdvanceAmountRequired",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "AmountPaid",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PaymentNotes",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PaymentProofUrl",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PaymentStatus",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PaymentSubmittedAtUtc",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PaymentTransactionReference",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PaymentVerifiedAtUtc",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PaymentVerifiedByUserId",
                table: "Appointments");
        }
    }
}
