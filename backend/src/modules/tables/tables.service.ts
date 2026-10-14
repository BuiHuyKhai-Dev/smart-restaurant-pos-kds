import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, SessionStatus, TableArea, TableStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth.interface';
import { TransferTableDto } from './dto/transfer-table.dto';
import { MergeTableDto } from './dto/merge-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async findAll(branchId?: string, area?: TableArea, status?: TableStatus) {
    return this.prisma.table.findMany({
      where: {
        branchId: branchId || undefined,
        area: area || undefined,
        status: status || undefined,
      },
      include: {
        orderSessions: {
          where: {
            status: { in: [SessionStatus.OPEN, SessionStatus.PAYMENT_PENDING] },
          },
          select: {
            id: true,
            guestCount: true,
            status: true,
            openedAt: true,
            paymentRequestedAt: true,
            orders: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                orderCode: true,
                createdAt: true,
                items: {
                  orderBy: { createdAt: 'asc' },
                  select: {
                    id: true,
                    productId: true,
                    kitchenStationId: true,
                    product: {
                      select: { name: true, kitchenStationId: true },
                    },
                    status: true,
                    quantity: true,
                    price: true,
                    note: true,
                    createdAt: true,
                    startedAt: true,
                    completedAt: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { tableNumber: 'asc' },
    });
  }

  async findOne(id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: {
        branch: {
          select: { id: true, name: true, address: true, phoneNumber: true },
        },
        orderSessions: {
          where: {
            status: { in: [SessionStatus.OPEN, SessionStatus.PAYMENT_PENDING] },
          },
          include: {
            orders: {
              orderBy: { createdAt: 'asc' },
              include: {
                items: {
                  orderBy: { createdAt: 'asc' },
                  include: {
                    modifiers: {
                      include: {
                        itemModifier: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException(`Không tìm thấy bàn với ID ${id}`);
    }

    return table;
  }

  async transferTable(dto: TransferTableDto, user: AuthUser) {
    if (dto.fromTableId === dto.toTableId) {
      throw new BadRequestException('Bàn nguồn và bàn đích không được trùng nhau');
    }

    const [fromTable, toTable] = await Promise.all([
      this.prisma.table.findUnique({ where: { id: dto.fromTableId } }),
      this.prisma.table.findUnique({ where: { id: dto.toTableId } }),
    ]);

    if (!fromTable) throw new NotFoundException('Bàn nguồn không tồn tại');
    if (!toTable) throw new NotFoundException('Bàn đích không tồn tại');

    if (fromTable.branchId !== toTable.branchId) {
      throw new BadRequestException('Chỉ có thể chuyển bàn trong cùng một chi nhánh');
    }

    if (user.role !== Role.ADMIN && user.branchId !== fromTable.branchId) {
      throw new ForbiddenException('Bạn chỉ có quyền quản lý bàn trong chi nhánh của mình');
    }

    if (toTable.status !== TableStatus.AVAILABLE) {
      throw new BadRequestException(
        `Bàn đích (${toTable.tableNumber}) hiện không trống (Trạng thái: ${toTable.status})`,
      );
    }

    // Tìm phiên ăn đang hoạt động của bàn nguồn
    const activeSession = await this.prisma.orderSession.findFirst({
      where: {
        tableId: fromTable.id,
        status: { in: [SessionStatus.OPEN, SessionStatus.PAYMENT_PENDING] },
      },
    });

    if (!activeSession) {
      throw new BadRequestException(`Bàn nguồn (${fromTable.tableNumber}) hiện không có phiên ăn nào đang mở`);
    }

    // Thực hiện chuyển toàn bộ phiên ăn sang bàn đích trong 1 transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật OrderSession sang bàn đích
      const updatedSession = await tx.orderSession.update({
        where: { id: activeSession.id },
        data: { tableId: toTable.id },
      });

      // 2. Giải phóng bàn nguồn
      await tx.table.update({
        where: { id: fromTable.id },
        data: {
          status: TableStatus.AVAILABLE,
          seatedAt: null,
          lastOrderAt: null,
        },
      });

      // 3. Chuyển trạng thái bàn đích
      const targetTableStatus =
        activeSession.status === SessionStatus.PAYMENT_PENDING
          ? TableStatus.PENDING_PAYMENT
          : TableStatus.OCCUPIED;

      const updatedToTable = await tx.table.update({
        where: { id: toTable.id },
        data: {
          status: targetTableStatus,
          seatedAt: fromTable.seatedAt || activeSession.openedAt,
          lastOrderAt: fromTable.lastOrderAt,
        },
      });

      return {
        message: `Đã chuyển toàn bộ bàn ${fromTable.tableNumber} sang bàn ${toTable.tableNumber} thành công`,
        fromTableId: fromTable.id,
        toTable: updatedToTable,
        orderSession: updatedSession,
      };
    });
  }

  async mergeTable(dto: MergeTableDto, user: AuthUser) {
    if (dto.fromTableId === dto.toTableId) {
      throw new BadRequestException('Bàn nguồn và bàn đích gộp không được trùng nhau');
    }

    const [fromTable, toTable] = await Promise.all([
      this.prisma.table.findUnique({ where: { id: dto.fromTableId } }),
      this.prisma.table.findUnique({ where: { id: dto.toTableId } }),
    ]);

    if (!fromTable) throw new NotFoundException('Bàn nguồn không tồn tại');
    if (!toTable) throw new NotFoundException('Bàn đích không tồn tại');

    if (fromTable.branchId !== toTable.branchId) {
      throw new BadRequestException('Chỉ có thể gộp bàn trong cùng một chi nhánh');
    }

    if (user.role !== Role.ADMIN && user.branchId !== fromTable.branchId) {
      throw new ForbiddenException('Bạn chỉ có quyền quản lý bàn trong chi nhánh của mình');
    }

    const [fromSession, toSession] = await Promise.all([
      this.prisma.orderSession.findFirst({
        where: {
          tableId: fromTable.id,
          status: { in: [SessionStatus.OPEN, SessionStatus.PAYMENT_PENDING] },
        },
      }),
      this.prisma.orderSession.findFirst({
        where: {
          tableId: toTable.id,
          status: { in: [SessionStatus.OPEN, SessionStatus.PAYMENT_PENDING] },
        },
      }),
    ]);

    if (!fromSession) {
      throw new BadRequestException(`Bàn nguồn (${fromTable.tableNumber}) hiện không có khách để gộp`);
    }

    // Nếu bàn đích đang trống, chuyển đổi thành thao tác đổi bàn thông thường
    if (!toSession) {
      return this.transferTable(
        { fromTableId: dto.fromTableId, toTableId: dto.toTableId },
        user,
      );
    }

    // Nếu cả 2 bàn đều có phiên ăn, gộp toàn bộ orders từ fromSession sang toSession
    return this.prisma.$transaction(async (tx) => {
      // 1. Chuyển tất cả Orders từ fromSession sang toSession
      await tx.order.updateMany({
        where: { orderSessionId: fromSession.id },
        data: { orderSessionId: toSession.id },
      });

      // 2. Cập nhật số lượng khách và đóng fromSession
      await tx.orderSession.update({
        where: { id: toSession.id },
        data: {
          guestCount: toSession.guestCount + fromSession.guestCount,
        },
      });

      await tx.orderSession.update({
        where: { id: fromSession.id },
        data: {
          status: SessionStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      // 3. Giải phóng bàn nguồn
      await tx.table.update({
        where: { id: fromTable.id },
        data: {
          status: TableStatus.AVAILABLE,
          seatedAt: null,
          lastOrderAt: null,
        },
      });

      // 4. Cập nhật bàn đích
      const updatedToTable = await tx.table.update({
        where: { id: toTable.id },
        data: {
          status: TableStatus.OCCUPIED,
          lastOrderAt: new Date(),
        },
      });

      return {
        message: `Đã gộp thành công món ăn từ bàn ${fromTable.tableNumber} vào bàn ${toTable.tableNumber}`,
        fromTableId: fromTable.id,
        toTable: updatedToTable,
        targetSessionId: toSession.id,
      };
    });
  }

  async updateStatus(id: string, dto: UpdateTableStatusDto, user: AuthUser) {
    const table = await this.prisma.table.findUnique({ where: { id } });
    if (!table) throw new NotFoundException('Không tìm thấy bàn');

    if (user.role !== Role.ADMIN && user.branchId !== table.branchId) {
      throw new ForbiddenException('Bạn chỉ có quyền quản trị bàn thuộc chi nhánh mình');
    }

    const updated = await this.prisma.table.update({
      where: { id },
      data: {
        status: dto.status,
        seatedAt: dto.status === TableStatus.OCCUPIED ? table.seatedAt || new Date() : undefined,
      },
    });

    this.eventsGateway.emitTableUpdated({
      branchId: table.branchId,
      tableId: table.id,
      status: updated.status,
      table: updated,
    });

    return updated;
  }

  async requestPayment(tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: {
        orderSessions: {
          where: { status: { in: [SessionStatus.OPEN, SessionStatus.PAYMENT_PENDING] } },
          orderBy: { openedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!table) throw new NotFoundException('Không tìm thấy bàn');

    const session = table.orderSessions[0];
    const now = new Date();

    if (session) {
      await this.prisma.orderSession.update({
        where: { id: session.id },
        data: {
          status: SessionStatus.PAYMENT_PENDING,
          paymentRequestedAt: now,
        },
      });
    }

    const updatedTable = await this.prisma.table.update({
      where: { id: table.id },
      data: { status: TableStatus.PENDING_PAYMENT },
    });

    this.eventsGateway.emitPaymentRequested({
      branchId: table.branchId,
      tableId: table.id,
      tableNumber: table.tableNumber,
      orderSessionId: session ? session.id : '',
      requestedAt: now,
    });

    this.eventsGateway.emitTableUpdated({
      branchId: table.branchId,
      tableId: table.id,
      status: updatedTable.status,
      table: updatedTable,
    });

    return {
      success: true,
      message: `Đã gửi yêu cầu thanh toán cho bàn ${table.tableNumber}`,
      tableId: table.id,
      tableNumber: table.tableNumber,
      requestedAt: now,
    };
  }
}

