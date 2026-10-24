# Visión experimental de RIKUY

Dos modelos independientes: segmentación de condiciones visibles y clasificación de madurez Hass en cinco etapas. La integración local está en `server/analysis.mjs`; Python produce un JSON y una imagen anotada. No se requiere una API FastAPI adicional.

## Instalar el entorno

Desde la raíz del proyecto, con Python 3.10 o superior compatible con las dependencias:

```bash
python3 -m venv ml/.venv
ml/.venv/bin/python -m pip install -r ml/requirements.txt
```

Los pesos y datasets están excluidos de Git y no se descargan automáticamente. Instala los artefactos entrenados de tu experimento, conservando pesos y manifiesto del mismo modelo:

```text
ml/artifacts/defectos-cpu-v1/
  best.pt
  model.json
ml/artifacts/hass-mendeley-active/
  best.pt
  model.json
```

La inferencia comprueba SHA-256, tarea y clases contra el manifiesto. No sirve colocar pesos genéricos bajo esos nombres. Si no dispones de los artefactos, puedes explorar el camino ilustrativo de la app o preparar y entrenar modelos con las herramientas incluidas; no puedes reproducir sus predicciones publicadas solo con el código del repositorio.

`ML_PYTHON`, `MODEL_DIR` y `RIPENESS_MODEL_DIR` permiten cambiar las rutas. Al reemplazar un modelo, reinicia el servidor. Las inspecciones anteriores conservan sus resultados.

## Comprobar inferencia

Con los modelos instalados:

```bash
ml/.venv/bin/python scripts/verificar-demo.py
```

El [kit de demo](../tests/fixtures/demo-en-vivo/README.md) conserva procedencia y salidas esperadas. No usa la API, no lee `.env` ni publica registros. Incluye aciertos, incertidumbre y un error conocido; no estima exactitud externa.

Para analizar otra foto, usa una carpeta de salida nueva:

```bash
PYTHONPATH=ml YOLO_CONFIG_DIR="$PWD/.data/ultralytics" MPLCONFIGDIR="$PWD/.data/matplotlib" \
  OMP_NUM_THREADS=4 MKL_NUM_THREADS=4 ml/.venv/bin/python -m agrotrace.predict \
  --model-dir ml/artifacts/defectos-cpu-v1 \
  --ripeness-model-dir ml/artifacts/hass-mendeley-active \
  --image /ruta/palta.jpg --out /ruta/salida-nueva --device cpu
```

## Informes y entrenamiento

- [Hass: selección, evaluación y reproducción](RESULTADO_HASS.md).
- [Auditoría del Excel, fotografías y particiones](AUDITORIA_HASS.md).
- [Segmentación de condiciones visibles](RESULTADO_LOCAL.md).
- [Clasificador anterior de tres etapas](RESULTADO_MADUREZ.md): experimento histórico, no el modelo preferido actual.
- [Alcance por componente](COMPONENTES_MVP.md).

`agrotrace.prepare`, `train` y `evaluate` preparan y evalúan defectos; `agrotrace.mendeley`, `ripeness` y `select_model` cubren Hass. Consulta la ayuda de cada módulo con `PYTHONPATH=ml ml/.venv/bin/python -m agrotrace.<modulo> --help`. Para el experimento de defectos también se conserva el [cuaderno de Colab](../notebooks/AgroTrace_Defectos_Colab.ipynb); requiere el paquete de datos y entrenamiento generado por separado.

Mantén días y lados del mismo fruto en una partición. Selecciona modelos con validación; reserva test para evaluación final. Las imágenes Roboflow de madurez coinciden con material Hass: no las presentes como evaluación externa independiente.

## Contrato y límites

El clasificador trabaja con RGB a 224 × 224 y un fruto entero. El umbral 0,6 es provisional y no calibrado; bajo ese valor la etapa queda ausente. No mide firmeza ni vida útil. El segmentador reproduce gris y estiramiento de su dataset; sus máscaras delimitan frutos completos y no áreas de lesión. No tiene clase sana; `Suffocation` es una etiqueta no validada como diagnóstico agronómico.

Conteo total, porcentaje de daño, calibre y categoría comercial automática permanecen nulos. Las mediciones manuales y la clasificación humana se guardan aparte. No sustituyas un error de inferencia por datos preparados sin identificarlo.

## Pruebas

```bash
PYTHONPATH=ml ml/.venv/bin/python -m unittest discover -s ml/tests
```

La procedencia y licencias de terceros están en [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). La versión de Ultralytics se fija en `requirements.txt`; el manifiesto registra el entorno de cada experimento. No se promete reproducción bit a bit entre equipos.
