import { test, expect } from '@playwright/test';

test('reporte recupera fotografía fallida y muestra trazabilidad del identificador escaneado', async ({ page }) => {
  let reads = 0;
  await page.route('**/api/public/palta-demo', async route => {
    const response = await route.fetch(); const record = await response.json(); reads++;
    await route.fulfill({ json: { ...record, photoUrl: reads === 1 ? '/broken-photo.jpg' : '/assets/palta-demo.jpg' } });
  });
  await page.route('**/broken-photo.jpg', route => route.abort());
  await page.goto('/p/palta-demo');
  await expect(page.getByText('No se pudo cargar esta fotografía.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ampliar fotografía' })).toBeDisabled();
  await page.getByRole('button', { name: 'Actualizar fotografías' }).click();
  const image = page.getByRole('img', { name: 'Fotografía de la muestra de palta', exact: true });
  await expect(image).toBeVisible();
  await expect.poll(async () => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Ampliar fotografía' })).toBeEnabled();
  await expect(page.locator('.public-record-id')).toHaveText('palta-demo');
  await expect(page.getByRole('heading', { name: 'Identificación y trazabilidad' })).toBeVisible();
  await expect(page.getByText('Resultados preparados de demostración', { exact: true })).toBeVisible();
  expect(reads).toBe(2);
});
