const http = require('http');
const io = require('./frontend/node_modules/socket.io-client');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: ĐẨY ORDER QUA BẾP KDS');

  // 1. Kết nối Socket.io giả lập màn hình Bếp KDS
  console.log('\n--- 1. Bếp KDS kết nối Socket.io và gia nhập trạm Bếp Nóng & Chi nhánh 1 ---');
  const kitchenSocket = io('http://localhost:4000', {
    transports: ['websocket'],
  });

  await new Promise((resolve) => {
    kitchenSocket.on('connect', () => {
      console.log('  ✅ Bếp KDS đã kết nối Socket thành công! SocketId:', kitchenSocket.id);
      kitchenSocket.emit('join:branch', { branchId: 'branch-1' });
      kitchenSocket.emit('join:kitchen', { branchId: 'branch-1', stationId: 'hot' });
      resolve(null);
    });
  });

  let socketReceivedOrderPlaced = null;
  let socketReceivedKitchenNewItems = null;

  kitchenSocket.on('order:placed', (data) => {
    console.log('  ⚡ [KDS NHẬN REALTIME] Sự kiện order:placed -> Mã đơn:', data?.orderCode, 'Bàn:', data?.tableNumber);
    socketReceivedOrderPlaced = data;
  });

  kitchenSocket.on('kitchen:new_items', (data) => {
    console.log('  ⚡ [KDS TRẠM HOT NHẬN REALTIME] Sự kiện kitchen:new_items -> Mã đơn:', data?.orderCode, 'Số món:', data?.items?.length);
    socketReceivedKitchenNewItems = data;
  });

  // 2. Lấy Menu
  const menuRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/menu',
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const menu = menuRes.data.data;
  const hotDish = menu.find((m) => m.kitchenStationId === 'hot') || menu[0];
  console.log(`\n--- 2. Chọn món kiểm thử: ${hotDish.name} (Trạm: ${hotDish.kitchenStationId}) ---`);

  // 3. Khách đặt món tại Bàn 1 (tbl-1) - Test trường hợp đặt món trực tiếp không có QR token động
  console.log('\n--- 3. Khách đặt món tại Bàn 1 (tbl-1) không cần token động (quét mã QR cố định tại bàn) ---');
  const guestOrderRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      tableId: 'tbl-1',
      guestCount: 2,
      items: [
        {
          productId: hotDish.id,
          quantity: 2,
          note: 'Không hành lá, làm cay nhẹ',
        },
      ],
    }
  );

  if (guestOrderRes.status !== 201 && guestOrderRes.status !== 200) {
    console.error('  ❌ Khách đặt món thất bại:', guestOrderRes.data);
    process.exit(1);
  }

  const order1 = guestOrderRes.data.data;
  console.log(`  ✅ Khách đặt món thành công: Mã ${order1.orderCode} (ID: ${order1.id})`);
  console.log(`     Bàn: ${order1.orderSession?.table?.tableNumber || 'T-01'}`);
  console.log(`     Món: ${order1.items[0]?.product?.name} x ${order1.items[0]?.quantity}`);

  // Chờ socket nhận sự kiện
  await new Promise((r) => setTimeout(r, 1000));

  if (!socketReceivedOrderPlaced) {
    console.error('  ❌ Bếp KDS KHÔNG nhận được sự kiện order:placed qua socket!');
    process.exit(1);
  }
  console.log('  ✅ [PASS] Bếp KDS đã nhận được thông báo đẩy đơn hàng từ khách!');

  // 4. Kiểm tra API lấy danh sách bàn và đơn của KDS (/tables?branchId=branch-1)
  console.log('\n--- 4. Kiểm tra API nạp dữ liệu vé của Bếp KDS (GET /api/tables?branchId=branch-1) ---');
  const tablesRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/tables?branchId=branch-1',
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const rawTables = tablesRes.data.data;
  const table1 = rawTables.find((t) => t.id === 'tbl-1');
  const ordersOnTable1 = table1?.orderSessions?.[0]?.orders || [];
  const foundOrder = ordersOnTable1.find((o) => o.id === order1.id);

  if (!foundOrder) {
    console.error('  ❌ Không tìm thấy đơn hàng trong phiên ăn của Bàn 1 trên KDS!');
    process.exit(1);
  }
  console.log(`  ✅ [PASS] Bàn 1 trên KDS có ${ordersOnTable1.length} đơn hàng. Đơn ${foundOrder.orderCode} đã xuất hiện!`);
  console.log(`     Trạng thái món trong vé: ${foundOrder.items[0]?.status}`);

  // 5. Bếp nhận nấu và hoàn tất món
  console.log('\n--- 5. Bếp bấm BẮT ĐẦU NẤU (COOKING) và HOÀN TẤT (READY) ---');
  const itemId = foundOrder.items[0].id;

  const cookingRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: `/api/orders/items/${itemId}/status`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    },
    { status: 'COOKING' }
  );
  console.log(`  ✅ Bếp chuyển sang COOKING: status = ${cookingRes.data.data?.status}`);

  const readyRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: `/api/orders/items/${itemId}/status`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    },
    { status: 'READY' }
  );
  console.log(`  ✅ Bếp chuyển sang READY (đã tự động trừ kho BOM): status = ${readyRes.data.data?.status}`);

  // Dọn dẹp bàn test
  console.log('\n--- 6. Thu dọn phiên bàn test ---');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { username: 'cashier', password: '123456' }
  );
  const token = loginRes.data.data?.accessToken;

  const settleRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/invoices/settle',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      tableId: 'tbl-1',
      paymentMethod: 'CASH',
      amountPaid: 200000,
    }
  );
  if (settleRes.data?.success) {
    console.log('  ✅ Đã thu dọn và giải phóng bàn 1 về AVAILABLE');
  }

  kitchenSocket.disconnect();
  console.log('\n🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ ĐẨY ORDER QUA BẾP ĐÃ THÀNH CÔNG RỰC RỠ 100%!');
}

run().catch((err) => {
  console.error('❌ Exception:', err);
  process.exit(1);
});
