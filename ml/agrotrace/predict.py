"""Inferencia sobre una imagen; contrato independiente de las métricas ficticias."""
import argparse
import hashlib
import json
from pathlib import Path
import time


def build_result(instances, version, elapsed_ms):
    return {'schemaVersion': 1, 'mode': 'experimental', 'task': 'avocado-condition-segmentation',
            'modelVersion': version, 'elapsedMs': elapsed_ms, 'instances': instances,
            'count': None, 'possibleDefects': None, 'meanDiameterMm': None,
            'suggestedCategory': None, 'requiresHumanReview': True,
            'explanation': 'Condiciones visuales estimadas. Sin conteo total validado ni categoría comercial automática.',
            'warnings': ['Ausencia de detecciones no equivale a fruto sano.',
                         'Las máscaras delimitan frutos completos, no área de lesión.']}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--model-dir', type=Path, required=True)
    p.add_argument('--image', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--device', default='cpu')
    p.add_argument('--ripeness-model-dir', type=Path)
    a = p.parse_args()
    manifest = json.loads((a.model_dir/'model.json').read_text())
    weights = a.model_dir/'best.pt'
    if hashlib.sha256(weights.read_bytes()).hexdigest() != manifest['weightsSha256']:
        raise ValueError('Los pesos no corresponden al manifiesto')
    from PIL import ImageOps, Image
    from ultralytics import YOLO
    model = YOLO(str(weights))
    if model.task != 'segment' or [model.names[i] for i in sorted(model.names)] != manifest['classes']:
        raise ValueError('Tarea o clases distintas al manifiesto')
    # El dataset de defectos usa gris y resize stretch; reproducirlo explícitamente.
    with Image.open(a.image) as image:
        image = ImageOps.grayscale(ImageOps.exif_transpose(image)).convert('RGB').resize((640,640))
    start = time.perf_counter()
    result = model.predict(image, imgsz=manifest.get('imageSize', 640), conf=manifest['confidenceThreshold'], device=a.device, verbose=False)[0]
    elapsed = round((time.perf_counter()-start)*1000)
    instances = []
    if result.masks is not None:
        for box, mask in zip(result.boxes, result.masks.xyn):
            cls = int(box.cls.item())
            instances.append({'classId': cls, 'className': model.names[cls],
                              'confidence': float(box.conf.item()), 'polygon': mask.tolist()})
    a.out.mkdir(parents=True, exist_ok=False)
    result.save(filename=str(a.out/'analyzed.jpg'))
    payload = build_result(instances, manifest['modelVersion'], elapsed)
    payload['sourceImageSha256'] = hashlib.sha256(a.image.read_bytes()).hexdigest()
    if a.ripeness_model_dir:
        from agrotrace.ripeness_predict import estimate
        try:
            payload['ripeness'] = estimate(a.image, a.ripeness_model_dir)
        except Exception as error:
            import sys
            print(f'Madurez: {error}', file=sys.stderr)
            payload['ripeness'] = {'status': 'error', 'mode': 'experimental'}
    (a.out/'result.json').write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(json.dumps(payload, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
