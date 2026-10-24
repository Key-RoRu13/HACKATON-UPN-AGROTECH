import { test, expect } from '@playwright/test';

test('el QR usa el dominio público configurado aunque el dashboard sea local', async ({ page }) => {
  await page.route('**/api/config', route => route.fulfill({ json: { publicBaseUrl: 'https://pasaporte.example' } }));
  await page.goto('/dashboard/i/demo-pal-002');
  await page.getByRole('button', { name: 'Mostrar QR del reporte' }).click();
  await expect(page.locator('.public-link')).toHaveAttribute('href', 'https://pasaporte.example/p/palta-demo');
  await expect(page.getByRole('img', { name: 'Código QR que abre el reporte público de esta inspección' })).toBeVisible();
  await expect(page.getByText('Para escanear desde otro celular', { exact: false })).toHaveCount(0);
});
