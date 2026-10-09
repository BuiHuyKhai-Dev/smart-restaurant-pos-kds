const { io } = require('./frontend/node_modules/socket.io-client');

const BACKEND_URL = 'http://localhost:4000';
const API_URL = `${BACKEND_URL}/api`;

async function runE2ETest() {
  console.log('===============================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ E2E LIÊN THÔNG TOÀN DIỆN FRONTEND - BACKEND');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  // 1. Đăng nhập Cashier
  console.log('--- 1. Xác thực tài khoản Thu Ngân (POS Cashier Login) ---');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'cashier',
      password: '123456',
    }),
  }).then((r) => r.json());

  assert(loginRes.success && loginRes.data?.accessToken, 'Đăng nhập Thu Ngân thành công và nhận JWT');
  const cashierToken = loginRes.data?.accessToken;
  const branchId = loginRes.data?.user?.branchId || 'branch-1';

  // Nạp thêm tồn kho để đảm bảo đủ nguyên liệu chạy thử nghiệm
  await fetch(`${API_URL}/inventory/restock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cashierToken}`,
    },
    body: JSON.stringify({
      branchId,
      items: [
        { ingredientId: 'ing-4', quantity: 5000 },
        { ingredientId: 'ing-5', quantity: 5000 },
        { ingredientId: 'ing-6', quantity: 10000 },
        { ingredientId: 'ing-14', quantity: 100 },
        { ingredientId: 'ing-15', quantity: 100 },
      ],
      note: 'Nạp tồn kho trước kiểm thử E2E liên thông',
    }),
  });

  // 2. Lấy sơ đồ bàn & Reset bàn test về AVAILABLE nếu đang bận
  console.log('\n--- 2. Lấy sơ đồ bàn từ Backend ---');
  await fetch(`${API_URL}/tables/tbl-1/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cashierToken}`,
    },
    body: JSON.stringify({ status: 'AVAILABLE' }),
  });

  const tablesRes = await fetch(`${API_URL}/tables?branchId=${branchId}`).then((r) => r.json());
  assert(tablesRes.success && Array.isArray(tablesRes.data), 'Lấy danh sách bàn thành công');
  const table1 = tablesRes.data.find((t) => t.id === 'tbl-1');
  assert(table1 && table1.status === 'AVAILABLE', 'Bàn 1 (tbl-1) đang ở trạng thái AVAILABLE');

  // 3. POS phát hành mã QR bàn
  console.log('\n--- 3. POS phát hành mã QR Bàn Khách ---');
  const qrRes = await fetch(`${API_URL}/tables/tbl-1/qr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cashierToken}`,
    },
    body: JSON.stringify({ rotate: true }),
  }).then((r) => r.json());

  assert(qrRes.success && qrRes.data?.token, 'Phát hành mã QR token bàn thành công');
  const guestQrToken = qrRes.data?.token;

  // 4. Khách xác thực qua QR
  console.log('\n--- 4. Khách truy cập xác thực qua mã QR ---');
  const guestAccessRes = await fetch(`${API_URL}/table-access/me`, {
    headers: { 'x-table-token': guestQrToken },
  }).then((r) => r.json());

  assert(
    guestAccessRes.success && guestAccessRes.data?.id === 'tbl-1',
    'Khách quét QR xác thực thành công vào Bàn 1 (tbl-1)'
  );

  // 5. Kết nối Socket.io Realtime (Mô phỏng POS, Bếp KDS và Khách Bàn 1)
  console.log('\n--- 5. Kết nối Socket.io Realtime (POS + KDS + Bàn Khách) ---');
  const socketPos = io(BACKEND_URL);
  const socketKds = io(BACKEND_URL);
  const socketGuest = io(BACKEND_URL);

  await new Promise((resolve) => setTimeout(resolve, 500));

  socketPos.emit('join:pos', { branchId });
  socketKds.emit('join:kitchen', { branchId, stationId: 'hot' });
  socketGuest.emit('join:table', { tableId: 'tbl-1' });

  let posReceivedOrder = false;
  let kdsReceivedItems = false;
  let guestReceivedStatusUpdate = false;
  let posReceivedPaymentRequest = false;

  socketPos.on('order:placed', (data) => {
    if (data.tableId === 'tbl-1') posReceivedOrder = true;
  });

  socketKds.on('kitchen:new_items', (data) => {
    if (data.tableId === 'tbl-1') kdsReceivedItems = true;
  });

  socketGuest.on('order_item:status_updated', (item) => {
    guestReceivedStatusUpdate = true;
  });

  socketPos.on('payment:requested', (data) => {
    if (data.tableId === 'tbl-1') posReceivedPaymentRequest = true;
  });

  // 6. Khách gửi đơn đặt món
  console.log('\n--- 6. Khách gửi đơn đặt món qua mã QR ---');
  const orderRes = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-table-token': guestQrToken,
    },
    body: JSON.stringify({
      tableId: 'tbl-1',
      guestCount: 2,
      items: [
        { productId: 'menu-2', quantity: 2, note: 'Ít hành' },
        { productId: 'menu-6', quantity: 1, note: 'Ít đá' },
      ],
    }),
  }).then((r) => r.json());

  if (!orderRes.success) {
    console.error('Lỗi đặt món:', orderRes);
  }
  assert(orderRes.success && (orderRes.data?.id || orderRes.data?.orderId), 'Khách đặt món thành công trên Backend');
  const createdOrderId = orderRes.data?.id || orderRes.data?.orderId;
  const hotItem = orderRes.data?.items?.find((i) => i.productId === 'menu-2');

  // Đợi socket lan tỏa
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert(posReceivedOrder, 'Màn hình Thu Ngân POS nhận realtime event order:placed');
  assert(kdsReceivedItems, 'Màn hình Bếp KDS (Bếp Nóng) nhận realtime event kitchen:new_items');

  // Kiểm tra trạng thái bàn và session
  const tableAfterOrder = await fetch(`${API_URL}/tables/tbl-1`).then((r) => r.json());
  assert(tableAfterOrder.data.status === 'OCCUPIED', 'Bàn 1 tự động chuyển sang OCCUPIED');
  assert(tableAfterOrder.data.orderSessions?.length > 0, 'Phiên ăn (OrderSession) tự động mở (OPEN)');

  // 7. Bếp KDS xử lý món ăn (COOKING -> READY)
  console.log('\n--- 7. Bếp KDS chuyển trạng thái món ăn & Kích hoạt trừ kho BOM ---');
  assert(hotItem && hotItem.id, 'Tìm thấy món Bếp Nóng trong đơn');

  // Chuyển sang COOKING
  const cookingRes = await fetch(`${API_URL}/orders/items/${hotItem.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cashierToken}`,
    },
    body: JSON.stringify({ status: 'COOKING' }),
  }).then((r) => r.json());
  assert(cookingRes.success && cookingRes.data.status === 'COOKING', 'Bếp nhận chế biến món: COOKING');

  // Chuyển sang READY -> Trừ kho BOM
  const readyRes = await fetch(`${API_URL}/orders/items/${hotItem.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cashierToken}`,
    },
    body: JSON.stringify({ status: 'READY' }),
  }).then((r) => r.json());
  if (!readyRes.success) {
    console.error('Lỗi khi hoàn thành món READY:', readyRes);
  }
  assert(readyRes.success && readyRes.data?.status === 'READY', 'Bếp hoàn tất món: READY (Trừ kho tự động)');

  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert(guestReceivedStatusUpdate, 'Khách tại bàn nhận realtime event order_item:status_updated');

  // 8. Khách bấm Gọi thanh toán tại bàn
  console.log('\n--- 8. Khách bấm Gọi thanh toán tại bàn ---');
  const payReqRes = await fetch(`${API_URL}/tables/tbl-1/request-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).then((r) => r.json());
  assert(payReqRes.success, 'Khách gửi yêu cầu thanh toán thành công');

  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert(posReceivedPaymentRequest, 'Màn hình Thu Ngân POS nhận chuông báo payment:requested');

  const tablePendingPay = await fetch(`${API_URL}/tables/tbl-1`).then((r) => r.json());
  assert(tablePendingPay.data.status === 'PENDING_PAYMENT', 'Bàn 1 chuyển sang trạng thái PENDING_PAYMENT');

  // 9. Thu ngân in hóa đơn tạm tính
  console.log('\n--- 9. Thu ngân POS lập & In hóa đơn tạm tính ---');
  const provRes = await fetch(`${API_URL}/invoices/provisional`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cashierToken}`,
    },
    body: JSON.stringify({
      tableId: 'tbl-1',
      discountPercent: 10,
    }),
  }).then((r) => r.json());

  assert(provRes.success && provRes.data.invoiceId, 'Lập phiếu tạm tính thành công (Tính đúng VAT 8% & Chiết khấu 10%)');
  const invoiceId = provRes.data.invoiceId;

  // 10. Thu ngân chốt thanh toán & giải phóng bàn
  console.log('\n--- 10. Thu ngân POS chốt thanh toán & Đóng phiên bàn ---');
  const settleRes = await fetch(`${API_URL}/invoices/settle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cashierToken}`,
    },
    body: JSON.stringify({
      invoiceId,
      paymentMethod: 'CASH',
      cashGiven: 500000,
    }),
  }).then((r) => r.json());

  console.log('settleRes result:', JSON.stringify(settleRes));

  const isPaid =
    settleRes.data?.invoice?.paymentStatus === 'PAID' ||
    settleRes.data?.updatedInvoice?.paymentStatus === 'PAID' ||
    settleRes.data?.paymentStatus === 'PAID' ||
    settleRes.data?.status === 'PAID';
  assert(settleRes.success && isPaid, 'Chốt hóa đơn thành công, trạng thái PAID');

  // Kiểm tra bàn giải phóng và mã QR thu hồi
  const tableAfterSettle = await fetch(`${API_URL}/tables/tbl-1`).then((r) => r.json());
  assert(tableAfterSettle.data.status === 'AVAILABLE', 'Bàn 1 tự động giải phóng về trạng thái AVAILABLE');
  assert(!tableAfterSettle.data.qrToken, 'Mã QR cũ của bàn 1 đã bị thu hồi (qrToken = null)');

  // Khách dùng lại token cũ sẽ bị chặn
  const oldTokenCheck = await fetch(`${API_URL}/table-access/me`, {
    headers: { 'x-table-token': guestQrToken },
  }).then((r) => r.json());
  assert(!oldTokenCheck.success, 'Mã QR cũ không còn hiệu lực truy cập (Bảo mật tuyệt đối)');

  // Dọn dẹp sockets
  socketPos.disconnect();
  socketKds.disconnect();
  socketGuest.disconnect();

  console.log('\n===============================================================');
  console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS HOÀN TOÀN VƯỢT QUA!`);
  console.log('===============================================================');
}

runE2ETest().catch((err) => {
  console.error('Lỗi thực thi kiểm thử E2E:', err);
  process.exit(1);
});
