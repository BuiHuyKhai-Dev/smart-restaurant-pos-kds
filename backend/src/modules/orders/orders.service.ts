import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderItemStatus,
  Role,
  SessionStatus,
  TableStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth.interface';
import { PlaceOrderDto } from './dto/place-order.dto';
import { InventoryService } from '../inventory/inventory.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /** Khách tại bàn hoặc Thu ngân gọi món */
  async placeOrder(
    dto: PlaceOrderDto,
    tableId: string,
    caller?: { isGuest: boolean; user?: AuthUser },
  ) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: { branch: true },
    });

    if (!table) {
      throw new NotFoundException(`Bàn ăn với ID ${tableId} không tồn tại`);
    }

    if (!table.branch.isActive) {
      throw new BadRequestException('Chi nhánh hiện đang tạm dừng phục vụ');
    }

    // Nếu là nhân viên gọi món, kiểm tra quyền chi nhánh
    if (caller && !caller.isGuest && caller.user) {
      if (caller.user.role !== Role.ADMIN && caller.user.branchId !== table.branchId) {
        throw new ForbiddenException('Bạn chỉ có quyền đặt món cho bàn thuộc chi nhánh mình');
      }
    }

    // Xác thực danh sách món ăn và tùy chọn
    const productIds = Array.from(new Set(dto.items.map((i) => i.productId)));
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { kitchenStation: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of dto.items) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        throw new NotFoundException(`Món ăn với ID ${item.productId} không tồn tại`);
      }
      if (!prod.isAvailable) {
        throw new BadRequestException(`Món ăn "${prod.name}" hiện đang tạm ngưng phục vụ`);
      }
    }

    // Lấy toàn bộ ItemModifiers nếu có
    const allModifierIds = dto.items.flatMap((i) => i.modifierIds || []);
    const modifiers = allModifierIds.length > 0
      ? await this.prisma.itemModifier.findMany({
          where: { id: { in: allModifierIds } },
        })
      : [];
    const modifierMap = new Map(modifiers.map((m) => [m.id, m]));

    const now = new Date();
    const orderCode = `ORD-${Math.floor(100 + Math.random() * 900)}`;

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // 1. Tìm hoặc Tự động mở phiên ăn mới (Theo quyết định thống nhất A3)
      let session = await tx.orderSession.findFirst({
        where: {
          tableId: table.id,
          status: { in: [SessionStatus.OPEN, SessionStatus.PAYMENT_PENDING] },
        },
      });

      if (!session) {
        session = await tx.orderSession.create({
          data: {
            tableId: table.id,
            branchId: table.branchId,
            guestCount: dto.guestCount || table.capacity || 2,
            status: SessionStatus.OPEN,
            openedAt: now,
          },
        });

        // Bàn chuyển sang OCCUPIED khi có khách mở phiên
        await tx.table.update({
          where: { id: table.id },
          data: {
            status: TableStatus.OCCUPIED,
            seatedAt: now,
            lastOrderAt: now,
          },
        });
      } else {
        // Cập nhật bàn đang có phiên ăn
        await tx.table.update({
          where: { id: table.id },
          data: {
            status: TableStatus.OCCUPIED,
            lastOrderAt: now,
          },
        });

        // Nếu khách từng bấm gọi thanh toán nhưng tiếp tục gọi món thêm (Round 2+)
        // Mở lại trạng thái OPEN và hủy cờ paymentRequestedAt
        if (session.status === SessionStatus.PAYMENT_PENDING) {
          session = await tx.orderSession.update({
            where: { id: session.id },
            data: {
              status: SessionStatus.OPEN,
              paymentRequestedAt: null,
            },
          });
        }
      }

      // 2. Tạo bản ghi Đơn hàng (Order)
      const order = await tx.order.create({
        data: {
          orderSessionId: session.id,
          orderCode,
          note: dto.note,
        },
      });

      // 3. Tạo các món ăn trong đơn (OrderItems) kèm Modifiers
      for (const item of dto.items) {
        const prod = productMap.get(item.productId)!;

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: prod.id,
            kitchenStationId: prod.kitchenStationId,
            price: prod.price,
            quantity: item.quantity,
            note: item.note,
            status: OrderItemStatus.PENDING,
          },
        });

        if (item.modifierIds && item.modifierIds.length > 0) {
          for (const modId of item.modifierIds) {
            const mod = modifierMap.get(modId);
            if (mod) {
              await tx.orderItemModifier.create({
                data: {
                  orderItemId: orderItem.id,
                  itemModifierId: mod.id,
                  extraPrice: mod.extraPrice,
                  quantity: 1,
                },
              });
            }
          }
        }
      }

      // 4. Trả về chi tiết đơn hàng vừa đặt
      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, pictureLink: true } },
              kitchenStation: { select: { id: true, name: true, color: true } },
              modifiers: {
                include: {
                  itemModifier: { select: { id: true, name: true, extraPrice: true } },
                },
              },
            },
          },
        },
      });
    });

    // Phát sự kiện realtime tới Bếp KDS, POS và Khách tại bàn
    this.eventsGateway.emitOrderPlaced({
      branchId: table.branchId,
      tableId: table.id,
      tableNumber: table.tableNumber,
      orderId: createdOrder!.id,
      orderCode: createdOrder!.orderCode,
      order: createdOrder,
    });

    return createdOrder;
  }

  /** Cập nhật trạng thái món ăn KDS (Pending -> Cooking -> Ready -> Served -> Cancelled) */
  async updateOrderItemStatus(
    itemId: string,
    status: OrderItemStatus,
    user?: AuthUser,
  ) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: {
          include: {
            orderSession: {
              include: { table: true },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Món ăn với ID ${itemId} không tồn tại`);
    }

    if (user && user.role !== Role.ADMIN) {
      const branchId = item.order.orderSession.table.branchId;
      if (user.branchId !== branchId) {
        throw new ForbiddenException('Bạn chỉ có quyền cập nhật món thuộc chi nhánh của mình');
      }
    }

    const now = new Date();
    const updateData: {
      status: OrderItemStatus;
      startedAt?: Date;
      completedAt?: Date;
      servedAt?: Date;
      cancelledAt?: Date;
    } = { status };

    if (status === OrderItemStatus.COOKING && !item.startedAt) {
      updateData.startedAt = now;
    } else if (status === OrderItemStatus.READY) {
      // Khi Bếp ấn READY -> Kích hoạt động cơ trừ kho định lượng BOM
      if (item.status !== OrderItemStatus.READY) {
        await this.inventoryService.deductInventoryForOrderItem(itemId);
      }
      updateData.completedAt = now;
      if (!item.startedAt) updateData.startedAt = now;
    } else if (status === OrderItemStatus.SERVED) {
      updateData.servedAt = now;
      if (!item.completedAt) updateData.completedAt = now;
    } else if (status === OrderItemStatus.CANCELLED) {
      updateData.cancelledAt = now;
    }

    const updatedItem = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        product: { select: { id: true, name: true } },
        kitchenStation: { select: { id: true, name: true, color: true } },
      },
    });

    // Phát sự kiện cập nhật trạng thái món tới Bếp, POS và Khách
    this.eventsGateway.emitOrderItemStatusUpdated({
      branchId: item.order.orderSession.table.branchId,
      tableId: item.order.orderSession.table.id,
      stationId: item.kitchenStationId,
      item: updatedItem,
    });

    return updatedItem;
  }

  /**
   * Hoàn tất toàn bộ vé order (Batch KDS Complete)
   * Trừ kho BOM toàn bộ các món trong 1 Transaction duy nhất và phát 1 sự kiện Batch.
   */
  async completeOrderTicket(
    orderId: string,
    stationId?: string,
    user?: AuthUser,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderSession: {
          include: { table: true },
        },
        items: {
          where: stationId
            ? { kitchenStationId: stationId }
            : undefined,
          include: {
            product: { select: { id: true, name: true } },
            kitchenStation: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Đơn hàng với ID ${orderId} không tồn tại`);
    }

    if (user && user.role !== Role.ADMIN) {
      const branchId = order.orderSession.table.branchId;
      if (user.branchId !== branchId) {
        throw new ForbiddenException('Bạn chỉ có quyền cập nhật đơn thuộc chi nhánh của mình');
      }
    }

    // Lọc ra các món chưa hoàn thành
    const itemsToComplete = order.items.filter(
      (it) =>
        it.status !== OrderItemStatus.READY &&
        it.status !== OrderItemStatus.SERVED &&
        it.status !== OrderItemStatus.CANCELLED,
    );

    if (itemsToComplete.length === 0) {
      return { success: true, message: 'Tất cả các món đã hoàn thành', items: order.items };
    }

    const itemIds = itemsToComplete.map((it) => it.id);

    // 1. Trừ kho BOM theo batch trong duy nhất 1 Transaction
    await this.inventoryService.deductInventoryForOrderItems(itemIds);

    // 2. Cập nhật trạng thái tất cả các món sang READY
    const now = new Date();
    await this.prisma.orderItem.updateMany({
      where: { id: { in: itemIds } },
      data: {
        status: OrderItemStatus.READY,
        completedAt: now,
      },
    });

    // Lấy lại danh sách món đã cập nhật
    const updatedItems = await this.prisma.orderItem.findMany({
      where: { id: { in: itemIds } },
      include: {
        product: { select: { id: true, name: true } },
        kitchenStation: { select: { id: true, name: true, color: true } },
      },
    });

    // 3. Phát sự kiện realtime
    const branchId = order.orderSession.table.branchId;
    const tableId = order.orderSession.table.id;

    // Phát batch event cho các client
    this.eventsGateway.emitOrderItemsBatchUpdated({
      branchId,
      tableId,
      orderId: order.id,
      items: updatedItems,
    });

    // Đồng thời phát lẻ để tương thích ngược 100%
    for (const item of updatedItems) {
      this.eventsGateway.emitOrderItemStatusUpdated({
        branchId,
        tableId,
        stationId: item.kitchenStationId,
        item,
      });
    }

    return {
      success: true,
      orderId: order.id,
      tableId,
      completedItems: updatedItems,
    };
  }

  /** Lấy danh sách các món cần chế biến trên màn hình Bếp KDS */
  async getKdsItems(
    branchId: string,
    stationId?: string,
    status?: OrderItemStatus,
  ) {
    return this.prisma.orderItem.findMany({
      where: {
        order: {
          orderSession: {
            branchId,
            status: { in: [SessionStatus.OPEN, SessionStatus.PAYMENT_PENDING] },
          },
        },
        kitchenStationId: stationId || undefined,
        status: status
          ? status
          : { in: [OrderItemStatus.PENDING, OrderItemStatus.COOKING, OrderItemStatus.READY] },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            pictureLink: true,
            standardPrepMinutes: true,
          },
        },
        kitchenStation: {
          select: { id: true, name: true, color: true, iconName: true },
        },
        modifiers: {
          include: {
            itemModifier: { select: { id: true, name: true, extraPrice: true } },
          },
        },
        order: {
          select: {
            id: true,
            orderCode: true,
            createdAt: true,
            orderSession: {
              select: {
                id: true,
                table: {
                  select: { id: true, tableNumber: true, displayName: true, area: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // Món đặt trước làm trước (FIFO)
    });
  }

  /** Lấy toàn bộ đơn và tính tiền tạm tính cho phiên ăn hiện tại của bàn */
  async getCurrentSessionByTable(tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: { branch: true },
    });

    if (!table) {
      throw new NotFoundException(`Bàn ăn với ID ${tableId} không tồn tại`);
    }

    const session = await this.prisma.orderSession.findFirst({
      where: {
        tableId: table.id,
        status: { in: [SessionStatus.OPEN, SessionStatus.PAYMENT_PENDING] },
      },
      include: {
        orders: {
          orderBy: { createdAt: 'asc' },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, pictureLink: true } },
                kitchenStation: { select: { id: true, name: true } },
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
      return {
        table,
        session: null,
        subtotal: 0,
        taxAmount: 0,
        finalAmount: 0,
        allItems: [],
      };
    }

    // Tính toán tài chính
    let subtotal = 0;
    const allItems: any[] = [];

    for (const order of session.orders) {
      for (const item of order.items) {
        if (item.status === OrderItemStatus.CANCELLED) continue;

        let itemPrice = Number(item.price);
        for (const mod of item.modifiers) {
          itemPrice += Number(mod.extraPrice);
        }

        const totalItemCost = itemPrice * item.quantity;
        subtotal += totalItemCost;

        allItems.push({
          id: item.id,
          orderId: order.id,
          orderCode: order.orderCode,
          productId: item.productId,
          productName: item.product.name,
          pictureLink: item.product.pictureLink,
          station: item.kitchenStation.name,
          unitPrice: itemPrice,
          quantity: item.quantity,
          totalPrice: totalItemCost,
          status: item.status,
          note: item.note,
          modifiers: item.modifiers.map((m) => m.itemModifier.name),
          orderedAt: item.createdAt,
          startedAt: item.startedAt,
          completedAt: item.completedAt,
          servedAt: item.servedAt,
        });
      }
    }

    const taxAmount = Math.round(subtotal * 0.08); // VAT 8%
    const finalAmount = subtotal + taxAmount;

    return {
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        displayName: table.displayName,
        area: table.area,
        status: table.status,
        branch: table.branch,
      },
      session: {
        id: session.id,
        status: session.status,
        guestCount: session.guestCount,
        openedAt: session.openedAt,
        paymentRequestedAt: session.paymentRequestedAt,
      },
      subtotal,
      taxPercent: 8,
      taxAmount,
      finalAmount,
      allItems,
    };
  }

  /** Khách hoặc Thu ngân bấm "Gọi thanh toán" */
  async requestPayment(tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) throw new NotFoundException('Không tìm thấy bàn');

    const session = await this.prisma.orderSession.findFirst({
      where: {
        tableId: table.id,
        status: { in: [SessionStatus.OPEN, SessionStatus.PAYMENT_PENDING] },
      },
    });

    if (!session) {
      throw new BadRequestException('Bàn hiện không có phiên ăn nào để yêu cầu thanh toán');
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.table.update({
        where: { id: table.id },
        data: { status: TableStatus.PENDING_PAYMENT },
      }),
      this.prisma.orderSession.update({
        where: { id: session.id },
        data: {
          status: SessionStatus.PAYMENT_PENDING,
          paymentRequestedAt: now,
        },
      }),
    ]);

    // Bắn chuông báo thu ngân và cập nhật bàn sang PENDING_PAYMENT
    this.eventsGateway.emitPaymentRequested({
      branchId: table.branchId,
      tableId: table.id,
      tableNumber: table.tableNumber,
      orderSessionId: session.id,
      requestedAt: now,
    });

    return {
      message: 'Đã gửi yêu cầu thanh toán tới quầy thu ngân',
      tableId: table.id,
      tableNumber: table.tableNumber,
      requestedAt: now,
    };
  }
}

