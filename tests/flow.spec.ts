import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test('inspector → confirmación → historial → dashboard → reporte público con QR', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/inspector');
  await expect(page.getByRole('heading', { name: 'Buenos días, Ana' })).toBeVisible();
  await page.getByRole('button', { name: 'Nueva inspección de lote' }).click();
  await expect(page.getByRole('button', { name: /Continuar a captura/ })).toBeDisabled();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: /Continuar a captura/ }).click();
  await page.locator('input[type=file]').setInputFiles('tests/fixtures/palta-validation.jpg');
  await page.getByRole('button', { name: /Usar fotografía/, exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Resultado de inspección' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Condiciones visibles' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Madurez visual estimada' })).toBeVisible();
  await expect(page.getByText('Detecciones del modelo', { exact: true })).toBeVisible();
  await expect(page.getByText('Mediciones complementarias', { exact: true })).toBeVisible();
  const analyzedImage = page.getByRole('img', { name: 'Imagen analizada con condiciones visibles estimadas' });
  const analyzedSrc = await analyzedImage.getAttribute('src');
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Fotografía de la muestra de palta cargada por el inspector' })).not.toHaveAttribute('src', analyzedSrc!);
  await page.getByRole('button', { name: 'Analizada', exact: true }).click();
  await expect(analyzedImage).toHaveAttribute('src', analyzedSrc!);
  await page.screenshot({ path: 'test-results/inspector-result.png', fullPage: true });
  await page.getByRole('button', { name: 'Revisar clasificación', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Selecciona la clasificación comercial' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar inspección', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Selecciona la clasificación comercial' })).toBeVisible();
  await page.getByLabel('Clasificación confirmada').selectOption('B');
  await page.getByLabel('Motivo obligatorio').fill('Clasificación manual para la demostración del jurado.');
  await page.getByText('Añadir mediciones manuales (opcional)', { exact: true }).click();
  await page.getByLabel('Conteo manual de frutos', { exact: true }).fill('1');
  await page.getByLabel('Frutos con defectos observados', { exact: true }).fill('0');
  await page.getByLabel('Diámetro medio medido (mm)', { exact: true }).fill('70');
  await page.getByLabel('Instrumento de medición', { exact: true }).selectOption('caliper');
  let confirmRequests = 0;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/confirm')) confirmRequests++; });
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  await page.getByRole('button', { name: 'Analizada', exact: true }).click();
  await page.getByRole('button', { name: 'Ampliar fotografía', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Motivo obligatorio')).toHaveValue('Clasificación manual para la demostración del jurado.');
  await expect(page.getByRole('button', { name: 'Confirmar inspección', exact: true })).toBeEnabled();
  expect(confirmRequests).toBe(0);
  await page.getByRole('button', { name: 'Confirmar inspección', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'La inspección quedó registrada' })).toBeVisible();
  expect(confirmRequests).toBe(1);
  await expect(page.getByText('70 mm', { exact: true })).toBeVisible();
  const publicLink = page.getByRole('link', { name: 'Abrir pasaporte', exact: true });
  const href = await publicLink.getAttribute('href'); expect(href).toContain('/p/');
  const qr = page.getByRole('img', { name: 'Código QR que abre el reporte público de esta inspección' });
  await expect(qr).toBeVisible();
  const qrImage = (await qr.getAttribute('src'))!.split(',')[1];
  const decoded = execFileSync('ml/.venv/bin/python', ['-c', 'import sys,base64,cv2,numpy as np; data=np.frombuffer(base64.b64decode(sys.stdin.read()),dtype=np.uint8); print(cv2.QRCodeDetector().detectAndDecode(cv2.imdecode(data,cv2.IMREAD_COLOR))[0])'], { input: qrImage, encoding: 'utf8' }).trim();
  expect(decoded).toBe(href);
  await page.getByRole('button', { name: 'Ver historial de inspecciones' }).click();
  await expect(page.getByRole('heading', { name: 'Historial de inspecciones' })).toBeVisible();
  await page.getByRole('button', { name: /PAL-2026-001/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Detalle de inspección' })).toBeVisible();
  await expect(page.getByText('Clasificación confirmada', { exact: false }).first()).toBeVisible();
  const publicPage = await context.newPage(); await publicPage.setViewportSize({ width: 390, height: 844 }); await publicPage.goto(decoded);
  await expect(publicPage.getByRole('heading', { name: 'PAL-2026-001' })).toBeVisible();
  await expect(publicPage.getByText('Categoría B', { exact: true })).toBeVisible();
  await expect(publicPage.getByText('70 mm', { exact: true })).toBeVisible();
  await expect(publicPage.getByText('1 fruto', { exact: true })).toBeVisible();
  await expect(publicPage.getByText('REGISTRADO POR EL INSPECTOR', { exact: true })).toBeVisible();
  await expect(publicPage.getByRole('heading', { name: 'Condiciones visibles' })).toBeVisible();
  await expect(publicPage.getByRole('heading', { name: 'Madurez visual estimada' })).toBeVisible();
  await publicPage.getByRole('button', { name: 'Analizada', exact: true }).click();
  await expect(publicPage.locator('.public-photo')).toHaveAttribute('src', analyzedSrc!);
  await expect(publicPage.getByRole('navigation')).toHaveCount(0);
  await expect(publicPage.locator('body')).not.toContainText('Observaciones');
  await publicPage.screenshot({ path: 'test-results/passport-mobile.png', fullPage: true });
  await publicPage.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(publicPage.getByText('Category B', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Resumen de calidad' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'PAL-2026-001', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Buscar lote o inspector' }).fill('NO-EXISTE');
  await expect(page.getByRole('heading', { name: 'No hay inspecciones con estos filtros' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Buscar lote o inspector' }).fill('');
  await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
  await page.getByRole('button', { name: 'PAL-2026-001', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Detalle de inspección' })).toBeVisible();
});

test('carga una fotografía y conserva el trabajo cuando falla la conexión', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/inspector');
  await page.getByRole('button', { name: 'Nueva inspección de lote' }).click(); await page.getByRole('radio').first().check(); await page.getByRole('button', { name: /Continuar a captura/ }).click();
  await page.locator('input[type=file]').setInputFiles('tests/fixtures/palta-validation.jpg');
  await expect(page.getByRole('heading', { name: 'Revisar fotografía' })).toBeVisible();
  await page.route('**/api/inspections', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await page.getByRole('button', { name: /Usar fotografía/ }).click();
  await expect(page.getByRole('alert')).toContainText('No se pudo conectar');
  await expect(page.getByRole('heading', { name: 'Revisar fotografía' })).toBeVisible();
  await page.unroute('**/api/inspections');
  await page.getByRole('button', { name: /Usar fotografía/ }).click();
  await expect(page.getByRole('heading', { name: 'Resultado de inspección' })).toBeVisible();
  await expect(page.getByText('Análisis experimental de esta fotografía. La máscara delimita el fruto, no el área dañada.')).toBeVisible();
});

test('un enlace público inexistente muestra recuperación sin datos privados', async ({ page }) => {
  await page.goto('/p/no-existe'); await expect(page.getByRole('heading', { name: 'Reporte no disponible' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
});

test('la foto de ejemplo permanece como demostración explícita', async ({ page }) => {
  await page.goto('/inspector');
  await page.getByRole('button', { name: 'Nueva inspección de lote' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: /Continuar a captura/ }).click();
  await page.getByRole('button', { name: /Usar fotografía de ejemplo/ }).click();
  await expect(page.getByText(/La fotografía ilustrativa utiliza resultados preparados/)).toBeVisible();
  await page.getByRole('button', { name: /Usar fotografía/ }).click();
  await expect(page.getByRole('heading', { name: 'Resultado de inspección' })).toBeVisible();
  await expect(page.getByText('RECOMENDACIÓN DE DEMOSTRACIÓN', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Condiciones visibles' })).toHaveCount(0);
});

test('sin detecciones se explica incertidumbre y no se declara fruto sano', async ({ page }) => {
  await page.route('**/api/public/sin-detecciones', route => route.fulfill({ json: {
    id: 'sin-detecciones', lot: { id: 'PAL-2026-001', product: 'Palta', variety: 'Hass', company: 'Agroexportadora Demo', origin: 'Chao' },
    photoUrl: '/assets/palta-demo.jpg', photoKind: 'uploaded', status: 'confirmed', confirmedCategory: 'B', inspector: 'Ana Torres',
    createdAt: '2026-10-17T17:00:00Z', confirmedAt: '2026-10-17T17:01:00Z', events: [],
    result: { mode: 'experimental', instances: [], modelVersion: 'test-empty', ripeness: { status: 'uncertain', label: null, score: 0.4, scores: { Ripe: 0.4, Underripe: 0.3, Overripe: 0.3 }, modelVersion: 'test-ripeness', mode: 'experimental' }, count: null, possibleDefects: null, meanDiameterMm: null, suggestedCategory: null }
  } }));
  await page.goto('/p/sin-detecciones');
  await expect(page.getByText(/Sin condiciones detectadas por encima del umbral/)).toBeVisible();
  await expect(page.getByText('Sin una estimación concluyente. Revisa la palta manualmente.', { exact: true })).toBeVisible();
  await expect(page.getByText(/Esto no significa que la palta esté sana/)).toBeVisible();
  await expect(page.locator('body')).not.toContainText('null');
  await expect(page.locator('body')).not.toContainText('undefined');
});

test('una fotografía RGB recibe madurez estimada sin asignar categoría comercial', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/inspector');
  await page.getByRole('button', { name: 'Nueva inspección de lote' }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: /Continuar a captura/ }).click();
  await page.locator('input[type=file]').setInputFiles('tests/fixtures/hass-cinco-etapas.jpg');
  const response = page.waitForResponse(r => r.url().endsWith('/api/inspections') && r.request().method() === 'POST');
  await page.getByRole('button', { name: /Usar fotografía/ }).click();
  const record = await (await response).json();
  expect(['estimated', 'uncertain']).toContain(record.result.ripeness.status);
  expect(record.result.ripeness.labelSchema).toBe('hass_ripening_5');
  expect(record.result.suggestedCategory).toBeNull();
  await expect(page.getByRole('heading', { name: 'Madurez visual estimada' })).toBeVisible();
  if (record.result.ripeness.status === 'estimated') {
    await expect(page.locator('.stage-indicator')).toContainText(`Etapa ${record.result.ripeness.stage} de 5`);
    await expect(page.locator('.ripeness-label')).toBeVisible();
  } else {
    await expect(page.getByText('Sin una estimación concluyente. Revisa la palta manualmente.', { exact: true })).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/madurez-rgb.png', fullPage: true });
});
