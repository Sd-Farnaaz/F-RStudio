using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SalonBook.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddClientConsultationAndFormulas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClientConsultationCards",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SalonId = table.Column<int>(type: "int", nullable: false),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    Allergies = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    SkinOrHairNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    PrivateStaffNotes = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: true),
                    IsPatchTested = table.Column<bool>(type: "bit", nullable: false),
                    PatchTestDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EmergencyContactName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    EmergencyContactPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientConsultationCards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientConsultationCards_Salons_SalonId",
                        column: x => x.SalonId,
                        principalTable: "Salons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClientConsultationCards_Users_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ClientFormulaRecords",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SalonId = table.Column<int>(type: "int", nullable: false),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    AppointmentId = table.Column<int>(type: "int", nullable: true),
                    StaffId = table.Column<int>(type: "int", nullable: true),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FormulaDetails = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Developer = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ProcessingTimeMinutes = table.Column<int>(type: "int", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedByStaffName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ServiceDateUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientFormulaRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientFormulaRecords_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ClientFormulaRecords_Salons_SalonId",
                        column: x => x.SalonId,
                        principalTable: "Salons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClientFormulaRecords_Staff_StaffId",
                        column: x => x.StaffId,
                        principalTable: "Staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ClientFormulaRecords_Users_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClientConsultationCards_CustomerId",
                table: "ClientConsultationCards",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientConsultationCards_SalonId_CustomerId",
                table: "ClientConsultationCards",
                columns: new[] { "SalonId", "CustomerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClientFormulaRecords_AppointmentId",
                table: "ClientFormulaRecords",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientFormulaRecords_CustomerId",
                table: "ClientFormulaRecords",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientFormulaRecords_SalonId_CustomerId",
                table: "ClientFormulaRecords",
                columns: new[] { "SalonId", "CustomerId" });

            migrationBuilder.CreateIndex(
                name: "IX_ClientFormulaRecords_ServiceDateUtc",
                table: "ClientFormulaRecords",
                column: "ServiceDateUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ClientFormulaRecords_StaffId",
                table: "ClientFormulaRecords",
                column: "StaffId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClientConsultationCards");

            migrationBuilder.DropTable(
                name: "ClientFormulaRecords");
        }
    }
}
