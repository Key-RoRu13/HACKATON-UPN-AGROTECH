"""Prepara defectos sin alterar los ZIP ni sus particiones originales."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import zipfile

from PIL import Image, ImageDraw, ImageOps
import yaml

CLASSES = ['Black or Brown Spots', 'Skin Damage', 'Suffocation']


def parse_label(line):
    values = list(map(float, line.split()))
    if len(values) < 7 or len(values) % 2 != 1:
        raise ValueError('Se esperaba un polígono YOLO de al menos tres puntos')
    cls, coords = values[0], values[1:]
    if cls != int(cls) or not 0 <= cls < 3:
        raise ValueError('Clase fuera de rango')
    if not all(math.isfinite(v) and 0 <= v <= 1 for v in coords):
        raise ValueError('Coordenadas no normalizadas o no finitas')
    points = list(zip(coords[::2], coords[1::2]))
    area = abs(sum(x*y2-x2*y for (x,y),(x2,y2) in zip(points, points[1:]+points[:1]))) / 2
    if area <= 1e-8:
        raise ValueError('Polígono sin área')
    return int(cls), points


def dhash(image):
    pixels = list(ImageOps.grayscale(image).resize((9, 8)).getdata())
    return sum((pixels[y*9+x] > pixels[y*9+x+1]) << (y*8+x)
               for y in range(8) for x in range(8))


def prepare(archive, output):
    output = output.resolve()
    if output.exists():
        raise ValueError(f'La salida ya existe: {output}. Usa otro directorio para conservar el experimento.')
    with zipfile.ZipFile(archive) as z:
        config = yaml.safe_load(z.read('data.yaml'))
        if config.get('names') != CLASSES:
            raise ValueError('El ZIP no corresponde a las tres clases esperadas de defectos v2')
        # Validar antes de escribir. Se toleran entradas ZIP duplicadas idénticas.
        seen = {}
        for item in z.infolist():
            name = item.filename
            if not (output/name).resolve().is_relative_to(output):
                raise ValueError('Ruta insegura en ZIP')
            if item.is_dir():
                continue
            content = z.read(item)
            if name in seen and seen[name] != hashlib.sha256(content).hexdigest():
                raise ValueError(f'Entradas contradictorias: {name}')
            seen[name] = hashlib.sha256(content).hexdigest()
        output.mkdir(parents=True)
        for name in seen:
            target = output/name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(z.read(name))

    records, tiles, counts = [], [], {}
    for split in ['train', 'valid', 'test']:
        images = sorted((output/split/'images').glob('*.jpg'))
        if not images:
            raise ValueError(f'Partición vacía: {split}')
        counts[split] = {'images': len(images), 'annotations': [0, 0, 0]}
        for i, file in enumerate(images):
            label = output/split/'labels'/(file.stem+'.txt')
            polygons = [parse_label(line) for line in label.read_text().splitlines() if line.strip()]
            for cls, _ in polygons:
                counts[split]['annotations'][cls] += 1
            with Image.open(file) as original:
                original.load()
                records.append({'file': str(file.relative_to(output)), 'split': split,
                                'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
                                'family': file.stem.split('.rf.')[0], 'dhash': dhash(original)})
                if i % max(1, len(images)//4) == 0 and sum(t[0] == split for t in tiles) < 4:
                    im = original.convert('RGB'); im.thumbnail((300, 280))
                    draw = ImageDraw.Draw(im)
                    for cls, pts in polygons:
                        pts = [(x*im.width, y*im.height) for x,y in pts]
                        draw.line(pts+[pts[0]], fill=['#ffb000','#00ff99','#ff66dd'][cls], width=2)
                    tile = Image.new('RGB', (320, 320), 'white'); tile.paste(im, (0,0))
                    ImageDraw.Draw(tile).text((4,285), f'{split}: {file.name[:28]}', fill='black')
                    tiles.append((split, tile))
    leaks, similar = [], []
    for i,a in enumerate(records):
        for b in records[i+1:]:
            if a['split'] == b['split']:
                continue
            if a['sha256'] == b['sha256'] or a['family'] == b['family']:
                leaks.append([a['file'], b['file']])
            distance = (a['dhash'] ^ b['dhash']).bit_count()
            if distance <= 4:
                similar.append({'files': [a['file'], b['file']], 'distance': distance})
    canvas = Image.new('RGB', (1280, 320*math.ceil(len(tiles)/4)), 'white')
    for i,(_,tile) in enumerate(tiles):
        canvas.paste(tile, ((i%4)*320, (i//4)*320))
    canvas.save(output/'masks-preview.jpg')
    report = {'source_sha256': hashlib.sha256(Path(archive).read_bytes()).hexdigest(),
              'classes': CLASSES, 'splits': counts, 'cross_split_leaks': leaks,
              'visual_similarity_candidates': similar,
              'similarity_note': 'dHash <=4: candidatos a revisión, no prueba de duplicado. No detecta todas las rotaciones.',
              'status': 'blocked_leakage' if leaks else 'prepared_needs_visual_review'}
    # Conservar evaluación y excluir del entrenamiento familias visualmente sospechosas.
    excluded_families = set()
    for pair in similar:
        for file in pair['files']:
            if file.startswith('train/'):
                excluded_families.add(Path(file).stem.split('.rf.')[0])
    train_files = []
    excluded = []
    for record in records:
        if record['split'] != 'train':
            continue
        if record['family'] in excluded_families:
            excluded.append(record['file'])
        else:
            train_files.append(str(output/record['file']))
    (output/'train-filtered.txt').write_text('\n'.join(train_files)+'\n')
    report['excluded_training_images'] = excluded
    report['effective_training_images'] = len(train_files)
    report['limitation'] = 'Filtrado conservador por similitud; no garantiza independencia por fruto o sesión. Evaluación exploratoria.'
    (output/'audit.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
    (output/'data.yaml').write_text(yaml.safe_dump({'path': str(output), 'train': 'train-filtered.txt',
        'val': 'valid/images', 'test': 'test/images', 'names': dict(enumerate(CLASSES))}, sort_keys=False))
    if leaks:
        raise ValueError('Coincidencias entre particiones. Revisar audit.json antes de entrenar.')
    if not train_files:
        raise ValueError('El filtrado dejó entrenamiento vacío. Revisar particiones; no entrenar.')
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--zip', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    prepare(args.zip, args.out)
