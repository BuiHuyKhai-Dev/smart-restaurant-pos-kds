// Test script verifying Phase 2 implementation end-to-end
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
  console.log('🧪 BẮT ĐẦU KIỂM THỬ PHASE 2: BRANCHES, TABLES & MENU\n');
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

  // Lấy token nhân viên trước
  const loginCashier = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'cashier', password: '123456' }),
  });
  const cashierToken = loginCashier.data?.data?.accessToken;

  const loginAdmin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: '123456' }),
  });
  const adminToken = loginAdmin.data?.data?.accessToken;

  // ==========================================
  // PHẦN 1: QUẢN LÝ CHI NHÁNH (Branches)
  // ==========================================
  console.log('--- PHẦN 1: QUẢN LÝ CHI NHÁNH ---');
  
  console.log('1. Lấy danh sách chi nhánh (GET /api/branches)');
  const branchesRes = await request('/branches');
  assert(branchesRes.status === 200, `Status 200 OK (got ${branchesRes.status})`);
  assert(Array.isArray(branchesRes.data?.data) && branchesRes.data?.data?.length === 3, 'Trả về đủ 3 chi nhánh');

  console.log('\n2. Lấy chi tiết chi nhánh (GET /api/branches/branch-1)');
  const branchDetailRes = await request('/branches/branch-1');
  assert(branchDetailRes.status === 200, `Status 200 OK (got ${branchDetailRes.status})`);
  assert(branchDetailRes.data?.data?.tables?.length === 12, 'Chi nhánh 1 có đúng 12 bàn ăn');

  // ==========================================
  // PHẦN 2: SƠ ĐỒ BÀN & ĐỔI/GỘP BÀN (Tables)
  // ==========================================
  console.log('\n--- PHẦN 2: SƠ ĐỒ BÀN & ĐỔI/GỘP BÀN ---');

  console.log('3. Lấy sơ đồ bàn theo chi nhánh (GET /api/tables?branchId=branch-1)');
  const tablesRes = await request('/tables?branchId=branch-1');
  assert(tablesRes.status === 200, `Status 200 OK (got ${tablesRes.status})`);
  assert(tablesRes.data?.data?.length === 12, 'Lọc đúng 12 bàn của branch-1');

  console.log('\n4. Lọc bàn theo khu vực Tầng 2 (area=FLOOR2)');
  const floor2Tables = await request('/tables?branchId=branch-1&area=FLOOR2');
  assert(floor2Tables.status === 200, `Status 200 OK (got ${floor2Tables.status})`);
  assert(floor2Tables.data?.data?.every(t => t.area === 'FLOOR2'), 'Tất cả bàn thuộc tầng 2');

  console.log('\n5. Xem chi tiết bàn (GET /api/tables/tbl-1)');
  const tableDetail = await request('/tables/tbl-1');
  assert(tableDetail.status === 200, `Status 200 OK (got ${tableDetail.status})`);
  assert(tableDetail.data?.data?.tableNumber === 'T-01', 'Đúng số bàn T-01');

  console.log('\n6. Cập nhật trạng thái bàn (PATCH /api/tables/tbl-1/status)');
  const updateStatusRes = await request('/tables/tbl-1/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ status: 'OCCUPIED' }),
  });
  assert(updateStatusRes.status === 200, `Cập nhật trạng thái bàn thành công (status ${updateStatusRes.status})`);
  assert(updateStatusRes.data?.data?.status === 'OCCUPIED', 'Trạng thái chuyển sang OCCUPIED');

  console.log('\n7. Kiểm tra Đổi bàn khi bàn nguồn chưa có phiên ăn');
  const transferEmptyRes = await request('/tables/transfer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ fromTableId: 'tbl-1', toTableId: 'tbl-2' }),
  });
  assert(transferEmptyRes.status === 400, `Status 400 khi bàn chưa mở phiên ăn (got ${transferEmptyRes.status})`);

  console.log('\n8. Kiểm tra Đổi bàn khi 2 bàn trùng nhau');
  const transferSameRes = await request('/tables/transfer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ fromTableId: 'tbl-1', toTableId: 'tbl-1' }),
  });
  assert(transferSameRes.status === 400, `Status 400 khi bàn nguồn trùng bàn đích (got ${transferSameRes.status})`);

  console.log('\n9. Kiểm tra Đổi bàn khác chi nhánh (tbl-1 CN1 sang tbl-13 CN2)');
  const transferDiffBranch = await request('/tables/transfer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ fromTableId: 'tbl-1', toTableId: 'tbl-13' }),
  });
  assert(transferDiffBranch.status === 400, `Status 400 chặn đổi bàn khác chi nhánh (got ${transferDiffBranch.status})`);

  // Trả tbl-1 về AVAILABLE
  await request('/tables/tbl-1/status', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ status: 'AVAILABLE' }),
  });

  // ==========================================
  // PHẦN 3: THỰC ĐƠN & TUỲ CHỌN (Menu & Modifiers)
  // ==========================================
  console.log('\n--- PHẦN 3: THỰC ĐƠN & TUỲ CHỌN ---');

  console.log('10. Lấy danh sách danh mục (GET /api/menu/categories)');
  const categoriesRes = await request('/menu/categories');
  assert(categoriesRes.status === 200, `Status 200 OK (got ${categoriesRes.status})`);
  assert(categoriesRes.data?.data?.length === 5, 'Có đúng 5 danh mục');

  console.log('\n11. Lấy danh sách trạm bếp KDS (GET /api/menu/stations)');
  const stationsRes = await request('/menu/stations');
  assert(stationsRes.status === 200, `Status 200 OK (got ${stationsRes.status})`);
  assert(stationsRes.data?.data?.length === 3, 'Có đúng 3 trạm bếp (hot, cold, bar)');

  console.log('\n12. Lấy toàn bộ thực đơn (GET /api/menu)');
  const menuRes = await request('/menu');
  assert(menuRes.status === 200, `Status 200 OK (got ${menuRes.status})`);
  assert(menuRes.data?.data?.length >= 8, `Có ít nhất 8 món ăn (got ${menuRes.data?.data?.length})`);
  
  // Kiểm tra món Ramen có đủ cấu trúc modifiers
  const ramen = menuRes.data?.data?.find(p => p.id === 'menu-1');
  assert(ramen !== undefined, 'Tìm thấy món Ramen menu-1');
  assert(ramen?.kitchenStation?.id === 'hot', 'Trạm bếp của Ramen là hot');
  assert(ramen?.modifiers?.length > 0, 'Ramen có nhóm modifiers đính kèm');

  console.log('\n13. Lọc thực đơn theo trạm Bếp Lạnh (stationId=cold)');
  const coldMenu = await request('/menu?stationId=cold');
  assert(coldMenu.status === 200, `Status 200 OK (got ${coldMenu.status})`);
  assert(coldMenu.data?.data?.every(p => p.kitchenStation.id === 'cold'), 'Mọi món lọc ra đều thuộc trạm cold');

  console.log('\n14. Tìm kiếm món ăn theo từ khóa (search=phở)');
  const searchMenu = await request('/menu?search=phở');
  assert(searchMenu.status === 200, `Status 200 OK (got ${searchMenu.status})`);
  assert(searchMenu.data?.data?.some(p => p.name.includes('Phở')), 'Tìm thấy món Phở bò');

  console.log('\n15. Xem chi tiết món ăn kèm công thức BOM (GET /api/menu/products/menu-1)');
  const productDetail = await request('/menu/products/menu-1');
  assert(productDetail.status === 200, `Status 200 OK (got ${productDetail.status})`);
  assert(productDetail.data?.data?.recipes?.length > 0, 'Món ăn có công thức BOM nguyên liệu');

  console.log('\n16. Bật/tắt trạng thái mở bán món ăn (PATCH /api/menu/products/menu-1/availability)');
  const toggleOff = await request('/menu/products/menu-1/availability', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ isAvailable: false }),
  });
  assert(toggleOff.status === 200, `Tắt món thành công (status ${toggleOff.status})`);
  assert(toggleOff.data?.data?.isAvailable === false, 'isAvailable chuyển sang false');

  console.log('\n17. Kiểm tra lọc onlyAvailable=true sau khi tắt món menu-1');
  const availableMenu = await request('/menu?onlyAvailable=true');
  assert(availableMenu.data?.data?.every(p => p.id !== 'menu-1'), 'menu-1 không còn xuất hiện khi lọc onlyAvailable');

  // Bật lại menu-1
  await request('/menu/products/menu-1/availability', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ isAvailable: true }),
  });

  console.log('\n18. Thêm món ăn mới với quyền Admin (POST /api/menu/products)');
  const newProductRes = await request('/menu/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Bánh Mì Thịt Xá Xíu Giòn Tan',
      categoryId: 'cat-noodles',
      kitchenStationId: 'hot',
      price: 45000,
      description: 'Bánh mì giòn rụm với nhân thịt xá xíu đậm đà',
      standardPrepMinutes: 5,
    }),
  });
  assert(newProductRes.status === 201 || newProductRes.status === 200, `Tạo món thành công (status ${newProductRes.status})`);
  assert(newProductRes.data?.data?.name === 'Bánh Mì Thịt Xá Xíu Giòn Tan', 'Đúng tên món mới tạo');

  console.log('\n19. Kiểm tra phân quyền: Không có token cố tạo món mới');
  const unauthorizedCreate = await request('/menu/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Món lậu',
      categoryId: 'cat-noodles',
      kitchenStationId: 'hot',
      price: 50000,
    }),
  });
  assert(unauthorizedCreate.status === 401, `Status 401 Unauthorized khi không có token (got ${unauthorizedCreate.status})`);

  console.log(`\n=================================================`);
  console.log(`📊 TỔNG KẾT PHASE 2: ${passed} PASSED, ${failed} FAILED`);
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

