using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SalonBook.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVendorOperationsAndPayouts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AnnualRevenueTarget",
                table: "Salons",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 1200000.00m);

            migrationBuilder.AddColumn<string>(
                name: "GstNumber",
                table: "Salons",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsVerified",
                table: "Salons",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "KycStatus",
                table: "Salons",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "NotSubmitted");

            migrationBuilder.CreateTable(
                name: "VendorComplianceLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SalonId = table.Column<int>(type: "int", nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    RejectionReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DocumentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DocumentUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ReviewedBy = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DisputeDetails = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CustomerIdentifier = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DisputedAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VendorComplianceLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VendorComplianceLogs_Salons_SalonId",
                        column: x => x.SalonId,
                        principalTable: "Salons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VendorPayouts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SalonId = table.Column<int>(type: "int", nullable: false),
                    EscrowTransactionId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CommissionAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    NetAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CurrencyCode = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false, defaultValue: "INR"),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Pending"),
                    UtrNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    BankReleaseAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DisbursedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VendorPayouts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VendorPayouts_Salons_SalonId",
                        column: x => x.SalonId,
                        principalTable: "Salons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VendorComplianceLogs_SalonId",
                table: "VendorComplianceLogs",
                column: "SalonId");

            migrationBuilder.CreateIndex(
                name: "IX_VendorComplianceLogs_SalonId_EventType",
                table: "VendorComplianceLogs",
                columns: new[] { "SalonId", "EventType" });

            migrationBuilder.CreateIndex(
                name: "IX_VendorPayouts_EscrowTransactionId",
                table: "VendorPayouts",
                column: "EscrowTransactionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VendorPayouts_SalonId",
                table: "VendorPayouts",
                column: "SalonId");

            migrationBuilder.CreateIndex(
                name: "IX_VendorPayouts_SalonId_Status",
                table: "VendorPayouts",
                columns: new[] { "SalonId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VendorComplianceLogs");

            migrationBuilder.DropTable(
                name: "VendorPayouts");

            migrationBuilder.DropColumn(
                name: "AnnualRevenueTarget",
                table: "Salons");

            migrationBuilder.DropColumn(
                name: "GstNumber",
                table: "Salons");

            migrationBuilder.DropColumn(
                name: "IsVerified",
                table: "Salons");

            migrationBuilder.DropColumn(
                name: "KycStatus",
                table: "Salons");
        }
    }
}
