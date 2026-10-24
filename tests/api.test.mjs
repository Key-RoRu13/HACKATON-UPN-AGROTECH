import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';

test('recorrido de API, validaciones y persistencia de una inspección de palta', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'agrotrace-api-'));
  const port = 20000 + Math.floor(Math.random() * 20000); const base = `http://127.0.0.1:${port}`;
  let child; let output = '';
  async function start(overrides = {}) {
    child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, SUPABASE_URL: '', SUPABASE_SECRET_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dir, ...overrides }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', d => output += d); child.stderr.on('data', d => output += d);
    for (let i = 0; i < 70; i++) { try { if ((await fetch(base + '/api/health')).ok) return; } catch {} await new Promise(r => setTimeout(r, 50)); }
    throw new Error('El servidor no arrancó: ' + output);
  }
  async function stop() { if (child && child.exitCode === null) { const ended = once(child, 'exit'); child.kill('SIGTERM'); await ended; } }
  async function request(route, data) { const response = await fetch(base + route, data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : undefined); return { status: response.status, data: await response.json() }; }
  t.after(async () => { await stop(); await rm(dir, { recursive: true, force: true }); });
  await start(); let record;
  await t.test('los lotes son de palta y el modo de análisis es explícito', async () => { const result = await request('/api/lots'); assert.equal(result.status, 200); assert.ok(result.data.every(l => l.product === 'Palta')); assert.ok(['experimental', 'unavailable'].includes((await request('/api/health')).data.analysis)); });
  await t.test('rechaza lotes inexistentes y archivos que no son imágenes', async () => { assert.equal((await request('/api/inspections', { lotId: 'NO-EXISTE' })).status, 400); assert.equal((await request('/api/inspections', { lotId: 'PAL-2026-001', photo: 'data:image/jpeg;base64,aGVsbG8=' })).status, 400); });
  await t.test('registra una muestra pendiente sin publicar ni inventar calibre', async () => { const result = await request('/api/inspections', { lotId: 'PAL-2026-001' }); assert.equal(result.status, 201); record = result.data; assert.equal(record.status, 'pending'); assert.equal(record.publicId, null); assert.equal(record.result.meanDiameterMm, null); assert.equal(record.result.mode, 'demonstration'); assert.equal((await request('/api/public/' + record.id)).status, 404); });
  await t.test('exige motivo al modificar y no modifica el registro si falla', async () => { assert.equal((await request(`/api/inspections/${record.id}/confirm`, { action: 'modify', category: 'A', reason: '  ' })).status, 400); assert.equal((await request('/api/inspections/' + record.id)).data.status, 'pending'); });
  await t.test('confirma la clasificación y expone solo los campos públicos', async () => { const result = await request(`/api/inspections/${record.id}/confirm`, { action: 'modify', category: 'A', reason: 'Revisión manual de ejemplo', observations: 'Nota interna de prueba', result: { count: 999 } }); assert.equal(result.status, 200); record = result.data; assert.equal(record.confirmedCategory, 'A'); assert.equal(record.result.count, 12); assert.ok(record.publicId); const pub = await request('/api/public/' + record.publicId); assert.equal(pub.status, 200); assert.equal(pub.data.lot.id, 'PAL-2026-001'); assert.equal(pub.data.confirmedCategory, 'A'); assert.equal(pub.data.result.count, record.result.count); assert.equal(pub.data.events.length, 3); assert.ok(!('observations' in pub.data)); assert.ok(!('reason' in pub.data)); assert.ok(!('lotId' in pub.data)); });
  await t.test('rechaza una segunda confirmación de la misma inspección', async () => { assert.equal((await request(`/api/inspections/${record.id}/confirm`, { action: 'confirm' })).status, 409); });
  await t.test('la retención necesita motivo y no genera pasaporte', async () => { const item = (await request('/api/inspections', { lotId: 'PAL-2026-001' })).data; assert.equal((await request(`/api/inspections/${item.id}/confirm`, { action: 'retain' })).status, 400); const result = await request(`/api/inspections/${item.id}/confirm`, { action: 'retain', reason: 'Segunda evaluación' }); assert.equal(result.status, 200); assert.equal(result.data.status, 'retained'); assert.equal(result.data.publicId, null); assert.equal(result.data.confirmedCategory, null); assert.equal((await request('/api/public/' + item.id)).status, 404); });
  await t.test('el modelo analiza, exige decisión manual y conserva la evidencia publicada', async () => {
    if ((await request('/api/health')).data.analysis !== 'experimental') return;
    const photo = 'data:image/jpeg;base64,' + (await readFile('tests/fixtures/palta-validation.jpg')).toString('base64');
    const requestId = 'abcdabcd-abcd-abcd-abcd-abcdabcdabcd';
    const input = { lotId: 'PAL-2026-001', photo, analysisMode: 'experimental', requestId };
    const result = await request('/api/inspections', input);
    assert.equal(result.status, 201, JSON.stringify(result.data));
    const item = result.data;
    assert.equal(item.result.mode, 'experimental');
    assert.equal(item.logisticsSuggestion.mode, 'simulation');
    assert.ok(['suggested', 'review'].includes(item.logisticsSuggestion.status));
    assert.deepEqual((await request('/api/inspections/' + item.id)).data.logisticsSuggestion, item.logisticsSuggestion);
    assert.equal(item.result.modelVersion, 'defectos-cpu-v1');
    assert.ok(['estimated', 'uncertain'].includes(item.result.ripeness.status));
    assert.match(item.result.ripeness.modelVersion, /^hass-mendeley-/);
    assert.equal(item.result.ripeness.labelSchema, 'hass_ripening_5');
    assert.equal(Object.keys(item.result.ripeness.scores).length, 5);
    assert.equal(item.result.ripeness.mode, 'experimental');
    assert.equal(item.result.count, null); assert.equal(item.result.suggestedCategory, null);
    assert.ok(item.result.instances.length > 0);
    assert.ok(item.analyzedPhotoUrl); assert.notEqual(item.photoUrl, item.analyzedPhotoUrl);
    assert.equal((await fetch(base + item.analyzedPhotoUrl)).status, 200);
    assert.equal((await request(`/api/inspections/${item.id}/confirm`, { action: 'confirm' })).status, 400);
    assert.equal((await request(`/api/inspections/${item.id}/confirm`, { action: 'classify', category: 'B' })).status, 400);
    const duplicate = await request('/api/inspections', input);
    assert.equal(duplicate.status, 200); assert.equal(duplicate.data.id, item.id);
    assert.equal((await request('/api/inspections', { ...input, lotId: 'PAL-2026-002' })).status, 409);
    const confirmed = await request(`/api/inspections/${item.id}/confirm`, { action: 'classify', category: 'B', reason: 'Criterio manual de prueba', observations: 'Nota interna privada' });
    assert.equal(confirmed.status, 200); assert.equal(confirmed.data.confirmedCategory, 'B');
    const pub = (await request('/api/public/' + confirmed.data.publicId)).data;
    assert.ok(!('logisticsSuggestion' in pub));
    assert.deepEqual(pub.result, item.result); assert.equal(pub.analyzedPhotoUrl, item.analyzedPhotoUrl);
    assert.ok(!('reason' in pub)); assert.ok(!('observations' in pub)); assert.ok(!('requestId' in pub));
  });
  await t.test('un fallo de inferencia no registra ni inventa resultados de demostración', async () => {
    const before = (await request('/api/inspections')).data.length;
    const broken = await request('/api/inspections', { lotId: 'PAL-2026-001', photo: 'data:image/jpeg;base64,/9j/', analysisMode: 'experimental' });
    assert.equal(broken.status, 503);
    assert.equal((await request('/api/inspections')).data.length, before);
    assert.equal((await request('/api/inspections', { lotId: 'PAL-2026-001', analysisMode: 'experimental' })).status, 400);
  });
  await t.test('el registro y el enlace público sobreviven a reiniciar el servidor', async () => { await stop(); await start(); const result = await request('/api/public/' + record.publicId); assert.equal(result.status, 200); assert.equal(result.data.confirmedCategory, 'A'); assert.equal((await request('/api/inspections/' + record.id)).data.status, 'confirmed'); });
  await t.test('valida mediciones manuales y conserva el resultado automático separado', async () => {
    const pending = (await request('/api/inspections', { lotId: 'PAL-2026-001' })).data;
    const route = `/api/inspections/${pending.id}/confirm`;
    for (const manualMeasurements of [
      { count: 1, possibleDefects: 2 }, { possibleDefects: 0 }, { count: 1.5 },
      { count: -1 }, { meanDiameterMm: 70 }, { meanDiameterMm: 0, diameterMethod: 'ruler' },
      { meanDiameterMm: 500, diameterMethod: 'caliper' }, { count: '1' }
    ]) {
      assert.equal((await request(route, { action: 'confirm', manualMeasurements })).status, 400);
      assert.equal((await request('/api/inspections/' + pending.id)).data.status, 'pending');
    }
    const confirmed = (await request(route, { action: 'confirm', manualMeasurements: {
      count: 1, possibleDefects: 0, meanDiameterMm: 70, diameterMethod: 'caliper', source: 'automatic', recordedBy: 'Otro usuario'
    } })).data;
    assert.equal(confirmed.result.count, 12);
    assert.equal(confirmed.manualMeasurements.count, 1);
    assert.equal(confirmed.manualMeasurements.possibleDefects, 0);
    assert.equal(confirmed.manualMeasurements.source, 'manual');
    assert.equal(confirmed.manualMeasurements.recordedBy, 'Ana Torres');
    const pub = (await request('/api/public/' + confirmed.publicId)).data;
    assert.deepEqual(pub.manualMeasurements, confirmed.manualMeasurements);
    assert.equal(pub.result.count, 12);
  });
  await t.test('guarda logística simulada, valida entradas y la mantiene fuera del pasaporte', async () => {
    const scenario = { lifeDays: 14, distributionDays: 3, routes: [{ transitDays: 2 }, { transitDays: 12 }] };
    const pending = (await request('/api/inspections', { lotId: 'PAL-2026-001' })).data;
    assert.equal((await request(`/api/inspections/${pending.id}/logistics`, scenario)).status, 409);
    const route = `/api/inspections/${record.id}/logistics`;
    for (const invalid of [{ ...scenario, lifeDays: '14' }, { ...scenario, lifeDays: 0 }, { ...scenario, distributionDays: -1 }, { ...scenario, routes: [{ transitDays: 1.5 }, { transitDays: 12 }] }, { ...scenario, routes: [] }]) {
      assert.equal((await request(route, invalid)).status, 400);
    }
    const saved = await request(route, { ...scenario, mode: 'validated', recordedBy: 'Otro usuario' });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.logisticsScenario.mode, 'simulation');
    assert.equal(saved.data.logisticsScenario.recordedBy, record.inspector);
    assert.deepEqual(saved.data.logisticsScenario.routes.map(r => [r.remainingDays, r.status]), [[9, 'compatible'], [-1, 'insufficient']]);
    assert.deepEqual(saved.data.result, record.result);
    assert.ok(!('logisticsScenario' in (await request('/api/public/' + record.publicId)).data));
    await stop(); await start();
    assert.deepEqual((await request('/api/inspections/' + record.id)).data.logisticsScenario, saved.data.logisticsScenario);
  });
  await t.test('fallar publicación cloud conserva confirmación y permite reintentar sin duplicarla', async () => {
    await stop(); await start({ SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_SERVICE_ROLE_KEY: 'dummy-test-key' });
    const item = (await request('/api/inspections', { lotId: 'PAL-2026-001' })).data;
    const confirmed = await request(`/api/inspections/${item.id}/confirm`, { action: 'confirm' });
    assert.equal(confirmed.status, 200); assert.equal(confirmed.data.status, 'confirmed');
    assert.equal(confirmed.data.publication.status, 'failed');
    const retry = await request(`/api/inspections/${item.id}/publish`, {});
    assert.equal(retry.status, 200); assert.equal(retry.data.publication.status, 'failed');
    assert.equal(retry.data.publicId, confirmed.data.publicId);
    assert.ok(!('publication' in (await request('/api/public/' + confirmed.data.publicId)).data));
    await stop(); await start();
  });
  await t.test('ficha productiva valida fechas, conserva QR y publica solo confirmadas sin historial interno', async () => {
    const lot = (await request('/api/lots')).data.find(l => l.id === 'PAL-2026-001');
    const profile = { company: 'Empresa de prueba', farm: 'Fundo de prueba', location: 'Chao', sector: 'Sector 1', harvestDate: '2026-10-15', packingDate: '2026-10-16', demonstration: true, recordedBy: 'No autorizado' };
    assert.equal((await request(`/api/lots/${lot.id}/profile`, { ...profile, packingDate: '2026-10-14' })).status, 400);
    assert.equal((await request(`/api/lots/${lot.id}/profile`, { ...profile, harvestDate: '2026-02-30' })).status, 400);
    const saved = await request(`/api/lots/${lot.id}/profile`, profile);
    assert.equal(saved.status, 200); assert.equal(saved.data.publication.status, 'local');
    assert.match(saved.data.lot.production.recordedBy, /Ana Torres/);
    await request(`/api/lots/${lot.id}/profile`, { ...profile, sector: 'Sector 2' });
    const pub = (await request('/api/public-lots/' + lot.publicId)).data;
    assert.equal(pub.lot.production.sector, 'Sector 2');
    assert.ok(!('productionHistory' in pub.lot));
    const all = (await request('/api/inspections')).data;
    assert.equal(pub.inspections.length, all.filter(i => i.lotId === lot.id && i.status === 'confirmed').length);
    assert.ok(pub.inspections.every(i => !('reason' in i) && !('photoUrl' in i)));
    assert.equal((await request('/api/public/' + record.publicId)).data.lot.production.sector, 'Sector 2');
    await stop(); await start();
    assert.equal((await request('/api/lots')).data.find(l => l.id === lot.id).publicId, lot.publicId);
    assert.equal((await request('/api/public-lots/' + lot.publicId)).data.lot.production.sector, 'Sector 2');
  });
  await t.test('un servidor sin modelo permite reintentar sin sustituir el análisis', async () => {
    await stop(); await start({ ML_PYTHON: '/no-existe/agrotrace-python' });
    assert.equal((await request('/api/health')).data.analysis, 'unavailable');
    const before = (await request('/api/inspections')).data.length;
    const photo = 'data:image/jpeg;base64,' + (await readFile('tests/fixtures/palta-validation.jpg')).toString('base64');
    const failed = await request('/api/inspections', { lotId: 'PAL-2026-001', photo, analysisMode: 'experimental' });
    assert.equal(failed.status, 503); assert.match(failed.data.error, /modelo no está disponible/);
    assert.equal((await request('/api/inspections')).data.length, before);
  });

});
