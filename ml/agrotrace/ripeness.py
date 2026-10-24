"""Madurez visual experimental: preparar por grupos, entrenar y evaluar."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import random
import re
import shutil

CLASSES = ['Overripe', 'Ripe', 'Underripe']


def fruit_group(name):
    match = re.match(r'T(?:\d+|am)_d\d+_(\d+)_[a-z]_\d+_jpg', name)
    if not match:
        raise ValueError(f'No se puede agrupar: {name}')
    # Conservador: unir incluso tratamientos distintos con el mismo ID numérico.
    # No asumir que día, ángulo o etiqueta de madurez sean frutos independientes.
    return match[1]


def prepare(source, out):
    from PIL import Image, ImageOps
    if out.exists():
        raise ValueError('Usa una salida nueva para conservar las particiones')
    groups = collections.defaultdict(list)
    for image in sorted((source/'train/images').glob('*.jpg')):
        lines = (source/'train/labels'/(image.stem+'.txt')).read_text().strip().splitlines()
        if len(lines) != 1:
            raise ValueError('El clasificador requiere exactamente una etiqueta por fotografía')
        values = list(map(float, lines[0].split()))
        if len(values) != 5 or values[0] != int(values[0]) or not 0 <= values[0] < 3:
            raise ValueError(f'Etiqueta inválida: {image.name}')
        groups[fruit_group(image.name)].append((image, int(values[0])))
    keys = sorted(groups); random.Random(42).shuffle(keys)
    boundaries = [int(len(keys)*0.7), int(len(keys)*0.85)]
    assignment = {key: 'train' if i < boundaries[0] else 'val' if i < boundaries[1] else 'test' for i,key in enumerate(keys)}
    manifest = {'schemaVersion': 1, 'classes': CLASSES, 'seed': 42, 'groupRule': 'numeric_fruit_id_across_days_views_treatments',
                'groupingLimitation': 'ID inferido del nombre, sin verificación del autor; no garantiza independencia total por sesión.',
                'imageSize': 224, 'preprocessing': 'exif_transpose_rgb_resize_square', 'splits': {}, 'files': []}
    for split in ['train', 'val', 'test']:
        manifest['splits'][split] = {'images': 0, 'classes': [0,0,0], 'groups': sum(s == split for s in assignment.values())}
        for name in CLASSES:
            (out/split/name).mkdir(parents=True, exist_ok=True)
    for key, files in groups.items():
        split = assignment[key]
        for file, cls in files:
            with Image.open(file) as image:
                ImageOps.exif_transpose(image).convert('RGB').resize((224,224)).save(out/split/CLASSES[cls]/file.name, quality=95)
            manifest['splits'][split]['images'] += 1
            manifest['splits'][split]['classes'][cls] += 1
            manifest['files'].append({'file': file.name, 'group': key, 'split': split, 'classId': cls, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
    if any(min(v['classes']) == 0 for v in manifest['splits'].values()):
        raise ValueError('Hay una partición sin ejemplos de alguna clase')
    hashes = collections.defaultdict(set)
    for file in manifest['files']:
        hashes[file['sha256']].add(file['split'])
    if any(len(v)>1 for v in hashes.values()):
        raise ValueError('Duplicados exactos entre particiones')
    manifest['datasetManifestSha256'] = hashlib.sha256(json.dumps(manifest['files'], sort_keys=True).encode()).hexdigest()
    (out/'audit.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(json.dumps(manifest['splits'], indent=2))


def train(data, out, weights, epochs, freeze=0, lr0=None):
    import torch
    from ultralytics import YOLO
    torch.set_num_threads(6)
    if out.exists():
        raise ValueError('El experimento ya existe')
    audit = json.loads((data/'audit.json').read_text())
    model = YOLO(str(weights))
    optimizer_options = {'optimizer': 'AdamW', 'lr0': lr0} if lr0 is not None else {}
    model.train(data=str(data.resolve()), epochs=epochs, imgsz=224, batch=16,
                workers=0, device='cpu', seed=42, deterministic=True, patience=5,
                project=str(out.resolve()), name='training', scale=0,
                auto_augment=None, erasing=0, hsv_h=0, hsv_s=0, hsv_v=0, fliplr=0.5, freeze=freeze, **optimizer_options)
    best = Path(model.trainer.save_dir)/'weights/best.pt'
    shutil.copy2(best, out/'best.pt')
    trained = YOLO(str(out/'best.pt'))
    validation = trained.val(data=str(data.resolve()), split='val', imgsz=224, batch=16, workers=0,
                             device='cpu', project=str(out.resolve()), name='validation')
    manifest = {'schemaVersion': 1, 'task': 'avocado-ripeness-classification', 'modelVersion': out.name,
                'classes': [trained.names[i] for i in sorted(trained.names)], 'imageSize': 224,
                'weightsSha256': hashlib.sha256((out/'best.pt').read_bytes()).hexdigest(),
                'datasetManifestSha256': audit['datasetManifestSha256'], 'externalValidation': False,
                'preprocessing': audit['preprocessing'], 'validation': {k:float(v) for k,v in validation.results_dict.items()},
                'limitations': ['Madurez visual estimada, no firmeza interna ni vida útil.', audit['groupingLimitation']],
                'confidenceThreshold': 0.6, 'confidenceThresholdStatus': 'provisional_not_calibrated',
                'labelSchema': 'hass_ripening_5' if len(audit['classes']) == 5 else 'ripeness_3',
                'datasetSource': audit.get('source', 'Roboflow Avocado Ripeness Prediction v3'),
                'environment': {'torch': torch.__version__, 'ultralytics': __import__('ultralytics').__version__}}
    (out/'model.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


def classification_report(matrix, class_count=None):
    if class_count is not None and len(matrix) == class_count + 1:
        if any(matrix[-1]) or any(row[-1] for row in matrix):
            raise ValueError('Fila de fondo no vacía en clasificación')
        matrix = [row[:class_count] for row in matrix[:class_count]]
    n = len(matrix); total = sum(map(sum, matrix))
    if not total:
        raise ValueError('Matriz de evaluación vacía')
    scores = []
    for i in range(n):
        tp = matrix[i][i]; predicted = sum(matrix[i]); actual = sum(row[i] for row in matrix)
        precision = tp / predicted if predicted else 0
        recall = tp / actual if actual else 0
        scores.append({'precision': precision, 'recall': recall,
                       'f1': 2*precision*recall/(precision+recall) if precision+recall else 0,
                       'support': actual})
    report = {'matrixPredictedRowsTrueColumns': matrix, 'perClass': scores,
              'macroF1': sum(s['f1'] for s in scores)/n, 'images': total}
    if n == 5:
        report['meanAbsoluteStageError'] = sum(abs(i-j)*matrix[i][j] for i in range(n) for j in range(n))/total
        report['withinOneStage'] = sum(matrix[i][j] for i in range(n) for j in range(n) if abs(i-j)<=1)/total
        coarse = [0,0,1,1,2]
        report['collapsedThreeStageAccuracy'] = sum(matrix[i][j] for i in range(n) for j in range(n) if coarse[i]==coarse[j])/total
        report['comparisonNote'] = 'Tres clases colapsadas en esta prueba nueva; no comparable directamente con la prueba del modelo anterior.'
    return report


def evaluate(data, model_dir):
    import torch
    from ultralytics import YOLO
    torch.set_num_threads(6)
    target = model_dir/'test-metrics.json'
    if target.exists():
        raise ValueError('Test ya registrado: no ajustar con test')
    model = YOLO(str(model_dir/'best.pt'))
    captured = {}
    def capture(validator):
        captured['report'] = classification_report(validator.confusion_matrix.matrix.tolist(), len(model.names))
    model.add_callback('on_val_end', capture)
    metrics = model.val(data=str(data.resolve()), split='test', imgsz=224, batch=16, workers=0,
                        device='cpu', project=str(model_dir.resolve()), name='test-final')
    target.write_text(json.dumps({'split': 'test', 'metrics': {k:float(v) for k,v in metrics.results_dict.items()},
                                 'classificationReport': captured.get('report'),
                                 'externalValidation': False}, indent=2))
    print(target.read_text())


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('command', choices=['prepare','train','evaluate'])
    p.add_argument('--data', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--weights', type=Path, default=Path('ml/artifacts/yolov8n-cls.pt'))
    p.add_argument('--epochs', type=int, default=10)
    p.add_argument('--freeze', type=int, default=0)
    p.add_argument('--lr0', type=float)
    a=p.parse_args()
    if a.command == 'prepare': prepare(a.data, a.out)
    elif a.command == 'train': train(a.data, a.out, a.weights, a.epochs, a.freeze, a.lr0)
    else: evaluate(a.data, a.out)
