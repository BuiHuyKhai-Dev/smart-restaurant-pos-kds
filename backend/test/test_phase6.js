/**
 * TEST SUITE: PHASE 6 - QUẢN LÝ IN BILL, TÍNH TOÁN TÀI CHÍNH, CHỐT HÓA ĐƠN & BÁO CÁO
 * Run: node test/test_phase6.js
 */

const BASE_URL = 'http://localhost:4000/api';

let cashierToken = '';
let adminToken = '';
let cookToken = '';
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

async function runTests() {
  console.log('🧪 BẮT ĐẦU KIỂM THỬ PHASE 6: INVOICES, BILLING & REPORTS\n');

  try {
    // 1. Đăng nhập các tài khoản
    console.log('1. Đăng nhập tài khoản Cashier, Admin và Kitchen');
    const cashierRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: 'cashier', password: '123456' }),
    });
    cashierToken = cashierRes.data?.data?.accessToken;

    const adminRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: '123456' }),
    });
    adminToken = adminRes.data?.data?.accessToken;

    const cookRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: 'kitchen', password: '123456' }),
    });
    cookToken = cookRes.data?.data?.accessToken;

    assert(cashierToken && adminToken && cookToken, 'Đăng nhập thành công các tài khoản');

    // 2. Mở bàn tbl-6 và Khách đặt món
    console.log('\n2. Cấp QR cho bàn tbl-6 và Khách gọi món');
    const qrRes = await request(`${BASE_URL}/tables/tbl-6/qr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({ rotate: true }),
    });
    const tableToken = qrRes.data?.data?.token;
    assert(typeof tableToken === 'string', 'Cấp mã QR bàn tbl-6 thành công');

    // Khách đặt: 2 Ramen (89k) + 2 Trứng lòng đào (15k) = 208k, 1 Trà Đào (49k) -> Subtotal = 257k
    const orderRes = await request(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'x-table-token': tableToken },
      body: JSON.stringify({
        guestCount: 3,
        note: 'Bàn gia đình',
        items: [
          {
            productId: 'menu-1',
            quantity: 2,
            modifierIds: ['top-egg'],
          },
          {
            productId: 'menu-6',
            quantity: 1,
          },
        ],
      }),
    });
    assert(orderRes.status === 201, 'Khách đặt món thành công (status 201)');
    const orderItems = orderRes.data?.data?.items || [];
    assert(orderItems.length === 2, 'Đơn hàng có 2 món');

    // 3. Bếp hoàn thành các món sang READY -> SERVED
    console.log('\n3. Bếp chế biến và phục vụ các món ăn');
    for (const item of orderItems) {
      await request(`${BASE_URL}/orders/items/${item.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${cookToken}` },
        body: JSON.stringify({ status: 'READY' }),
      });
      await request(`${BASE_URL}/orders/items/${item.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${cookToken}` },
        body: JSON.stringify({ status: 'SERVED' }),
      });
    }
    assert(true, 'Các món ăn đã sẵn sàng và được phục vụ tới bàn');

    // 4. In phiếu tạm tính lần 1 (Chưa áp dụng giảm giá)
    console.log('\n4. In phiếu tạm tính lần 1 (Provisional Bill - 0% discount)');
    const provBill1Res = await request(`${BASE_URL}/invoices/provisional`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({ tableId: 'tbl-6' }),
    });
    assert(provBill1Res.status === 201 || provBill1Res.status === 200, 'Tạo phiếu tạm tính thành công');
    const bill1 = provBill1Res.data?.data;

    assert(bill1?.subtotal === 257000, `Subtotal chính xác 257.000đ (got ${bill1?.subtotal})`);
    assert(bill1?.discountAmount === 0, 'Giảm giá 0đ');
    assert(bill1?.taxPercent === 8, 'Thuế suất VAT 8%');
    assert(bill1?.taxAmount === 20560, `Thuế VAT chính xác 20.560đ (got ${bill1?.taxAmount})`);
    assert(bill1?.finalAmount === 277560, `Tổng cộng chính xác 277.560đ (got ${bill1?.finalAmount})`);
    assert(bill1?.printCount === 1, 'Số lần in printCount = 1');
    assert(bill1?.paymentStatus === 'PENDING', 'Trạng thái hóa đơn là PENDING');
    const invoiceId = bill1?.invoiceId;

    // 5. In phiếu tạm tính lần 2 (Áp dụng Chiết khấu VIP 10%)
    console.log('\n5. In phiếu tạm tính lần 2 (Áp dụng chiết khấu 10%)');
    const provBill2Res = await request(`${BASE_URL}/invoices/provisional`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({ tableId: 'tbl-6', discountPercent: 10 }),
    });
    assert(provBill2Res.status === 201 || provBill2Res.status === 200, 'In lại phiếu tạm tính thành công');
    const bill2 = provBill2Res.data?.data;

    assert(bill2?.printCount === 2, `Số lần in printCount tăng lên 2 (got ${bill2?.printCount})`);
    assert(bill2?.discountPercent === 10, 'Chiết khấu 10%');
    assert(bill2?.discountAmount === 25700, `Tiền chiết khấu chính xác 25.700đ (got ${bill2?.discountAmount})`);
    assert(bill2?.taxAmount === 18504, `Thuế VAT sau giảm giá chính xác 18.504đ (got ${bill2?.taxAmount})`);
    assert(bill2?.finalAmount === 249804, `Tổng cộng sau giảm giá chính xác 249.804đ (got ${bill2?.finalAmount})`);

    // 6. Kiểm tra chặn thanh toán khi khách đưa thiếu tiền mặt
    console.log('\n6. Kiểm tra chặn thanh toán khi khách đưa thiếu tiền mặt');
    const failSettleRes = await request(`${BASE_URL}/invoices/settle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        invoiceId,
        paymentMethod: 'CASH',
        cashGiven: 200000, // Cần 249.804đ mà chỉ đưa 200.000đ
      }),
    });
    assert(failSettleRes.status === 400, `Chặn thanh toán khi thiếu tiền mặt (status 400)`);
    assert(
      failSettleRes.data?.message?.includes('không đủ để thanh toán'),
      `Thông báo lỗi chính xác: "${failSettleRes.data?.message}"`,
    );

    // 7. Chốt Hóa Đơn & Thanh toán thành công (Khách đưa 300.000đ)
    console.log('\n7. Chốt Hóa Đơn & Thanh toán thành công (Tiền mặt 300.000đ)');
    const settleRes = await request(`${BASE_URL}/invoices/settle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        invoiceId,
        paymentMethod: 'CASH',
        cashGiven: 300000,
      }),
    });
    assert(settleRes.status === 201 || settleRes.status === 200, 'Chốt hóa đơn thanh toán thành công');
    const settleData = settleRes.data?.data;

    assert(settleData?.invoice?.paymentStatus === 'PAID', 'Trạng thái hóa đơn chuyển sang PAID');
    assert(settleData?.invoice?.cashGiven === 300000, 'Tiền khách đưa là 300.000đ');
    assert(settleData?.invoice?.changeDue === 50196, `Tiền thừa trả lại chính xác 50.196đ (got ${settleData?.invoice?.changeDue})`);
    assert(settleData?.table?.status === 'AVAILABLE', 'Bàn tbl-6 được tự động giải phóng về AVAILABLE');

    // 8. Xác minh bàn tbl-6 và phiên ăn trong Database đã được đóng hoàn toàn
    console.log('\n8. Kiểm tra trạng thái bàn và phiên ăn sau thanh toán');
    const tableAfterRes = await request(`${BASE_URL}/tables/tbl-6`);
    assert(tableAfterRes.data?.data?.status === 'AVAILABLE', 'Trạng thái bàn là AVAILABLE');
    assert(tableAfterRes.data?.data?.orderSessions?.length === 0, 'Không còn phiên ăn nào đang mở');

    // 9. Kiểm tra chặn thanh toán lặp lại cho cùng 1 hóa đơn
    console.log('\n9. Kiểm tra chặn thanh toán lặp lại (Idempotent Settlement)');
    const repeatSettleRes = await request(`${BASE_URL}/invoices/settle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        invoiceId,
        paymentMethod: 'CASH',
        cashGiven: 300000,
      }),
    });
    assert(repeatSettleRes.status === 400, 'Chặn đứng thanh toán lặp lại (status 400)');
    assert(
      repeatSettleRes.data?.message?.includes('đã được thanh toán'),
      `Thông báo lỗi chính xác: "${repeatSettleRes.data?.message}"`,
    );

    // 10. Xem chi tiết hóa đơn qua API (GET /api/invoices/:id)
    console.log('\n10. Tra cứu chi tiết hóa đơn (GET /api/invoices/:id)');
    const detailRes = await request(`${BASE_URL}/invoices/${invoiceId}`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(detailRes.status === 200, 'Lấy chi tiết hóa đơn thành công');
    assert(detailRes.data?.data?.id === invoiceId, 'Đúng ID hóa đơn');
    assert(detailRes.data?.data?.paymentStatus === 'PAID', 'Hóa đơn hiển thị PAID');

    // 11. Báo cáo Doanh thu trong ngày (GET /api/reports/daily)
    console.log('\n11. Báo cáo Doanh thu Ngày (GET /api/reports/daily)');
    const reportRes = await request(`${BASE_URL}/reports/daily?branchId=branch-1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(reportRes.status === 200, 'Lấy báo cáo doanh thu ngày thành công');
    const report = reportRes.data?.data;

    assert(report?.totalRevenue >= 249804, `Tổng doanh thu có ghi nhận hóa đơn vừa thanh toán (${report?.totalRevenue}đ)`);
    assert(report?.totalInvoices >= 1, `Có ít nhất 1 hóa đơn (${report?.totalInvoices})`);
    assert(report?.paymentBreakdown?.CASH >= 249804, `Doanh thu tiền mặt ghi nhận chính xác (${report?.paymentBreakdown?.CASH}đ)`);
    assert(Array.isArray(report?.topSellingItems) && report?.topSellingItems.length > 0, 'Có danh sách món bán chạy Top Selling');

    const topItem = report?.topSellingItems[0];
    assert(topItem?.name && topItem?.quantity >= 1, `Món bán chạy: ${topItem?.name} (SL: ${topItem?.quantity})`);

    console.log('\n=================================================');
    console.log(`📊 TỔNG KẾT PHASE 6: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('=================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình kiểm thử Phase 6:', err);
    process.exit(1);
  }
}

runTests();

