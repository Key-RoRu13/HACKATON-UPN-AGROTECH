import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
const execute = promisify(execFile);
const root = process.cwd();
const python = process.env.ML_PYTHON || path.join(root, 'ml/.venv/bin/python');
const model = path.resolve(process.env.MODEL_DIR || path.join(root, 'ml/artifacts/defectos-cpu-v1'));
const preferredRipeness = ['hass-mendeley-active', 'hass-mendeley-cpu-v1', 'madurez-cpu-v1'].find(name => existsSync(path.join(root, 'ml/artifacts', name, 'model.json'))) || 'madurez-cpu-v1';
const ripenessModel = path.resolve(process.env.RIPENESS_MODEL_DIR || path.join(root, 'ml/artifacts', preferredRipeness));
let active = false;
export async function modelAvailable() {
  try { await Promise.all([access(python), access(path.join(model, 'best.pt')), access(path.join(model, 'model.json'))]); return true; } catch { return false; }
}
export async function analyzePhoto(file, uploadDir, dataDir) {
  if (active) throw Object.assign(new Error('Hay otra fotografía en análisis. Conserva tu captura y reintenta en unos segundos.'), { status: 429 });
  active = true;
  const work = path.join(dataDir, 'analysis', randomUUID());
  try {
    if (!await modelAvailable()) throw Object.assign(new Error('El modelo no está disponible en este servidor. Conserva la fotografía y reintenta cuando esté configurado.'), { status: 503 });
    await mkdir(path.dirname(work), { recursive: true });
    let ripenessReady = false;
    try { await Promise.all([access(path.join(ripenessModel, 'best.pt')), access(path.join(ripenessModel, 'model.json'))]); ripenessReady = true; } catch {}
    const args = ['-m', 'agrotrace.predict', '--model-dir', model, '--image', file, '--out', work, '--device', 'cpu'];
    if (ripenessReady) args.push('--ripeness-model-dir', ripenessModel);
    await execute(python, args, {
      cwd: root, timeout: 60000, maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, PYTHONPATH: path.join(root, 'ml'), YOLO_CONFIG_DIR: path.join(dataDir, 'ultralytics'), MPLCONFIGDIR: path.join(dataDir, 'matplotlib'), YOLO_AUTOINSTALL: 'false', OMP_NUM_THREADS: '4', MKL_NUM_THREADS: '4' }
    });
    const result = JSON.parse(await readFile(path.join(work, 'result.json'), 'utf8'));
    if (!ripenessReady) result.ripeness = { status: 'unavailable', mode: 'experimental' };
    if (result.mode !== 'experimental' || !Array.isArray(result.instances) || result.suggestedCategory !== null) throw new Error('Contrato de inferencia inválido');
    const name = randomUUID() + '.jpg';
    await rename(path.join(work, 'analyzed.jpg'), path.join(uploadDir, name));
    return { result, analyzedPhotoUrl: '/uploads/' + name };
  } catch (error) {
    if (error.status) throw error;
    console.error('Inferencia:', error.killed ? 'Tiempo máximo excedido' : error.stderr?.slice(-1000) || error.message);
    throw Object.assign(new Error('No se pudo analizar esta fotografía. Comprueba que sea una imagen válida y vuelve a intentarlo; tu captura se conserva.'), { status: 503 });
  } finally { active = false; await rm(work, { recursive: true, force: true }); }
}
