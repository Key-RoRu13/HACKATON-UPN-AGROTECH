import { test, expect } from '@playwright/test';

test('dashboard mantiene contenido, formularios y QR dentro de sus contenedores', async ({ page, request }) => {
  const created = await (await request.post('/api/inspections', { data: { lotId: 'PAL-2026-001' } })).json();
  await request.post(`/api/inspections/${created.id}/confirm`, { data: { action: 'confirm' } });
  const production = { farm: 'Fundo ' + 'NombreExtenso'.repeat(10), location: 'Ubicación productiva y zona de empaque '.repeat(4), sector: 'Sector ' + 'Largo'.repeat(30), harvestDate: null, packingDate: null, demonstration: true, recordedBy: 'Responsable de demostración con nombre extenso', recordedAt: new Date().toISOString(), source: 'declared' };
  const adjustLot = (lot: any) => ({ ...lot, company: 'EmpresaExportadora'.repeat(10), origin: production.location, production });
  await page.route('**/api/lots', async route => { const rows = await (await route.fetch()).json(); await route.fulfill({ json: rows.map(adjustLot) }); });
  await page.route('**/api/inspections', async route => { const rows = await (await route.fetch()).json(); await route.fulfill({ json: rows.map((r: any) => ({ ...r, lot: adjustLot(r.lot) })) }); });
  async function contained() {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const overflowing = await page.locator('.dashboard-main .card').evaluateAll(cards => cards.filter(c => c.scrollWidth > c.clientWidth + 3).map(c => c.className));
    expect(overflowing).toEqual([]);
  }
  for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/dashboard', '/dashboard/inspecciones', '/dashboard/lotes', `/dashboard/i/${created.id}`]) {
      await page.goto(route); await expect(page.locator('.dashboard-main')).toBeVisible();
      await contained();
      if (route.endsWith('lotes')) {
        const card = page.locator('.lot-summary').first();
        await card.getByRole('button', { name: 'QR del lote', exact: true }).click();
        await expect(card.locator('.qr-block img')).toBeVisible(); await contained();
        await card.getByRole('button', { name: 'Editar ficha productiva' }).click();
        await expect(card.getByLabel('Fecha de empaque')).toBeVisible(); await contained();
      }
      if (width === 1280 && route.includes('/i/')) {
        await expect(page.locator('.simulation-preset-grid button')).toHaveCount(3);
        for (const button of await page.locator('.simulation-preset-grid button').all()) expect(await button.evaluate(e => e.scrollWidth <= e.clientWidth + 2)).toBe(true);
      }
    }
  }
});
