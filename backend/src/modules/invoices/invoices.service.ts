import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderItemStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
  SessionStatus,
  TableStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth.interface';
import { CreateProvisionalInvoiceDto } from './dto/create-provisional-invoice.dto';
import { SettleInvoiceDto } from './dto/settle-invoice.dto';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /** Tạo hoặc In lại phiếu tạm tính (Provisional Bill) cho bàn ăn */
  async createProvisionalInvoice(
    dto: CreateProvisionalInvoiceDto,
    user?: AuthUser,
  ) {
    const table = await this.prisma.table.findUnique({
      where: { id: dto.tableId },
      include: { branch: true },
    });

    if (!table) {
      throw new NotFoundException(`Bàn ăn với ID ${dto.tableId} không tồn tại`);
    }

    if (user && user.role !== Role.ADMIN && user.branchId !== table.branchId) {
      throw new ForbiddenException('Bạn chỉ có quyền in bill cho bàn thuộc chi nhánh mình');
    }

    // Tìm phiên ăn hiện hành
    const session = await this.prisma.orderSession.findFirst({
      where: {
        tableId: table.id,
        status: { in: [SessionStatus.OPEN, SessionStatus.PAYMENT_PENDING] },
      },
      include: {
        orders: {
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, price: true } },
                modifiers: {
                  include: {
                    itemModifier: { select: { id: true, name: true, extraPrice: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new BadRequestException('Bàn hiện không có phiên ăn nào đang hoạt động để in bill');
    }

    // Tổng hợp danh sách món và tính toán tài chính
    let subtotal = 0;
    const billItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      modifiers: string[];
    }> = [];

    for (const order of session.orders) {
      for (const item of order.items) {
        if (item.status === OrderItemStatus.CANCELLED) continue;

        let itemPrice = Number(item.price);
        const modNames: string[] = [];
        for (const mod of item.modifiers) {
          itemPrice += Number(mod.extraPrice);
          modNames.push(mod.itemModifier.name);
        }

        const totalPrice = itemPrice * item.quantity;
        subtotal += totalPrice;

        billItems.push({
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: itemPrice,
          totalPrice,
          modifiers: modNames,
        });
      }
    }

    if (subtotal === 0) {
      throw new BadRequestException('Phiên ăn chưa có món nào được đặt hoặc tất cả món đã bị hủy');
    }

    const discountPercent = dto.discountPercent || 0;
    const discountAmount = Math.round(subtotal * (discountPercent / 100));
    const taxableAmount = subtotal - discountAmount;
    const taxPercent = 8; // VAT 8% chuẩn dịch vụ F&B
    const taxAmount = Math.round(taxableAmount * (taxPercent / 100));
    const finalAmount = taxableAmount + taxAmount;

    const now = new Date();

    // Kiểm tra xem đã có bản ghi Invoice trước đó chưa
    const existingInvoice = await this.prisma.invoice.findUnique({
      where: { orderSessionId: session.id },
    });

    let invoice;
    if (existingInvoice) {
      invoice = await this.prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          subtotal,
          discountPercent,
          discountAmount,
          taxPercent,
          taxAmount,
          finalAmount,
          printedAt: now,
          printCount: { increment: 1 },
          accountId: user?.id || existingInvoice.accountId,
        },
        include: {
          branch: true,
          account: { select: { id: true, fullName: true, username: true } },
        },
      });
    } else {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const invoiceCode = `INV-${now.getFullYear()}-${randomSuffix}`;

      invoice = await this.prisma.invoice.create({
        data: {
          orderSessionId: session.id,
          branchId: table.branchId,
          accountId: user?.id,
          invoiceCode,
          subtotal,
          discountPercent,
          discountAmount,
          taxPercent,
          taxAmount,
          finalAmount,
          paymentStatus: PaymentStatus.PENDING,
          printedAt: now,
          printCount: 1,
        },
        include: {
          branch: true,
          account: { select: { id: true, fullName: true, username: true } },
        },
      });
    }

    return {
      invoiceId: invoice.id,
      invoiceCode: invoice.invoiceCode,
      tableNumber: table.tableNumber,
      tableName: table.displayName,
      branchName: table.branch.name,
      branchAddress: table.branch.address,
      branchPhone: table.branch.phoneNumber,
      cashierName: invoice.account?.fullName || user?.username || 'Thu Ngân',
      guestCount: session.guestCount,
      openedAt: session.openedAt,
      printedAt: invoice.printedAt,
      printCount: invoice.printCount,
      items: billItems,
      subtotal,
      discountPercent,
      discountAmount,
      taxPercent,
      taxAmount,
      finalAmount,
      paymentStatus: invoice.paymentStatus,
    };
  }

  /** Chốt hóa đơn thanh toán (Settlement) */
  async settleInvoice(dto: SettleInvoiceDto, user: AuthUser) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: {
        orderSession: {
          include: { table: true },
        },
        branch: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Hóa đơn với ID ${dto.invoiceId} không tồn tại`);
    }

    if (user.role !== Role.ADMIN && user.branchId !== invoice.branchId) {
      throw new ForbiddenException('Bạn chỉ có quyền chốt hóa đơn thuộc chi nhánh mình');
    }

    if (invoice.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Hóa đơn này đã được thanh toán trước đó');
    }

    const finalAmount = Number(invoice.finalAmount);
    let cashGiven: number | null = null;
    let changeDue: number | null = null;

    if (dto.paymentMethod === PaymentMethod.CASH) {
      cashGiven = dto.cashGiven !== undefined ? dto.cashGiven : finalAmount;
      if (cashGiven < finalAmount) {
        throw new BadRequestException(
          `Tiền khách đưa (${cashGiven.toLocaleString('vi-VN')}đ) không đủ để thanh toán hóa đơn (${finalAmount.toLocaleString('vi-VN')}đ)`,
        );
      }
      changeDue = cashGiven - finalAmount;
    }

    const now = new Date();
    const tableId = invoice.orderSession.tableId;

    // Database Transaction: Chốt invoice + Đóng session + Giải phóng bàn
    const settled = await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật hóa đơn
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: dto.paymentMethod,
          cashGiven,
          changeDue,
          paidAt: now,
          accountId: user.id,
        },
        include: {
          branch: true,
          account: { select: { id: true, fullName: true, username: true } },
        },
      });

      // 2. Đóng phiên ăn
      await tx.orderSession.update({
        where: { id: invoice.orderSessionId },
        data: {
          status: SessionStatus.CLOSED,
          closedAt: now,
        },
      });

      // 3. Giải phóng bàn ăn về AVAILABLE
      const releasedTable = await tx.table.update({
        where: { id: tableId },
        data: {
          status: TableStatus.AVAILABLE,
          seatedAt: null,
          lastOrderAt: null,
          qrToken: null, // Thu hồi mã QR cũ
        },
      });

      return { updatedInvoice, releasedTable };
    });

    // Phát sự kiện Realtime cập nhật bàn và báo thanh toán hoàn tất
    this.eventsGateway.emitTableUpdated({
      branchId: invoice.branchId,
      tableId,
      status: TableStatus.AVAILABLE,
      table: settled.releasedTable,
    });

    if (this.eventsGateway.server) {
      const paymentCompletedPayload = {
        invoiceId: settled.updatedInvoice.id,
        invoiceCode: settled.updatedInvoice.invoiceCode,
        tableId,
        tableNumber: invoice.orderSession.table.tableNumber,
        finalAmount,
        paymentMethod: dto.paymentMethod,
        paidAt: now,
        cashier: user.username,
      };

      this.eventsGateway.server
        .to(`pos_${invoice.branchId}`)
        .emit('payment:completed', paymentCompletedPayload);

      this.eventsGateway.server
        .to(`table_${tableId}`)
        .emit('payment:completed', paymentCompletedPayload);
    }

    const cashierName = settled.updatedInvoice.account?.fullName || user.username;

    return {
      success: true,
      message: 'Thanh toán và chốt hóa đơn thành công',
      invoice: {
        id: settled.updatedInvoice.id,
        invoiceCode: settled.updatedInvoice.invoiceCode,
        finalAmount,
        paymentMethod: dto.paymentMethod,
        cashGiven,
        changeDue,
        paidAt: now,
        paymentStatus: PaymentStatus.PAID,
        cashier: cashierName,
      },
      table: {
        id: tableId,
        tableNumber: invoice.orderSession.table.tableNumber,
        status: TableStatus.AVAILABLE,
      },
    };
  }

  /** Chi tiết 1 hóa đơn */
  async getInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        branch: true,
        account: { select: { id: true, fullName: true, username: true } },
        orderSession: {
          include: {
            table: true,
            orders: {
              include: {
                items: {
                  include: {
                    product: true,
                    modifiers: { include: { itemModifier: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Hóa đơn với ID ${id} không tồn tại`);
    }

    return invoice;
  }

  /** Danh sách hóa đơn theo chi nhánh */
  async getInvoices(branchId?: string, paymentStatus?: PaymentStatus, take = 50) {
    return this.prisma.invoice.findMany({
      where: {
        branchId: branchId || undefined,
        paymentStatus: paymentStatus || undefined,
      },
      include: {
        branch: { select: { id: true, name: true } },
        account: { select: { id: true, fullName: true, username: true } },
        orderSession: {
          select: {
            table: { select: { id: true, tableNumber: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
