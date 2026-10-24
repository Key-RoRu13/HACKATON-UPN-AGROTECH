"""Evaluación final separada del entrenamiento; no ajustar parámetros con test."""
import argparse
import hashlib
import json
from pathlib import Path


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--model-dir', type=Path, required=True)
    p.add_argument('--data', type=Path, required=True)
    p.add_argument('--device', default='0')
    a = p.parse_args()
    from ultralytics import YOLO
    manifest = json.loads((a.model_dir/'model.json').read_text())
    weights = a.model_dir/'best.pt'
    if hashlib.sha256(weights.read_bytes()).hexdigest() != manifest['weightsSha256']:
        raise ValueError('Pesos diferentes del manifiesto')
    target = a.model_dir/'test-metrics.json'
    if target.exists():
        raise ValueError('Evaluación test ya registrada. No reutilizar test para ajustar el modelo.')
    model = YOLO(str(weights))
    metrics = model.val(data=str(a.data.resolve()), split='test', device=a.device,
                        project=str(a.model_dir.resolve()), name='test-final')
    target.write_text(json.dumps({'split': 'test', 'metrics': {k: float(v) for k,v in metrics.results_dict.items()},
        'externalValidation': False, 'note': 'Prueba interna pequeña; no acredita desempeño en planta.'}, indent=2))
    print(target.read_text())


if __name__ == '__main__':
    main()
