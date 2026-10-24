import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publishPassport, readCloudPassport } from '../server/cloud-passports.mjs';
import handler from '../api/passport.mjs';

function env(t, key, value) { const previous = process.env[key]; process.env[key] = value; t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; }); }

test('publicación y lectura cloud: fotos privadas firmadas y payload confirmado', async t => {
  env(t, 'SUPABASE_SECRET_KEY', '');
  env(t, 'SUPABASE_URL', 'https://test.supabase.co');
  env(t, 'SUPABASE_SERVICE_ROLE_KEY', 'dummy-test-server-key');
  let stored; const uploads = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(init.headers.apikey, 'dummy-test-server-key');
    if (url.includes('/object/sign/')) return new Response(JSON.stringify({ signedURL: '/object/sign/agrotrace-passports/report/photoUrl.jpg?token=test' }));
    if (url.includes('/storage/v1/object/')) { uploads.push(url); return new Response('{}'); }
    if (init.method === 'POST') { stored = JSON.parse(init.body); return new Response(null, { status: 204 }); }
    return new Response(JSON.stringify(stored ? [stored] : []));
  });
  const input = { id: 'report', status: 'confirmed', lot: { id: 'PAL-2026-001' }, confirmedCategory: 'B', photoUrl: '/assets/palta-demo.jpg' };
  await publishPassport(input, { root: process.cwd(), dataDir: '/unused' });
  assert.equal(uploads.length, 1); assert.ok(!('photoUrl' in stored.payload));
  assert.equal(stored.photo_objects.photoUrl, 'report/photoUrl.jpg');
  assert.equal(input.photoUrl, '/assets/palta-demo.jpg');
  const read = await readCloudPassport('report');
  assert.equal(read.confirmedCategory, 'B');
  assert.match(read.photoUrl, /^https:\/\/test.supabase.co\/storage\/v1\/object\/sign\//);
  await assert.rejects(publishPassport({ ...input, status: 'pending' }, { root: process.cwd() }));
  await assert.rejects(publishPassport({ ...input, photoUrl: '/../../.env' }, { root: process.cwd() }));
});

test('función pública rechaza escritura, ID inválido y oculta errores de proveedor', async t => {
  const response = () => ({ code: 0, body: null, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  let res = response(); await handler({ method: 'POST', query: { id: 'test' } }, res); assert.equal(res.code, 405);
  res = response(); await handler({ method: 'GET', query: { id: '../secret' } }, res); assert.equal(res.code, 400);
  env(t, 'SUPABASE_SECRET_KEY', '');
  env(t, 'SUPABASE_URL', ''); env(t, 'SUPABASE_SERVICE_ROLE_KEY', '');
  res = response(); await handler({ method: 'GET', query: { id: 'test' } }, res); assert.equal(res.code, 503); assert.ok(!JSON.stringify(res.body).includes('SUPABASE'));
});

 test('clave secreta nueva usa apikey sin Bearer inválido', async t => {
  env(t, 'SUPABASE_URL', 'https://test.supabase.co');
  env(t, 'SUPABASE_SECRET_KEY', 'sb_secret_dummy-test');
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(init.headers.apikey, 'sb_secret_dummy-test');
    assert.equal(init.headers.Authorization, undefined);
    return new Response('[]');
  });
  assert.equal(await readCloudPassport('test'), null);
});

test('publica lote con perfiles actuales, sin listar inspecciones aún no publicadas', async t => {
  const { publishLotPassport, readCloudLot } = await import('../server/cloud-passports.mjs');
  env(t, 'SUPABASE_URL', 'https://test.supabase.co'); env(t, 'SUPABASE_SECRET_KEY', 'sb_secret_test');
  const patches = []; let lotRow;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (url.includes('rikuy_lot_passports')) {
      if (init.method === 'POST') { lotRow = JSON.parse(init.body); return new Response(null, { status: 204 }); }
      return new Response(JSON.stringify([lotRow]));
    }
    if (init.method === 'PATCH') { patches.push(JSON.parse(init.body)); return new Response(null, { status: 204 }); }
    return new Response(JSON.stringify([{ id: 'published', payload: { status: 'confirmed', lot: { id: 'PAL-2026-001' }, result: { mode: 'experimental' } } }]));
  });
  const record = { lot: { id: 'PAL-2026-001', publicId: 'lot-public', production: { farm: 'Fundo' } }, inspections: [{ id: 'published' }, { id: 'not-published' }] };
  await publishLotPassport(record);
  assert.deepEqual(lotRow.payload.inspections, [{ id: 'published' }]);
  assert.equal(patches[0].payload.lot.production.farm, 'Fundo');
  assert.ok(!('photo_objects' in patches[0]));
  assert.deepEqual(await readCloudLot('lot-public'), lotRow.payload);
});
