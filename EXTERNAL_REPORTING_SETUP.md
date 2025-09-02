# External Reporting Engine Integration Setup

This document explains how to set up and use the external reporting engine integration in your procurement application.

## Overview

The external reporting engine is a separate service that provides advanced database reporting capabilities. Your application acts as a client that communicates with this engine via REST API calls.

## Configuration

### 1. Environment Variables

Create a `.env.local` file in your project root with the following database connection details:

```bash
# Database Configuration for External Reporting Engine
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wujha_procurement
DB_USER=postgres
DB_PASSWORD=your_actual_password

# External Reporting Engine URL (default - change if needed)
REPORTING_ENGINE_URL=https://reporting-engine-production-a330.up.railway.app
```

### 2. Database Access Requirements

Ensure your database is accessible from the external reporting engine:
- The reporting engine needs to connect directly to your PostgreSQL database
- Check firewall settings and network access
- Verify the database user has appropriate permissions

## API Endpoints

The integration provides the following API routes:

- `GET /api/reporting/tables` - List all database tables
- `POST /api/reporting/table-info` - Get columns for a specific table
- `POST /api/reporting/table-relationships` - Get table relationships
- `POST /api/reporting/preview` - Preview reports
- `POST /api/reporting/generate` - Generate final reports (PDF/Excel)

## Usage

### 1. Access Advanced Reports

Navigate to `/procurement/reports/advanced` to access the advanced report builder.

### 2. Building Reports

1. **Select Table**: Choose a database table from the available options
2. **Select Columns**: Pick the columns you want in your report
3. **Add Filters**: Apply filters to narrow down the data
4. **Preview**: Click "Preview Report" to see a sample of your data
5. **Generate**: Export as PDF or Excel format

### 3. Report Types

- **PDF Reports**: Professional formatted reports with charts and styling
- **Excel Reports**: Data in spreadsheet format for further analysis

## Security Considerations

- Store database credentials securely using environment variables
- Implement proper authentication/authorization for report access
- Consider rate limiting for the reporting endpoints
- Validate user permissions before allowing database access

## Troubleshooting

### Common Issues

1. **Connection Errors**: Verify database credentials and network access
2. **Permission Denied**: Check database user permissions
3. **Timeout Errors**: Ensure the reporting engine can reach your database

### Testing

Test the integration by:
1. Checking the `/api/reporting/tables` endpoint returns data
2. Verifying table info can be retrieved
3. Testing report preview functionality
4. Confirming report generation works

## Architecture

```
Your App → API Proxy Routes → External Reporting Engine → Your Database
```

The external reporting engine connects directly to your database using the provided credentials, while your application provides a user-friendly interface for building and generating reports.

## Support

For issues with the external reporting engine service, contact the service provider. For integration issues, check the application logs and verify configuration. 