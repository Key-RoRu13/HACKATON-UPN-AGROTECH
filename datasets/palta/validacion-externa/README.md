# Prueba piloto con fotografías propias

Objetivo: comprobar el recorrido y observar errores fuera del dataset. Diez frutos no bastan para certificar precisión en planta. Esta carpeta no se incorpora al entrenamiento.

## Preparar la muestra

1. Seleccionar 10 paltas Hass distintas, con variedad de apariencia y maduración. Identificarlas EXT-001 a EXT-010.
2. Fotografiar ambos lados, una palta por imagen, a color, enfocada, con fondo sencillo y luz uniforme sin filtros. Guardar en `fotos/` como `EXT-001-a.jpg`, `EXT-001-b.jpg`, etc. Cada archivo debe pesar como máximo 6 MB. Si son PNG o WebP, conservar la extensión real y actualizar el CSV; no basta renombrarla.
3. Completar las columnas de referencia de `registro.csv` **antes de consultar las predicciones**. Una persona con criterio técnico debe registrar el método y su evaluación independiente. Si no puede determinar una etapa, dejarla vacía: no inventar una etiqueta para calcular aciertos.
4. Usar 1 = inmadura; 2 = inicio de maduración; 3 = madura fase I; 4 = madura fase II; 5 = sobremadura. Una referencia visual es una comparación entre evaluadores, no una medición de firmeza interna. No equiparar automáticamente estas etapas con categorías A/B/C.
5. Registrar defectos observados con una descripción, incluido «sin defecto visible» cuando corresponda. El diámetro solo se registra si fue medido con instrumento. Mantener ambos lados del mismo fruto identificados como una sola muestra.

## Probar la aplicación

1. Desde la raíz ejecutar `npm run dev` y abrir `http://localhost:5173/inspector`. Reiniciar el servidor si estaba abierto antes de activar el modelo Hass.
2. Elegir PAL-2026-001 y cargar la primera fotografía propia, sin usar la ilustración de demostración.
3. Revisar la foto y ejecutar el análisis. Anotar en el CSV el identificador de inspección, etapa o «no concluyente», puntuación, versión y tiempo observado. No convertir puntuaciones en certeza de acierto.
4. Alternar Original / Analizada y ampliar/cerrar. Estas acciones deben conservar el registro y no confirmar ni avanzar el formulario.
5. Revisar clasificación. Introducir únicamente mediciones realmente tomadas; elegir una decisión humana con motivo o retener la inspección si no existe criterio suficiente. Si cada foto contiene un fruto, no registrar 10 como conteo de esa foto. No sumar los dos lados como dos frutos distintos.
6. Si se confirmó, abrir la misma inspección desde historial, dashboard y pasaporte. Verificar coincidencia de foto, decisión y mediciones; el pasaporte solo debe mostrar datos confirmados. Una retención no debe tener pasaporte público.
7. Completar el resto de fotografías, una por vez. Ante un error conservar la captura y reintentar; comprobar que no aparece una inspección duplicada.

## Revisar los resultados

- Separar fallos de interfaz (navegación, persistencia, QR) de errores de predicción.
- Para madurez, comparar solo filas con referencia independiente válida y predicción concluyente. Informar también cuántas quedaron sin conclusión, para no ocultarlas al calcular aciertos.
- Contar aciertos exactos y diferencias de una o más etapas. Revisar ambos lados juntos por fruto: 20 fotos de 10 frutos no son 20 muestras independientes.
- Examinar también falsos avisos sobre frutos sin defectos visibles. El segmentador no tiene clase sana: ausencia de detección no certifica ausencia de daño y «Suffocation» no constituye diagnóstico validado.
- Documentar fallos, condiciones de luz y referencias dudosas sin corregir las predicciones para que coincidan. Si después se usan estas fotos para ajustar el modelo, reservar otros frutos nuevos para la evaluación final.

## Teléfono y QR

Para una prueba física, conectar teléfono y computadora a la misma red y abrir `http://IP-DE-LA-COMPUTADORA:5173/inspector`. Generar el QR desde esa dirección, no desde localhost. Comprobar que otro teléfono abre el mismo reporte. Si el navegador no ofrece cámara en HTTP, usar el selector de archivo para cargar una foto tomada previamente. Aún no existe un despliegue público HTTPS.

El CSV es una ficha manual; la aplicación no importa automáticamente esta carpeta. El ensayo no publica ni entrena con las fotos.
