# Auditoría del dataset original Hass

Se conservaron el Excel y las fotos originales sin modificaciones. El informe detallado está en `preparado-v1/audit.json`; las trayectorias descriptivas en `preparado-v1/trajectories.json`.

## Correspondencia

- Excel: 14.722 filas de fotografías, sin nombres duplicados.
- Imágenes disponibles y etiquetadas: 14.710; ninguna imagen sin fila en Excel.
- 12 nombres del Excel no tienen archivo; se excluyeron del entrenamiento y quedaron registrados.
- 478 identificadores Sample. Cada uno pertenece a una sola condición de almacenamiento; la clave numérica es globalmente única en este archivo.
- Etapa, día, fruto y almacenamiento de cada nombre coinciden con las columnas del Excel.
- Las 999 fotos de Roboflow coinciden por nombre y contenido: diferencia RGB media de miniaturas 64 × 64 de 0,000576 sobre valores 0–255; máxima media por imagen 0,00814. No constituyen un conjunto externo independiente.

## Partición nueva

334/72/72 frutos de entrenamiento/validación/prueba, respectivamente. Todas las fotos de cada fruto, días y lados permanecen juntas. Hay 10.238/2.200/2.272 imágenes por partición; las cinco etapas están representadas en todas. Sin hashes exactos cruzados entre particiones. No se garantiza ausencia de toda similitud visual ni desempeño bajo iluminación diferente.

Se prepararon imágenes RGB de 224 × 224 para un clasificador de cinco etapas. El entrenamiento arranca desde pesos genéricos ImageNet, sin reutilizar el modelo Roboflow que pudo haber visto frutos de la nueva prueba.

## Datos temporales

No hay etapas contradictorias entre lados en un mismo día ni retrocesos de etapa en las secuencias revisadas. 52 de los 478 frutos no presentan una observación de etapa 4 o posterior; están censurados por la derecha respecto a ese evento. El primer día observado en etapa 4 o posterior es una observación diaria del estudio, no un instante exacto ni una fecha garantizada para una nueva palta.

El Excel no contiene mediciones de diámetro, peso, conteo de una bandeja ni porcentaje de superficie lesionada. No se asignan a la app a partir de estas etiquetas. Las mediciones manuales existentes conservan fuente e instrumento. No se publica una predicción de días restantes sin evaluación temporal y condiciones de almacenamiento conocidas.

## Procedencia

Xavier, Rodrigues y Silva, ‘Hass’ Avocado Ripening Photographic Dataset, versión 1, DOI 10.17632/3xd9n945v8.1. Licencia declarada CC BY 4.0.
https://data.mendeley.com/datasets/3xd9n945v8/1
