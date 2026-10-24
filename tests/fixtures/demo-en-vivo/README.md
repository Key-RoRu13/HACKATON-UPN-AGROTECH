# RIKUY · kit de pruebas para la demo en vivo

## Dónde ejecutar cada parte

**Para esta demo: análisis en la laptop y pasaportes públicos en Vercel + Supabase.**

La laptop ejecuta Node y los modelos Python/CPU existentes. No hace falta alojar los modelos para presentar: abre el inspector y el dashboard en la laptop y carga las fotografías de `imagenes/`. Vercel sirve la consulta y Supabase conserva los reportes publicados y sus fotos. El QR debe apuntar al dominio público, nunca a `localhost`.

La inferencia local no necesita Internet una vez instaladas las dependencias y los pesos. Publicar un reporte nuevo y consultarlo desde el celular sí necesita conexión. Un reporte ya publicado debe seguir disponible aunque cierres la laptop. No estamos desplegando inferencia Python en Vercel en esta iteración.

## Imágenes listas para cargar

Usa los JPG de **imagenes/**, no las imágenes anotadas de resultados. Todos conservan los bytes de las fotografías originales. Para el recorrido corto utiliza **02-madura.jpg**; los otros casos sirven para preguntas o una segunda prueba.

| Archivo | Etapa según Excel | Resultado comprobado | Qué mostrar |
| --- | --- | --- | --- |
| [01-inmadura.jpg](imagenes/01-inmadura.jpg) | 1 · Inmadura | Etapa 1; puntuación 1,000 redondeada | Contraste con la muestra madura. No implica certeza absoluta. |
| [02-madura.jpg](imagenes/02-madura.jpg) | 3 · Madura I | Etapa 3; puntuación 0,879 | Caso principal: analizar → revisar → confirmar → publicar → escanear. |
| [03-sobremadura.jpg](imagenes/03-sobremadura.jpg) | 5 · Sobremadura | Etapa 5; puntuación 0,999 | Madurez avanzada y revisión de aptitud; no confirmar automáticamente descarte. |
| [04-requiere-revision.jpg](imagenes/04-requiere-revision.jpg) | 3 · Madura I | No concluyente; puntuación máxima 0,436 | El sistema evita asignar una etapa cuando no supera su umbral provisional. |
| [05-limite-del-modelo.jpg](imagenes/05-limite-del-modelo.jpg) | 2 · Inicio de maduración | Predice etapa 1; puntuación 0,887 | Error conocido: una puntuación alta no garantiza un acierto. |

Estas puntuaciones son salidas del modelo, **no probabilidades calibradas de acierto**. Los números pueden variar ligeramente por versiones o CPU. El quinto caso reproduce el error de `../hass-cinco-etapas.jpg`.

En los cinco casos, el detector de defectos señala **Suffocation**. Es una alerta experimental del modelo, no un diagnóstico de asfixia. Por esa alerta la lógica actual pide revisión y no propone automáticamente duración ni destino. No ocultar esta limitación ni esperar que estas fotos activen tres escenarios logísticos distintos. Los escenarios de 14/7/3 días del dashboard son simulaciones separadas, no vida útil medida.

### Procedencia y selección

Xavier, Rodrigues y Silva, *‘Hass’ Avocado Ripening Photographic Dataset*, DOI [10.17632/3xd9n945v8.1](https://data.mendeley.com/datasets/3xd9n945v8/1), licencia **CC BY 4.0**. Las cinco fotos pertenecen a validación de la partición local agrupada por fruto; no al entrenamiento de ese clasificador. Son frutos enteros fotografiados con luz controlada, no medias paltas cortadas ni fotografías externas de planta.

Se exploraron 50 fotografías de validación (10 por etapa, selección aleatoria con semilla 71): se eligió un acierto de alta puntuación para las etapas 1, 3 y 5 y el ejemplo de menor puntuación. Se añadió el error conocido de etapa 2. **Son ejemplos seleccionados para presentación, no una evaluación imparcial del modelo.** No se reentrenó ni modificó la inferencia. Nombres originales, identificadores, etiquetas, hashes y salidas están en [casos.json](casos.json). Los resultados completos y fotografías analizadas están en `resultados/`; son respaldo documental y no se inyectan en la aplicación.

## Preparación antes de presentar

1. Desde la raíz del proyecto, verifica los cinco casos:

   ```bash
   ml/.venv/bin/python scripts/verificar-demo.py
   ```

   Repite la inferencia real con los modelos actuales. No crea inspecciones, no lee `.env` ni publica en Supabase. Debe terminar con `5/5 casos reproducidos`. No evalúa el despliegue público.

2. Si el servidor ya está abierto, úsalo. Si necesitas iniciarlo con la configuración de publicación:

   ```bash
   node --env-file=.env scripts/dev.mjs
   ```

3. Abre `http://localhost:5173/inspector` y, en otra pestaña, `http://localhost:5173/dashboard`. Conserva el servidor en ejecución. Verifica `http://localhost:3001/api/health`: `analysis` debe ser `experimental`.
4. Comprueba en tu configuración local que `PUBLIC_BASE_URL` sea `https://rikuy-gamma.vercel.app`. No compartas ni proyectes `.env`. No uses los QR locales del video grabado como QR para el jurado.
5. En dashboard → Lotes, revisa la ficha de `PAL-2026-001`, la identificación de demostración y su publicación. No necesitas volver a ingresar datos productivos por cada inspección. Las fotos son de una muestra: no acreditan todo el lote.
6. Ensaya una publicación completa con Internet. En el celular, usando datos móviles, abre el QR del lote y el de una inspección publicada: deben funcionar sin sesión y mostrar su propia evidencia. Verifica las fotos original y analizada. No basta con abrir el enlace desde la laptop.
7. Ten abierto un pasaporte previamente publicado como respaldo, y carga el video local de `demo-video/`. Si falla la red durante la presentación, explica que estás mostrando el respaldo; no presentes el reporte anterior como resultado de una inspección nueva.

## Recorrido en vivo · aproximadamente dos minutos

| Tiempo | Acción en pantalla | Frase sugerida |
| --- | --- | --- |
| 0:00–0:15 | Inspector → seleccionar PAL-2026-001 | «Partimos de un lote con origen y ficha productiva registrados.» |
| 0:15–0:40 | Cargar 02-madura.jpg → elegir análisis experimental → analizar | «Analizamos una fotografía real del dataset de referencia. La estimación visual es experimental.» |
| 0:40–1:00 | Resultado → Original / Analizada → ampliar → revisar madurez y alerta | «La muestra se estima en etapa 3. Las alertas requieren revisión; no representan por sí solas un diagnóstico.» |
| 1:00–1:20 | Revisar clasificación → elegir categoría humana → indicar motivo → confirmar | «La decisión comercial la confirma el supervisor y queda asociada a esta inspección.» |
| 1:20–1:35 | Dashboard → inspección confirmada → verificar publicación y evidencia | «La misma inspección aparece en gestión con su foto y decisión, sin volver a capturar los datos.» |
| 1:35–2:00 | Mostrar QR del lote → escanear con cámara del celular → abrir inspección del historial o su QR individual | «El receptor consulta el lote y accede al reporte de esta muestra sin instalar una aplicación ni iniciar sesión.» |

Para ensayar puedes seleccionar B y escribir: «Clasificación manual de demostración; no derivada automáticamente de la fotografía». Esto es una decisión ficticia identificada, no la etiqueta del dataset ni una recomendación comercial real. En una inspección real, utiliza el criterio y las mediciones del supervisor.

No llenes calibre o peso con datos inventados. Si registras conteo manual, identifica su origen manual; una fotografía de un fruto no habilita un conteo validado de un bin. El flujo actual no mide textura al tacto, pulpa, semilla, adherencia, peso ni estándares de packing desde estas imágenes.

## Pruebas de aceptación

| Prueba | Resultado esperado |
| --- | --- |
| Original / Analizada y ampliar | Cambia la imagen o abre la ampliación; no avanza ni envía el formulario. |
| Caso principal | Madurez etapa 3, sin calibre/peso inventado; exige confirmación humana. |
| Caso no concluyente | Indica revisión; no fuerza una etapa ni duración. |
| Error conocido | Se reconoce la discrepancia con el Excel; la decisión sigue siendo humana. |
| Confirmar sin motivo cuando es obligatorio | Muestra validación y conserva la inspección pendiente. |
| Repetir captura antes de confirmar | Permite sustituir la foto sin confirmar la anterior por accidente. |
| Confirmar e ir a historial | Se conserva el registro y la fotografía de esa inspección. |
| QR individual | Abre esa inspección, con su clasificación confirmada y fotos, sin credenciales. |
| QR de lote | Abre ficha e historial confirmado del lote; los enlaces llevan a las inspecciones correctas. |
| Consulta desde otro dispositivo | Funciona por HTTPS sin depender de localhost ni de una sesión de la laptop. |
| Fallo de publicación | Conserva la inspección y permite reintentar; no anunciar un nuevo QR público hasta publicarla. |

El verificador automatiza los resultados de imagen y su integridad. `npm test` comprueba la API con datos temporales aislados. Las pruebas de celular, cámara física, red del evento y publicación real deben ensayarse en el entorno del presentador; este kit no las da por verificadas.
