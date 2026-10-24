export type LogisticsSuggestion = { mode: 'simulation'; ruleVersion: string; sourceModelVersion: string | null; status: 'suggested' | 'review'; scenario: 'A' | 'B' | 'C' | null; lifeDays: number | null; reason: string; recordedAt: string };
export type LogisticsScenario = { mode: 'simulation'; ruleVersion: string; lifeDays: number; distributionDays: number; routes: { name: string; transitDays: number; remainingDays: number; status: 'compatible' | 'review' | 'insufficient' }[]; recordedAt: string; recordedBy: string };
export type ManualMeasurements = { count: number | null; possibleDefects: number | null; meanDiameterMm: number | null; diameterMethod: 'caliper' | 'ruler' | null; source: 'manual'; recordedBy: string; recordedAt: string };
export type ProductionProfile = { farm: string; location: string; sector: string; harvestDate: string | null; packingDate: string | null; demonstration: boolean; source: 'declared'; recordedBy: string; recordedAt: string };
export type LotPassport = { lot: Lot; inspections: { id: string; confirmedAt: string; confirmedCategory: string; inspector: string }[]; updatedAt: string | null };
export type Lot = { publicId?: string; production?: ProductionProfile; id: string; product: string; variety: string; origin: string; company: string };
export type Result = { count: number | null; possibleDefects: number | null; meanDiameterMm: number | null; suggestedCategory: string | null; mode: string; explanation: string; modelVersion?: string; elapsedMs?: number; instances?: { classId: number; className: string; confidence: number; polygon: number[][] }[]; warnings?: string[]; ripeness?: { status: 'estimated' | 'uncertain' | 'error' | 'unavailable'; label?: string | null; score?: number; scores?: Record<string, number>; modelVersion?: string; mode: string; threshold?: number; labelSchema?: string; stage?: number | null; datasetSource?: string } };
export type Inspection = { publication?: { status: 'published' | 'failed'; at: string; lotStatus?: 'published' | 'failed' }; logisticsSuggestion?: LogisticsSuggestion; logisticsScenario?: LogisticsScenario; id: string; lotId: string; lot: Lot; product: string; photoUrl: string; analyzedPhotoUrl?: string; photoKind: 'illustration' | 'uploaded'; result: Result; manualMeasurements?: ManualMeasurements; status: 'pending' | 'confirmed' | 'retained'; confirmedCategory: string | null; inspector: string; observations?: string; reason?: string; createdAt: string; confirmedAt?: string; publicId: string | null; events: { label: string; at: string }[] };
export type PublicRecord = Omit<Inspection, 'lotId' | 'observations' | 'reason' | 'publicId' | 'logisticsScenario' | 'logisticsSuggestion' | 'publication'> & { demonstration: boolean };
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch('/api' + path, { ...init, signal: init?.signal || AbortSignal.timeout(75000), headers: { 'Content-Type': 'application/json', ...init?.headers } }); }
  catch { throw new Error('No se pudo conectar. Comprueba la conexión y vuelve a intentarlo.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'No se pudo completar la operación.');
  return data as T;
}
export function newRequestId() {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export const date = (value: string) => new Date(value).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
export const time = (value: string) => new Date(value).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
export const measurementsFor = (record: Inspection) => record.manualMeasurements || record.result;
export const defectPercent = (result: Pick<Result, 'count' | 'possibleDefects'>) => result.count && result.possibleDefects !== null ? (result.possibleDefects / result.count * 100).toLocaleString('es-PE', { maximumFractionDigits: 1 }) + ' %' : 'No disponible';
let publicBaseUrl = '';
export function setPublicBaseUrl(value: string) {
  try { const url = new URL(value); publicBaseUrl = url.protocol === 'https:' ? url.origin : ''; } catch { publicBaseUrl = ''; }
}
export const publicUrl = (id: string) => `${publicBaseUrl || window.location.origin}/p/${encodeURIComponent(id)}`;
export const publicLotUrl = (id: string) => `${publicBaseUrl || window.location.origin}/l/${encodeURIComponent(id)}`;
export async function shareLink(url: string): Promise<string> {
  if (navigator.share) { try { await navigator.share({ title: 'RIKUY · Reporte de palta', url }); return 'Enlace compartido'; } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return ''; } }
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); return 'Enlace copiado'; }
  return 'Selecciona y copia el enlace que aparece debajo del QR.';
}

export function ripenessLabel(result: Result) {
  const r = result.ripeness;
  if (!r || r.status === 'unavailable' || r.status === 'error') return 'Sin estimación';
  if (r.status !== 'estimated' || !r.label) return 'Revisión manual';
  return ripenessClassName(r.label);
}

export function ripenessClassName(label: string, en = false) {
  const labels: Record<string, [string, string]> = {
    Overripe: ['Sobremadura', 'Overripe'], Ripe: ['Madura', 'Ripe'], Underripe: ['Inmadura', 'Underripe'],
    '01_Underripe': ['Inmadura', 'Underripe'], '02_Breaking': ['Inicio de maduración', 'Breaking'],
    '03_Ripe_I': ['Madura · fase I', 'Ripe · phase I'], '04_Ripe_II': ['Madura · fase II', 'Ripe · phase II'],
    '05_Overripe': ['Sobremadura', 'Overripe']
  };
  return labels[label]?.[en ? 1 : 0] || label;
}
