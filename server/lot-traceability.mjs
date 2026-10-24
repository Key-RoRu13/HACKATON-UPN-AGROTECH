export function productionProfile(input, recordedAt) {
  if (!input || typeof input !== 'object') throw new Error('Completa la ficha productiva.');
  const text = (key, max = 180) => { if (typeof input[key] !== 'string' || input[key].trim().length > max) throw new Error(`Campo no válido: ${key}.`); return input[key].trim(); };
  const company = text('company'); const farm = text('farm'); const location = text('location'); const sector = text('sector');
  if (!company || !farm || !location) throw new Error('Indica empresa, fundo y ubicación.');
  const date = key => { const value = text(key, 10); if (!value) return null; if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(value).toISOString().slice(0,10) !== value) throw new Error('Fecha no válida.'); return value; };
  const harvestDate = date('harvestDate'); const packingDate = date('packingDate');
  if (harvestDate && packingDate && packingDate < harvestDate) throw new Error('El empaque no puede ser anterior a la cosecha.');
  if (typeof input.demonstration !== 'boolean') throw new Error('Indica la procedencia de los datos.');
  return { company, production: { farm, location, sector, harvestDate, packingDate, demonstration: input.demonstration, source: 'declared', recordedBy: 'Ana Torres · sesión de demostración', recordedAt } };
}
export function publicLot(lot) {
  return { id: lot.id, publicId: lot.publicId, product: lot.product, variety: lot.variety, origin: lot.origin, company: lot.company, production: lot.production };
}
export function lotPassport(lot, inspections) {
  return { lot: publicLot(lot), inspections: inspections.filter(i => i.lotId === lot.id && i.status === 'confirmed' && i.publicId).sort((a,b) => b.confirmedAt.localeCompare(a.confirmedAt)).map(i => ({ id: i.publicId, confirmedAt: i.confirmedAt, confirmedCategory: i.confirmedCategory, inspector: i.inspector })), updatedAt: lot.production?.recordedAt || null };
}
