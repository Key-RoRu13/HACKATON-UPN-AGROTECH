import { readCloudPassport, readCloudLot } from '../server/cloud-passports.mjs';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });
  const id = req.query.id;
  if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(id)) return res.status(400).json({ error: 'Identificador no válido.' });
  try {
    const record = await (req.query.kind === 'lot' ? readCloudLot(id) : readCloudPassport(id));
    if (!record) return res.status(404).json({ error: 'Este reporte no existe o todavía no está publicado.' });
    return res.status(200).json(record);
  } catch { return res.status(503).json({ error: 'No se pudo consultar el reporte. Vuelve a intentarlo.' }); }
}
