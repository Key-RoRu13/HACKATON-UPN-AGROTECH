import http from 'node:http';
import { readFile, writeFile, mkdir, rename, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { analyzePhoto, modelAvailable } from './analysis.mjs';
import { cloudConfigured, publishPassport, publishLotPassport } from './cloud-passports.mjs';
import { productionProfile, publicLot, lotPassport } from './lot-traceability.mjs';
import { evaluateLogistics, suggestLogistics } from './logistics.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, '.data'));
const uploadDir = path.join(dataDir, 'uploads');
const dbFile = path.join(dataDir, 'records.json');
const dist = path.join(root, 'apps/web/dist');
await mkdir(uploadDir, { recursive: true });
const now = new Date().toISOString();
const lots = [
  { id: 'PAL-2026-001', product: 'Palta', variety: 'Hass', origin: 'Fundo San José, Chao, La Libertad, Perú', company: 'Agroexportadora Demo' },
  { id: 'PAL-2026-002', product: 'Palta', variety: 'Hass', origin: 'Fundo San José, Chao, La Libertad, Perú', company: 'Agroexportadora Demo' }
];
const demoResult = { count: 12, possibleDefects: 2, meanDiameterMm: null, suggestedCategory: 'B', mode: 'demonstration', explanation: 'Resultado preparado para demostrar la revisión de una muestra de palta. No procede de un modelo de visión.' };
let db;
try { db = JSON.parse(await readFile(dbFile, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  db = { lots, inspections: [{ id: 'demo-pal-002', lotId: lots[1].id, product: 'Palta', photoUrl: '/assets/palta-demo.jpg', photoKind: 'illustration', result: demoResult, status: 'confirmed', confirmedCategory: 'B', inspector: 'Ana Torres', observations: 'Registro inicial de demostración.', reason: '', createdAt: now, confirmedAt: now, publicId: 'palta-demo', events: [{ label: 'Muestra de demostración registrada', at: now }, { label: 'Resultado preparado consultado', at: now }, { label: 'Clasificación confirmada por Ana Torres', at: now }] }] };
  await writeFile(dbFile, JSON.stringify(db, null, 2));
}
let mutationQueue = Promise.resolve();
function mutate(action) {
  const result = mutationQueue.then(async () => {
    const draft = structuredClone(db);
    const value = await action(draft);
    const temporary = dbFile + '.tmp';
    await writeFile(temporary, JSON.stringify(draft, null, 2));
    await rename(temporary, dbFile);
    db = draft;
    return value;
  });
  mutationQueue = result.catch(() => {});
  return result;
}
// Non-destructive migration: stable public identifier for each existing lot.
if (db.lots.some(l => !l.publicId)) await mutate(draft => { for (const lot of draft.lots) lot.publicId ||= randomUUID(); });
function fail(status, message) { const e = new Error(message); e.status = status; throw e; }
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
async function body(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 9 * 1024 * 1024) fail(413, 'La fotografía supera el máximo de 6 MB.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { fail(400, 'Solicitud JSON no válida.'); }
}
function joined(record) { const { requestId, requestHash, ...visible } = record; return { ...visible, lot: db.lots.find(l => l.id === record.lotId) }; }
function publicRecord(record) {
  const lot = db.lots.find(l => l.id === record.lotId);
  return { id: record.publicId, lot: publicLot(lot), product: record.product, photoUrl: record.photoUrl, analyzedPhotoUrl: record.analyzedPhotoUrl, photoKind: record.photoKind, result: record.result, manualMeasurements: record.manualMeasurements, confirmedCategory: record.confirmedCategory, status: 'confirmed', createdAt: record.createdAt, confirmedAt: record.confirmedAt, inspector: record.inspector, events: record.events, demonstration: true };
}
async function publishRecord(record) {
  if (!cloudConfigured() || record.status !== 'confirmed') return record;
  let publication;
  try {
    await publishPassport(publicRecord(record), { root, dataDir });
    publication = { status: 'published', at: new Date().toISOString(), lotStatus: 'published' };
    try { await publishLotPassport(lotPassport(db.lots.find(l => l.id === record.lotId), db.inspections)); }
    catch { publication.lotStatus = 'failed'; }
  }
  catch { publication = { status: 'failed', at: new Date().toISOString() }; }
  return mutate(draft => { const item = draft.inspections.find(i => i.id === record.id); item.publication = publication; return item; });
}
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
async function serveFile(res, file) { const bytes = await readFile(file); res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }); res.end(bytes); }
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/config') return json(res, 200, { publicBaseUrl: process.env.PUBLIC_BASE_URL || '' });
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, analysis: await modelAvailable() ? 'experimental' : 'unavailable', demonstrationAvailable: true, authentication: false });
    if (req.method === 'GET' && url.pathname === '/api/lots') return json(res, 200, db.lots);
    const profile = /^\/api\/lots\/([^/]+)\/profile$/.exec(url.pathname);
    if (req.method === 'POST' && profile) {
      const input = await body(req); let validated;
      try { validated = productionProfile(input, new Date().toISOString()); } catch (error) { fail(400, error.message); }
      const lot = await mutate(draft => {
        const item = draft.lots.find(l => l.id === profile[1]); if (!item) fail(404, 'Lote no encontrado.');
        item.productionHistory ||= [];
        if (item.production) item.productionHistory.push({ company: item.company, production: item.production });
        item.company = validated.company; item.production = validated.production;
        item.origin = `${validated.production.farm}, ${validated.production.location}`;
        return item;
      });
      let publication = { status: 'local' };
      if (cloudConfigured()) {
        try { await publishLotPassport(lotPassport(lot, db.inspections)); publication = { status: 'published' }; }
        catch { publication = { status: 'failed' }; }
      }
      return json(res, 200, { lot: publicLot(lot), publication });
    }
    const publishLot = /^\/api\/lots\/([^/]+)\/publish$/.exec(url.pathname);
    if (req.method === 'POST' && publishLot) {
      const lot = db.lots.find(l => l.id === publishLot[1]); if (!lot) fail(404, 'Lote no encontrado.');
      if (!cloudConfigured()) fail(503, 'Publicación en nube no configurada.');
      try { await publishLotPassport(lotPassport(lot, db.inspections)); } catch { fail(503, 'La ficha está guardada. No se pudo publicar; comprueba la tabla de lotes en Supabase y reintenta.'); }
      return json(res, 200, { status: 'published' });
    }
    const lotPublic = /^\/api\/public-lots\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'GET' && lotPublic) {
      const lot = db.lots.find(l => l.publicId === lotPublic[1]); if (!lot) fail(404, 'Lote no encontrado.');
      return json(res, 200, lotPassport(lot, db.inspections));
    }
    if (req.method === 'GET' && url.pathname === '/api/inspections') return json(res, 200, db.inspections.map(joined).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    if (req.method === 'POST' && url.pathname === '/api/inspections') {
      const input = await body(req);
      if (!db.lots.some(l => l.id === input.lotId)) fail(400, 'Selecciona un lote válido.');
      if (input.analysisMode && !['experimental', 'demonstration'].includes(input.analysisMode)) fail(400, 'Modo de análisis no válido.');
      const experimental = input.photo && input.analysisMode !== 'demonstration';
      if (input.analysisMode === 'experimental' && !input.photo) fail(400, 'Carga una fotografía para utilizar el modelo.');
      const requestId = input.requestId;
      if (requestId && (typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(requestId))) fail(400, 'Identificador de solicitud no válido.');
      const requestHash = createHash('sha256').update(JSON.stringify([input.lotId, input.photo || null, !!experimental])).digest('hex');
      const previous = requestId && db.inspections.find(i => i.requestId === requestId);
      if (previous) { if (previous.requestHash !== requestHash) fail(409, 'La solicitud ya corresponde a otra fotografía.'); return json(res, 200, joined(previous)); }
      let photoUrl = '/assets/palta-demo.jpg';
      let photoKind = 'illustration';
      if (input.photo) {
        if (typeof input.photo !== 'string') fail(400, 'Fotografía no válida.');
        const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(input.photo);
        if (!match) fail(400, 'Usa una fotografía JPG, PNG o WebP.');
        const bytes = Buffer.from(match[2], 'base64');
        if (bytes.length > 6 * 1024 * 1024) fail(413, 'La fotografía supera el máximo de 6 MB.');
        const valid = match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
        if (!valid) fail(400, 'El contenido del archivo no corresponde a una imagen válida.');
        const name = randomUUID() + '.' + (match[1] === 'jpeg' ? 'jpg' : match[1]);
        await writeFile(path.join(uploadDir, name), bytes); photoUrl = '/uploads/' + name; photoKind = 'uploaded';
      }
      let analysis = { result: { ...demoResult } };
      try { if (experimental) analysis = await analyzePhoto(path.join(uploadDir, path.basename(photoUrl)), uploadDir, dataDir); }
      catch (error) { if (photoKind === 'uploaded') await rm(path.join(uploadDir, path.basename(photoUrl)), { force: true }); throw error; }
      const record = await mutate(draft => {
        const existing = requestId && draft.inspections.find(i => i.requestId === requestId);
        if (existing) { if (existing.requestHash !== requestHash) fail(409, 'La solicitud ya corresponde a otra fotografía.'); return existing; }
        const at = new Date().toISOString();
        const item = { id: randomUUID(), requestId, requestHash, lotId: input.lotId, product: 'Palta', photoUrl, photoKind, ...analysis, status: 'pending', confirmedCategory: null, inspector: 'Ana Torres', createdAt: at, publicId: null, events: [{ label: photoKind === 'uploaded' ? 'Fotografía cargada' : 'Fotografía ilustrativa seleccionada', at }, { label: experimental ? 'Análisis experimental de condiciones visibles completado' : 'Resultado de demostración preparado', at }] };
        if (experimental) item.logisticsSuggestion = { ...suggestLogistics(item.result), recordedAt: at };
        if (['estimated', 'uncertain'].includes(item.result.ripeness?.status)) item.events.push({ label: 'Estimación visual de madurez registrada', at });
        draft.inspections.unshift(item); return item;
      });
      return json(res, 201, joined(record));
    }
    const logistics = /^\/api\/inspections\/([^/]+)\/logistics$/.exec(url.pathname);
    if (req.method === 'POST' && logistics) {
      const input = await body(req);
      let scenario;
      try { scenario = evaluateLogistics(input); } catch (error) { fail(400, error.message); }
      const saved = await mutate(draft => {
        const item = draft.inspections.find(i => i.id === logistics[1]);
        if (!item) fail(404, 'Inspección no encontrada.');
        if (item.status !== 'confirmed') fail(409, 'Confirma la inspección antes de guardar la simulación logística.');
        item.logisticsScenario = { ...scenario, recordedAt: new Date().toISOString(), recordedBy: item.inspector };
        return item;
      });
      return json(res, 200, joined(saved));
    }
    const confirm = /^\/api\/inspections\/([^/]+)\/confirm$/.exec(url.pathname);
    if (req.method === 'POST' && confirm) {
      const input = await body(req);
      if (!['confirm', 'modify', 'retain', 'classify'].includes(input.action)) fail(400, 'Acción de clasificación no válida.');
      if (['reason', 'observations'].some(key => input[key] !== undefined && typeof input[key] !== 'string')) fail(400, 'El motivo y las observaciones deben ser texto.');
      if (input.action !== 'confirm' && (typeof input.reason !== 'string' || !input.reason.trim())) fail(400, 'Indica un motivo para modificar o retener la inspección.');
      if (['modify', 'classify'].includes(input.action) && !['A', 'B', 'C'].includes(input.category)) fail(400, 'Selecciona una categoría válida.');
      if (typeof input.reason === 'string' && input.reason.length > 1000 || typeof input.observations === 'string' && input.observations.length > 1000) fail(400, 'El texto no puede superar los 1000 caracteres.');
      let measurements;
      if (input.manualMeasurements !== undefined) {
        const m = input.manualMeasurements;
        if (!m || typeof m !== 'object' || Array.isArray(m)) fail(400, 'Mediciones manuales no válidas.');
        const { count = null, possibleDefects = null, meanDiameterMm = null, diameterMethod = null } = m;
        if (count !== null && (!Number.isInteger(count) || count < 1 || count > 10000)) fail(400, 'El conteo manual debe ser un entero entre 1 y 10000.');
        if (possibleDefects !== null && (!Number.isInteger(possibleDefects) || possibleDefects < 0 || count === null || possibleDefects > count)) fail(400, 'Los defectos observados requieren un conteo total y no pueden superarlo.');
        if (meanDiameterMm !== null && (typeof meanDiameterMm !== 'number' || !Number.isFinite(meanDiameterMm) || meanDiameterMm <= 0 || meanDiameterMm > 300)) fail(400, 'El diámetro debe ser mayor que 0 y no superar 300 mm.');
        if (meanDiameterMm !== null && !['caliper', 'ruler'].includes(diameterMethod)) fail(400, 'Indica el instrumento usado para medir el diámetro.');
        if ([count, possibleDefects, meanDiameterMm].some(v => v !== null)) measurements = { count, possibleDefects, meanDiameterMm, diameterMethod: meanDiameterMm === null ? null : diameterMethod, source: 'manual' };
      }
      const record = await mutate(draft => {
        const item = draft.inspections.find(i => i.id === confirm[1]);
        if (!item) fail(404, 'No se encontró la inspección.');
        if (item.status !== 'pending') fail(409, 'Esta inspección ya fue revisada. Actualiza el registro.');
        if (input.action === 'confirm' && !item.result.suggestedCategory) fail(400, 'Este análisis no recomienda una categoría comercial. Selecciona la clasificación manualmente.');
        item.status = input.action === 'retain' ? 'retained' : 'confirmed';
        item.confirmedCategory = input.action === 'retain' ? null : ['modify', 'classify'].includes(input.action) ? input.category : item.result.suggestedCategory;
        item.reason = input.reason?.trim() || ''; item.observations = input.observations?.trim() || '';
        item.confirmedAt = new Date().toISOString(); item.publicId = item.status === 'confirmed' ? randomUUID() : null;
        if (measurements) item.manualMeasurements = { ...measurements, recordedBy: item.inspector, recordedAt: item.confirmedAt };
        item.events.push({ label: item.status === 'confirmed' ? 'Clasificación confirmada por Ana Torres' : 'Retenida para evaluación por Ana Torres', at: item.confirmedAt });
        return item;
      });
      return json(res, 200, joined(await publishRecord(record)));
    }
    const publication = /^\/api\/inspections\/([^/]+)\/publish$/.exec(url.pathname);
    if (req.method === 'POST' && publication) {
      const item = db.inspections.find(i => i.id === publication[1]);
      if (!item) fail(404, 'Inspección no encontrada.');
      if (item.status !== 'confirmed') fail(409, 'Solo se publican inspecciones confirmadas.');
      if (!cloudConfigured()) fail(503, 'Configura Supabase antes de publicar.');
      return json(res, 200, joined(await publishRecord(item)));
    }
    const detail = /^\/api\/inspections\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'GET' && detail) { const item = db.inspections.find(i => i.id === detail[1]); if (!item) fail(404, 'Inspección no encontrada.'); return json(res, 200, joined(item)); }
    const passport = /^\/api\/public\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'GET' && passport) { const item = db.inspections.find(i => i.publicId === passport[1] && i.status === 'confirmed'); if (!item) fail(404, 'Este reporte no existe o todavía no está publicado.'); return json(res, 200, publicRecord(item)); }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Recurso no encontrado.' });
    if (url.pathname.startsWith('/uploads/')) {
      const name = url.pathname.slice(9); if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(name)) fail(404, 'Imagen no encontrada.');
      try { return await serveFile(res, path.join(uploadDir, name)); } catch { fail(404, 'Imagen no encontrada.'); }
    }
    if (!['GET', 'HEAD'].includes(req.method)) fail(405, 'Método no permitido.');
    const target = path.resolve(dist, '.' + decodeURIComponent(url.pathname));
    if (!target.startsWith(dist + path.sep) && target !== dist) fail(404, 'Recurso no encontrado.');
    try { if ((await stat(target)).isFile()) return await serveFile(res, target); } catch {}
    if (path.extname(url.pathname)) fail(404, 'Archivo no encontrado.');
    try { return await serveFile(res, path.join(dist, 'index.html')); } catch { return json(res, 503, { error: 'Ejecuta npm run build o utiliza el servidor de desarrollo en el puerto 5173.' }); }
  } catch (error) { if (!error.status) console.error(error); if (!res.headersSent) json(res, error.status || 500, { error: error.status ? error.message : 'No se pudo guardar la operación. Vuelve a intentarlo.' }); }
});
server.listen(Number(process.env.PORT || 3001), process.env.HOST || '0.0.0.0', () => console.log(`RIKUY API y web: http://localhost:${process.env.PORT || 3001}`));
