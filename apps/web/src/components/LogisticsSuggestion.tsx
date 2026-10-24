import { CircleAlert, Truck } from 'lucide-react';
import type { Inspection } from '../lib/api';

export default function LogisticsSuggestion({ record }: { record: Inspection }) {
  const suggestion = record.logisticsSuggestion;
  if (!suggestion) return null;
  const held = record.status === 'retained';
  const usable = !held && suggestion.status === 'suggested';
  return <section className="card logistics-panel" aria-label="Orientación logística automática">
    <div className="section-title"><h2>{usable ? <Truck size={22}/> : <CircleAlert size={22}/>} Orientación logística</h2><span className="demo-pill">SIMULACIÓN</span></div>
    {usable ? <><strong className="ripeness-label">Escenario logístico {suggestion.scenario}</strong><p><strong>Ventana simulada: {suggestion.lifeDays} días</strong></p><p>{suggestion.scenario === 'A' ? 'Mayor margen: evaluar traslados más largos.' : suggestion.scenario === 'B' ? 'Margen intermedio: priorizar destinos cercanos.' : 'Menor margen: revisión prioritaria y distribución rápida, si corresponde.'}</p></> : <><h3>Revisión humana necesaria</h3><p>{held ? 'La muestra está retenida. No se propone duración ni destino.' : suggestion.reason}</p></>}
    <p className="caption">{usable ? 'Regla automática basada en madurez visual; no demuestra ausencia de defectos. ' : ''}No equivale a la categoría comercial A/B/C ni autoriza un envío. Los días no son una predicción de vida útil.</p>
    <details><summary>Cómo se obtuvo esta orientación</summary><p>{suggestion.reason}</p><p className="caption">Regla {suggestion.ruleVersion} · modelo {suggestion.sourceModelVersion || 'no disponible'}. Se conserva con la inspección; no es una cuenta regresiva. El dashboard permite comparar y guardar escenarios tras la confirmación humana.</p></details>
  </section>;
}
