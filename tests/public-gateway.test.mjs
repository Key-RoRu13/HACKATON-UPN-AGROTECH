import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('puerta pública: permite pasaporte y fotos confirmadas, bloquea administración y escrituras', async t => {
  const photo = '/uploads/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg';
  const upstream = http.createServer((req, res) => {
    if (req.url === '/api/inspections') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify([{ status: 'confirmed', publicId: 'visible', photoUrl: photo }])); }
    res.setHeader('Content-Type', 'text/plain'); res.end('public-content');
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const reservation = http.createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ['server/public-gateway.mjs'], { env: { ...process.env, PUBLIC_PORT: String(port), INTERNAL_ORIGIN: `http://127.0.0.1:${upstream.address().port}` }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { if (child.exitCode === null) { const ended = once(child, 'exit'); child.kill(); await ended; } await new Promise(resolve => upstream.close(resolve)); });
  await once(child.stdout, 'data');
  const base = `http://127.0.0.1:${port}`;
  for (const route of ['/p/visible', '/api/public/visible', '/assets/app.js', photo]) assert.equal((await fetch(base + route)).status, 200);
  for (const route of ['/dashboard', '/inspector', '/api/inspections', '/api/lots', '/api/config', '/uploads/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.jpg']) assert.equal((await fetch(base + route)).status, 404);
  assert.equal((await fetch(base + '/api/public/visible', { method: 'POST' })).status, 404);
});
