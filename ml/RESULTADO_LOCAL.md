# AgroTrace: primer modelo local de defectos

## Estado

Entrenado con CPU en este equipo. Versión `defectos-cpu-v1`, YOLOv8 nano segmentación, resolución 320 px. Piloto de dos épocas seguido de diez épocas de ajuste desde sus mejores pesos; el segundo entrenamiento duró 343.9 segundos, sin contar instalación ni evaluaciones posteriores.

504 imágenes de entrenamiento filtrado, 44 de validación y 24 de prueba. Se seleccionó el mejor checkpoint usando validación; test se evaluó después de finalizar, una vez. Se excluyeron seis imágenes de familias sospechosas, pero persiste riesgo de fotos del mismo fruto/sesión entre particiones.

| Métrica de máscaras | Validación | Test interno |
| --- | --- | --- |
| Precisión | 0.889 | 0.936 |
| Recall | 0.811 | 0.842 |
| mAP@50 | 0.878 | 0.890 |
| mAP@50–95 | 0.822 | 0.874 |

Estas métricas internas no son porcentaje de aciertos en planta. Los valores agregados de precisión/recall son calculados por Ultralytics y no describen necesariamente el umbral provisional de inferencia 0,5. En validación, Skin Damage presenta recall cercano a 0,526: puede omitir daños aun con buenas métricas agregadas. No se optimizó el umbral con test.

## Artefactos

- `ml/artifacts/defectos-cpu-v1/best.pt`: pesos entrenados.
- `ml/artifacts/defectos-cpu-v1/model.json`: manifiesto, clases, versiones, huellas y límites.
- `ml/artifacts/defectos-cpu-v1/test-metrics.json`: evaluación final interna.
- `ml/artifacts/prediccion-cpu-v1/analyzed.jpg`: predicción real sobre una imagen de validación; no es una prueba externa.
- `ml/artifacts/prediccion-cpu-v1/result.json`: instancias y polígonos, con métricas no disponibles nulas.
- `ml/artifacts/agrotrace-modelo-cpu-v1.zip`: copia empaquetada para respaldo.

Se verificó que el modelo se carga, que la huella de pesos corresponde al manifiesto y que puede producir una máscara de fruto completo con clase Black or Brown Spots. Su confianza no es un porcentaje de superficie afectada ni una probabilidad calibrada.

## Límites y siguiente integración

No hay clase sana. Ausencia de detección no certifica ausencia de daño. No se validan conteo total de muestra, calibre, madurez, vida útil ni categoría A/B/C. La clase Suffocation conserva el nombre original sin atribuir diagnóstico causal.

El modelo ya está conectado a las fotos cargadas mediante `server/analysis.mjs`. Las pantallas muestran original/analizada, condiciones visibles, campos no disponibles, decisión comercial manual y recuperación ante fallos. La ilustración mantiene resultados preparados explícitos. Falta probar fotografías propias de frutos sanos y afectados; la integración no demuestra generalización en planta.

El dataset declara CC BY 4.0, autor NeuranTechno; se conservan sus README. El entorno CPU está aislado en `ml/.venv` y sus versiones en `ml/artifacts/requirements-cpu.lock.txt`.
