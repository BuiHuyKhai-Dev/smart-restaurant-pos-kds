import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy báo cáo doanh thu và món bán chạy trong ngày theo chi nhánh */
  async getDailyReport(branchId: string, dateStr?: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Chi nhánh với ID ${branchId} không tồn tại`);
    }

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Lấy tất cả hóa đơn đã thanh toán trong ngày
    const invoices = await this.prisma.invoice.findMany({
      where: {
        branchId,
        paymentStatus: PaymentStatus.PAID,
        paidAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        orderSession: {
          include: {
            orders: {
              include: {
                items: {
                  include: {
                    product: { select: { id: true, name: true, price: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalSubtotal = 0;

    const paymentBreakdown = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.VIETQR]: 0,
      [PaymentMethod.CARD]: 0,
    };

    const itemSalesMap = new Map<
      string,
      { productId: string; name: string; quantity: number; revenue: number }
    >();

    for (const inv of invoices) {
      const finalAmt = Number(inv.finalAmount);
      totalRevenue += finalAmt;
      totalDiscount += Number(inv.discountAmount);
      totalTax += Number(inv.taxAmount);
      totalSubtotal += Number(inv.subtotal);

      if (paymentBreakdown[inv.paymentMethod] !== undefined) {
        paymentBreakdown[inv.paymentMethod] += finalAmt;
      }

      // Thống kê món bán chạy
      for (const order of inv.orderSession.orders) {
        for (const item of order.items) {
          const prodId = item.productId;
          const prodName = item.product.name;
          const itemRev = Number(item.price) * item.quantity;

          if (itemSalesMap.has(prodId)) {
            const current = itemSalesMap.get(prodId)!;
            current.quantity += item.quantity;
            current.revenue += itemRev;
          } else {
            itemSalesMap.set(prodId, {
              productId: prodId,
              name: prodName,
              quantity: item.quantity,
              revenue: itemRev,
            });
          }
        }
      }
    }

    const topSellingItems = Array.from(itemSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const totalInvoices = invoices.length;
    const averageOrderValue =
      totalInvoices > 0 ? Math.round(totalRevenue / totalInvoices) : 0;

    return {
      branchId,
      branchName: branch.name,
      reportDate: startOfDay.toISOString().split('T')[0],
      totalRevenue,
      totalInvoices,
      averageOrderValue,
      totalSubtotal,
      totalDiscount,
      totalTax,
      paymentBreakdown,
      topSellingItems,
    };
  }
}

