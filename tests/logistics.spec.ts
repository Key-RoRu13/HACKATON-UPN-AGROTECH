import { test, expect } from '@playwright/test';

test('dashboard guarda escenario, conserva al recargar y no lo publica', async ({ page, request }) => {
  const created = await request.post('/api/inspections', { data: { lotId: 'PAL-2026-001' } });
  const item = await created.json();
  await page.goto(`/dashboard/i/${item.id}`);
  await expect(page.getByText('Confirma la inspección para evaluar escenarios.', { exact: false })).toBeVisible();
  const confirmation = await request.post(`/api/inspections/${item.id}/confirm`, { data: { action: 'confirm' } });
  const confirmed = await confirmation.json();
  await page.reload();
  await page.getByRole('button', { name: 'Calcular y guardar simulación' }).click();
  await expect(page.getByText('Escenario simulado guardado en esta inspección.')).toBeVisible();
  await expect(page.getByText('Destino compatible', { exact: true })).toBeVisible();
  await expect(page.getByText('Tiempo insuficiente', { exact: true })).toBeVisible();
  await page.getByLabel('Vida útil simulada (días)').fill('7');
  await expect(page.getByText('Hay cambios sin guardar.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Calcular y guardar simulación' }).click();
  await expect(page.getByText('Requiere revisión', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Vida útil simulada (días)')).toHaveValue('7');
  await expect(page.getByText('Requiere revisión', { exact: true })).toBeVisible();
  const pub = await request.get(`/api/public/${confirmed.publicId}`);
  expect(await pub.json()).not.toHaveProperty('logisticsScenario');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Vida útil simulada (días)')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/logistics-mobile.png', fullPage: true });
});

for (const [scenario, lifeDays] of [['A',14], ['B',7], ['C',3]] as const) {
  test(`orientación ${scenario} visible en inspector y precarga dashboard (respuesta simulada)`, async ({ page, request }) => {
    const created = await request.post('/api/inspections', { data: { lotId: 'PAL-2026-001' } });
    const item = await created.json();
    const confirmation = await request.post(`/api/inspections/${item.id}/confirm`, { data: { action: 'confirm' } });
    const record = await confirmation.json();
    const suggestion = { status: 'suggested', scenario, lifeDays, mode: 'simulation', ruleVersion: 'test-rule', sourceModelVersion: 'test-model', reason: 'Regla simulada de prueba.', recordedAt: new Date().toISOString() };
    await page.route('**/api/inspections', async route => {
      const response = await route.fetch(); const records = await response.json();
      await route.fulfill({ json: records.map((r: { id: string }) => r.id === record.id ? { ...r, logisticsSuggestion: suggestion } : r) });
    });
    await page.goto(`/dashboard/i/${record.id}`);
    await expect(page.getByText(`Escenario logístico ${scenario}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Ventana simulada: ${lifeDays} días`, { exact: true })).toBeVisible();
    await expect(page.getByLabel('Vida útil simulada (días)')).toHaveValue(String(lifeDays));
    await page.goto(`/inspector/i/${record.id}`);
    await expect(page.getByText(`Escenario logístico ${scenario}`, { exact: true })).toBeVisible();
  });
}

test('RIKUY: casos de demostración cambian logística sin alterar clasificación ni análisis', async ({ page, request }) => {
  const created = await request.post('/api/inspections', { data: { lotId: 'PAL-2026-001' } });
  const item = await created.json();
  const confirmation = await request.post(`/api/inspections/${item.id}/confirm`, { data: { action: 'confirm' } });
  const record = await confirmation.json();
  await page.goto(`/dashboard/i/${record.id}`);
  await expect(page).toHaveTitle(/RIKUY/);
  await expect(page.locator('.brand').first()).toContainText('RIKUY');
  await page.getByRole('button', { name: 'Aplicar escenario A' }).click();
  await expect(page.getByRole('heading', { name: 'Último escenario guardado · simulado' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Calcular y guardar simulación' }).click();
  await expect(page.getByText('Destino compatible', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Aplicar escenario B' }).click();
  await expect(page.getByText('Hay cambios sin guardar.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Calcular y guardar simulación' }).click();
  await expect(page.getByText('Requiere revisión', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Aplicar escenario C' }).click();
  await page.getByRole('button', { name: 'Calcular y guardar simulación' }).click();
  await expect(page.getByText('Tiempo insuficiente', { exact: true })).toHaveCount(2);
  await page.reload();
  await expect(page.getByLabel('Vida útil simulada (días)')).toHaveValue('3');
  const saved = await (await request.get(`/api/inspections/${record.id}`)).json();
  expect(saved.result).toEqual(record.result);
  expect(saved.confirmedCategory).toBe(record.confirmedCategory);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
