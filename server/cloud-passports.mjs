import { readFile } from 'node:fs/promises';
import path from 'node:path';

const serverKey = () => process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
export const cloudConfigured = () => Boolean(process.env.SUPABASE_URL && serverKey());
export async function cloudRequest(route, options = {}) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = serverKey();
  if (!base || !key) throw new Error('Publicación en nube no configurada.');
  const response = await fetch(base + route, { ...options, signal: AbortSignal.timeout(20000), headers: { apikey: key, ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }), ...options.headers } });
  if (!response.ok) throw new Error(`No se pudo completar la operación de publicación (${response.status}).`);
  return response.status === 204 ? null : response.json().catch(() => null);
}
const bucket = 'agrotrace-passports';
export async function publishPassport(publicRecord, { root, dataDir }) {
  if (publicRecord.status !== 'confirmed' || !/^[a-zA-Z0-9-]+$/.test(publicRecord.id)) throw new Error('Solo se publican inspecciones confirmadas.');
  const payload = structuredClone(publicRecord);
  const photoObjects = {};
  for (const field of ['photoUrl', 'analyzedPhotoUrl']) {
    const source = payload[field]; if (!source) continue;
    let file;
    if (/^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(source)) file = path.join(dataDir, 'uploads', path.basename(source));
    else if (source === '/assets/palta-demo.jpg') file = path.join(root, 'apps/web/public/assets/palta-demo.jpg');
    else throw new Error('La fotografía no corresponde a evidencia local permitida.');
    const ext = path.extname(file); const object = `${payload.id}/${field}${ext}`;
    const bytes = await readFile(file);
    await cloudRequest(`/storage/v1/object/${bucket}/${object}`, { method: 'POST', headers: { 'Content-Type': ({ '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' })[ext], 'x-upsert': 'true' }, body: bytes });
    photoObjects[field] = object;
    delete payload[field];
  }
  await cloudRequest('/rest/v1/agrotrace_passports?on_conflict=id', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: payload.id, payload, photo_objects: photoObjects, published_at: new Date().toISOString() }) });
}
export async function readCloudPassport(id) {
  const rows = await cloudRequest(`/rest/v1/agrotrace_passports?id=eq.${encodeURIComponent(id)}&select=payload,photo_objects&limit=1`);
  if (!rows?.length) return null;
  const record = rows[0].payload;
  if (record.status !== 'confirmed') return null;
  for (const [field, object] of Object.entries(rows[0].photo_objects || {})) {
    if (!['photoUrl', 'analyzedPhotoUrl'].includes(field)) continue;
    if (!object.startsWith(id + '/') || !/^[a-zA-Z0-9/._-]+$/.test(object)) throw new Error('Referencia de imagen inválida.');
    const signed = await cloudRequest(`/storage/v1/object/sign/${bucket}/${object}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }) });
    record[field] = new URL('/storage/v1' + signed.signedURL, process.env.SUPABASE_URL).href;
  }
  return record;
}

export async function publishLotPassport(record) {
  // Update only public lot metadata on existing reports; retain their photo objects.
  const rows = await cloudRequest(`/rest/v1/agrotrace_passports?payload->lot->>id=eq.${encodeURIComponent(record.lot.id)}&select=id,payload`);
  for (const row of rows || []) {
    await cloudRequest(`/rest/v1/agrotrace_passports?id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ payload: { ...row.payload, lot: record.lot } }) });
  }
  const publishedIds = new Set((rows || []).map(r => r.id));
  const payload = { ...record, inspections: record.inspections.filter(i => publishedIds.has(i.id)) };
  await cloudRequest('/rest/v1/rikuy_lot_passports?on_conflict=id', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: record.lot.publicId, payload, published_at: new Date().toISOString() }) });
}
export async function readCloudLot(id) {
  const rows = await cloudRequest(`/rest/v1/rikuy_lot_passports?id=eq.${encodeURIComponent(id)}&select=payload&limit=1`);
  return rows?.[0]?.payload || null;
}
