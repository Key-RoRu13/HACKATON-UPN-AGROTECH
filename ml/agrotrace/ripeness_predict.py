"""Estimación de madurez visual para una fotografía de un fruto."""
import hashlib
import json


def summarize(scores, version, threshold, schema='ripeness_3', source=None):
    label = max(scores, key=scores.get)
    score = scores[label]
    stage = int(label.split('_')[0]) if schema == 'hass_ripening_5' else None
    return {'status': 'estimated' if score >= threshold else 'uncertain',
            'label': label if score >= threshold else None, 'score': score,
            'scores': scores, 'modelVersion': version, 'mode': 'experimental',
            'threshold': threshold, 'thresholdStatus': 'provisional_not_calibrated',
            'scope': 'single_fruit_visual_ripeness', 'externalValidation': False,
            'labelSchema': schema, 'stage': stage if score >= threshold else None, 'datasetSource': source}


def estimate(image_path, model_dir):
    from pathlib import Path
    from PIL import Image, ImageOps
    from ultralytics import YOLO
    model_dir = Path(model_dir)
    manifest = json.loads((model_dir/'model.json').read_text())
    weights = model_dir/'best.pt'
    if hashlib.sha256(weights.read_bytes()).hexdigest() != manifest['weightsSha256']:
        raise ValueError('Los pesos de madurez no corresponden al manifiesto')
    if manifest['task'] != 'avocado-ripeness-classification':
        raise ValueError('Tarea de modelo de madurez incorrecta')
    model = YOLO(str(weights))
    if model.task != 'classify' or [model.names[i] for i in sorted(model.names)] != manifest['classes']:
        raise ValueError('Clases de madurez distintas al manifiesto')
    with Image.open(image_path) as image:
        image = ImageOps.exif_transpose(image).convert('RGB').resize((224,224))
    prediction = model.predict(image, imgsz=224, device='cpu', verbose=False)[0]
    scores = {model.names[i]: float(score) for i,score in enumerate(prediction.probs.data.tolist())}
    return summarize(scores, manifest['modelVersion'], manifest['confidenceThreshold'],
                     manifest.get('labelSchema', 'ripeness_3'), manifest.get('datasetSource'))
