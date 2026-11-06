# 1. Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["SalonBook.Api/SalonBook.Api.csproj", "SalonBook.Api/"]
RUN dotnet restore "SalonBook.Api/SalonBook.Api.csproj"

COPY SalonBook.Api/ SalonBook.Api/
WORKDIR "/src/SalonBook.Api"
RUN dotnet publish "SalonBook.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 2. Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "SalonBook.Api.dll"]

