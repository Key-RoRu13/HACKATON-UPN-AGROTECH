import { useState } from 'react';
import { CheckCircle2, CircleAlert, Truck, XCircle } from 'lucide-react';
import { api, date, time, ripenessLabel, type Inspection } from '../lib/api';
import { Button, Notice } from './ui';

export default function LogisticsPanel({ record, refresh }: { record: Inspection; refresh: () => Promise<void> }) {
  const saved = record.logisticsScenario;
  const [life, setLife] = useState(String(saved?.lifeDays ?? record.logisticsSuggestion?.lifeDays ?? 14));
  const [distribution, setDistribution] = useState(String(saved?.distributionDays ?? 3));
  const [near, setNear] = useState(String(saved?.routes[0].transitDays ?? 2));
  const [far, setFar] = useState(String(saved?.routes[1].transitDays ?? 12));
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const presets = [{ id: 'A', days: 14, title: 'Mayor margen', description: 'Explorar traslado largo' }, { id: 'B', days: 7, title: 'Margen intermedio', description: 'Priorizar destino cercano' }, { id: 'C', days: 3, title: 'Menor margen', description: 'Revisar distribución rápida' }];
  const dirty = saved && (Number(life) !== saved.lifeDays || Number(distribution) !== saved.distributionDays || Number(near) !== saved.routes[0].transitDays || Number(far) !== saved.routes[1].transitDays);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await api(`/inspections/${record.id}/logistics`, { method: 'POST', body: JSON.stringify({ lifeDays: Number(life), distributionDays: Number(distribution), routes: [{ transitDays: Number(near) }, { transitDays: Number(far) }] }) });
      await refresh(); setMessage('Escenario simulado guardado en esta inspección.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="card logistics-panel" aria-label="Evaluación logística simulada">
    <div className="section-title"><h2><Truck size={22}/> Evaluación logística</h2><span className="demo-pill">SIMULACIÓN</span></div>
    <p>Compara destinos usando días de ejemplo. La vida útil no se calcula desde la fotografía.</p>{!saved && record.logisticsSuggestion?.status === 'suggested' && <p className="caption">Vida útil precargada desde el escenario logístico {record.logisticsSuggestion.scenario}, pendiente de revisión. Puedes ajustar los parámetros antes de guardar.</p>}
    <div className="logistics-context"><span>Lote <strong>{record.lotId}</strong></span><span>Madurez visual <strong>{ripenessLabel(record.result)}</strong></span><span>Decisión humana <strong>{record.status === 'confirmed' ? `Categoría ${record.confirmedCategory}` : record.status === 'retained' ? 'Retenida' : 'Pendiente'}</strong></span></div>
    {record.status !== 'confirmed' ? <Notice>Confirma la inspección para evaluar escenarios. Una muestra retenida requiere evaluación adicional; no se recomienda enviarla.</Notice> : <>
      <div className="simulation-presets"><h3>Explora tres casos de demostración</h3><p className="caption">Seleccionar un caso cambia los parámetros de prueba. La predicción de la foto y la categoría comercial se conservan.</p><div className="simulation-preset-grid">{presets.map(preset => <button type="button" key={preset.id} disabled={busy} aria-label={`Aplicar escenario ${preset.id}`} aria-pressed={Number(life) === preset.days && distribution === '3' && near === '2' && far === '12'} onClick={() => { setLife(String(preset.days)); setDistribution('3'); setNear('2'); setFar('12'); setMessage(`Caso ${preset.id} preparado. Calcula y guarda para actualizar la comparación.`); }}><span className="eyebrow">ESCENARIO {preset.id}</span><strong>{preset.title}</strong><span className="preset-days">{preset.days} <small>días simulados</small></span><span>{preset.description}</span></button>)}</div></div>
      <form onSubmit={save}>
        <fieldset disabled={busy}><legend>Parámetros de demostración · días desde esta evaluación</legend><div className="logistics-fields">
          <label className="field">Vida útil simulada (días)<input type="number" min="1" max="90" step="1" required value={life} onChange={e => setLife(e.target.value)}/></label>
          <label className="field">Distribución y venta (días)<input type="number" min="1" max="30" step="1" required value={distribution} onChange={e => setDistribution(e.target.value)}/></label>
          <label className="field">Traslado a destino cercano (días)<input type="number" min="0" max="90" step="1" required value={near} onChange={e => setNear(e.target.value)}/></label>
          <label className="field">Traslado a destino lejano (días)<input type="number" min="0" max="90" step="1" required value={far} onChange={e => setFar(e.target.value)}/></label>
        </div></fieldset>
        <p className="caption">Margen = vida útil − traslado − distribución y venta. Regla ilustrativa: más de 2 días, compatible; de 0 a 2, revisión; menos de 0, insuficiente.</p>
        <Button type="submit" variant="secondary" busy={busy}>Calcular y guardar simulación</Button>
      </form>
      {error && <Notice error>{error}</Notice>}{message && <p role="status">{message}</p>}
      {dirty && <Notice>Hay cambios sin guardar. Los resultados siguientes corresponden al último escenario guardado.</Notice>}
      {saved && <div className="logistics-results"><h3>Último escenario guardado · simulado</h3>{saved.routes.map(route => {
        const Icon = route.status === 'compatible' ? CheckCircle2 : route.status === 'review' ? CircleAlert : XCircle;
        const label = route.status === 'compatible' ? 'Destino compatible' : route.status === 'review' ? 'Requiere revisión' : 'Tiempo insuficiente';
        return <div className={`logistics-route ${route.status}`} key={route.name}><Icon size={22}/><div><h4>{route.name}</h4><strong>{label}</strong><p>{route.transitDays} días de traslado · margen {route.remainingDays} días</p><p className="caption">{route.status === 'compatible' ? 'Supera el margen ilustrativo de 2 días.' : route.status === 'review' ? 'Queda un margen reducido para absorber demoras.' : 'El traslado y la venta exceden la vida útil simulada.'}</p></div></div>;
      })}<p className="caption">{date(saved.recordedAt)} · {time(saved.recordedAt)} · {saved.recordedBy}. No es una cuenta regresiva ni un despacho aprobado.</p></div>}
    </>}
    <p className="caption">La evaluación corresponde a esta muestra, no valida todo el lote. No verifica cadena de frío, requisitos del país ni aptitud de exportación. Menor duración no implica merma. Los escenarios permanecen internos y no se publican en el QR.</p>
  </section>;
}
