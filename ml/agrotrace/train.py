"""Entrenamiento experimental; test se evalúa únicamente por comando separado."""
import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import shutil


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--data', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--epochs', type=int, default=30)
    p.add_argument('--device', default='0')
    p.add_argument('--imgsz', type=int, default=640)
    p.add_argument('--batch', type=int, default=8)
    p.add_argument('--workers', type=int, default=2)
    p.add_argument('--threads', type=int, default=6)
    p.add_argument('--weights', default='yolov8n-seg.pt')
    p.add_argument('--reviewed', action='store_true', help='Confirma revisión de máscaras y similitudes')
    args = p.parse_args()
    if not args.reviewed:
        p.error('Revisa masks-preview.jpg y audit.json; luego añade --reviewed.')
    report = json.loads((args.data.parent/'audit.json').read_text())
    if report['cross_split_leaks']:
        p.error('El dataset tiene fuga conocida entre particiones.')
    if args.out.exists():
        p.error('Usa una carpeta de experimento nueva.')
    import torch
    from ultralytics import YOLO
    torch.set_num_threads(args.threads)
    if args.device != 'cpu' and not torch.cuda.is_available():
        p.error('GPU no disponible. Activa GPU en Colab o indica --device cpu explícitamente.')
    # YOLOv8 nano mantiene compatibilidad con los ZIP recibidos; no se usan pesos
    # genéricos COCO como si fueran un detector de defectos ya entrenado.
    model = YOLO(args.weights)
    model.train(data=str(args.data.resolve()), epochs=args.epochs, imgsz=args.imgsz,
                batch=args.batch, device=args.device, workers=args.workers, seed=42, deterministic=True,
                project=str(args.out.resolve()), name='training', patience=10,
                exist_ok=False, hsv_h=0, hsv_s=0, hsv_v=0,
                mosaic=0, mixup=0, degrees=0, fliplr=0, flipud=0)
    run = Path(model.trainer.save_dir)
    best = run/'weights/best.pt'
    trained = YOLO(str(best))
    metrics = trained.val(data=str(args.data.resolve()), split='val',
                          imgsz=args.imgsz, batch=args.batch, workers=args.workers,
                          device=args.device, project=str(args.out.resolve()), name='validation')
    shutil.copy2(best, args.out/'best.pt')
    manifest = {'schemaVersion': 1, 'task': 'avocado-condition-segmentation',
        'modelVersion': args.out.name, 'weightsSha256': hashlib.sha256(best.read_bytes()).hexdigest(),
        'datasetSha256': report['source_sha256'], 'classes': report['classes'],
        'initialWeights': str(args.weights),
        'validation': {k: float(v) for k,v in metrics.results_dict.items()},
        'imageSize': args.imgsz, 'epochsRequested': args.epochs,
        'confidenceThreshold': 0.5, 'confidenceThresholdStatus': 'provisional_not_calibrated',
        'externalValidation': False, 'commercialGradingValidated': False,
        'limitations': [report['limitation'], 'Sin clase sana; ausencia de detección no implica ausencia de defectos.',
                       'Máscaras de frutos completos; no porcentaje de superficie dañada.'],
        'environment': {'python': platform.python_version(), 'torch': torch.__version__,
                        'ultralytics': importlib.metadata.version('ultralytics')}}
    (args.out/'model.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(f'Exportado: {args.out}/best.pt y model.json. Falta evaluación final y fotos propias.')


if __name__ == '__main__':
    main()
