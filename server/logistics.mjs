// Illustrative scenario arithmetic, independent of image predictions.
export function evaluateLogistics(input) {
  if (!input || typeof input !== 'object') throw new Error('Indica los parámetros del escenario.');
  const { lifeDays, distributionDays, routes } = input;
  if (!Number.isInteger(lifeDays) || lifeDays < 1 || lifeDays > 90 || !Number.isInteger(distributionDays) || distributionDays < 1 || distributionDays > 30) throw new Error('Usa vida útil de 1 a 90 días y distribución/venta de 1 a 30 días, en enteros.');
  if (!Array.isArray(routes) || routes.length !== 2) throw new Error('Configura los dos escenarios de traslado.');
  const evaluated = routes.map((route, index) => {
    if (!route || !Number.isInteger(route.transitDays) || route.transitDays < 0 || route.transitDays > 90) throw new Error('El traslado debe ser un entero de 0 a 90 días.');
    const remainingDays = lifeDays - route.transitDays - distributionDays;
    return { name: index === 0 ? 'Destino cercano' : 'Destino lejano', transitDays: route.transitDays, remainingDays, status: remainingDays < 0 ? 'insufficient' : remainingDays <= 2 ? 'review' : 'compatible' };
  });
  return { mode: 'simulation', ruleVersion: 'logistics-demo-v1', lifeDays, distributionDays, routes: evaluated };
}

// Demo policy, not an agronomic shelf-life model. Never derives physical measurements.
export function suggestLogistics(result) {
  const base = { mode: 'simulation', ruleVersion: 'visual-logistics-demo-v1', sourceModelVersion: result.ripeness?.modelVersion ?? null };
  const r = result.ripeness;
  if (result.mode !== 'experimental' || r?.status !== 'estimated' || r.labelSchema !== 'hass_ripening_5' || !Number.isInteger(r.stage) || r.stage < 1 || r.stage > 5) {
    return { ...base, status: 'review', scenario: null, lifeDays: null, reason: 'Madurez no concluyente o sin esquema Hass de cinco etapas. Requiere revisión humana.' };
  }
  if (r.stage === 5) return { ...base, status: 'review', scenario: null, lifeDays: null, reason: 'Madurez visual avanzada: evaluar la aptitud de la muestra antes de proponer un destino.' };
  if (result.instances?.length) return { ...base, status: 'review', scenario: null, lifeDays: null, reason: 'El modelo señala posibles condiciones visibles. Revisar la evidencia antes de asignar duración o destino; las detecciones no son un diagnóstico.' };
  const scenario = r.stage <= 2 ? 'A' : r.stage === 3 ? 'B' : 'C';
  const lifeDays = { A: 14, B: 7, C: 3 }[scenario];
  return { ...base, status: 'suggested', scenario, lifeDays, reason: `Etapa visual ${r.stage} de 5. Regla de demostración: etapas 1–2 → A (14 días), 3 → B (7 días), 4 → C (3 días). Los días son arbitrarios y no están validados.` };
}
