// Test script verifying Phase 1 implementation end-to-end
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
  console.log('🧪 BẮT ĐẦU KIỂM THỬ PHASE 1: NỀN TẢNG, AUTH & TABLE SECURITY\n');
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

  // 1. Kiểm tra Route Public /api
  console.log('1. Kiểm tra Route Public Healthcheck');
  const healthRes = await request('');
  assert(healthRes.status === 200, `Status 200 OK (got ${healthRes.status})`);
  assert(healthRes.data?.success === true, 'Response bọc trong { success: true }');
  assert(healthRes.data?.data === 'Hello World!', 'Data đúng Hello World!');

  // 2. Kiểm tra Route yêu cầu đăng nhập khi không có token (Global Guard)
  console.log('\n2. Kiểm tra Global JwtAuthGuard chặn route được bảo vệ');
  const meUnauthorized = await request('/auth/me');
  assert(meUnauthorized.status === 401, `Status 401 Unauthorized khi không có Bearer token (got ${meUnauthorized.status})`);
  assert(meUnauthorized.data?.success === false, 'Response lỗi có success: false');

  // 3. Kiểm tra ValidationPipe khi đăng nhập
  console.log('\n3. Kiểm tra ValidationPipe khi đăng nhập thiếu thông tin');
  const loginEmpty = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  assert(loginEmpty.status === 400, `Status 400 Bad Request khi thiếu username & password (got ${loginEmpty.status})`);
  assert(Array.isArray(loginEmpty.data?.message), 'Trả về danh sách lỗi validation');

  console.log('\n4. Kiểm tra ValidationPipe chặn field lạ (forbidNonWhitelisted)');
  const loginExtra = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: '123', extraField: 'hack' }),
  });
  assert(loginExtra.status === 400, `Status 400 Bad Request khi gửi field không khai báo (got ${loginExtra.status})`);

  // 5. Kiểm tra đăng nhập sai mật khẩu
  console.log('\n5. Kiểm tra đăng nhập sai mật khẩu');
  const loginWrong = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
  });
  assert(loginWrong.status === 401, `Status 401 Unauthorized khi sai mật khẩu (got ${loginWrong.status})`);

  // 6. Đăng nhập thành công với tài khoản Admin
  console.log('\n6. Đăng nhập thành công tài khoản Admin (admin / 123456)');
  const loginAdmin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: '123456' }),
  });
  assert(loginAdmin.status === 200, `Status 200 OK (got ${loginAdmin.status})`);
  const adminToken = loginAdmin.data?.data?.accessToken;
  assert(typeof adminToken === 'string' && adminToken.length > 20, 'Nhận được JWT accessToken');
  assert(loginAdmin.data?.data?.user?.role === 'ADMIN', 'Role trả về là ADMIN');

  // 7. Đăng nhập thành công bằng Email (cashier@smartpos.vn / 123456)
  console.log('\n7. Đăng nhập thành công bằng Email (cashier@smartpos.vn)');
  const loginCashier = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'cashier@smartpos.vn', password: '123456' }),
  });
  assert(loginCashier.status === 200, `Status 200 OK (got ${loginCashier.status})`);
  const cashierToken = loginCashier.data?.data?.accessToken;
  const cashierBranchId = loginCashier.data?.data?.user?.branchId;
  assert(loginCashier.data?.data?.user?.role === 'CASHIER', 'Role trả về là CASHIER');

  // 8. Lấy hồ sơ nhân viên qua GET /api/auth/me
  console.log('\n8. Kiểm tra GET /api/auth/me với Token hợp lệ');
  const meAdmin = await request('/auth/me', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(meAdmin.status === 200, `Status 200 OK (got ${meAdmin.status})`);
  assert(meAdmin.data?.data?.username === 'admin', 'Đúng thông tin user admin');
  assert(meAdmin.data?.data?.password === undefined, 'Không bị lộ mật khẩu hash');

  // 9. Cấp mã QR bàn ăn (POST /api/tables/:tableId/qr)
  console.log('\n9. Nhân viên tạo mã QR bàn ăn (POST /api/tables/tbl-1/qr)');
  const issueQr = await request('/tables/tbl-1/qr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({}),
  });
  assert(issueQr.status === 201 || issueQr.status === 200, `Cấp mã QR thành công (status ${issueQr.status})`);
  const tableToken = issueQr.data?.data?.token;
  assert(typeof tableToken === 'string' && tableToken.includes('.'), 'Token bàn có cấu trúc <tableId>.<nonce>.<sig>');

  // 10. Phân quyền: Cashier chi nhánh 1 cố cấp QR bàn chi nhánh 2 (tbl-13)
  console.log('\n10. Kiểm tra phân quyền: Thu ngân CN 1 cấp QR bàn CN 2 (tbl-13)');
  const crossBranchQr = await request('/tables/tbl-13/qr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({}),
  });
  assert(crossBranchQr.status === 403, `Status 403 Forbidden khi khác chi nhánh (got ${crossBranchQr.status})`);

  // 11. Khách truy cập bàn qua mã QR hợp lệ (GET /api/table-access/me)
  console.log('\n11. Khách quét mã QR hợp lệ truy cập thông tin bàn');
  const guestAccessValid = await request('/table-access/me', {
    headers: { 'x-table-token': tableToken },
  });
  assert(guestAccessValid.status === 200, `Status 200 OK (got ${guestAccessValid.status})`);
  assert(guestAccessValid.data?.data?.tableNumber === 'T-01', 'Đúng số bàn T-01');

  // 12. Khách truy cập với token giả mạo
  console.log('\n12. Khách gửi token QR giả mạo');
  const fakeToken = `${tableToken.slice(0, -6)}fake99`;
  const guestAccessFake = await request('/table-access/me', {
    headers: { 'x-table-token': fakeToken },
  });
  assert(guestAccessFake.status === 401, `Status 401 Unauthorized chặn token giả (got ${guestAccessFake.status})`);

  // 13. Thu hồi / Xoay vòng mã QR bàn (rotate: true)
  console.log('\n13. Thu ngân xoay vòng mã QR bàn (rotate: true)');
  const rotateQr = await request('/tables/tbl-1/qr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ rotate: true }),
  });
  assert(rotateQr.data?.data?.rotated === true, 'Đã xoay vòng nonce bàn');
  const newTableToken = rotateQr.data?.data?.token;
  assert(newTableToken !== tableToken, 'Sinh ra token mới khác token cũ');

  // 14. Token cũ lập tức bị vô hiệu hóa
  console.log('\n14. Kiểm tra token cũ sau khi bị xoay vòng');
  const oldTokenAccess = await request('/table-access/me', {
    headers: { 'x-table-token': tableToken },
  });
  assert(oldTokenAccess.status === 401, `Status 401 Unauthorized: Mã QR cũ đã hết hiệu lực (got ${oldTokenAccess.status})`);

  console.log(`\n=================================================`);
  console.log(`📊 TỔNG KẾT: ${passed} PASSED, ${failed} FAILED`);
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

