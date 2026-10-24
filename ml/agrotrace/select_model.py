"""Activa una versión usando solo validación, conservando experimentos originales."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil


def select(candidates, out):
    if out.exists():
        raise ValueError('La carpeta activa ya existe; conservar y usar una salida nueva')
    rows = []
    for folder in candidates:
        manifest = json.loads((folder/'model.json').read_text())
        digest = hashlib.sha256((folder/'best.pt').read_bytes()).hexdigest()
        if digest != manifest['weightsSha256']:
            raise ValueError('Pesos no coinciden con manifiesto')
        score = manifest['validation']['metrics/accuracy_top1']
        if not isinstance(score, (int, float)) or not 0 <= score <= 1:
            raise ValueError('Métrica de validación inválida')
        rows.append((score, folder, manifest))
    if not rows:
        raise ValueError('Faltan candidatos')
    reference = rows[0][2]
    for _,_,manifest in rows:
        if any(manifest[key] != reference[key] for key in ['datasetManifestSha256', 'classes', 'task', 'preprocessing']):
            raise ValueError('Los candidatos no usan los mismos datos y tarea')
    score, chosen, manifest = max(rows, key=lambda row: row[0])
    out.mkdir(parents=True)
    shutil.copy2(chosen/'best.pt', out/'best.pt')
    shutil.copy2(chosen/'model.json', out/'model.json')
    selection = {'selectedVersion': manifest['modelVersion'], 'criterion': 'validation_accuracy_top1',
                 'testUsedForSelection': False, 'candidates': [{'version': m['modelVersion'], 'validationAccuracy': s} for s,_,m in rows]}
    (out/'selection.json').write_text(json.dumps(selection, indent=2))
    print(json.dumps(selection, indent=2))
    return selection


if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--candidates', type=Path, nargs='+', required=True);p.add_argument('--out', type=Path, required=True)
    a=p.parse_args();select(a.candidates,a.out)
