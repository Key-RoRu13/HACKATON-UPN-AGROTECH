import { test, expect } from '@playwright/test';
import QRCode from 'qrcode';

async function confirmed(request: any) {
  const created = await request.post('/api/inspections', { data: { lotId: 'PAL-2026-001' } });
  const item = await created.json();
  return (await request.post(`/api/inspections/${item.id}/confirm`, { data: { action: 'confirm' } })).json();
}
test('sube dos QR y abre la inspección correspondiente, sin cargar un ejemplo al entrar', async ({ page, request }) => {
  const one = await confirmed(request); const two = await confirmed(request);
  let internalCalls = 0;
  page.on('request', req => { if (/\/api\/(lots|inspections|config)(\?|$)/.test(req.url())) internalCalls++; });
  for (const item of [one, two]) {
    await page.goto('/consultar');
    await expect(page.getByRole('heading', { name: 'Escanea y conoce la muestra' })).toBeVisible();
    const buffer = await QRCode.toBuffer(`https://rikuy.example/p/${item.publicId}`, { width: 400 });
    await page.getByLabel('Imagen del código QR').setInputFiles({ name: 'qr.png', mimeType: 'image/png', buffer });
    await expect(page).toHaveURL(new RegExp('/p/' + item.publicId + '$'));
    await expect(page.getByText('Inspección confirmada', { exact: true })).toBeVisible();
  }
  expect(internalCalls).toBe(0);
});
test('recupera imágenes sin QR, rechaza enlaces ajenos y permite pegar un reporte', async ({ page }) => {
  await page.goto('/consultar');
  await page.getByLabel('Imagen del código QR').setInputFiles('tests/fixtures/hass-cinco-etapas.jpg');
  await expect(page.getByText('No encontramos un QR legible.', { exact: false })).toBeVisible();
  const buffer = await QRCode.toBuffer('https://example.com/no-es-reporte');
  await page.getByLabel('Imagen del código QR').setInputFiles({ name: 'otro.png', mimeType: 'image/png', buffer });
  await expect(page.getByText('El código no corresponde a un pasaporte', { exact: false })).toBeVisible();
  await page.getByText('¿Ya tienes el enlace del reporte?').click();
  await page.getByLabel('Enlace de la inspección').fill('https://rikuy.example/p/palta-demo');
  await page.getByRole('button', { name: 'Consultar reporte', exact: true }).click();
  await expect(page).toHaveURL(/\/p\/palta-demo$/);
});
test('permiso de cámara denegado ofrece recuperación por archivo', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: async () => { throw new DOMException('denied', 'NotAllowedError'); } } }); });
  await page.goto('/consultar'); await page.getByRole('button', { name: 'Escanear con cámara' }).click();
  await expect(page.getByText('Permiso de cámara denegado.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Subir imagen del QR' })).toBeEnabled();
});
test('lee QR desde cámara simulada y libera el flujo al abrir el reporte', async ({ page }) => {
  const data = await QRCode.toDataURL('https://rikuy.example/p/palta-demo', { width: 400 });
  await page.addInitScript(data => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: async () => {
      const image = new Image(); image.src = data; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 400;
      canvas.getContext('2d')!.drawImage(image, 0, 0);
      const stream = canvas.captureStream(10); (window as any).testQrStream = stream;
      return stream;
    } } });
  }, data);
  await page.goto('/consultar'); await page.getByRole('button', { name: 'Escanear con cámara' }).click();
  await expect(page).toHaveURL(/\/p\/palta-demo$/);
  expect(await page.evaluate(() => (window as any).testQrStream.getTracks().every((t: MediaStreamTrack) => t.readyState === 'ended'))).toBe(true);
});
