// Test script verifying Phase 3 implementation end-to-end
const API_URL = 'http://localhost:4000/api';

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runTests() {
  console.log('🧪 BẮT ĐẦU KIỂM THỬ PHASE 3: ĐỘNG CƠ ĐẶT MÓN, PHIÊN ĂN & KDS\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Đăng nhập Thu ngân và Bếp
  const loginCashier = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'cashier', password: '123456' }),
  });
  const cashierToken = loginCashier.data?.data?.accessToken;

  const loginKitchen = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'kitchen', password: '123456' }),
  });
  const kitchenToken = loginKitchen.data?.data?.accessToken;

  // 2. Thu ngân cấp mã QR cho bàn tbl-1
  console.log('1. Cấp mã QR cho bàn tbl-1 để khách đặt món');
  const qrRes = await request('/tables/tbl-1/qr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ rotate: true }),
  });
  const tableToken = qrRes.data?.data?.token;
  assert(typeof tableToken === 'string', 'Cấp mã QR bàn thành công');

  // 3. Khách quét QR đặt món đợt 1
  console.log('\n2. Khách quét QR đặt món đợt 1 (1 Ramen + 1 Trà Đào kèm Topping)');
  const guestOrderRes = await request('/orders', {
    method: 'POST',
    headers: { 'x-table-token': tableToken },
    body: JSON.stringify({
      guestCount: 2,
      note: 'Cho ít ớt và nước dùng nóng',
      items: [
        {
          productId: 'menu-1', // Ramen Chashu (89k)
          quantity: 1,
          note: 'Không hành',
          modifierIds: ['top-egg'], // Thêm trứng (+15k)
        },
        {
          productId: 'menu-6', // Trà Đào (49k)
          quantity: 1,
          modifierIds: ['top-peach'], // Thêm đào miếng (+12k)
        },
      ],
    }),
  });

  assert(guestOrderRes.status === 201 || guestOrderRes.status === 200, `Đặt món đợt 1 thành công (status ${guestOrderRes.status})`);
  const firstOrder = guestOrderRes.data?.data;
  assert(firstOrder?.items?.length === 2, 'Đơn hàng có đủ 2 món');
  const ramenItem = firstOrder?.items?.find(i => i.productId === 'menu-1');
  const teaItem = firstOrder?.items?.find(i => i.productId === 'menu-6');
  assert(ramenItem?.kitchenStation?.id === 'hot', 'Món Ramen định tuyến đúng Bếp Nóng (hot)');
  assert(teaItem?.kitchenStation?.id === 'bar', 'Món Trà Đào định tuyến đúng Quầy Pha Chế (bar)');
  assert(ramenItem?.modifiers?.length === 1, 'Ramen có đúng 1 modifier đính kèm');

  // 4. Kiểm tra trạng thái bàn tbl-1 sau khi khách đặt món
  console.log('\n3. Kiểm tra bàn tbl-1 tự động chuyển sang OCCUPIED');
  const tableAfterOrder = await request('/tables/tbl-1');
  assert(tableAfterOrder.data?.data?.status === 'OCCUPIED', 'Bàn chuyển sang trạng thái OCCUPIED');
  assert(tableAfterOrder.data?.data?.orderSessions?.length === 1, 'Tự động mở 1 OrderSession');
  const sessionId = tableAfterOrder.data?.data?.orderSessions[0]?.id;

  // 5. Khách gọi thêm món đợt 2 (Cùng phiên ăn)
  console.log('\n4. Khách gọi thêm món đợt 2 (1 Phở Bò Tái Nạm)');
  const secondOrderRes = await request('/orders', {
    method: 'POST',
    headers: { 'x-table-token': tableToken },
    body: JSON.stringify({
      items: [
        {
          productId: 'menu-2', // Phở Bò (75k)
          quantity: 1,
        },
      ],
    }),
  });
  assert(secondOrderRes.status === 201 || secondOrderRes.status === 200, `Gọi thêm món đợt 2 thành công`);

  // Kiểm tra phiên ăn không bị tạo mới
  const tableAfterSecond = await request('/tables/tbl-1');
  assert(tableAfterSecond.data?.data?.orderSessions?.length === 1, 'Vẫn giữ đúng 1 OrderSession duy nhất');
  assert(tableAfterSecond.data?.data?.orderSessions[0]?.orders?.length === 2, 'Phiên ăn chứa đủ 2 đợt gọi món');

  // 6. Thu ngân POS gọi thêm món tại quầy cho bàn tbl-4 (Dùng Bearer JWT)
  console.log('\n5. Thu ngân POS gọi món tại quầy cho bàn tbl-4 (JWT Token)');
  const posOrderRes = await request('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({
      tableId: 'tbl-4',
      items: [
        {
          productId: 'menu-3', // Cơm Rang Hải Sản
          quantity: 2,
        },
      ],
    }),
  });
  assert(posOrderRes.status === 201 || posOrderRes.status === 200, `Thu ngân đặt món thành công`);

  const table4 = await request('/tables/tbl-4');
  assert(table4.data?.data?.status === 'OCCUPIED', 'Bàn tbl-4 chuyển sang OCCUPIED');

  // 7. Xem tiến độ phiên ăn và tạm tính tiền (GET /api/orders/table/tbl-1/current)
  console.log('\n6. Xem tiến độ món và tạm tính tiền (GET /api/orders/table/tbl-1/current)');
  const currentSessionRes = await request('/orders/table/tbl-1/current');
  assert(currentSessionRes.status === 200, `Status 200 OK (got ${currentSessionRes.status})`);
  const sessionData = currentSessionRes.data?.data;
  assert(sessionData?.allItems?.length === 3, 'Phiên ăn có tổng cộng 3 món từ 2 đợt đặt');
  // Tính tiền:
  // Ramen: 89k + 15k trứng = 104k
  // Trà đào: 49k + 12k đào = 61k
  // Phở bò: 75k
  // Tổng subtotal = 104 + 61 + 75 = 240k
  // VAT 8% = 240k * 8% = 19.2k
  // Final = 259.2k
  assert(sessionData?.subtotal === 240000, `Subtotal chính xác 240.000đ (got ${sessionData?.subtotal})`);
  assert(sessionData?.taxAmount === 19200, `VAT 8% chính xác 19.200đ (got ${sessionData?.taxAmount})`);
  assert(sessionData?.finalAmount === 259200, `Tổng cộng chính xác 259.200đ (got ${sessionData?.finalAmount})`);

  // 8. Màn hình Bếp KDS (GET /api/orders/kds)
  console.log('\n7. Kiểm tra màn hình Bếp KDS phân theo trạm');
  const kdsHot = await request('/orders/kds?stationId=hot', {
    headers: { Authorization: `Bearer ${kitchenToken}` },
  });
  assert(kdsHot.status === 200, `Status 200 OK (got ${kdsHot.status})`);
  assert(kdsHot.data?.data?.every(i => i.kitchenStation.id === 'hot'), 'KDS Bếp Nóng chỉ chứa món trạm hot');

  const kdsBar = await request('/orders/kds?stationId=bar', {
    headers: { Authorization: `Bearer ${kitchenToken}` },
  });
  assert(kdsBar.data?.data?.every(i => i.kitchenStation.id === 'bar'), 'KDS Quầy Bar chỉ chứa món trạm bar');

  // 9. Cập nhật trạng thái món trên KDS (PATCH /api/orders/items/:id/status)
  console.log('\n8. Bếp cập nhật trạng thái món: Pending -> Cooking -> Ready -> Served');
  const ramenOrderItemId = ramenItem.id;

  // Bắt đầu nấu
  const cookRes = await request(`/orders/items/${ramenOrderItemId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${kitchenToken}` },
    body: JSON.stringify({ status: 'COOKING' }),
  });
  assert(cookRes.status === 200, `Chuyển sang COOKING thành công`);
  assert(cookRes.data?.data?.status === 'COOKING', 'Status là COOKING');

  // Nấu xong
  const readyRes = await request(`/orders/items/${ramenOrderItemId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${kitchenToken}` },
    body: JSON.stringify({ status: 'READY' }),
  });
  assert(readyRes.status === 200, `Chuyển sang READY thành công`);
  assert(readyRes.data?.data?.status === 'READY', 'Status là READY');

  // Đã phục vụ ra bàn
  const servedRes = await request(`/orders/items/${ramenOrderItemId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${kitchenToken}` },
    body: JSON.stringify({ status: 'SERVED' }),
  });
  assert(servedRes.status === 200, `Chuyển sang SERVED thành công`);
  assert(servedRes.data?.data?.status === 'SERVED', 'Status là SERVED');

  // 10. Khách tại bàn bấm "Gọi thanh toán" (POST /api/tables/:id/request-payment)
  console.log('\n9. Khách bấm Gọi thanh toán tại bàn tbl-1');
  const payReqRes = await request('/tables/tbl-1/request-payment', {
    method: 'POST',
  });
  assert(payReqRes.status === 200 || payReqRes.status === 201, `Gửi yêu cầu thanh toán thành công`);

  const tableAfterPayReq = await request('/tables/tbl-1');
  assert(tableAfterPayReq.data?.data?.status === 'PENDING_PAYMENT', 'Bàn chuyển sang PENDING_PAYMENT');

  // 11. Kiểm tra bảo mật: Không có mã QR và không có JWT
  console.log('\n10. Kiểm tra chặn đặt món không hợp lệ (Không QR và không JWT)');
  const unauthOrderRes = await request('/orders', {
    method: 'POST',
    body: JSON.stringify({
      tableId: 'tbl-1',
      items: [{ productId: 'menu-1', quantity: 1 }],
    }),
  });
  assert(unauthOrderRes.status === 401, `Status 401 Unauthorized khi không xác thực (got ${unauthOrderRes.status})`);

  console.log(`\n=================================================`);
  console.log(`📊 TỔNG KẾT PHASE 3: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=================================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

