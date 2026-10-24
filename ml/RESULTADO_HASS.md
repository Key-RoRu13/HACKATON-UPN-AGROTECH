# Modelo Hass de cinco etapas: resultado e integración

## Resultado

Versión seleccionada: `hass-mendeley-ajuste-v1`. Clasificador YOLOv8 nano, RGB 224 × 224, una palta por fotografía. Diez épocas con backbone congelado (freeze=9), seguidas de cuatro épocas de ajuste parcial (freeze=5, AdamW, lr0=0,0002). Se conservan ambos experimentos y los modelos anteriores.

Se inició desde pesos genéricos de clasificación, sin reutilizar el modelo Roboflow de tres clases porque contiene frutos presentes en el conjunto original nuevo.

## Selección y prueba

La selección usó exclusivamente accuracy de validación: primera pasada 0,74773 (CSV redondeado; manifiesto recuperado tras corregir preprocessing ausente), ajuste 0.76727. La primera pasada completó entrenamiento y validación; el error de exportación no modificó sus pesos. Se corrigió el contrato de preparación y se añadió una prueba de ese campo.

La versión elegida se evaluó una vez en las 2.272 fotos de 72 frutos reservados para prueba:

- Accuracy de etapa exacta: 0.7914.
- Macro F1: 0.7814.
- Error absoluto medio: 0.2174 etapas.
- A una etapa o menos de la etiqueta: 0.9916.
- Accuracy agrupando 1–2 / 3–4 / 5 en tres clases: 0.8886.

La última cifra se calcula sobre ESTA prueba nueva: no demuestra una mejora frente al 82 % del modelo anterior, que tenía otras clases y otros frutos de evaluación. Top-5 con cinco clases siempre incluye la clase correcta y no se presenta como logro.

| Etapa | Precision | Recall | F1 | Fotos de prueba |
| --- | --- | --- | --- | --- |
| 1. Inmadura | 0.934 | 0.910 | 0.922 | 590 |
| 2. Inicio de maduración | 0.694 | 0.766 | 0.728 | 308 |
| 3. Madura · fase I | 0.805 | 0.718 | 0.759 | 500 |
| 4. Madura · fase II | 0.703 | 0.691 | 0.697 | 472 |
| 5. Sobremadura | 0.761 | 0.846 | 0.801 | 402 |

Las métricas corresponden a la clase de mayor puntuación antes de aplicar la abstención del umbral 0,6. Ese umbral sigue siendo provisional y no calibrado. No se estimaron intervalos de confianza por fruto; las múltiples fotos del mismo fruto no son muestras independientes. El modelo fue probado dentro del mismo estudio, no en capturas externas de planta.

La matriz de clasificación de Ultralytics contiene una fila/columna adicional vacía de fondo. Se excluyó de las métricas por clase; no se repitió la inferencia ni se cambiaron predicciones. Ver `test-metrics.json`.

## Datos y procedencia

Ver `ml/AUDITORIA_HASS.md`: 14.710 fotos disponibles, 14.722 filas Excel, 12 archivos ausentes, 478 frutos. Las 999 fotos de Roboflow coinciden por nombre y contenido; se tratan como el mismo material. Partición 334/72/72 frutos, 10.238/2.200/2.272 fotos, agrupando días y lados. Etiquetas verificadas contra Excel.

Fuente: Xavier, Rodrigues y Silva, Hass Avocado Ripening Photographic Dataset, DOI 10.17632/3xd9n945v8.1, CC BY 4.0. https://data.mendeley.com/datasets/3xd9n945v8/1

## App y contrato

`ml/artifacts/hass-mendeley-active/` contiene pesos y manifiesto seleccionados. `server/analysis.mjs` lo prefiere en un nuevo arranque, salvo que RIPENESS_MODEL_DIR indique otra carpeta. Reiniciar `npm run dev` si el servidor seguía abierto antes del cambio.

La salida `result.ripeness` conserva labelSchema=hass_ripening_5, etapa, etiqueta, puntuaciones, versión y fuente. Si ninguna clase supera el umbral, etiqueta y etapa quedan nulas; la UI muestra incertidumbre y las dos mayores puntuaciones. Son puntuaciones, no probabilidades calibradas. Los registros previos no se recalculan.

Inspector, dashboard, CSV y pasaporte muestran las cinco etapas. Se conserva el segmentador de condiciones visibles y las mediciones manuales con procedencia e instrumento. Cambiar o ampliar fotografía no envía el formulario. La vida útil no se publica: 52 secuencias no alcanzan el evento final observado y falta evaluación temporal bajo condiciones conocidas.

## Reproducir

```bash
PYTHONPATH=ml ml/.venv/bin/python -m agrotrace.mendeley --source datasets/palta/hass-mendeley --out datasets/palta/hass-mendeley/otra-preparacion
PYTHONPATH=ml ml/.venv/bin/python -m agrotrace.ripeness train --data datasets/palta/hass-mendeley/otra-preparacion --out ml/artifacts/otra-base --epochs 10 --freeze 9
PYTHONPATH=ml ml/.venv/bin/python -m agrotrace.ripeness train --data datasets/palta/hass-mendeley/otra-preparacion --out ml/artifacts/otro-ajuste --weights ml/artifacts/otra-base/best.pt --epochs 4 --freeze 5 --lr0 0.0002
PYTHONPATH=ml ml/.venv/bin/python -m agrotrace.select_model --candidates ml/artifacts/otra-base ml/artifacts/otro-ajuste --out ml/artifacts/otro-activo
PYTHONPATH=ml ml/.venv/bin/python -m agrotrace.ripeness evaluate --data datasets/palta/hass-mendeley/otra-preparacion --out ml/artifacts/otro-activo
```

Configurar los directorios de caché y threads según `ml/README.md`. Usar salidas nuevas; conservar originales. No ajustar hiperparámetros a los resultados de test.

## Prueba de demostración

`tests/fixtures/hass-cinco-etapas.jpg` proviene de validación y tiene etapa 2 en el Excel. Sirve para probar el recorrido, no para demostrar precisión externa. Tomar fotos propias a color, de una palta entera, con buena luz y fondo claro, y etiquetarlas con una persona conocedora antes de afirmar desempeño real.

Alcance de todos los componentes: `ml/COMPONENTES_MVP.md`. La publicación de pasaportes por HTTPS está implementada con Vercel/Supabase; la autenticación interna sigue pendiente. Ver `deployment/GRATUITO.md`. El QR local no equivale a un enlace público.

## Revisión visual de la prueba de interfaz

En `tests/fixtures/hass-cinco-etapas.jpg`, el Excel indica etapa 2 y el modelo seleccionado estima etapa 1 con puntuación 0,89: es un error de una etapa documentado, no se reemplaza por la etiqueta real para aparentar acierto. La prueba automatizada comprueba que la UI representa la predicción guardada; no certifica que sea correcta. Esto refuerza la necesidad de revisión humana y validación externa.

El segmentador independiente asigna a esa foto la clase original “Suffocation”. El dataset de madurez no aporta una etiqueta de defectos para confirmar o refutar ese resultado; no debe interpretarse como diagnóstico de asfixia ni evidencia de pudrición. Su entrenamiento no se ha ampliado con clases sanas del nuevo conjunto. La incorporación de Mendeley mejora la documentación y resolución de la tarea de madurez, no valida automáticamente el detector de defectos.
