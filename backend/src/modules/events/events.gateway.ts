import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Client disconnected: ${client.id}`);
  }

  // ==========================================
  // ĐĂNG KÝ VÀ RỜI PHÒNG (ROOM MANAGEMENT)
  // ==========================================

  @SubscribeMessage('join:branch')
  handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    if (data?.branchId) {
      const room = `branch_${data.branchId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined ${room}`);
      return { success: true, room };
    }
    return { success: false, message: 'Missing branchId' };
  }

  @SubscribeMessage('join:pos')
  handleJoinPos(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    if (data?.branchId) {
      const room = `pos_${data.branchId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined POS room ${room}`);
      return { success: true, room };
    }
    return { success: false, message: 'Missing branchId' };
  }

  @SubscribeMessage('join:kitchen')
  handleJoinKitchen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string; stationId: string },
  ) {
    if (data?.branchId && data?.stationId) {
      const room = `kitchen_${data.branchId}_${data.stationId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined Kitchen room ${room}`);
      return { success: true, room };
    }
    return { success: false, message: 'Missing branchId or stationId' };
  }

  @SubscribeMessage('join:table')
  handleJoinTable(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    if (data?.tableId) {
      const room = `table_${data.tableId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined Table room ${room}`);
      return { success: true, room };
    }
    return { success: false, message: 'Missing tableId' };
  }

  // ==========================================
  // SERVER EMITTERS (PHÁT SỰ KIỆN TỚI CÁC PHÒNG)
  // ==========================================

  /** Phát sự kiện khi có đơn gọi món mới */
  emitOrderPlaced(payload: {
    branchId: string;
    tableId: string;
    tableNumber: string;
    orderId: string;
    orderCode: string;
    order: any;
  }) {
    const { branchId, tableId, order } = payload;
    this.logger.log(`📢 emitOrderPlaced -> Table: ${tableId}, Order: ${payload.orderCode}, Branch: ${branchId}`);

    // 1. Gửi tới POS quầy thu ngân
    this.server.to(`pos_${branchId}`).emit('order:placed', payload);

    // 2. Gửi tới kênh chung toàn chi nhánh
    this.server.to(`branch_${branchId}`).emit('order:placed', payload);

    // 3. Gửi tới điện thoại khách tại bàn
    this.server.to(`table_${tableId}`).emit('order:placed', payload);

    // 4. Phân luồng từng món tới đúng trạm bếp liên quan
    if (order?.items && Array.isArray(order.items)) {
      const itemsByStation = new Map<string, any[]>();
      for (const item of order.items) {
        const stationId = item.kitchenStationId || item.kitchenStation?.id;
        if (stationId) {
          if (!itemsByStation.has(stationId)) {
            itemsByStation.set(stationId, []);
          }
          itemsByStation.get(stationId)!.push(item);
        }
      }

      for (const [stationId, items] of itemsByStation.entries()) {
        this.server
          .to(`kitchen_${branchId}_${stationId}`)
          .emit('kitchen:new_items', {
            tableId,
            tableNumber: payload.tableNumber,
            orderId: payload.orderId,
            orderCode: payload.orderCode,
            items,
          });
      }
    }
  }

  /** Phát sự kiện khi Bếp cập nhật trạng thái món ăn */
  emitOrderItemStatusUpdated(payload: {
    branchId: string;
    tableId: string;
    stationId: string;
    item: any;
  }) {
    const { branchId, tableId, stationId, item } = payload;

    // 1. Gửi tới điện thoại khách tại bàn
    this.server.to(`table_${tableId}`).emit('order_item:status_updated', item);

    // 2. Gửi tới POS
    this.server.to(`pos_${branchId}`).emit('order_item:status_updated', item);

    // 3. Gửi tới Bếp trạm phụ trách
    this.server
      .to(`kitchen_${branchId}_${stationId}`)
      .emit('order_item:status_updated', item);
  }

  /** Phát sự kiện khi khách bấm Gọi thanh toán tại bàn */
  emitPaymentRequested(payload: {
    branchId: string;
    tableId: string;
    tableNumber: string;
    orderSessionId: string;
    requestedAt: Date;
  }) {
    const { branchId, tableId } = payload;

    // Bắn chuông báo quầy thu ngân POS
    this.server.to(`pos_${branchId}`).emit('payment:requested', payload);
    this.server.to(`table_${tableId}`).emit('payment:requested', payload);
  }

  /** Phát cảnh báo nguyên liệu chạm ngưỡng đỏ/vàng an toàn */
  emitLowStockAlert(payload: {
    branchId: string;
    ingredientId: string;
    ingredientName: string;
    currentStock: number;
    minSafetyStock: number;
    unit: string;
  }) {
    const { branchId } = payload;
    this.server.to(`pos_${branchId}`).emit('inventory:low_stock', payload);
    this.server.to(`branch_${branchId}`).emit('inventory:low_stock', payload);
  }

  /** Phát sự kiện thay đổi trạng thái bàn (chuyển bàn, gộp bàn, cập nhật status) */
  emitTableUpdated(payload: {
    branchId: string;
    tableId: string;
    status: string;
    table?: any;
  }) {
    const { branchId, tableId } = payload;
    this.server.to(`pos_${branchId}`).emit('table:updated', payload);
    this.server.to(`branch_${branchId}`).emit('table:updated', payload);
    this.server.to(`table_${tableId}`).emit('table:updated', payload);
  }
}

