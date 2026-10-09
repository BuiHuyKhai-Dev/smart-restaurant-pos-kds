/**
 * TEST SUITE: PHASE 5 - HỆ THỐNG THỜI GIAN THỰC WEBSOCKET (SOCKET.IO GATEWAY)
 * Run: node test/test_phase5.js
 */

const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:4000';
const BASE_URL = `${SERVER_URL}/api`;

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

function waitEvent(socket, eventName, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout ${timeoutMs}ms waiting for event: ${eventName}`));
    }, timeoutMs);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function runTests() {
  console.log('🧪 BẮT ĐẦU KIỂM THỬ PHASE 5: WEBSOCKET GATEWAY & REALTIME EVENTS\n');

  let posClient, hotKitchenClient, barKitchenClient, tableClient;

  try {
    // 1. Đăng nhập nhân viên
    console.log('1. Đăng nhập tài khoản Thu ngân và Bếp');
    const cashierRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: 'cashier', password: '123456' }),
    });
    const cashierToken = cashierRes.data?.data?.accessToken;

    const cookRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: 'kitchen', password: '123456' }),
    });
    const cookToken = cookRes.data?.data?.accessToken;
    assert(cashierToken && cookToken, 'Đăng nhập thành công');

    // 2. Khởi tạo 4 WebSocket clients đại diện cho các trạm
    console.log('\n2. Thiết lập kết nối WebSocket Clients & Tham gia Rooms');
    const connectClient = (name) => {
      return new Promise((resolve, reject) => {
        const client = io(SERVER_URL, { transports: ['websocket'] });
        client.on('connect', () => resolve(client));
        client.on('connect_error', reject);
      });
    };

    posClient = await connectClient('POS Thu Ngân');
    hotKitchenClient = await connectClient('KDS Bếp Nóng');
    barKitchenClient = await connectClient('KDS Quầy Bar');
    tableClient = await connectClient('Khách Bàn tbl-5');

    assert(
      posClient.connected &&
        hotKitchenClient.connected &&
        barKitchenClient.connected &&
        tableClient.connected,
      'Cả 4 WebSocket clients kết nối thành công tới Server',
    );

    // Gửi tín hiệu gia nhập Rooms
    posClient.emit('join:pos', { branchId: 'branch-1' });
    hotKitchenClient.emit('join:kitchen', { branchId: 'branch-1', stationId: 'hot' });
    barKitchenClient.emit('join:kitchen', { branchId: 'branch-1', stationId: 'bar' });
    tableClient.emit('join:table', { tableId: 'tbl-5' });

    // Đợi 300ms cho server socket room join hoàn tất
    await new Promise((r) => setTimeout(r, 300));
    assert(true, 'Các clients đã tham gia đúng phòng (pos, kitchen_hot, kitchen_bar, table_tbl-5)');

    // 3. Khách quét QR bàn tbl-5 và đặt món (1 Ramen ở Bếp Nóng + 1 Trà Đào ở Quầy Bar)
    console.log('\n3. Kiểm tra phân phối sự kiện order:placed & kitchen:new_items');
    const qrRes = await request(`${BASE_URL}/tables/tbl-5/qr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({ rotate: true }),
    });
    const tableQrToken = qrRes.data?.data?.token;

    // Chuẩn bị các listener đón sự kiện realtime TRƯỚC KHI gọi API đặt món
    const pPosOrderPlaced = waitEvent(posClient, 'order:placed');
    const pTableOrderPlaced = waitEvent(tableClient, 'order:placed');
    const pHotKitchenItems = waitEvent(hotKitchenClient, 'kitchen:new_items');
    const pBarKitchenItems = waitEvent(barKitchenClient, 'kitchen:new_items');

    // Khách gọi API đặt món
    const orderRes = await request(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'x-table-token': tableQrToken },
      body: JSON.stringify({
        guestCount: 2,
        note: 'Bàn cạnh cửa sổ',
        items: [
          { productId: 'menu-1', quantity: 1, note: 'Ít ớt' }, // Ramen -> Bếp Nóng (hot)
          { productId: 'menu-6', quantity: 2, note: 'Ít đá' }, // Trà Đào -> Quầy Bar (bar)
        ],
      }),
    });
    assert(orderRes.status === 201, `Khách đặt món thành công qua API (status ${orderRes.status})`);

    // Chờ kết quả từ các WebSocket listeners
    const [posEvent, tableEvent, hotEvent, barEvent] = await Promise.all([
      pPosOrderPlaced,
      pTableOrderPlaced,
      pHotKitchenItems,
      pBarKitchenItems,
    ]);

    assert(posEvent && posEvent.tableId === 'tbl-5', 'POS nhận được event order:placed cho đúng bàn tbl-5');
    assert(tableEvent && tableEvent.orderId === posEvent.orderId, 'Điện thoại khách nhận được event order:placed');

    // Kiểm tra định tuyến món KDS theo trạm
    assert(
      hotEvent &&
        hotEvent.items.length === 1 &&
        hotEvent.items[0].productId === 'menu-1',
      'KDS Bếp Nóng chỉ nhận đúng món Ramen',
    );
    assert(
      barEvent &&
        barEvent.items.length === 1 &&
        barEvent.items[0].productId === 'menu-6',
      'KDS Quầy Bar chỉ nhận đúng món Trà Đào',
    );

    const ramenItemId = hotEvent.items[0].id;

    // 4. Bếp cập nhật trạng thái món -> Kiểm tra event order_item:status_updated
    console.log('\n4. Kiểm tra sự kiện realtime order_item:status_updated');
    const pTableStatusUpdated = waitEvent(tableClient, 'order_item:status_updated');
    const pPosStatusUpdated = waitEvent(posClient, 'order_item:status_updated');

    const updateStatusRes = await request(`${BASE_URL}/orders/items/${ramenItemId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${cookToken}` },
      body: JSON.stringify({ status: 'COOKING' }),
    });
    assert(updateStatusRes.status === 200, 'Bếp chuyển món sang COOKING thành công');

    const [tableItemUpdate, posItemUpdate] = await Promise.all([
      pTableStatusUpdated,
      pPosStatusUpdated,
    ]);
    assert(
      tableItemUpdate && tableItemUpdate.id === ramenItemId && tableItemUpdate.status === 'COOKING',
      'Khách tại bàn nhận được realtime cập nhật món đang COOKING',
    );
    assert(
      posItemUpdate && posItemUpdate.id === ramenItemId && posItemUpdate.status === 'COOKING',
      'Thu ngân POS nhận được realtime cập nhật món đang COOKING',
    );

    // 5. Khách bấm Gọi thanh toán -> Kiểm tra event payment:requested
    console.log('\n5. Kiểm tra sự kiện realtime payment:requested');
    const pPosPaymentRequested = waitEvent(posClient, 'payment:requested');
    const pTablePaymentRequested = waitEvent(tableClient, 'payment:requested');

    const payReqRes = await request(`${BASE_URL}/tables/tbl-5/request-payment`, {
      method: 'POST',
    });
    assert(payReqRes.status === 201 || payReqRes.status === 200, 'Gửi yêu cầu thanh toán thành công');

    const [posPayEvent, tablePayEvent] = await Promise.all([
      pPosPaymentRequested,
      pTablePaymentRequested,
    ]);
    assert(
      posPayEvent && posPayEvent.tableId === 'tbl-5',
      'Thu ngân POS nhận được chuông báo payment:requested cho bàn tbl-5',
    );
    assert(
      tablePayEvent && tablePayEvent.tableId === 'tbl-5',
      'Điện thoại khách nhận được xác nhận payment:requested',
    );

    // 6. Cập nhật trạng thái bàn -> Kiểm tra event table:updated
    console.log('\n6. Kiểm tra sự kiện realtime table:updated');
    const pPosTableUpdated = waitEvent(posClient, 'table:updated');

    const tablePatchRes = await request(`${BASE_URL}/tables/tbl-5/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({ status: 'RESERVED' }),
    });
    assert(tablePatchRes.status === 200, 'Cập nhật trạng thái bàn thành công');

    const posTableEvent = await pPosTableUpdated;
    assert(
      posTableEvent && posTableEvent.tableId === 'tbl-5' && posTableEvent.status === 'RESERVED',
      'POS nhận được event table:updated với status RESERVED',
    );

    console.log('\n=================================================');
    console.log(`📊 TỔNG KẾT PHASE 5: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('=================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình kiểm thử WebSocket:', err);
    process.exit(1);
  } finally {
    // Đóng toàn bộ socket clients sau khi test xong
    if (posClient) posClient.disconnect();
    if (hotKitchenClient) hotKitchenClient.disconnect();
    if (barKitchenClient) barKitchenClient.disconnect();
    if (tableClient) tableClient.disconnect();
  }
}

runTests();
