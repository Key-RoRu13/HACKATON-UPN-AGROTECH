# Madurez visual: modelo experimental local

## Estado

`madurez-cpu-v1`, clasificador YOLOv8 nano ajustado localmente en CPU durante 10 épocas. Entrada de una palta por fotografía, RGB, orientación EXIF corregida y redimensionado a 224 × 224 conservando el encuadre completo. Las cajas originales sirven para comprobar que hay una sola etiqueta por foto; no se entrenó conteo ni localización de frutos con este clasificador.

## Particiones

999 imágenes de Avocado Ripeness Prediction v3. Se agruparon conservadoramente por el ID numérico del nombre, uniendo días, vistas y tratamientos con ese ID: 388 grupos, 271/58/59 para entrenamiento/validación/prueba. Resultado: 700/161/138 imágenes. No hay grupos ni hashes exactos compartidos entre particiones. La identidad se infiere de los nombres y no está confirmada con el autor; no se descartan todas las similitudes ni dependencia por sesión.

Clases por partición, en orden Overripe / Ripe / Underripe:

- Entrenamiento: 234 / 233 / 233.
- Validación: 51 / 49 / 61.
- Prueba: 48 / 51 / 39.

## Evaluación interna

- Accuracy top-1 en validación: 0.807.
- Accuracy top-1 en prueba: 0.819 (113 de 138 fotografías).
- Tiempo acumulado de entrenamiento: 84.1 segundos.

Se eligieron pesos usando validación y se evaluó test después, sin modificar el modelo ni su umbral con estos resultados. Top-5 no aporta información útil al existir solo tres clases y no se presenta como logro. La accuracy corresponde a la clase con mayor puntuación antes de la abstención por umbral.

El umbral 0,6 es provisional, no calibrado. Inferencia muestra una estimación solo si se supera; de otro modo registra incertidumbre y no asigna una etiqueta. Esto no detecta automáticamente imágenes fuera de distribución: un fondo, otra especie o varias paltas pueden producir puntuaciones altas erróneas. La captura debe cumplir el protocolo y pasar revisión humana.

## Integración

`server/analysis.mjs` ejecuta ambos modelos dentro del mismo trabajo Python. Los resultados se guardan en `result.ripeness`, separados de detecciones, mediciones manuales y categoría comercial. Inspector, dashboard, CSV y pasaporte consultan el mismo registro. Las inspecciones anteriores permanecen sin una estimación retroactiva inventada.

Si madurez falla, se indica el error de esa tarea y se conserva el resultado de condiciones visibles. No se sustituye por datos de demostración. `RIPENESS_MODEL_DIR` permite configurar la carpeta de pesos/manifiesto. La fotografía ilustrativa sigue siendo demostración sin inferencia.

## Límites

Es madurez visual estimada; no mide firmeza interna, calibre comercial, vida útil, inocuidad ni destino de exportación. El modelo de defectos sigue siendo independiente, sin clase sana y sin conteo total validado. No se han evaluado fotos externas propias de una planta peruana.

## Reproducir

Desde la raíz, con el entorno de `ml/README.md`:

```bash
PYTHONPATH=ml ml/.venv/bin/python -m agrotrace.ripeness prepare --data datasets/palta/madurez/original --out datasets/palta/madurez/otra-preparacion
PYTHONPATH=ml ml/.venv/bin/python -m agrotrace.ripeness train --data datasets/palta/madurez/otra-preparacion --out ml/artifacts/otro-modelo --epochs 10
PYTHONPATH=ml ml/.venv/bin/python -m agrotrace.ripeness evaluate --data datasets/palta/madurez/otra-preparacion --out ml/artifacts/otro-modelo
```

Configurar YOLO_CONFIG_DIR, MPLCONFIGDIR y OMP_NUM_THREADS como en la guía CPU. Se requieren los pesos iniciales `ml/artifacts/yolov8n-cls.pt`. El comando de prueba rechaza sobrescribir una evaluación existente.

## Atribución

Dataset: Avocado Ripeness Prediction Using Images, Avocado Ripeness Prediction v3, CC BY 4.0. Fuente: https://universe.roboflow.com/avocado-ripeness-prediction-using-images/avocado-ripeness-prediction/dataset/3. Conservar README de origen. Herramientas/modelos Ultralytics tienen licencia separada.

Referencia técnica: https://docs.ultralytics.com/tasks/classify/.
