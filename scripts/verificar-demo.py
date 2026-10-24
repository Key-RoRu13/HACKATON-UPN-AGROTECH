"""Repite inferencia real sobre el kit, sin usar la API ni publicar inspecciones."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / 'tests/fixtures/demo-en-vivo'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--caso', help='Identificador de casos.json; por defecto verifica todos.')
    args = parser.parse_args()
    manifest = json.loads((KIT / 'casos.json').read_text())
    cases = [c for c in manifest['cases'] if not args.caso or c['id'] == args.caso]
    if not cases:
        parser.error('Caso inexistente; consulta tests/fixtures/demo-en-vivo/casos.json')
    env = {**os.environ, 'PYTHONPATH': str(ROOT / 'ml'),
           'YOLO_CONFIG_DIR': str(ROOT / '.data/ultralytics'),
           'MPLCONFIGDIR': str(ROOT / '.data/matplotlib'),
           'YOLO_AUTOINSTALL': 'false', 'OMP_NUM_THREADS': '4', 'MKL_NUM_THREADS': '4'}
    failures = 0
    for case in cases:
        try:
            image = KIT / case['image']
            if hashlib.sha256(image.read_bytes()).hexdigest() != case['sha256']:
                raise ValueError('La imagen cambió; no corresponde al caso documentado.')
            with tempfile.TemporaryDirectory(prefix='rikuy-demo-') as directory:
                out = Path(directory) / 'inferencia'
                run = subprocess.run([
                    sys.executable, '-m', 'agrotrace.predict', '--image', str(image),
                    '--model-dir', str(ROOT / 'ml/artifacts/defectos-cpu-v1'),
                    '--ripeness-model-dir', str(ROOT / 'ml/artifacts/hass-mendeley-active'),
                    '--device', 'cpu', '--out', str(out),
                ], cwd=ROOT, env=env, capture_output=True, text=True, timeout=90)
                if run.returncode:
                    raise RuntimeError(run.stderr[-1500:])
                result = json.loads((out / 'result.json').read_text())
                ripe = result['ripeness']
                expected = case['expected']
                checks = [
                    result['sourceImageSha256'] == case['sha256'],
                    ripe['modelVersion'] == manifest['modelVersion'],
                    ripe['status'] == expected['status'],
                    ripe['stage'] == expected['stage'],
                    abs(ripe['score'] - expected['score']) <= 0.02,
                    sorted(i['className'] for i in result['instances']) == sorted(expected['defectLabels']),
                    all(result[key] is None for key in ['count', 'possibleDefects', 'meanDiameterMm', 'suggestedCategory']),
                    result['requiresHumanReview'] is True,
                    (out / 'analyzed.jpg').stat().st_size > 0,
                ]
                if not all(checks):
                    raise ValueError(f'Resultado diferente del registro: {ripe}; revisar antes de la demo.')
                print(f"OK {case['id']}: {ripe['status']}, etapa={ripe['stage']}, puntuación={ripe['score']:.3f}", flush=True)
        except Exception as error:
            failures += 1
            print(f"FALLO {case['id']}: {error}", file=sys.stderr, flush=True)
    print(f'{len(cases) - failures}/{len(cases)} casos reproducidos. No mide exactitud ni valida uso comercial.')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
