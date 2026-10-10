using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SalonBook.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSalonLogoImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LogoUrl",
                table: "Salons",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LogoUrl",
                table: "Salons");
        }
    }
}
