import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLogistics } from '../server/logistics.mjs';
test('logística: bordes de margen, sin inferir duración desde madurez', () => {
  for (const [transit, margin, status] of [[8,3,'compatible'],[9,2,'review'],[11,0,'review'],[12,-1,'insufficient']]) {
    const result = evaluateLogistics({ lifeDays: 14, distributionDays: 3, routes: [{ transitDays: transit }, { transitDays: 0 }], stage: 5 });
    assert.equal(result.routes[0].remainingDays, margin);
    assert.equal(result.routes[0].status, status);
    assert.equal(result.mode, 'simulation');
  }
});

test('orientación automática: A/B/C y bloqueos sin duración inventada', async () => {
  const { suggestLogistics } = await import('../server/logistics.mjs');
  const result = stage => ({ mode: 'experimental', instances: [], ripeness: { status: 'estimated', stage, labelSchema: 'hass_ripening_5', modelVersion: 'test-model' } });
  for (const [stage, scenario, days] of [[1,'A',14],[2,'A',14],[3,'B',7],[4,'C',3]]) {
    const suggestion = suggestLogistics(result(stage));
    assert.equal(suggestion.scenario, scenario); assert.equal(suggestion.lifeDays, days);
    assert.equal(suggestion.mode, 'simulation'); assert.equal(suggestion.sourceModelVersion, 'test-model');
  }
  for (const input of [result(5), result(null), { ...result(2), instances: [{ className: 'Skin Damage' }] }, { ...result(2), ripeness: { status: 'uncertain' } }, { mode: 'demonstration' }, { ...result(2), ripeness: { ...result(2).ripeness, labelSchema: 'old' } }]) {
    const suggestion = suggestLogistics(input);
    assert.equal(suggestion.status, 'review'); assert.equal(suggestion.lifeDays, null); assert.equal(suggestion.scenario, null);
  }
});
