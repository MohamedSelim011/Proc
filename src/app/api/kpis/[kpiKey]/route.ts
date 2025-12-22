import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/kpis/[kpiKey] - Get detailed data for a specific KPI
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kpiKey: string }> }
) {
  try {
    const { kpiKey } = await params;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'monthly';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date range
    const dateRange = getDateRange(period, startDate, endDate);

    // Fetch detailed data based on KPI key
    let details: any = {};

    switch (kpiKey) {
      case 'procurementCycleTime':
        details = await getProcurementCycleTimeDetails(dateRange);
        break;
      case 'onTimeDeliveryRate':
        details = await getOnTimeDeliveryRateDetails(dateRange);
        break;
      case 'vendorComplianceRate':
        details = await getVendorComplianceRateDetails(dateRange);
        break;
      case 'invoiceProcessingTime':
        details = await getInvoiceProcessingTimeDetails(dateRange);
        break;
      case 'threeWayMatchSuccessRate':
        details = await getThreeWayMatchSuccessRateDetails(dateRange);
        break;
      case 'costVarianceVsBudget':
        details = await getCostVarianceVsBudgetDetails(dateRange);
        break;
      case 'vendorPerformanceScore':
        details = await getVendorPerformanceScoreDetails(dateRange);
        break;
      case 'pendingApprovalRate':
        details = await getPendingApprovalRateDetails(dateRange);
        break;
      case 'stockItemDeliveryAccuracy':
        details = await getStockItemDeliveryAccuracyDetails(dateRange);
        break;
      case 'nonStockServiceQualityRating':
        details = await getNonStockServiceQualityRatingDetails(dateRange);
        break;
      case 'inventoryTurnoverRate':
        details = await getInventoryTurnoverRateDetails(dateRange);
        break;
      case 'dashboardUpdateTimeliness':
        details = await getDashboardUpdateTimelinessDetails(dateRange);
        break;
      case 'topVendorSpendContribution':
        details = await getTopVendorSpendContributionDetails(dateRange);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid KPI key' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      kpiKey,
      period,
      dateRange: {
        start: dateRange.start,
        end: dateRange.end
      },
      ...details
    });
  } catch (error) {
    console.error(`Error fetching KPI details for ${kpiKey}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI details' },
      { status: 500 }
    );
  }
}

function getDateRange(period: string, startDate?: string | null, endDate?: string | null) {
  const now = new Date();
  let start: Date, end: Date;

  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    switch (period) {
      case 'weekly':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        end = now;
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'monthly':
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }
  }

  return { start, end };
}

async function getProcurementCycleTimeDetails(dateRange: any) {
  const prs = await prisma.purchaseRequisition.findMany({
    where: {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end
      },
      status: 'APPROVED'
    },
    include: {
      purchaseOrders: {
        include: {
          goodsReceipts: {
            orderBy: {
              receivedDate: 'desc'
            },
            take: 1
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const items = prs.map(pr => {
    const prCreated = pr.createdAt;
    let completionDate = null;
    let cycleTime = null;

    for (const po of pr.purchaseOrders) {
      if (po.goodsReceipts.length > 0) {
        completionDate = po.goodsReceipts[0].receivedDate;
        cycleTime = Math.floor(
          (completionDate.getTime() - prCreated.getTime()) / (1000 * 60 * 60 * 24)
        );
        break;
      }
    }

    return {
      prNumber: pr.prNumber,
      prCreated: prCreated,
      completionDate: completionDate,
      cycleTime: cycleTime,
      status: pr.status
    };
  }).filter(item => item.cycleTime !== null);

  const averageCycleTime = items.length > 0
    ? items.reduce((sum, item) => sum + (item.cycleTime || 0), 0) / items.length
    : 0;

  return {
    summary: {
      averageCycleTime: Math.round(averageCycleTime * 100) / 100,
      totalCompleted: items.length,
      unit: 'days'
    },
    items
  };
}

async function getOnTimeDeliveryRateDetails(dateRange: any) {
  const deliveries = await prisma.goodsReceipt.findMany({
    where: {
      receivedDate: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    },
    include: {
      po: true
    },
    orderBy: {
      receivedDate: 'desc'
    }
  });

  const items = deliveries.map(gr => {
    const isOnTime = gr.po && gr.po.deliveryDate
      ? new Date(gr.receivedDate) <= new Date(gr.po.deliveryDate)
      : false;

    return {
      grNumber: gr.grNumber,
      receivedDate: gr.receivedDate,
      expectedDate: gr.po?.deliveryDate,
      isOnTime,
      poNumber: gr.po?.poNumber
    };
  });

  const onTimeCount = items.filter(item => item.isOnTime).length;
  const rate = items.length > 0 ? (onTimeCount / items.length) * 100 : 0;

  return {
    summary: {
      onTimeRate: Math.round(rate * 100) / 100,
      onTimeCount,
      totalCount: items.length,
      unit: '%'
    },
    items
  };
}

async function getVendorComplianceRateDetails(dateRange: any) {
  const vendors = await prisma.vendor.findMany({
    where: {
      status: 'ACTIVE'
    },
    include: {
      evaluations: {
        where: {
          evaluationDate: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        }
      },
      documents: true
    }
  });

  const items = vendors.map(vendor => {
    const hasValidDocuments = vendor.documents.some(doc =>
      doc.documentType === 'INSURANCE' && doc.status === 'APPROVED'
    );
    const hasGoodPerformance = vendor.evaluations.length > 0 &&
      vendor.evaluations.every(evaluation => evaluation.overallScore >= 70);
    const hasValidLicense = vendor.documents.some(doc =>
      doc.documentType === 'LICENSE' && doc.status === 'APPROVED'
    );

    const isCompliant = hasValidDocuments && hasGoodPerformance && hasValidLicense;

    return {
      vendorId: vendor.id,
      vendorName: vendor.nameEn,
      vendorCode: vendor.vendorCode,
      hasValidDocuments,
      hasGoodPerformance,
      hasValidLicense,
      isCompliant,
      evaluationCount: vendor.evaluations.length,
      documentCount: vendor.documents.length
    };
  });

  const compliantCount = items.filter(item => item.isCompliant).length;
  const rate = items.length > 0 ? (compliantCount / items.length) * 100 : 0;

  return {
    summary: {
      complianceRate: Math.round(rate * 100) / 100,
      compliantCount,
      totalCount: items.length,
      unit: '%'
    },
    items
  };
}

async function getInvoiceProcessingTimeDetails(dateRange: any) {
  const invoices = await prisma.invoice.findMany({
    where: {
      invoiceDate: {
        gte: dateRange.start,
        lte: dateRange.end
      },
      paymentStatus: 'PAID'
    },
    orderBy: {
      invoiceDate: 'desc'
    }
  });

  const items = invoices
    .filter(invoice => invoice.paymentDate) // Only include invoices with payment date
    .map(invoice => {
      const processingTime = Math.floor(
        (invoice.paymentDate!.getTime() - invoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        paymentDate: invoice.paymentDate,
        processingTime,
        amount: invoice.totalAmount,
        status: invoice.status
      };
    });

  const averageTime = items.length > 0
    ? items.reduce((sum, item) => sum + item.processingTime, 0) / items.length
    : 0;

  return {
    summary: {
      averageProcessingTime: Math.round(averageTime * 100) / 100,
      totalProcessed: items.length,
      unit: 'days'
    },
    items
  };
}

async function getThreeWayMatchSuccessRateDetails(dateRange: any) {
  const invoices = await prisma.invoice.findMany({
    where: {
      invoiceDate: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    },
    include: {
      po: true
    },
    orderBy: {
      invoiceDate: 'desc'
    }
  });

  const items = invoices.map(invoice => ({
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    isMatched: invoice.threeWayMatched,
    matchingStatus: invoice.matchingStatus,
    poNumber: invoice.po?.poNumber,
    amount: invoice.totalAmount
  }));

  const matchedCount = items.filter(item => item.isMatched).length;
  const rate = items.length > 0 ? (matchedCount / items.length) * 100 : 0;

  return {
    summary: {
      successRate: Math.round(rate * 100) / 100,
      matchedCount,
      totalCount: items.length,
      unit: '%'
    },
    items
  };
}

async function getCostVarianceVsBudgetDetails(dateRange: any) {
  const pos = await prisma.purchaseOrder.findMany({
    where: {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    },
    include: {
      pr: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const items = pos
    .filter(po => po.pr)
    .map(po => {
      const budgeted = Number(po.pr?.estimatedCost || 0);
      const actual = Number(po.totalAmount);
      const variance = budgeted > 0 ? ((actual - budgeted) / budgeted) * 100 : 0;

      return {
        poNumber: po.poNumber,
        prNumber: po.pr?.prNumber,
        budgeted,
        actual,
        variance: Math.round(variance * 100) / 100,
        createdAt: po.createdAt
      };
    });

  const totalBudgeted = items.reduce((sum, item) => sum + item.budgeted, 0);
  const totalActual = items.reduce((sum, item) => sum + item.actual, 0);
  const overallVariance = totalBudgeted > 0 ? ((totalActual - totalBudgeted) / totalBudgeted) * 100 : 0;

  return {
    summary: {
      overallVariance: Math.round(overallVariance * 100) / 100,
      totalBudgeted,
      totalActual,
      totalItems: items.length,
      unit: '%'
    },
    items
  };
}

async function getVendorPerformanceScoreDetails(dateRange: any) {
  const evaluations = await prisma.vendorEvaluation.findMany({
    where: {
      evaluationDate: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    },
    include: {
      vendor: true
    },
    orderBy: {
      evaluationDate: 'desc'
    }
  });

  const items = evaluations.map(evaluation => {
    const weightedScore = (evaluation.deliveryScore * 0.4) + (evaluation.qualityScore * 0.3) + (evaluation.serviceScore * 0.3);

    return {
      evaluationId: evaluation.id,
      vendorName: evaluation.vendor.nameEn,
      vendorCode: evaluation.vendor.vendorCode,
      deliveryScore: evaluation.deliveryScore,
      qualityScore: evaluation.qualityScore,
      serviceScore: evaluation.serviceScore,
      weightedScore: Math.round(weightedScore * 100) / 100,
      overallScore: evaluation.overallScore,
      evaluationDate: evaluation.evaluationDate
    };
  });

  const averageScore = items.length > 0
    ? items.reduce((sum, item) => sum + item.weightedScore, 0) / items.length
    : 0;

  return {
    summary: {
      averageScore: Math.round(averageScore * 100) / 100,
      totalEvaluations: items.length,
      unit: 'score'
    },
    items
  };
}

async function getPendingApprovalRateDetails(dateRange: any) {
  const [prs, pos, invoices] = await Promise.all([
    prisma.purchaseRequisition.findMany({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      select: {
        prNumber: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.purchaseOrder.findMany({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      select: {
        poNumber: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.invoice.findMany({
      where: {
        invoiceDate: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      select: {
        invoiceNumber: true,
        status: true,
        invoiceDate: true
      }
    })
  ]);

  const pendingPRs = prs.filter(pr => pr.status === 'SUBMITTED');
  const pendingPOs = pos.filter(po => po.status === 'DRAFT');
  const pendingInvoices = invoices.filter(inv => ['DRAFT', 'SUBMITTED'].includes(inv.status));

  const allItems = [
    ...pendingPRs.map(pr => ({ type: 'PR', number: pr.prNumber, status: pr.status, date: pr.createdAt })),
    ...pendingPOs.map(po => ({ type: 'PO', number: po.poNumber, status: po.status, date: po.createdAt })),
    ...pendingInvoices.map(inv => ({ type: 'Invoice', number: inv.invoiceNumber, status: inv.status, date: inv.invoiceDate }))
  ];

  const totalPending = allItems.length;
  const totalDocuments = prs.length + pos.length + invoices.length;
  const rate = totalDocuments > 0 ? (totalPending / totalDocuments) * 100 : 0;

  return {
    summary: {
      pendingRate: Math.round(rate * 100) / 100,
      totalPending,
      totalDocuments,
      unit: '%'
    },
    items: allItems
  };
}

async function getStockItemDeliveryAccuracyDetails(dateRange: any) {
  const grItems = await prisma.gRItem.findMany({
    where: {
      gr: {
        receivedDate: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      item: {
        minStockLevel: {
          not: null
        }
      }
    },
    include: {
      item: true,
      gr: {
        include: {
          po: {
            include: {
              items: true
            }
          }
        }
      }
    },
    orderBy: {
      gr: {
        receivedDate: 'desc'
      }
    }
  });

  const items = grItems.map(grItem => {
    const poItem = grItem.gr.po?.items.find(pi => pi.itemId === grItem.itemId);
    const quantityAccurate = poItem ? grItem.acceptedQuantity === poItem.quantity : false;
    const qualityAccurate = grItem.qualityStatus === 'PASSED';
    const isAccurate = quantityAccurate && qualityAccurate;

    return {
      grNumber: grItem.gr.grNumber,
      itemName: grItem.item.nameEn,
      itemCode: grItem.item.itemCode,
      orderedQuantity: poItem?.quantity || 0,
      receivedQuantity: grItem.acceptedQuantity,
      qualityStatus: grItem.qualityStatus,
      quantityAccurate,
      qualityAccurate,
      isAccurate,
      receivedDate: grItem.gr.receivedDate
    };
  });

  const accurateCount = items.filter(item => item.isAccurate).length;
  const rate = items.length > 0 ? (accurateCount / items.length) * 100 : 0;

  return {
    summary: {
      accuracyRate: Math.round(rate * 100) / 100,
      accurateCount,
      totalCount: items.length,
      unit: '%'
    },
    items
  };
}

async function getNonStockServiceQualityRatingDetails(dateRange: any) {
  const evaluations = await prisma.vendorEvaluation.findMany({
    where: {
      evaluationDate: {
        gte: dateRange.start,
        lte: dateRange.end
      },
      comments: {
        contains: 'service'
      }
    },
    include: {
      vendor: true
    },
    orderBy: {
      evaluationDate: 'desc'
    }
  });

  const items = evaluations.map(evaluation => {
    const rating = (evaluation.serviceScore / 100) * 5; // Convert to 1-5 scale

    return {
      evaluationId: evaluation.id,
      vendorName: evaluation.vendor.nameEn,
      serviceScore: evaluation.serviceScore,
      rating: Math.round(rating * 100) / 100,
      evaluationDate: evaluation.evaluationDate,
      comments: evaluation.comments
    };
  });

  const averageRating = items.length > 0
    ? items.reduce((sum, item) => sum + item.rating, 0) / items.length
    : 0;

  return {
    summary: {
      averageRating: Math.round(averageRating * 100) / 100,
      totalEvaluations: items.length,
      unit: 'rating (1-5 scale)'
    },
    items
  };
}

async function getInventoryTurnoverRateDetails(dateRange: any) {
  const items = await prisma.item.findMany({
    where: {
      minStockLevel: {
        not: null
      }
    },
    include: {
      grItems: {
        where: {
          gr: {
            receivedDate: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          }
        }
      }
    }
  });

  const itemDetails = items.map(item => {
    const totalReceived = item.grItems.reduce((sum, grItem) => sum + grItem.acceptedQuantity, 0);
    const avgUnitCost = item.grItems.length > 0
      ? item.grItems.reduce((sum, grItem) => sum + Number(grItem.unitPrice || 0), 0) / item.grItems.length
      : 0;
    const costOfGoodsSold = totalReceived * avgUnitCost;
    const averageInventory = (item.minStockLevel || 0) * avgUnitCost;
    const turnoverRate = averageInventory > 0 ? costOfGoodsSold / averageInventory : 0;

    return {
      itemCode: item.itemCode,
      itemName: item.nameEn,
      totalReceived,
      avgUnitCost,
      costOfGoodsSold: Math.round(costOfGoodsSold * 100) / 100,
      averageInventory: Math.round(averageInventory * 100) / 100,
      turnoverRate: Math.round(turnoverRate * 100) / 100
    };
  });

  const totalCOGS = itemDetails.reduce((sum, item) => sum + item.costOfGoodsSold, 0);
  const totalAvgInventory = itemDetails.reduce((sum, item) => sum + item.averageInventory, 0);
  const overallRate = totalAvgInventory > 0 ? totalCOGS / totalAvgInventory : 0;

  return {
    summary: {
      turnoverRate: Math.round(overallRate * 100) / 100,
      totalCostOfGoodsSold: totalCOGS,
      totalAverageInventory: totalAvgInventory,
      totalItems: itemDetails.length,
      unit: 'times'
    },
    items: itemDetails
  };
}

async function getDashboardUpdateTimelinessDetails(dateRange: any) {
  // This is a placeholder - in a real system, you'd track actual dashboard update timestamps
  return {
    summary: {
      timelinessRate: 93.33,
      actualUpdates: 28,
      totalExpectedUpdates: 30,
      unit: '%'
    },
    items: [],
    note: 'Dashboard update tracking requires implementation of update timestamp logging'
  };
}

async function getTopVendorSpendContributionDetails(dateRange: any) {
  const vendors = await prisma.vendor.findMany({
    include: {
      purchaseOrders: {
        where: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        }
      }
    }
  });

  const vendorTotals = vendors
    .map(vendor => ({
      vendorId: vendor.id,
      vendorName: vendor.nameEn,
      vendorCode: vendor.vendorCode,
      totalSpend: vendor.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0),
      orderCount: vendor.purchaseOrders.length
    }))
    .filter(v => v.totalSpend > 0)
    .sort((a, b) => b.totalSpend - a.totalSpend);

  const totalSpend = vendorTotals.reduce((sum, v) => sum + v.totalSpend, 0);
  const top5Spend = vendorTotals.slice(0, 5).reduce((sum, v) => sum + v.totalSpend, 0);
  const contributionRate = totalSpend > 0 ? (top5Spend / totalSpend) * 100 : 0;

  return {
    summary: {
      contributionRate: Math.round(contributionRate * 100) / 100,
      top5Spend,
      totalSpend,
      totalVendors: vendorTotals.length,
      unit: '%'
    },
    topVendors: vendorTotals.slice(0, 5),
    allVendors: vendorTotals
  };
}

