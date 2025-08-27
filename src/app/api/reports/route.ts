import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/reports - Generate various reports
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'summary';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter = {
      gte: startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1),
      lte: endDate ? new Date(endDate) : new Date()
    };

    let reportData;

    switch (reportType) {
      case 'vendor-performance':
        reportData = await getVendorPerformanceReport(dateFilter);
        break;
      case 'spend-analysis':
        reportData = await getSpendAnalysisReport(dateFilter);
        break;
      case 'procurement-cycle':
        reportData = await getProcurementCycleReport(dateFilter);
        break;
      case 'savings':
        reportData = await getSavingsReport(dateFilter);
        break;
      default:
        reportData = await getSummaryReport(dateFilter);
    }

    return NextResponse.json({
      type: reportType,
      period: {
        start: dateFilter.gte,
        end: dateFilter.lte
      },
      data: reportData
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function getVendorPerformanceReport(dateFilter: any) {
  const vendors = await prisma.vendor.findMany({
    where: {
      status: 'ACTIVE'
    },
    include: {
      purchaseOrders: {
        where: {
          createdAt: dateFilter
        }
      },
      evaluations: {
        where: {
          evaluationDate: dateFilter
        }
      },
      invoices: {
        where: {
          createdAt: dateFilter
        }
      }
    }
  });

  return vendors.map(vendor => {
    const onTimeDeliveries = vendor.purchaseOrders.filter(po => 
      po.status === 'COMPLETED' && po.deliveryDate >= po.orderDate
    ).length;
    
    const totalOrders = vendor.purchaseOrders.length;
    const deliveryRate = totalOrders > 0 ? (onTimeDeliveries / totalOrders) * 100 : 0;

    const avgScores = vendor.evaluations.length > 0 ? {
      quality: vendor.evaluations.reduce((sum, e) => sum + e.qualityScore, 0) / vendor.evaluations.length,
      delivery: vendor.evaluations.reduce((sum, e) => sum + e.deliveryScore, 0) / vendor.evaluations.length,
      price: vendor.evaluations.reduce((sum, e) => sum + e.priceScore, 0) / vendor.evaluations.length,
      service: vendor.evaluations.reduce((sum, e) => sum + e.serviceScore, 0) / vendor.evaluations.length,
      overall: vendor.evaluations.reduce((sum, e) => sum + e.overallScore, 0) / vendor.evaluations.length,
    } : null;

    return {
      vendorId: vendor.id,
      vendorName: vendor.nameEn,
      vendorCode: vendor.vendorCode,
      totalOrders,
      totalSpend: vendor.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0),
      onTimeDeliveryRate: deliveryRate,
      averageScores: avgScores,
      omanizationPercentage: vendor.omanizationPercentage
    };
  });
}

async function getSpendAnalysisReport(dateFilter: any) {
  // Spend by category
  const categorySpend = await prisma.category.findMany({
    include: {
      items: {
        include: {
          poItems: {
            where: {
              po: {
                createdAt: dateFilter
              }
            },
            include: {
              po: true
            }
          }
        }
      }
    }
  });

  const categoryAnalysis = categorySpend.map(category => {
    const spend = category.items.reduce((catSum, item) => {
      const itemSpend = item.poItems.reduce((sum, poi) => sum + Number(poi.totalPrice), 0);
      return catSum + itemSpend;
    }, 0);

    return {
      categoryId: category.id,
      categoryName: category.nameEn,
      categoryCode: category.code,
      totalSpend: spend,
      itemCount: category.items.length
    };
  }).filter(cat => cat.totalSpend > 0);

  // Spend by vendor
  const vendorSpend = await prisma.vendor.findMany({
    include: {
      purchaseOrders: {
        where: {
          createdAt: dateFilter
        }
      }
    }
  });

  const vendorAnalysis = vendorSpend.map(vendor => ({
    vendorId: vendor.id,
    vendorName: vendor.nameEn,
    totalSpend: vendor.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0),
    orderCount: vendor.purchaseOrders.length
  })).filter(v => v.totalSpend > 0);

  // Monthly trend
  const monthlyTrend = await getMonthlyTrend(dateFilter);

  return {
    totalSpend: categoryAnalysis.reduce((sum, cat) => sum + cat.totalSpend, 0),
    byCategory: categoryAnalysis,
    byVendor: vendorAnalysis,
    monthlyTrend
  };
}

async function getProcurementCycleReport(dateFilter: any) {
  const requisitions = await prisma.purchaseRequisition.findMany({
    where: {
      createdAt: dateFilter
    },
    include: {
      purchaseOrders: true,
      rfqs: true,
      approvals: true
    }
  });

  const cycleAnalysis = requisitions.map(pr => {
    const prCreated = pr.createdAt;
    const firstApproval = pr.approvals.find(a => a.status === 'APPROVED')?.approvedAt;
    const poCreated = pr.purchaseOrders[0]?.createdAt;
    
    const prToApprovalDays = firstApproval 
      ? Math.floor((firstApproval.getTime() - prCreated.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    const approvalToPoDeploymentDays = firstApproval && poCreated
      ? Math.floor((poCreated.getTime() - firstApproval.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    const totalCycleDays = poCreated
      ? Math.floor((poCreated.getTime() - prCreated.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      prNumber: pr.prNumber,
      status: pr.status,
      priority: pr.priority,
      prToApprovalDays,
      approvalToPoDeploymentDays,
      totalCycleDays,
      hasRfq: pr.rfqs.length > 0
    };
  });

  const avgCycleTime = cycleAnalysis
    .filter(c => c.totalCycleDays !== null)
    .reduce((sum, c) => sum + c.totalCycleDays!, 0) / cycleAnalysis.filter(c => c.totalCycleDays !== null).length || 0;

  return {
    totalRequisitions: requisitions.length,
    averageCycleTime: avgCycleTime,
    details: cycleAnalysis
  };
}

async function getSavingsReport(dateFilter: any) {
  // Compare RFQ responses to actual PO amounts
  const rfqs = await prisma.rFQ.findMany({
    where: {
      createdAt: dateFilter
    },
    include: {
      responses: true,
      pr: {
        include: {
          purchaseOrders: true
        }
      }
    }
  });

  const savingsAnalysis = rfqs.map(rfq => {
    const responses = rfq.responses;
    if (responses.length === 0) return null;

    const highestBid = Math.max(...responses.map(r => Number(r.totalAmount)));
    const lowestBid = Math.min(...responses.map(r => Number(r.totalAmount)));
    const actualPOAmount = rfq.pr?.purchaseOrders[0]?.totalAmount || 0;

    const potentialSavings = highestBid - lowestBid;
    const actualSavings = rfq.pr?.estimatedCost 
      ? Number(rfq.pr.estimatedCost) - Number(actualPOAmount)
      : 0;

    return {
      rfqNumber: rfq.rfqNumber,
      responseCount: responses.length,
      highestBid,
      lowestBid,
      selectedAmount: Number(actualPOAmount),
      potentialSavings,
      actualSavings,
      savingsPercentage: rfq.pr?.estimatedCost 
        ? (actualSavings / Number(rfq.pr.estimatedCost)) * 100
        : 0
    };
  }).filter(s => s !== null);

  const totalSavings = savingsAnalysis.reduce((sum, s) => sum + (s?.actualSavings || 0), 0);
  const totalPotentialSavings = savingsAnalysis.reduce((sum, s) => sum + (s?.potentialSavings || 0), 0);

  return {
    totalActualSavings: totalSavings,
    totalPotentialSavings,
    averageSavingsPercentage: savingsAnalysis.length > 0
      ? savingsAnalysis.reduce((sum, s) => sum + (s?.savingsPercentage || 0), 0) / savingsAnalysis.length
      : 0,
    details: savingsAnalysis
  };
}

async function getSummaryReport(dateFilter: any) {
  const [prCount, poCount, vendorCount, totalSpend] = await Promise.all([
    prisma.purchaseRequisition.count({
      where: { createdAt: dateFilter }
    }),
    prisma.purchaseOrder.count({
      where: { createdAt: dateFilter }
    }),
    prisma.vendor.count({
      where: { 
        status: 'ACTIVE',
        createdAt: dateFilter 
      }
    }),
    prisma.purchaseOrder.aggregate({
      where: { createdAt: dateFilter },
      _sum: { totalAmount: true }
    })
  ]);

  return {
    totalRequisitions: prCount,
    totalOrders: poCount,
    newVendors: vendorCount,
    totalSpend: Number(totalSpend._sum.totalAmount || 0)
  };
}

async function getMonthlyTrend(dateFilter: any) {
  // Implementation for monthly trend within the date range
  return [];
}