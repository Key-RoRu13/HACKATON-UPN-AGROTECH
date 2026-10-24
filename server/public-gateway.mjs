// Exposes only published passports. Internal inspection APIs remain local.
import http from 'node:http';
const upstream = process.env.INTERNAL_ORIGIN || 'http://127.0.0.1:3001';
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, upstream);
    const allowed = req.method === 'GET' && (['/', '/consultar', '/escanear'].includes(url.pathname) || /^\/(p|l)\/[a-zA-Z0-9-]+$/.test(url.pathname) || /^\/api\/(public|public-lots)\/[a-zA-Z0-9-]+$/.test(url.pathname) || /^\/assets\/[a-zA-Z0-9._-]+$/.test(url.pathname));
    let allowedPhoto = false;
    if (req.method === 'GET' && /^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(url.pathname)) {
      const records = await fetch(upstream + '/api/inspections').then(r => r.json());
      allowedPhoto = records.some(r => r.status === 'confirmed' && r.publicId && [r.photoUrl, r.analyzedPhotoUrl].includes(url.pathname));
    }
    if (!allowed && !allowedPhoto) { res.writeHead(404); res.end('Reporte no disponible. Abre el enlace completo del QR.'); return; }
    const response = await fetch(upstream + (url.pathname === '/' ? '/consultar' : url.pathname), { redirect: 'error', signal: AbortSignal.timeout(15000) });
    res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(503); res.end('Reporte temporalmente no disponible. Vuelve a intentarlo.'); }
});
server.listen(Number(process.env.PUBLIC_PORT || 3002), '127.0.0.1', () => console.log('Pasaportes públicos: http://127.0.0.1:' + (process.env.PUBLIC_PORT || 3002)));
