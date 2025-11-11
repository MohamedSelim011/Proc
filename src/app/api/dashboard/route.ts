import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    // Get date range for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch all statistics in parallel
    const [
      vendorStats,
      prStats,
      poStats,
      invoiceStats,
      monthlySpend,
      pendingApprovals,
      topVendors,
      categorySpend
    ] = await Promise.all([
      // Vendor statistics
      prisma.vendor.aggregate({
        where: { status: 'ACTIVE' },
        _count: true,
        _avg: {
          performanceScore: true,
          omanizationPercentage: true
        }
      }),

      // Purchase Requisition statistics
      prisma.purchaseRequisition.groupBy({
        by: ['status'],
        _count: true,
        _sum: {
          estimatedCost: true
        }
      }),

      // Purchase Order statistics
      prisma.purchaseOrder.aggregate({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _count: true,
        _sum: {
          totalAmount: true
        }
      }),

      // Invoice statistics
      prisma.invoice.groupBy({
        by: ['paymentStatus'],
        _count: true,
        _sum: {
          totalAmount: true
        }
      }),

      // Monthly spend trend (last 6 months)
      getMonthlySpend(),

      // Pending approvals
      prisma.approval.count({
        where: { status: 'PENDING' }
      }),

      // Top vendors by spend
      getTopVendors(5),

      // Spend by category
      getCategorySpend()
    ]);

    // Process PR statistics
    const prSummary = {
      total: prStats.reduce((sum, stat) => sum + stat._count, 0),
      draft: prStats.find(s => s.status === 'DRAFT')?._count || 0,
      submitted: prStats.find(s => s.status === 'SUBMITTED')?._count || 0,
      approved: prStats.find(s => s.status === 'APPROVED')?._count || 0,
      rejected: prStats.find(s => s.status === 'REJECTED')?._count || 0,
      totalValue: prStats.reduce((sum, stat) => sum + Number(stat._sum.estimatedCost || 0), 0)
    };

    // Process invoice statistics
    const invoiceSummary = {
      total: invoiceStats.reduce((sum, stat) => sum + stat._count, 0),
      unpaid: invoiceStats.find(s => s.paymentStatus === 'UNPAID')?._count || 0,
      paid: invoiceStats.find(s => s.paymentStatus === 'PAID')?._count || 0,
      overdue: invoiceStats.find(s => s.paymentStatus === 'OVERDUE')?._count || 0,
      totalUnpaid: Number(invoiceStats.find(s => s.paymentStatus === 'UNPAID')?._sum.totalAmount || 0)
    };

    // Calculate additional metrics for dashboard
    const activePOs = await prisma.purchaseOrder.count({
      where: {
        status: {
          in: ['APPROVED', 'SENT', 'ACKNOWLEDGED', 'PARTIAL']
        }
      }
    });

    const pendingDeliveries = await prisma.purchaseOrder.count({
      where: {
        status: {
          in: ['SENT', 'ACKNOWLEDGED', 'PARTIAL']
        }
      }
    });

    // Calculate total spend (YTD from paid invoices)
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const totalSpendResult = await prisma.invoice.aggregate({
      where: {
        paymentStatus: 'PAID',
        paymentDate: {
          gte: yearStart
        }
      },
      _sum: {
        totalAmount: true
      }
    });

    // Calculate average lead time (from PO creation to delivery)
    const completedPOs = await prisma.purchaseOrder.findMany({
      where: {
        status: 'COMPLETED'
      },
      select: {
        createdAt: true,
        deliveryDate: true
      }
    });

    const totalLeadTime = completedPOs.reduce((sum, po) => {
      const leadTime = Math.floor(
        (new Date(po.deliveryDate!).getTime() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return sum + leadTime;
    }, 0);

    const avgLeadTime = completedPOs.length > 0
      ? Math.round((totalLeadTime / completedPOs.length) * 10) / 10
      : 0;

    return NextResponse.json({
      // Dashboard-specific metrics (for backward compatibility)
      totalPRs: prSummary.total,
      pendingApprovals,
      activePOs,
      pendingDeliveries,
      totalSpend: Number(totalSpendResult._sum.totalAmount || 0),
      budgetUtilization: 0, // Requires budget data
      onTimeDelivery: 0, // Requires expectedDeliveryDate field in schema
      costSavings: 0, // Requires historical pricing data
      avgLeadTime,

      // Detailed breakdowns
      overview: {
        activeVendors: vendorStats._count,
        averageVendorScore: vendorStats._avg.performanceScore || 0,
        averageOmanization: vendorStats._avg.omanizationPercentage || 0,
        monthlySpend: Number(poStats._sum.totalAmount || 0),
        monthlyOrders: poStats._count,
        pendingApprovals
      },
      purchaseRequisitions: prSummary,
      invoices: invoiceSummary,
      charts: {
        monthlySpend,
        topVendors,
        categorySpend
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

async function getMonthlySpend() {
  const months = [];
  const data = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const result = await prisma.purchaseOrder.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        status: {
          in: ['APPROVED', 'SENT', 'ACKNOWLEDGED', 'PARTIAL', 'COMPLETED']
        }
      },
      _sum: {
        totalAmount: true
      }
    });
    
    months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    data.push(Number(result._sum.totalAmount || 0));
  }
  
  return { months, data };
}

async function getTopVendors(limit: number) {
  const vendors = await prisma.vendor.findMany({
    where: {
      status: 'ACTIVE'
    },
    include: {
      purchaseOrders: {
        where: {
          status: {
            in: ['APPROVED', 'SENT', 'ACKNOWLEDGED', 'PARTIAL', 'COMPLETED']
          }
        },
        select: {
          totalAmount: true
        }
      }
    },
    take: limit
  });

  return vendors.map(vendor => ({
    id: vendor.id,
    name: vendor.nameEn,
    totalSpend: vendor.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0),
    orderCount: vendor.purchaseOrders.length,
    performanceScore: vendor.performanceScore
  })).sort((a, b) => b.totalSpend - a.totalSpend);
}

async function getCategorySpend() {
  const categories = await prisma.category.findMany({
    where: {
      parentId: null // Only top-level categories
    },
    include: {
      items: {
        include: {
          poItems: {
            include: {
              po: {
                select: {
                  status: true
                }
              }
            }
          }
        }
      }
    }
  });

  return categories.map(category => {
    const totalSpend = category.items.reduce((catSum, item) => {
      const itemSpend = item.poItems
        .filter(poi => ['APPROVED', 'SENT', 'ACKNOWLEDGED', 'PARTIAL', 'COMPLETED'].includes(poi.po.status))
        .reduce((sum, poi) => sum + Number(poi.totalPrice), 0);
      return catSum + itemSpend;
    }, 0);

    return {
      id: category.id,
      name: category.nameEn,
      spend: totalSpend
    };
  }).filter(cat => cat.spend > 0);
}