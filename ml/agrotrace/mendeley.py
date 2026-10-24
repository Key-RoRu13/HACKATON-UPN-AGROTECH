"""Auditoría y preparación del Excel original de Hass, sin dependencias Excel externas."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import random
import re
import xml.etree.ElementTree as ET
import zipfile

CLASSES = ['01_Underripe', '02_Breaking', '03_Ripe_I', '04_Ripe_II', '05_Overripe']
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def read_metadata(excel):
    with zipfile.ZipFile(excel) as z:
        shared = [''.join(node.itertext()) for node in ET.fromstring(z.read('xl/sharedStrings.xml'))]
        rows = ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//m:row', NS)
        result = []
        for row in rows[1:]:
            cells = {}
            for cell in row:
                value = cell.find('m:v', NS)
                text = shared[int(value.text)] if cell.get('t') == 's' and value is not None else value.text if value is not None else ''
                cells[re.sub(r'\d+', '', cell.get('r'))] = text
            if not cells.get('A'):
                continue
            name = cells['A']
            match = re.fullmatch(r'(T(?:\d+|am))_d(\d+)_(\d+)_([ab])_([1-5])', name)
            if not match:
                raise ValueError(f'Nombre inesperado: {name}')
            stage, day, sample = int(cells['F']), int(cells['E']), int(cells['D'])
            if stage != int(match[5]) or day != int(match[2]) or sample != int(match[3]) or cells['C'] != match[1]:
                raise ValueError(f'Excel y nombre discrepan: {name}')
            result.append({'name': name, 'stage': stage, 'day': day, 'sample': sample,
                           'storage': cells['C'], 'side': match[4], 'timestamp': cells['B']})
    if len({r['name'] for r in result}) != len(result):
        raise ValueError('Nombres duplicados en Excel')
    return result


def prepare(base, out):
    from PIL import Image, ImageOps, ImageChops, ImageStat
    if out.exists():
        raise ValueError('La preparación ya existe; usa otra salida')
    excel = next(base.rglob('*.xlsx'))
    rows = read_metadata(excel)
    photo_root = excel.parent/'Avocado Ripening Dataset'
    if not photo_root.is_dir():
        raise ValueError('Falta la carpeta original Avocado Ripening Dataset junto al Excel')
    photos = {f.stem: f for f in photo_root.glob('*.jpg')}
    missing = [r['name'] for r in rows if r['name'] not in photos]
    unlisted = sorted(set(photos)-{r['name'] for r in rows})
    if unlisted:
        raise ValueError('Hay fotos sin etiqueta en Excel')
    available = [r for r in rows if r['name'] in photos]
    groups = sorted({r['sample'] for r in rows})
    # Confirmar que cada ID numérico pertenece a una sola condición.
    storage_by_id = collections.defaultdict(set)
    for row in rows:
        storage_by_id[row['sample']].add(row['storage'])
    if any(len(s) != 1 for s in storage_by_id.values()):
        raise ValueError('Sample no es globalmente único; revisar clave de fruto')
    random.Random(42).shuffle(groups)
    assignment = {key: 'train' if i < int(len(groups)*.7) else 'val' if i < int(len(groups)*.85) else 'test' for i,key in enumerate(groups)}
    report = {'classes': CLASSES, 'excelSha256': hashlib.sha256(excel.read_bytes()).hexdigest(),
              'metadataRows': len(rows), 'availableImages': len(available), 'missingImages': missing,
              'source': '10.17632/3xd9n945v8.1', 'preprocessing': 'exif_transpose_rgb_resize_square', 'imageSize': 224,
              'groupRule': 'Sample from original Excel; days and sides together',
              'groupingLimitation': 'ID comprobado con Excel. Condiciones de luz controladas; falta validación externa.',
              'seed': 42, 'splits': {}, 'files': []}
    for split in ['train','val','test']:
        report['splits'][split] = {'images': 0, 'classes': [0]*5, 'groups': sum(s == split for s in assignment.values())}
        for cls in CLASSES:
            (out/split/cls).mkdir(parents=True, exist_ok=True)
    hashes = collections.defaultdict(set)
    for row in available:
        file = photos[row['name']]; split = assignment[row['sample']]
        digest = hashlib.sha256(file.read_bytes()).hexdigest(); hashes[digest].add(split)
        with Image.open(file) as image:
            ImageOps.exif_transpose(image).convert('RGB').resize((224,224)).save(out/split/CLASSES[row['stage']-1]/file.name, quality=95)
        report['splits'][split]['images'] += 1
        report['splits'][split]['classes'][row['stage']-1] += 1
        report['files'].append({**row, 'file': file.name, 'split': split, 'sha256': digest})
    if any(len(s)>1 for s in hashes.values()):
        raise ValueError('Duplicados exactos entre particiones')
    if any(min(s['classes']) == 0 for s in report['splits'].values()):
        raise ValueError('Partición sin ejemplos de alguna etapa')
    old = base.parent/'madurez/original/train/images'
    overlap = []; differences = []
    for file in sorted(old.glob('*.jpg')):
        name = file.name.split('_jpg.rf.')[0]
        if name in photos:
            overlap.append(name)
            with Image.open(file) as a, Image.open(photos[name]) as b:
                diff = ImageChops.difference(a.convert('RGB').resize((64,64)), b.convert('RGB').resize((64,64)))
                differences.append(sum(ImageStat.Stat(diff).mean)/3)
    report['roboflowOverlap'] = {'matchedNames': len(overlap), 'comparedThumbnails': len(differences),
         'meanAbsolutePixelDifference': sum(differences)/len(differences) if differences else None,
         'maxAbsolutePixelDifference': max(differences) if differences else None,
         'note': 'Comparación de miniaturas RGB 64x64; coincidencia de contenido, no independencia externa.'}
    report['datasetManifestSha256'] = hashlib.sha256(json.dumps(report['files'], sort_keys=True).encode()).hexdigest()
    (out/'audit.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
    # Resumen temporal descriptivo, no predicción de días restantes.
    trajectories = collections.defaultdict(list)
    for row in rows:
        trajectories[row['sample']].append(row)
    temporal = []
    for sample, sequence in trajectories.items():
        events = [r['day'] for r in sequence if r['stage'] >= 4]
        temporal.append({'sample': sample, 'storage': sequence[0]['storage'], 'split': assignment[sample],
                         'firstObservedStage4OrLaterDay': min(events) if events else None,
                         'lastObservedDay': max(r['day'] for r in sequence), 'rightCensored': not bool(events)})
    (out/'trajectories.json').write_text(json.dumps(temporal, indent=2))
    print(json.dumps({k:v for k,v in report.items() if k != 'files'}, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    a=p.parse_args();prepare(a.source,a.out)
