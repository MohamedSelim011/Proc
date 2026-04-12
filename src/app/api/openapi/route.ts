import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Wujha Procurement API',
    description:
      'REST API for the Wujha Procurement Management System. Covers vendors, purchase requisitions, purchase orders, RFQs, goods receipts, invoices, payments, items, and automation workflows.',
    version: '1.0.0',
    contact: {
      name: 'Wujha Procurement',
    },
  },
  servers: [
    {
      url: 'https://wujhaprocurement-dev.up.railway.app',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Vendors', description: 'Vendor management' },
    { name: 'Categories', description: 'Procurement categories' },
    { name: 'Items', description: 'Inventory items (stock)' },
    { name: 'Non-Stock Items', description: 'Non-stock / service items' },
    { name: 'Purchase Requisitions', description: 'PR lifecycle' },
    { name: 'Purchase Orders', description: 'PO lifecycle' },
    { name: 'RFQ', description: 'Request for Quotation' },
    { name: 'Goods Receipts', description: 'Goods receipt notes' },
    { name: 'Invoices', description: 'Supplier invoices' },
    { name: 'Payments', description: 'Payment processing' },
    { name: 'Payment Batches', description: 'Batch payments' },
    { name: 'Dashboard', description: 'Dashboard KPIs and summary' },
    { name: 'KPIs', description: 'Key performance indicators' },
    { name: 'Reports', description: 'Procurement reports' },
    { name: 'Upload', description: 'File uploads' },
    { name: 'Automation', description: 'Workflow automation engine' },
    { name: 'Services', description: 'Service procurement' },
  ],
  components: {
    schemas: {
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 100 },
          totalPages: { type: 'integer', example: 10 },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Failed to fetch resource' },
        },
      },
      Vendor: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          vendorCode: { type: 'string', example: 'V-0001' },
          nameEn: { type: 'string', example: 'Acme Corp' },
          nameAr: { type: 'string', example: 'شركة أكمي' },
          crNumber: { type: 'string' },
          taxId: { type: 'string' },
          vatNumber: { type: 'string' },
          primaryContactName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          mobile: { type: 'string' },
          address: { type: 'string' },
          businessType: { type: 'string' },
          yearEstablished: { type: 'integer' },
          numberOfEmployees: { type: 'integer' },
          omanizationPercentage: { type: 'number' },
          status: {
            type: 'string',
            enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'BLACKLISTED'],
          },
          performanceScore: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string' },
          nameEn: { type: 'string' },
          nameAr: { type: 'string' },
          parentId: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Item: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          itemCode: { type: 'string' },
          nameEn: { type: 'string' },
          nameAr: { type: 'string' },
          description: { type: 'string' },
          unitOfMeasure: { type: 'string' },
          categoryId: { type: 'string' },
          standardPrice: { type: 'number' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PurchaseRequisition: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          prNumber: { type: 'string', example: 'PR-2024-0001' },
          requesterId: { type: 'string' },
          departmentId: { type: 'string' },
          itemType: { type: 'string', enum: ['STOCK', 'NON_STOCK', 'SERVICE'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
          status: {
            type: 'string',
            enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED'],
          },
          estimatedCost: { type: 'number' },
          budgetCode: { type: 'string' },
          justification: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PurchaseOrder: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          poNumber: { type: 'string', example: 'PO-2024-0001' },
          prId: { type: 'string' },
          vendorId: { type: 'string' },
          deliveryDate: { type: 'string', format: 'date-time' },
          deliveryAddress: { type: 'string' },
          paymentTerms: { type: 'string' },
          status: {
            type: 'string',
            enum: ['DRAFT', 'APPROVED', 'SENT', 'ACKNOWLEDGED', 'COMPLETED', 'CANCELLED'],
          },
          totalAmount: { type: 'number' },
          currency: { type: 'string', example: 'OMR' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      RFQ: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          rfqNumber: { type: 'string', example: 'RFQ-2024-0001' },
          prId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          closingDate: { type: 'string', format: 'date-time' },
          status: {
            type: 'string',
            enum: ['DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED', 'CANCELLED'],
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      GoodsReceipt: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          grnNumber: { type: 'string', example: 'GRN-2024-0001' },
          poId: { type: 'string' },
          receivedDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['DRAFT', 'CONFIRMED', 'REJECTED'] },
          notes: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Invoice: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          invoiceNumber: { type: 'string' },
          vendorId: { type: 'string' },
          poId: { type: 'string' },
          invoiceDate: { type: 'string', format: 'date-time' },
          dueDate: { type: 'string', format: 'date-time' },
          totalAmount: { type: 'number' },
          taxAmount: { type: 'number' },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAID'] },
          threeWayMatched: { type: 'boolean' },
          paymentStatus: { type: 'string', enum: ['UNPAID', 'PARTIAL', 'PAID'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          paymentNumber: { type: 'string' },
          invoiceId: { type: 'string' },
          vendorId: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string', example: 'OMR' },
          paymentDate: { type: 'string', format: 'date-time' },
          paymentMethod: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'PROCESSED', 'FAILED'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    parameters: {
      pageParam: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', default: 1 },
        description: 'Page number',
      },
      limitParam: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', default: 10 },
        description: 'Items per page',
      },
      idParam: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Resource ID',
      },
    },
  },
  paths: {
    // ── VENDORS ──────────────────────────────────────────────
    '/api/vendors': {
      get: {
        tags: ['Vendors'],
        summary: 'List vendors',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'BLACKLISTED'] },
          },
          { name: 'categoryId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Paginated list of vendors',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    vendors: { type: 'array', items: { $ref: '#/components/schemas/Vendor' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        tags: ['Vendors'],
        summary: 'Create vendor',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['vendorCode', 'nameEn', 'email'],
                properties: {
                  vendorCode: { type: 'string' },
                  nameEn: { type: 'string' },
                  nameAr: { type: 'string' },
                  crNumber: { type: 'string' },
                  taxId: { type: 'string' },
                  vatNumber: { type: 'string' },
                  primaryContactName: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  mobile: { type: 'string' },
                  address: { type: 'string' },
                  businessType: { type: 'string' },
                  yearEstablished: { type: 'integer' },
                  numberOfEmployees: { type: 'integer' },
                  omanizationPercentage: { type: 'number' },
                  status: { type: 'string', default: 'PENDING' },
                  categories: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        categoryId: { type: 'string' },
                        isPrimary: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Vendor created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Vendor' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/vendors/{id}': {
      get: {
        tags: ['Vendors'],
        summary: 'Get vendor by ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          '200': { description: 'Vendor detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/Vendor' } } } },
          '404': { description: 'Not found' },
          '500': { description: 'Server error' },
        },
      },
      put: {
        tags: ['Vendors'],
        summary: 'Update vendor',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Vendor' } } } },
        responses: {
          '200': { description: 'Updated vendor', content: { 'application/json': { schema: { $ref: '#/components/schemas/Vendor' } } } },
          '404': { description: 'Not found' },
          '500': { description: 'Server error' },
        },
      },
      delete: {
        tags: ['Vendors'],
        summary: 'Delete vendor',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          '200': { description: 'Deleted' },
          '404': { description: 'Not found' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/api/vendors/{id}/documents': {
      get: {
        tags: ['Vendors'],
        summary: 'Get vendor documents',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: { '200': { description: 'Documents list' } },
      },
      post: {
        tags: ['Vendors'],
        summary: 'Upload vendor document',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Document created' } },
      },
    },
    '/api/vendors/{id}/evaluations': {
      get: {
        tags: ['Vendors'],
        summary: 'Get vendor evaluations',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: { '200': { description: 'Evaluations list' } },
      },
      post: {
        tags: ['Vendors'],
        summary: 'Create vendor evaluation',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Evaluation created' } },
      },
    },

    // ── CATEGORIES ───────────────────────────────────────────
    '/api/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List categories',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: { '200': { description: 'Categories list', content: { 'application/json': { schema: { type: 'object', properties: { categories: { type: 'array', items: { $ref: '#/components/schemas/Category' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } } },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create category',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'nameEn'],
                properties: {
                  code: { type: 'string' },
                  nameEn: { type: 'string' },
                  nameAr: { type: 'string' },
                  parentId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Category created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } } },
      },
    },
    '/api/categories/{id}': {
      get: { tags: ['Categories'], summary: 'Get category', parameters: [{ $ref: '#/components/parameters/idParam' }], responses: { '200': { description: 'Category' } } },
      put: { tags: ['Categories'], summary: 'Update category', parameters: [{ $ref: '#/components/parameters/idParam' }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } }, responses: { '200': { description: 'Updated' } } },
      delete: { tags: ['Categories'], summary: 'Delete category', parameters: [{ $ref: '#/components/parameters/idParam' }], responses: { '200': { description: 'Deleted' } } },
    },

    // ── ITEMS ─────────────────────────────────────────────────
    '/api/items': {
      get: {
        tags: ['Items'],
        summary: 'List items',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'categoryId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } },
        ],
        responses: { '200': { description: 'Items list', content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Item' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } } },
      },
      post: {
        tags: ['Items'],
        summary: 'Create item',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['itemCode', 'nameEn', 'unitOfMeasure'],
                properties: {
                  itemCode: { type: 'string' },
                  nameEn: { type: 'string' },
                  nameAr: { type: 'string' },
                  description: { type: 'string' },
                  unitOfMeasure: { type: 'string' },
                  categoryId: { type: 'string' },
                  standardPrice: { type: 'number' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Item created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } } } },
      },
    },
    '/api/items/{id}': {
      get: { tags: ['Items'], summary: 'Get item', parameters: [{ $ref: '#/components/parameters/idParam' }], responses: { '200': { description: 'Item' } } },
      put: { tags: ['Items'], summary: 'Update item', parameters: [{ $ref: '#/components/parameters/idParam' }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } } }, responses: { '200': { description: 'Updated' } } },
      delete: { tags: ['Items'], summary: 'Delete item', parameters: [{ $ref: '#/components/parameters/idParam' }], responses: { '200': { description: 'Deleted' } } },
    },

    // ── NON-STOCK ITEMS ───────────────────────────────────────
    '/api/non-stock-items': {
      get: {
        tags: ['Non-Stock Items'],
        summary: 'List non-stock items',
        parameters: [{ $ref: '#/components/parameters/pageParam' }, { $ref: '#/components/parameters/limitParam' }],
        responses: { '200': { description: 'Non-stock items list' } },
      },
      post: {
        tags: ['Non-Stock Items'],
        summary: 'Create non-stock item',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },

    // ── PURCHASE REQUISITIONS ─────────────────────────────────
    '/api/purchase-requisitions': {
      get: {
        tags: ['Purchase Requisitions'],
        summary: 'List purchase requisitions',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] } },
          { name: 'requesterId', in: 'query', schema: { type: 'string' } },
          { name: 'departmentId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Paginated PRs',
            content: { 'application/json': { schema: { type: 'object', properties: { requisitions: { type: 'array', items: { $ref: '#/components/schemas/PurchaseRequisition' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } },
          },
        },
      },
      post: {
        tags: ['Purchase Requisitions'],
        summary: 'Create purchase requisition',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['requesterId', 'departmentId', 'itemType', 'priority', 'items'],
                properties: {
                  requesterId: { type: 'string' },
                  departmentId: { type: 'string' },
                  itemType: { type: 'string', enum: ['STOCK', 'NON_STOCK', 'SERVICE'] },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
                  budgetCode: { type: 'string' },
                  justification: { type: 'string' },
                  autoSubmit: { type: 'boolean', default: false },
                  firstApproverId: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        itemId: { type: 'string' },
                        quantity: { type: 'number' },
                        estimatedPrice: { type: 'number' },
                        specifications: { type: 'string' },
                        requiredDate: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'PR created', content: { 'application/json': { schema: { $ref: '#/components/schemas/PurchaseRequisition' } } } },
          '500': { description: 'Server error' },
        },
      },
    },
    '/api/purchase-requisitions/{id}': {
      get: { tags: ['Purchase Requisitions'], summary: 'Get PR by ID', parameters: [{ $ref: '#/components/parameters/idParam' }], responses: { '200': { description: 'PR detail' } } },
      put: { tags: ['Purchase Requisitions'], summary: 'Update PR', parameters: [{ $ref: '#/components/parameters/idParam' }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PurchaseRequisition' } } } }, responses: { '200': { description: 'Updated' } } },
      delete: { tags: ['Purchase Requisitions'], summary: 'Delete PR', parameters: [{ $ref: '#/components/parameters/idParam' }], responses: { '200': { description: 'Deleted' } } },
    },
    '/api/purchase-requisitions/{id}/approve': {
      post: {
        tags: ['Purchase Requisitions'],
        summary: 'Approve or reject a PR',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action', 'approverId'],
                properties: {
                  action: { type: 'string', enum: ['APPROVE', 'REJECT'] },
                  approverId: { type: 'string' },
                  comments: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Approval processed' }, '500': { description: 'Server error' } },
      },
    },

    // ── PURCHASE ORDERS ───────────────────────────────────────
    '/api/purchase-orders': {
      get: {
        tags: ['Purchase Orders'],
        summary: 'List purchase orders',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'APPROVED', 'SENT', 'ACKNOWLEDGED', 'COMPLETED', 'CANCELLED'] } },
          { name: 'vendorId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Paginated POs',
            content: { 'application/json': { schema: { type: 'object', properties: { orders: { type: 'array', items: { $ref: '#/components/schemas/PurchaseOrder' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } },
          },
        },
      },
      post: {
        tags: ['Purchase Orders'],
        summary: 'Create purchase order',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['vendorId', 'deliveryDate', 'items'],
                properties: {
                  prId: { type: 'string' },
                  vendorId: { type: 'string' },
                  deliveryDate: { type: 'string', format: 'date-time' },
                  deliveryAddress: { type: 'string' },
                  paymentTerms: { type: 'string' },
                  currency: { type: 'string', default: 'OMR' },
                  status: { type: 'string', default: 'DRAFT' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        itemId: { type: 'string' },
                        quantity: { type: 'number' },
                        unitPrice: { type: 'number' },
                        deliveryDate: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'PO created', content: { 'application/json': { schema: { $ref: '#/components/schemas/PurchaseOrder' } } } } },
      },
    },
    '/api/purchase-orders/{id}': {
      get: { tags: ['Purchase Orders'], summary: 'Get PO by ID', parameters: [{ $ref: '#/components/parameters/idParam' }], responses: { '200': { description: 'PO detail' } } },
      put: { tags: ['Purchase Orders'], summary: 'Update PO', parameters: [{ $ref: '#/components/parameters/idParam' }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PurchaseOrder' } } } }, responses: { '200': { description: 'Updated' } } },
      delete: { tags: ['Purchase Orders'], summary: 'Delete PO', parameters: [{ $ref: '#/components/parameters/idParam' }], responses: { '200': { description: 'Deleted' } } },
    },
    '/api/purchase-orders/{id}/status': {
      put: {
        tags: ['Purchase Orders'],
        summary: 'Update PO status',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: { status: { type: 'string', enum: ['DRAFT', 'APPROVED', 'SENT', 'ACKNOWLEDGED', 'COMPLETED', 'CANCELLED'] } },
              },
            },
          },
        },
        responses: { '200': { description: 'Status updated' } },
      },
    },
    '/api/purchase-orders/{id}/amend': {
      post: {
        tags: ['Purchase Orders'],
        summary: 'Amend a PO',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' }, changes: { type: 'object' } } } } } },
        responses: { '201': { description: 'Amendment created' } },
      },
    },

    // ── RFQ ───────────────────────────────────────────────────
    '/api/rfq': {
      get: {
        tags: ['RFQ'],
        summary: 'List RFQs',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED', 'CANCELLED'] } },
        ],
        responses: { '200': { description: 'Paginated RFQs', content: { 'application/json': { schema: { type: 'object', properties: { rfqs: { type: 'array', items: { $ref: '#/components/schemas/RFQ' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } } },
      },
      post: {
        tags: ['RFQ'],
        summary: 'Create RFQ',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'closingDate'],
                properties: {
                  prId: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  closingDate: { type: 'string', format: 'date-time' },
                  status: { type: 'string', default: 'DRAFT' },
                  publishNow: { type: 'boolean', default: false },
                  vendorIds: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'RFQ created' } },
      },
    },
    '/api/rfq/{id}': {
      get: { tags: ['RFQ'], summary: 'Get RFQ by ID', parameters: [{ $ref: '#/components/parameters/idParam' }], responses: { '200': { description: 'RFQ detail' } } },
      put: { tags: ['RFQ'], summary: 'Update RFQ', parameters: [{ $ref: '#/components/parameters/idParam' }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RFQ' } } } }, responses: { '200': { description: 'Updated' } } },
      delete: { tags: ['RFQ'], summary: 'Delete RFQ', parameters: [{ $ref: '#/components/parameters/idParam' }], responses: { '200': { description: 'Deleted' } } },
    },
    '/api/rfq/{id}/status': {
      put: {
        tags: ['RFQ'],
        summary: 'Update RFQ status',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED', 'CANCELLED'] } } } } } },
        responses: { '200': { description: 'Status updated' } },
      },
    },
    '/api/rfq/{id}/responses': {
      get: { tags: ['RFQ'], summary: 'List RFQ vendor responses', parameters: [{ $ref: '#/components/parameters/idParam' }], responses: { '200': { description: 'Responses' } } },
      post: {
        tags: ['RFQ'],
        summary: 'Submit vendor response to RFQ',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['vendorId', 'totalPrice'], properties: { vendorId: { type: 'string' }, totalPrice: { type: 'number' }, currency: { type: 'string' }, deliveryDays: { type: 'integer' }, notes: { type: 'string' } } } } } },
        responses: { '201': { description: 'Response submitted' } },
      },
    },
    '/api/rfq/{id}/evaluate': {
      post: {
        tags: ['RFQ'],
        summary: 'Evaluate RFQ responses',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Evaluation result' } },
      },
    },
    '/api/rfq/{id}/award': {
      post: {
        tags: ['RFQ'],
        summary: 'Award RFQ to a vendor',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['vendorId'], properties: { vendorId: { type: 'string' }, notes: { type: 'string' } } } } } },
        responses: { '200': { description: 'RFQ awarded' } },
      },
    },

    // ── GOODS RECEIPTS ────────────────────────────────────────
    '/api/goods-receipts': {
      get: {
        tags: ['Goods Receipts'],
        summary: 'List goods receipts',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { name: 'poId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'CONFIRMED', 'REJECTED'] } },
        ],
        responses: { '200': { description: 'GRNs list', content: { 'application/json': { schema: { type: 'object', properties: { receipts: { type: 'array', items: { $ref: '#/components/schemas/GoodsReceipt' } }, pagination: { $ref: '#/components/schemas/Pagination' } } } } } } },
      },
      post: {
        tags: ['Goods Receipts'],
        summary: 'Create goods receipt',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['poId', 'receivedDate', 'items'],
                properties: {
                  poId: { type: 'string' },
                  receivedDate: { type: 'string', format: 'date-time' },
                  notes: { type: 'string' },
                  items: { type: 'array', items: { type: 'object', properties: { poItemId: { type: 'string' }, quantityReceived: { type: 'number' }, condition: { type: 'string' } } } },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'GRN created' } },
      },
    },
    '/api/goods-receipts/{id}': {
      get: { tags: ['Goods Receipts'], summary: 'Get GRN by ID', parameters: [{ $ref: '#/components/parameters/idParam' }], responses: { '200': { description: 'GRN detail' } } },
      put: { tags: ['Goods Receipts'], summary: 'Update GRN', parameters: [{ $ref: '#/components/parameters/idParam' }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/GoodsReceipt' } } } }, responses: { '200': { description: 'Updated' } } },
    },

    // ── INVOICES ──────────────────────────────────────────────
    '/api/invoices': {
      get: {
        tags: ['Invoices'],
        summary: 'List invoices',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAID'] } },
          { name: 'paymentStatus', in: 'query', schema: { type: 'string', enum: ['UNPAID', 'PARTIAL', 'PAID'] } },
          { name: 'vendorId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Invoices with summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    invoices: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                    summary: { type: 'object', properties: { totalUnpaid: { type: 'number' }, unpaidCount: { type: 'integer' } } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Invoices'],
        summary: 'Create invoice',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['invoiceNumber', 'vendorId', 'invoiceDate', 'dueDate', 'totalAmount'],
                properties: {
                  invoiceNumber: { type: 'string' },
                  vendorId: { type: 'string' },
                  poId: { type: 'string' },
                  invoiceDate: { type: 'string', format: 'date-time' },
                  dueDate: { type: 'string', format: 'date-time' },
                  totalAmount: { type: 'number' },
                  taxAmount: { type: 'number', default: 0 },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Invoice created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } } },
      },
    },
    '/api/invoices/{id}': {
      get: { tags: ['Invoices'], summary: 'Get invoice by ID', parameters: [{ $ref: '#/components/parameters/idParam' }], responses: { '200': { description: 'Invoice detail' } } },
      put: { tags: ['Invoices'], summary: 'Update invoice', parameters: [{ $ref: '#/components/parameters/idParam' }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } }, responses: { '200': { description: 'Updated' } } },
    },
    '/api/invoices/{id}/status': {
      put: {
        tags: ['Invoices'],
        summary: 'Update invoice status',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAID'] } } } } } },
        responses: { '200': { description: 'Status updated' } },
      },
    },
    '/api/invoices/three-way-match': {
      get: {
        tags: ['Invoices'],
        summary: 'Run three-way match check (Invoice / PO / GRN)',
        parameters: [{ name: 'invoiceId', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Three-way match result', content: { 'application/json': { schema: { type: 'object', properties: { matched: { type: 'boolean' }, details: { type: 'object' } } } } } } },
      },
    },

    // ── PAYMENTS ──────────────────────────────────────────────
    '/api/payments': {
      get: {
        tags: ['Payments'],
        summary: 'List payments',
        parameters: [{ $ref: '#/components/parameters/pageParam' }, { $ref: '#/components/parameters/limitParam' }, { name: 'vendorId', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }],
        responses: { '200': { description: 'Payments list' } },
      },
      post: {
        tags: ['Payments'],
        summary: 'Create payment',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['invoiceId', 'vendorId', 'amount', 'paymentDate'],
                properties: {
                  invoiceId: { type: 'string' },
                  vendorId: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string', default: 'OMR' },
                  paymentDate: { type: 'string', format: 'date-time' },
                  paymentMethod: { type: 'string' },
                  reference: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Payment created' } },
      },
    },

    // ── PAYMENT BATCHES ───────────────────────────────────────
    '/api/payment-batches': {
      get: {
        tags: ['Payment Batches'],
        summary: 'List payment batches',
        parameters: [{ $ref: '#/components/parameters/pageParam' }, { $ref: '#/components/parameters/limitParam' }],
        responses: { '200': { description: 'Batches list' } },
      },
      post: {
        tags: ['Payment Batches'],
        summary: 'Create payment batch',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['invoiceIds'], properties: { invoiceIds: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } } } } } },
        responses: { '201': { description: 'Batch created' } },
      },
    },

    // ── DASHBOARD ─────────────────────────────────────────────
    '/api/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get dashboard summary metrics',
        responses: {
          '200': {
            description: 'Dashboard data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalVendors: { type: 'integer' },
                    activePOs: { type: 'integer' },
                    pendingInvoices: { type: 'integer' },
                    totalSpend: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── KPIs ──────────────────────────────────────────────────
    '/api/kpis': {
      get: {
        tags: ['KPIs'],
        summary: 'Get procurement KPIs',
        parameters: [
          { name: 'period', in: 'query', schema: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { '200': { description: 'KPI metrics' } },
      },
    },

    // ── REPORTS ───────────────────────────────────────────────
    '/api/reports': {
      get: {
        tags: ['Reports'],
        summary: 'Generate procurement report',
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['spend', 'vendor', 'category', 'compliance'] } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { '200': { description: 'Report data' } },
      },
    },

    // ── UPLOAD ────────────────────────────────────────────────
    '/api/upload': {
      post: {
        tags: ['Upload'],
        summary: 'Upload a file (document / attachment)',
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, type: { type: 'string' } } } } },
        },
        responses: { '200': { description: 'Upload result', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, filename: { type: 'string' } } } } } } },
      },
    },

    // ── AUTOMATION ────────────────────────────────────────────
    '/api/automation/workflows': {
      get: { tags: ['Automation'], summary: 'List automation workflows', responses: { '200': { description: 'Workflows list' } } },
      post: {
        tags: ['Automation'],
        summary: 'Create automation workflow',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'trigger'], properties: { name: { type: 'string' }, trigger: { type: 'string' }, conditions: { type: 'array', items: { type: 'object' } }, actions: { type: 'array', items: { type: 'object' } }, isActive: { type: 'boolean' } } } } } },
        responses: { '201': { description: 'Workflow created' } },
      },
    },
    '/api/automation/workflows/{id}/start': {
      post: {
        tags: ['Automation'],
        summary: 'Start / trigger a workflow manually',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { context: { type: 'object' } } } } } },
        responses: { '200': { description: 'Workflow started' } },
      },
    },
    '/api/automation/approvals': {
      get: { tags: ['Automation'], summary: 'List pending approvals', responses: { '200': { description: 'Approvals list' } } },
      post: {
        tags: ['Automation'],
        summary: 'Submit an approval decision',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['documentId', 'documentType', 'approverId', 'action'], properties: { documentId: { type: 'string' }, documentType: { type: 'string' }, approverId: { type: 'string' }, action: { type: 'string', enum: ['APPROVE', 'REJECT'] }, comments: { type: 'string' } } } } } },
        responses: { '200': { description: 'Decision recorded' } },
      },
    },
    '/api/automation/notifications': {
      get: { tags: ['Automation'], summary: 'List notifications', parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }, { name: 'unread', in: 'query', schema: { type: 'boolean' } }], responses: { '200': { description: 'Notifications' } } },
      post: { tags: ['Automation'], summary: 'Create notification', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Notification sent' } } },
    },
    '/api/automation/triggers': {
      get: { tags: ['Automation'], summary: 'List automation triggers', responses: { '200': { description: 'Triggers' } } },
      post: { tags: ['Automation'], summary: 'Create trigger', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Trigger created' } } },
    },

    // ── SERVICES ──────────────────────────────────────────────
    '/api/services/categories': {
      get: { tags: ['Services'], summary: 'List service categories', responses: { '200': { description: 'Service categories' } } },
      post: { tags: ['Services'], summary: 'Create service category', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/api/services/items': {
      get: { tags: ['Services'], summary: 'List service items', responses: { '200': { description: 'Service items' } } },
      post: { tags: ['Services'], summary: 'Create service item', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/api/services/contracts': {
      get: { tags: ['Services'], summary: 'List service contracts', responses: { '200': { description: 'Service contracts' } } },
      post: { tags: ['Services'], summary: 'Create service contract', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/api/services/requisitions': {
      get: { tags: ['Services'], summary: 'List service requisitions', responses: { '200': { description: 'Service requisitions' } } },
      post: { tags: ['Services'], summary: 'Create service requisition', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/api/services/receipts': {
      get: { tags: ['Services'], summary: 'List service receipts', responses: { '200': { description: 'Service receipts' } } },
      post: { tags: ['Services'], summary: 'Create service receipt', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
  },
};

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
