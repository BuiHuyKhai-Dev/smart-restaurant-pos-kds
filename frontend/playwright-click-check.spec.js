const { test, expect } = require('@playwright/test');

test('click menu item flow', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('http://localhost:3000/table/T-02');

  await page.locator('button:has-text("Thêm")').first().click();
  await page.waitForTimeout(700);

  await expect(page.locator('text=Thêm Vào Giỏ')).toBeVisible();
  await expect(page.locator('text=Ramen Thịt Heo Chashu Đặc')).toBeVisible();

  await page.locator('button:has-text("Thêm Vào Giỏ")').click();
  await page.waitForTimeout(700);

  await expect(page.locator('text=Giỏ Hàng Của Bạn')).toBeVisible();
});
