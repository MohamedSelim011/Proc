# Database Setup Guide

## PostgreSQL Database Setup

The procurement module uses PostgreSQL as its database. Follow these steps to set up the database:

### Prerequisites
- PostgreSQL installed and running on your Mac
- User `helshamy` with database creation privileges

### Database Information
- **Database Name**: `procurement_db`
- **Username**: `helshamy`
- **Host**: `localhost`
- **Port**: `5432`

### Setup Steps

1. **Database Creation** ✅
   ```bash
   createdb -U helshamy procurement_db
   ```

2. **Environment Configuration** ✅
   Create `.env` file with:
   ```
   DATABASE_URL="postgresql://helshamy@localhost:5432/procurement_db?schema=public"
   ```

3. **Prisma Setup** ✅
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Seed Database** ✅
   ```bash
   npm run db:seed
   ```

### Database Schema

The database includes the following main entities:

#### Core Tables
- **suppliers** - Supplier information and contact details
- **categories** - Product categories with hierarchical structure
- **items** - Product/service items with inventory tracking
- **purchase_orders** - Purchase orders with approval workflow
- **purchase_order_items** - Line items for purchase orders
- **quotations** - Supplier quotations and pricing
- **quotation_items** - Line items for quotations

#### Sample Data
The seed script creates:
- 4 categories (including Electronics with Computers subcategory)
- 2 suppliers (TechCorp Solutions, Office Plus Ltd)
- 4 items (Laptop, Printer, Chair, Paper)
- 1 sample purchase order
- 1 sample quotation

### Useful Commands

```bash
# Reset database and reseed
npm run db:reset

# Generate Prisma client
npx prisma generate

# View database in Prisma Studio
npx prisma studio

# Check database tables
psql -U helshamy -d procurement_db -c "\dt"

# View suppliers
psql -U helshamy -d procurement_db -c "SELECT name, email FROM suppliers;"
```

### Database Connection

Use the Prisma client from `src/lib/db.ts`:

```typescript
import { prisma } from '@/lib/db'

// Example usage
const suppliers = await prisma.supplier.findMany()
```

### Status: ✅ READY FOR DEVELOPMENT

The database is fully configured and ready for development with:
- Complete schema with all procurement entities
- Sample data for testing
- Proper relationships and constraints
- Development utilities and scripts
