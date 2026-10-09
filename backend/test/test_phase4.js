/**
 * TEST SUITE: PHASE 4 - ĐỘNG CƠ ĐỊNH LƯỢNG BOM & TRỪ KHO VỚI ROW-LEVEL LOCK
 * Run: node test/test_phase4.js
 */

const BASE_URL = 'http://localhost:4000/api';

let adminToken = '';
let cookToken = '';
let cashierToken = '';
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
  console.log('🧪 BẮT ĐẦU KIỂM THỬ PHASE 4: ĐỘNG CƠ BOM & TRỪ KHO ROW-LEVEL LOCK\n');

  try {
    // 0. Đăng nhập các tài khoản
    console.log('1. Đăng nhập Admin, Cook, Cashier');
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

    const cashierRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: 'cashier', password: '123456' }),
    });
    cashierToken = cashierRes.data?.data?.accessToken;

    assert(adminToken && cookToken && cashierToken, 'Đăng nhập thành công các tài khoản');

    // 2. Kiểm tra danh mục nguyên liệu & tạo nguyên liệu mới
    console.log('\n2. Quản lý danh mục nguyên liệu (Ingredients)');
    const ingRes = await request(`${BASE_URL}/inventory/ingredients`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(ingRes.status === 200, `Lấy danh mục nguyên liệu thành công (status ${ingRes.status})`);
    assert(Array.isArray(ingRes.data.data) && ingRes.data.data.length >= 18, `Có ít nhất 18 nguyên liệu seed`);

    // Tạo nguyên liệu thử nghiệm
    const createIngRes = await request(`${BASE_URL}/inventory/ingredients`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Trứng Cút Thượng Hạng',
        baseUnit: 'quả',
        description: 'Dùng cho topping ramen đặc biệt',
      }),
    });
    assert(createIngRes.status === 201, 'Tạo nguyên liệu mới thành công');
    const newIngredientId = createIngRes.data.data.id;

    // 3. Kiểm tra và Cập nhật công thức BOM món ăn
    console.log('\n3. Quản lý công thức định lượng BOM (Món chính & Topping)');
    // Lấy BOM của Ramen (menu-1)
    const bomRes = await request(`${BASE_URL}/bom/product/menu-1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(bomRes.status === 200, 'Lấy định lượng BOM của Mì Ramen thành công');
    assert(bomRes.data.data.recipes.length > 0, `Mì Ramen có ${bomRes.data.data.recipes.length} nguyên liệu trong BOM`);

    // Lấy BOM của Modifier Trứng lòng đào (top-egg)
    const modBomRes = await request(`${BASE_URL}/bom/modifier/top-egg`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(modBomRes.status === 200, 'Lấy định lượng BOM của Topping thành công');

    // Cập nhật BOM cho Modifier với nguyên liệu mới
    const updateModBom = await request(`${BASE_URL}/bom/modifier/top-egg`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        recipes: [
          { ingredientId: newIngredientId, amountNeeded: 2 }, // 2 quả Trứng cút
        ],
      }),
    });
    assert(updateModBom.status === 200, 'Cập nhật BOM của Topping thành công');

    // 4. Kiểm tra tồn kho chi nhánh & Nhập kho (Restock)
    console.log('\n4. Kiểm tra tồn kho chi nhánh & Nhập thêm nguyên liệu (Restock)');
    const branchInvBefore = await request(`${BASE_URL}/inventory?branchId=branch-1`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(branchInvBefore.status === 200, 'Lấy bảng cân đối kho chi nhánh 1 thành công');

    const miRamenStockBefore = branchInvBefore.data.data.find((i) => i.ingredientId === 'ing-1');
    const stockIng1Before = miRamenStockBefore ? miRamenStockBefore.currentStock : 0;

    // Nhập thêm 50 phần mì ramen
    const restockRes = await request(`${BASE_URL}/inventory/restock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        branchId: 'branch-1',
        items: [
          { ingredientId: 'ing-1', quantity: 50, costPrice: 12000 },
          { ingredientId: newIngredientId, quantity: 200, costPrice: 1500 },
        ],
        note: 'Nhập hàng đầu ngày từ NCC CP',
      }),
    });
    assert(restockRes.status === 201, 'Nhập kho nguyên liệu thành công');

    // Kiểm tra tồn kho sau nhập
    const branchInvAfterRestock = await request(`${BASE_URL}/inventory?branchId=branch-1`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const miRamenStockAfter = branchInvAfterRestock.data.data.find((i) => i.ingredientId === 'ing-1');
    assert(
      miRamenStockAfter.currentStock === stockIng1Before + 50,
      `Tồn kho mì Ramen tăng chính xác +50 (Trước: ${stockIng1Before}, Sau: ${miRamenStockAfter.currentStock})`,
    );

    // 5. Đặt món và chạy động cơ trừ kho khi Bếp chuyển trạng thái sang READY
    console.log('\n5. Đặt món và kích hoạt trừ kho BOM tại trạng thái READY');
    // Cấp QR token cho bàn tbl-2
    const tokenRes = await request(`${BASE_URL}/tables/tbl-2/qr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({ rotate: true }),
    });
    const tableQrToken = tokenRes.data?.data?.token;
    assert(typeof tableQrToken === 'string', 'Cấp mã QR cho bàn tbl-2 thành công');

    // Khách đặt: 2 Mì Ramen (mỗi phần cần: 150g mì ing-1, 100g thịt heo ing-2, 300ml nước dùng ing-3, 1 quả trứng ing-18)
    // Kèm topping top-egg (2 quả Trứng cút newIngredientId)
    // Và 1 Trà Đào (menu-6)
    const placeOrderRes = await request(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'x-table-token': tableQrToken },
      body: JSON.stringify({
        guestCount: 2,
        items: [
          {
            productId: 'menu-1', // Ramen
            quantity: 2,
            modifierIds: ['top-egg'],
          },
          {
            productId: 'menu-6', // Trà Đào
            quantity: 1,
          },
        ],
      }),
    });
    assert(placeOrderRes.status === 201, 'Khách đặt món thành công');
    const firstOrder = placeOrderRes.data?.data;
    const ramenItem = firstOrder?.items?.find((i) => i.productId === 'menu-1');
    const teaItem = firstOrder?.items?.find((i) => i.productId === 'menu-6');
    assert(ramenItem && teaItem, 'Lấy được 2 món ăn trong đơn');

    // Bếp chuyển Ramen sang COOKING -> Kho chưa bị trừ
    const cookingRes = await request(`${BASE_URL}/orders/items/${ramenItem.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${cookToken}` },
      body: JSON.stringify({ status: 'COOKING' }),
    });
    assert(cookingRes.status === 200, 'Chuyển sang COOKING thành công');

    const stockDuringCooking = await request(`${BASE_URL}/inventory?branchId=branch-1`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const miRamenCooking = stockDuringCooking.data.data.find((i) => i.ingredientId === 'ing-1');
    assert(
      miRamenCooking.currentStock === miRamenStockAfter.currentStock,
      'Ở trạng thái COOKING tồn kho chưa bị trừ',
    );

    // Lấy tồn kho trước khi READY của các nguyên liệu mì ramen (ing-1, ing-2)
    const porkStockBefore = stockDuringCooking.data.data.find((i) => i.ingredientId === 'ing-2').currentStock;

    // Bếp chuyển Ramen sang READY -> Kích hoạt trừ kho BOM!
    const readyRes = await request(`${BASE_URL}/orders/items/${ramenItem.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${cookToken}` },
      body: JSON.stringify({ status: 'READY' }),
    });
    assert(readyRes.status === 200, 'Bếp chuyển món Ramen sang READY thành công');

    // Kiểm tra tồn kho sau khi READY
    const stockAfterReady = await request(`${BASE_URL}/inventory?branchId=branch-1`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const miRamenAfterReady = stockAfterReady.data.data.find((i) => i.ingredientId === 'ing-1');
    const porkAfterReady = stockAfterReady.data.data.find((i) => i.ingredientId === 'ing-2');

    // 2 bát mì Ramen -> trừ 150g * 2 = 300g mì ramen
    assert(
      miRamenAfterReady.currentStock === miRamenCooking.currentStock - 300,
      `Tồn kho mì ramen trừ chính xác 300g (Còn: ${miRamenAfterReady.currentStock})`,
    );
    // Mỗi bát cần 100g thịt heo -> 2 bát = 200g
    assert(
      porkAfterReady.currentStock === porkStockBefore - 200,
      `Tồn kho thịt xá xíu trừ chính xác 200g (Còn: ${porkAfterReady.currentStock})`,
    );

    // 6. Kiểm tra tính Idempotent (Không trừ trùng lặp)
    console.log('\n6. Kiểm tra Idempotent (Không trừ kho trùng lặp khi đổi sang SERVED)');
    const servedRes = await request(`${BASE_URL}/orders/items/${ramenItem.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${cookToken}` },
      body: JSON.stringify({ status: 'SERVED' }),
    });
    assert(servedRes.status === 200, 'Chuyển sang SERVED thành công');

    const stockAfterServed = await request(`${BASE_URL}/inventory?branchId=branch-1`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const miRamenAfterServed = stockAfterServed.data.data.find((i) => i.ingredientId === 'ing-1');
    assert(
      miRamenAfterServed.currentStock === miRamenAfterReady.currentStock,
      'Tồn kho giữ nguyên, không bị trừ lần 2',
    );

    // 7. Kiểm tra Strict Inventory (Chặn trừ âm kho)
    console.log('\n7. Kiểm tra Strict Inventory (Chặn trừ âm kho)');
    // Tạo 1 đơn hàng Trà Đào với số lượng cực lớn
    const placeTeaRes = await request(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'x-table-token': tableQrToken },
      body: JSON.stringify({
        items: [
          {
            productId: 'menu-6', // Trà đào
            quantity: 99999, // Đặt số lượng cực lớn vượt quá tồn kho
          },
        ],
      }),
    });
    const hugeTeaItem = placeTeaRes.data?.data?.items?.[0];

    // Bếp cố gắng ấn READY cho món có số lượng vượt quá tồn kho
    const failReadyRes = await request(`${BASE_URL}/orders/items/${hugeTeaItem.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${cookToken}` },
      body: JSON.stringify({ status: 'READY' }),
    });
    assert(
      failReadyRes.status === 400,
      `Hệ thống chặn đứng và trả về 400 Bad Request khi không đủ tồn kho (got ${failReadyRes.status})`,
    );
    assert(
      failReadyRes.data.message && failReadyRes.data.message.includes('không đủ nguyên liệu'),
      `Thông báo lỗi chính xác: "${failReadyRes.data.message}"`,
    );

    // 8. Kiểm tra Nhật ký biến động kho (Audit Logs)
    console.log('\n8. Kiểm tra Nhật ký biến động kho (Audit Logs)');
    const logsRes = await request(`${BASE_URL}/inventory/audit-logs?branchId=branch-1&take=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(logsRes.status === 200, 'Lấy danh sách Audit Logs thành công');
    assert(Array.isArray(logsRes.data.data) && logsRes.data.data.length > 0, 'Có các bản ghi biến động kho');
    const latestLog = logsRes.data.data[0];
    assert(latestLog.amountDeducted !== undefined, `Log có ghi nhận amountDeducted (${latestLog.amountDeducted})`);
    assert(latestLog.reason !== undefined, `Log có lý do rõ ràng: "${latestLog.reason}"`);

    console.log('\n=================================================');
    console.log(`📊 TỔNG KẾT PHASE 4: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('=================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình kiểm thử:', err);
    process.exit(1);
  }
}

runTests();
