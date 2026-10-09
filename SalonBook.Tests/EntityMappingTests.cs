using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using SalonBook.Api.Data;
using SalonBook.Api.Models;

namespace SalonBook.Tests;

public class EntityMappingTests
{
    private ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer("Server=127.0.0.1;Database=TestDb;Trusted_Connection=True;Encrypt=False;")
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public void SalonEntity_HasConfiguredPropertiesAndUniqueIndexOnSlug()
    {
        using var context = CreateContext();
        var entityType = context.Model.FindEntityType(typeof(Salon));

        Assert.NotNull(entityType);
        Assert.Equal("Salons", entityType.GetTableName());

        // Primary key
        var pk = entityType.FindPrimaryKey();
        Assert.NotNull(pk);
        Assert.Single(pk.Properties);
        Assert.Equal(nameof(Salon.Id), pk.Properties[0].Name);

        // Required and max lengths
        var nameProp = entityType.FindProperty(nameof(Salon.Name));
        Assert.NotNull(nameProp);
        Assert.False(nameProp.IsNullable);
        Assert.Equal(150, nameProp.GetMaxLength());

        var slugProp = entityType.FindProperty(nameof(Salon.Slug));
        Assert.NotNull(slugProp);
        Assert.False(slugProp.IsNullable);
        Assert.Equal(100, slugProp.GetMaxLength());

        // Slug Unique Index
        var slugIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == nameof(Salon.Slug)));
        Assert.NotNull(slugIndex);
        Assert.True(slugIndex.IsUnique);
        Assert.Equal("IX_Salons_Slug", slugIndex.GetDatabaseName());

        // Defaults
        var tzProp = entityType.FindProperty(nameof(Salon.TimeZone));
        Assert.NotNull(tzProp);
        Assert.Equal("Asia/Kolkata", tzProp.GetDefaultValue());

        var currencyProp = entityType.FindProperty(nameof(Salon.CurrencyCode));
        Assert.NotNull(currencyProp);
        Assert.Equal("INR", currencyProp.GetDefaultValue());

        var onboardingProp = entityType.FindProperty(nameof(Salon.OnboardingState));
        Assert.NotNull(onboardingProp);
        Assert.Equal("Created", onboardingProp.GetDefaultValue());
    }

    [Fact]
    public void UserEntity_HasConfiguredPropertiesAndUniqueEmailIndex()
    {
        using var context = CreateContext();
        var entityType = context.Model.FindEntityType(typeof(User));

        Assert.NotNull(entityType);
        Assert.Equal("Users", entityType.GetTableName());

        // Primary key
        var pk = entityType.FindPrimaryKey();
        Assert.NotNull(pk);
        Assert.Single(pk.Properties);
        Assert.Equal(nameof(User.Id), pk.Properties[0].Name);

        // SalonId is nullable
        var salonIdProp = entityType.FindProperty(nameof(User.SalonId));
        Assert.NotNull(salonIdProp);
        Assert.True(salonIdProp.IsNullable);

        // Required strings and max lengths
        var emailProp = entityType.FindProperty(nameof(User.Email));
        Assert.NotNull(emailProp);
        Assert.False(emailProp.IsNullable);
        Assert.Equal(256, emailProp.GetMaxLength());

        // Email index is UNIQUE in Phase 2 for global identity
        var emailIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == nameof(User.Email)));
        Assert.NotNull(emailIndex);
        Assert.True(emailIndex.IsUnique);
        Assert.Equal("IX_Users_Email", emailIndex.GetDatabaseName());

        // SalonId index
        var salonIdIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == nameof(User.SalonId)));
        Assert.NotNull(salonIdIndex);
        Assert.False(salonIdIndex.IsUnique);
        Assert.Equal("IX_Users_SalonId", salonIdIndex.GetDatabaseName());

        // Foreign key relationship with Restrict delete behavior
        var foreignKey = entityType.GetForeignKeys().FirstOrDefault(fk => fk.PrincipalEntityType.ClrType == typeof(Salon));
        Assert.NotNull(foreignKey);
        Assert.Equal(DeleteBehavior.Restrict, foreignKey.DeleteBehavior);
        Assert.Equal("FK_Users_Salons_SalonId", foreignKey.GetConstraintName());
    }

    [Fact]
    public void RefreshTokenEntity_HasConfiguredCascadeDeleteAndIndexes()
    {
        using var context = CreateContext();
        var entityType = context.Model.FindEntityType(typeof(RefreshToken));

        Assert.NotNull(entityType);
        Assert.Equal("RefreshTokens", entityType.GetTableName());

        var tokenHashProp = entityType.FindProperty(nameof(RefreshToken.TokenHash));
        Assert.NotNull(tokenHashProp);
        Assert.False(tokenHashProp.IsNullable);
        Assert.Equal(128, tokenHashProp.GetMaxLength());

        var tokenHashIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == nameof(RefreshToken.TokenHash)));
        Assert.NotNull(tokenHashIndex);
        Assert.True(tokenHashIndex.IsUnique);

        var familyIndex = entityType.GetIndexes().FirstOrDefault(i => i.Properties.Any(p => p.Name == nameof(RefreshToken.FamilyId)));
        Assert.NotNull(familyIndex);

        var userFk = entityType.GetForeignKeys().FirstOrDefault(fk => fk.PrincipalEntityType.ClrType == typeof(User));
        Assert.NotNull(userFk);
        Assert.Equal(DeleteBehavior.Cascade, userFk.DeleteBehavior);
    }
}
