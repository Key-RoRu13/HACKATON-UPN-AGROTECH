const base = process.env.LOCAL_API_ORIGIN || 'http://127.0.0.1:3001';
const response = await fetch(base + '/api/inspections');
if (!response.ok) throw new Error('No se pudo consultar el servidor local.');
const records = (await response.json()).filter(record => record.status === 'confirmed');
let failures = 0;
for (const record of records) {
  const result = await fetch(`${base}/api/inspections/${record.id}/publish`, { method: 'POST' });
  const saved = await result.json();
  const published = result.ok && saved.publication?.status === 'published';
  if (!published) failures++;
  if (saved.publication?.lotStatus === 'failed') { failures++; console.log('Inspección publicada; actualización del lote pendiente. Revisa la tabla rikuy_lot_passports.'); }
  console.log(`${record.lotId} · ${record.id} · ${published ? 'publicado' : 'pendiente de publicación'}`);
}
if (failures) process.exitCode = 1;
