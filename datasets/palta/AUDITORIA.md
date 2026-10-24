# Revisión inicial de los datasets

Se conservaron los ZIP y se extrajeron en `defectos/original/` y `madurez/original/`. El informe estructurado está en `auditoria.json` y la muestra visual en `muestras.jpg`.

## Defectos v2

- 578 imágenes: 510 entrenamiento, 44 validación, 24 prueba. El README indica aumentos de entrenamiento y conversión a escala de grises.
- Tres clases reales del ZIP: `Black or Brown Spots`, `Skin Damage`, `Suffocation`. No contiene una clase `Good`.
- 761 anotaciones poligonales de segmentación: 666/66/29 por partición. No son cajas de detección; requieren un modelo de segmentación o una conversión explícita.
- Sin etiquetas ausentes ni errores sintácticos de clase/coordenadas detectados. Sin duplicados binarios exactos. Esto no descarta imágenes casi idénticas ni garantiza calidad semántica.
- La muestra visual presenta frutos individuales, fondos variables y fotografías en gris. No confirma variedad Hass ni representatividad de una planta peruana.
- No interpretar ausencia de detección como fruto sano. Tampoco contar polígonos como frutos sin revisar qué delimita cada etiqueta.

## Madurez v3

- 999 imágenes, todas en entrenamiento. No existen las carpetas de validación y prueba que referencia `data.yaml`.
- 999 cajas: 333 `Overripe`, 333 `Ripe`, 333 `Underripe`.
- Sin etiquetas ausentes ni errores sintácticos detectados; sin duplicados binarios exactos.
- Muestra visual: una palta por foto, fondo claro y condiciones controladas. Los nombres contienen patrones de tratamiento/día/fruto; deben investigarse para separar por fruto o sesión y evitar fuga de información. No dividir aleatoriamente sin revisar esos grupos.

## Decisión técnica

Mantener separados ambos conjuntos y sus clases. Priorizar un experimento de defectos con segmentación; usar madurez como tarea independiente después de preparar particiones por grupos. La demo inicial debe fotografiar una palta individual con buena iluminación. No afirmar rendimiento sobre bandejas, calibre, vida útil o clasificación comercial automática.

Antes de conectar inferencia real: revisar superposición de máscaras, comprobar particiones y similitudes visuales, entrenar y evaluar, probar fotografías propias y registrar versión del modelo. El análisis de la aplicación sigue siendo demostración; no se ha entrenado ni conectado un modelo con esta extracción.

Ambos conjuntos declaran CC BY 4.0; conservar los README de atribución.

## Segunda revisión: preparación reproducible

Se revisó una cuadrícula de 12 fotografías con máscaras (cuatro por partición). Las máscaras rodean frutos completos en esas muestras: las anotaciones expresan condiciones del fruto, no áreas individuales de lesión.

El comando `agrotrace.prepare` encontró dos pares con dHash de distancia <=4 entre entrenamiento y evaluación. La inspección visual muestra semejanza importante de fruto, mano y fondo; uno parece la misma captura con variación pequeña. Se excluyeron conservadoramente las familias de entrenamiento implicadas: seis imágenes, dejando **504** de entrenamiento, 44 de validación y 24 de prueba. Las originales permanecen intactas. No se afirma haber eliminado todas las coincidencias por fruto/sesión.

Resultado preparado: `defectos/preparado-v2/`, con configuración de rutas corregida, lista de entrenamiento filtrada, informe y cuadrícula. Paquete autónomo de Colab en `ml/artifacts/agrotrace-defectos-colab.zip`; cuaderno en `notebooks/AgroTrace_Defectos_Colab.ipynb`. No se ejecutó entrenamiento ni inferencia real.
