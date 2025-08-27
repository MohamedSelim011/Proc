# 🧪 Procurement Module Testing Guide

## 🚀 Quick Start

### 1. Start the Development Server
```bash
npm run dev
```
The application will be available at: **http://localhost:3000**

### 2. Access the Procurement Module
Navigate to: **http://localhost:3000/procurement**

---

## 📋 Complete P2P Workflow Testing

### **Step 1: Purchase Requisition Creation**
1. **Navigate to**: `/procurement/requisitions/new`
2. **Test the 3-step wizard**:
   - **Step 1**: Enter basic information
     - Department: `IT Department`
     - Priority: `HIGH`
     - Budget Code: `IT-2024-001`
     - Justification: `New laptops for development team`
   
   - **Step 2**: Add items
     - Search for existing items or add new ones
     - Set quantities and estimated prices
     - Add specifications
   
   - **Step 3**: Review and submit
     - Verify total cost calculations
     - Submit the PR

3. **Expected Result**: PR created with status `SUBMITTED`

### **Step 2: PR Approval Process**
1. **Navigate to**: `/procurement/requisitions`
2. **Find your submitted PR** and click the approve button
3. **Navigate to**: `/procurement/requisitions/[id]/approve`
4. **Test approval workflow**:
   - Review PR details and items
   - Check budget validation
   - Add approval comments
   - Approve or reject the PR

5. **Expected Result**: PR status changes to `APPROVED`

### **Step 3: Purchase Order Creation**
1. **Navigate to**: `/procurement/purchase-orders/new`
2. **Test the 4-step PO wizard**:
   - **Step 1**: Select the approved PR and choose a vendor
   - **Step 2**: Set delivery details and payment terms
   - **Step 3**: Confirm items and adjust pricing
   - **Step 4**: Review terms and create PO

3. **Expected Result**: PO created with status `DRAFT`

### **Step 4: Goods Receipt Creation**
1. **Navigate to**: `/procurement/receipts/new`
2. **Test the 4-step GRN wizard**:
   - **Step 1**: Select the acknowledged PO
   - **Step 2**: Enter receipt details and transport info
   - **Step 3**: Inspect items (received/accepted/rejected quantities)
   - **Step 4**: Perform quality check

3. **Expected Result**: GRN created with calculated status

### **Step 5: Invoice Processing with 3-Way Matching**
1. **Navigate to**: `/procurement/invoices/new`
2. **Test the 4-step invoice wizard**:
   - **Step 1**: Select PO and GR
   - **Step 2**: Enter invoice details
   - **Step 3**: Configure line items with pricing
   - **Step 4**: Review 3-way matching results

3. **Expected Result**: Invoice created with matching status

### **Step 6: Payment Processing**
1. **Navigate to**: `/procurement/payments`
2. **Test payment workflow**:
   - Select approved invoices
   - Choose payment method
   - Set payment details
   - Process payment batch

3. **Expected Result**: Payment batch created and invoices marked as paid

---

## 🔍 Feature-Specific Testing

### **Dashboard Testing**
- **URL**: `/procurement/dashboard`
- **Test**: Verify real-time KPIs and activity feeds
- **Check**: All metrics update based on actual data

### **Advanced Filtering & Search**
- **Test on all list pages**: PRs, POs, GRs, Invoices, Payments
- **Verify**: Status filters, date ranges, vendor filters work correctly
- **Check**: Search functionality across all relevant fields

### **Three-Way Matching Validation**
- **Create discrepancies** by varying quantities/prices between PO, GR, and Invoice
- **Verify**: System detects and reports variances correctly
- **Test**: Tolerance levels and approval workflows for discrepancies

### **Multi-Level Approvals**
- **Test different PR amounts** to trigger various approval levels
- **Verify**: Budget thresholds work correctly
- **Check**: Approval routing based on monetary values

---

## 📊 Sample Test Data

The system comes pre-loaded with comprehensive test data:

### **Categories**
- Office Supplies, IT Equipment, Furniture, Cleaning Supplies, etc.

### **Vendors**
- Al Madina Trading, Muscat Office Solutions, Oman Tech Solutions, etc.
- Each with complete contact and banking information

### **Items**
- Laptops, Office Chairs, Printers, Stationery, etc.
- With proper categorization and pricing

### **Sample Workflow Data**
- Pre-created PRs, POs, GRs, and Invoices in various statuses
- Realistic Omani business context and data

---

## 🧪 API Testing

### **Test Individual Endpoints**
```bash
# Get all purchase requisitions
curl http://localhost:3000/api/purchase-requisitions

# Get specific PR
curl http://localhost:3000/api/purchase-requisitions/[id]

# Create new PR
curl -X POST http://localhost:3000/api/purchase-requisitions \
  -H "Content-Type: application/json" \
  -d '{"requesterId":"emp001","departmentId":"IT","itemType":"STOCK",...}'

# Test other endpoints similarly
```

### **Key API Endpoints to Test**
- `/api/purchase-requisitions` - PR CRUD operations
- `/api/purchase-orders` - PO management
- `/api/goods-receipts` - GR processing
- `/api/invoices` - Invoice management
- `/api/payments` - Payment processing
- `/api/vendors` - Vendor data
- `/api/items` - Item catalog

---

## 🔧 Testing Scenarios

### **Happy Path Testing**
1. **Complete P2P Flow**: PR → Approval → PO → GR → Invoice → Payment
2. **Verify**: Each step transitions correctly to the next
3. **Check**: All calculations and validations work properly

### **Error Handling Testing**
1. **Invalid Data**: Submit forms with missing required fields
2. **Business Rule Violations**: Try to create PO from unapproved PR
3. **Validation Errors**: Enter negative quantities or invalid dates
4. **Network Errors**: Test with slow/failed API responses

### **Edge Cases Testing**
1. **Partial Deliveries**: Receive less than ordered quantities
2. **Price Variances**: Invoice prices different from PO prices
3. **Quality Rejections**: Reject items during goods receipt
4. **Multiple Currencies**: Test with different currency combinations

### **Performance Testing**
1. **Large Data Sets**: Test with many items in PR/PO
2. **Pagination**: Verify list pages handle large datasets
3. **Search Performance**: Test search with various query types
4. **Concurrent Users**: Multiple browser tabs/users

---

## 📱 Responsive Testing

### **Desktop Testing**
- **Browsers**: Chrome, Firefox, Safari, Edge
- **Resolutions**: 1920x1080, 1366x768, 2560x1440

### **Tablet Testing**
- **iPad**: Portrait and landscape modes
- **Android Tablets**: Various screen sizes

### **Mobile Testing**
- **iPhone**: Various models and orientations
- **Android**: Different screen sizes and densities

---

## 🌐 Localization Testing

### **Omani Context Validation**
- **Currency**: All amounts display in OMR
- **Dates**: Proper date formatting for Oman
- **Addresses**: Governorate dropdown with Omani regions
- **Business Rules**: Align with Omani procurement practices

### **Language Support**
- **English**: Primary interface language
- **Arabic Names**: Vendor and item names in Arabic
- **RTL Support**: Test if Arabic content displays correctly

---

## 🚨 Critical Test Cases

### **Security Testing**
1. **Input Validation**: SQL injection, XSS attempts
2. **Authorization**: Access control for different user roles
3. **Data Integrity**: Ensure calculations are tamper-proof

### **Business Logic Testing**
1. **Approval Workflows**: Multi-level approval routing
2. **Three-Way Matching**: Variance detection accuracy
3. **Status Transitions**: Proper workflow state management
4. **Financial Calculations**: Tax, discount, total calculations

### **Integration Testing**
1. **Database Operations**: CRUD operations work correctly
2. **API Consistency**: Frontend and backend data synchronization
3. **Cross-Module Integration**: Data flows between P2P stages

---

## 📈 Performance Benchmarks

### **Expected Performance**
- **Page Load**: < 2 seconds for list pages
- **Form Submission**: < 1 second for simple forms
- **Search Results**: < 500ms for filtered results
- **API Responses**: < 200ms for single record retrieval

### **Scalability Targets**
- **Concurrent Users**: 50+ simultaneous users
- **Data Volume**: 10,000+ records per entity type
- **Transaction Volume**: 1,000+ transactions per day

---

## 🐛 Common Issues & Solutions

### **Database Connection Issues**
```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Restart if needed
brew services restart postgresql

# Verify connection
psql -U helshamy -d procurement_db -c "SELECT 1;"
```

### **Prisma Issues**
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database if needed
npm run db:reset
```

### **Port Conflicts**
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 [PID]
```

---

## ✅ Testing Checklist

### **Pre-Testing Setup**
- [ ] Database is running and seeded
- [ ] Development server is started
- [ ] All dependencies are installed
- [ ] Environment variables are configured

### **Core Functionality**
- [ ] All pages load without errors
- [ ] Forms submit successfully
- [ ] Data displays correctly
- [ ] Navigation works properly

### **Business Workflows**
- [ ] Complete P2P flow works end-to-end
- [ ] Approval workflows function correctly
- [ ] Three-way matching validates properly
- [ ] Payment processing completes successfully

### **User Experience**
- [ ] Responsive design works on all devices
- [ ] Loading states display appropriately
- [ ] Error messages are clear and helpful
- [ ] Success notifications appear correctly

### **Data Integrity**
- [ ] Calculations are accurate
- [ ] Status transitions are correct
- [ ] Audit trails are maintained
- [ ] Data validation prevents invalid entries

---

## 🎯 Success Criteria

### **Functional Success**
- ✅ All 9 P2P pages work without errors
- ✅ Complete workflow can be executed end-to-end
- ✅ All business rules are enforced correctly
- ✅ Data integrity is maintained throughout

### **Technical Success**
- ✅ No console errors or warnings
- ✅ All API endpoints respond correctly
- ✅ Database operations complete successfully
- ✅ Performance meets benchmarks

### **User Experience Success**
- ✅ Intuitive navigation and workflows
- ✅ Clear feedback and error messages
- ✅ Responsive design across devices
- ✅ Professional appearance and behavior

---

## 🚀 Ready for Production

Once all tests pass, the system is ready for:
- **Production deployment**
- **User training and onboarding**
- **Live business operations**
- **Continuous monitoring and optimization**

**Happy Testing! 🎉**
