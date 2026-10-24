# RIKUY — Guion de demostración en vivo, 2 minutos

Duración objetivo: 120 segundos. Público: jurado de hackatón y responsables B2B de calidad, logística y compras. Fecha de corte: 17 de octubre de 2026.

## 1. Idea central

> Una muestra, una decisión documentada y un lote cuyo origen y evidencia se consultan por QR.

La demostración mantiene la secuencia cosecha → inspección → clasificación → consulta del lote → consulta de su evidencia. El objetivo es mostrar un recorrido completo y verificable, sin atribuir al MVP mediciones o resultados comerciales que no realiza.

Jesús representa al responsable de la operación; la plataforma utiliza actualmente la sesión de demostración de Ana Torres. La entrega de permisos a un supervisor se explica como contexto de negocio, no se representa como una función de acceso implementada.

Mercadona puede mencionarse como ejemplo hipotético de comprador español. No existe en este proyecto evidencia de que sea cliente, haya realizado pedidos o recomiende RIKUY.

## 2. Preparación fuera del cronómetro

### Pantallas y personas

- Presentador: narra y opera la computadora.
- Apoyo recomendado: lleva el celular para escanear los QR mientras la computadora permanece en el dashboard.
- Con una sola persona: mostrar el teléfono mediante duplicación de pantalla, o preparar una captura de respaldo identificada como tal. Ensayar el cambio de ventana antes de comenzar.
- Pestaña 1: dashboard local, en `/dashboard/lotes`, con el lote principal visible.
- Pestaña 2: inspector local, en `/inspector`, listo para iniciar la inspección. No hace falta usar teléfono físico para este paso: es una web adaptable.
- Pestaña 3: detalle del mismo lote en dashboard, preparada para mostrar su QR. La lista de inspecciones se actualiza al refrescar.
- Teléfono: cámara o web pública `/consultar`, sin sesión de Vercel y preferentemente usando datos móviles.

### Ficha preparada para la demo

Estos valores son ilustrativos y deben estar identificados como demostración, no como hechos verificados de una empresa real.

| Campo | Valor ilustrativo o acción |
| --- | --- |
| Lote | `PAL-2026-001` |
| Producto | Palta |
| Variedad | Hass |
| Empresa | Agroexportadora RIKUY Demo |
| Fundo | Fundo San José |
| Ubicación | Chao, Virú, La Libertad, Perú |
| Sector | Sector A — Parcela 03 |
| Cosecha | 15/10/2026 |
| Empaque | 16/10/2026, solo como evento de ejemplo ya ocurrido |
| Procedencia | Datos de demostración activados |
| Responsable y actualización | Generados por la sesión actual; no fingir otro usuario |

La fecha de empaque se deja vacía si en el caso narrado aún no ocurrió. Para esta demostración breve se puede representar una revisión de una partida con cosecha y empaque previamente declarados. No narrar que la app acaba de registrar físicamente esos eventos.

Guardar y publicar la ficha antes de grabar. No gastar el tiempo del pitch introduciendo cada campo.

### Foto y resultado

- Usar una foto a color de una palta entera, sin cambiar de imagen entre inspección y evidencia final.
- Si se usa una foto del dataset, identificar su procedencia como material de demostración.
- Ensayar el análisis de esa foto sin modificar su predicción para que encaje con la historia.
- Si devuelve incertidumbre o posibles condiciones visibles, mantenerlas en la presentación: la revisión humana es parte del producto.
- Una media palta puede servir como imagen de contexto del control manual, pero no debe presentarse como una entrada validada para los modelos actuales.
- Tener una inspección confirmada y publicada de respaldo con su QR. Si se usa, anunciar que es un registro previamente preparado; no presentarlo como el análisis que acaba de ejecutarse.

### Publicación y comprobación

- Servidor local actualizado y abierto con `node --env-file=.env scripts/dev.mjs`.
- SQL de lotes aplicado y versión actual desplegada en Vercel.
- Ficha y reportes publicados; comprobar los mensajes de publicación.
- Dominio público configurado en `PUBLIC_BASE_URL`; ningún QR para el jurado debe apuntar a localhost.
- Probar ambos QR desde el teléfono antes de grabar y comprobar que las fotos cargan.
- Evitar abrir `.env`, terminales con claves o pantallas de credenciales durante la grabación.

## 3. Guion cronometrado

Las frases entre comillas son la narración. Las acciones se realizan mientras se habla. No leer las aclaraciones técnicas de las secciones posteriores durante el pitch.

| Tiempo | Qué se muestra y qué se hace | Narración lista para decir |
| --- | --- | --- |
| **0:00–0:20 · Acceso operativo y cosecha** | Dashboard → Lotes → ficha de `PAL-2026-001`. Señalar empresa, fundo, sector, cosecha y empaque si está registrado. Cambiar al inspector, iniciar inspección y seleccionar ese lote. No realizar un alta de usuario inexistente. | «Jesús, responsable de la operación, encarga la revisión a su supervisor de calidad. La fruta llega del campo al acopio. En RIKUY, este lote ya tiene origen y fechas declaradas. Ahora vinculamos una muestra con su inspección.» |
| **0:20–0:45 · Inspección inteligente** | Cargar la foto entera preparada → Usar fotografía. Durante el procesamiento explicar el alcance. En resultado mostrar madurez, condiciones visibles y alternar Original/Analizada una vez. | «Seleccionamos una fotografía de palta Hass. El modelo estima madurez visual y señala posibles condiciones visibles. Conservamos la original y la evidencia analizada. Si el resultado no es concluyente, solicita revisión. Las mediciones físicas se registran aparte; no las inventamos desde la foto.» |
| **0:45–1:15 · Clasificación y preparación operativa** | Revisar clasificación → seleccionar la categoría comercial de demostración acordada, por ejemplo B → escribir motivo → confirmar. Si hay mediciones reales de esa muestra, tenerlas listas; si no, dejarlas vacías. Mostrar confirmación y que el registro se conserva en historial/dashboard. | «El supervisor revisa la evidencia, registra la categoría comercial y documenta el motivo. Puede añadir conteo, defectos observados y diámetro medido. Si la muestra requiere otra evaluación, se retiene. Así dejamos una decisión trazable para la siguiente operación; el cálculo de cajas pertenece a una siguiente versión.» |
| **1:15–1:40 · Lote y pasaporte digital** | Comprobar publicación. En Dashboard → Lotes, abrir QR del lote. El apoyo lo escanea; mostrar el pasaporte público con ficha e historial. La nueva inspección debe figurar entre las confirmadas publicadas. | «Tras confirmar y publicar, el lote reúne su ficha productiva y sus inspecciones. Este QR permanece asociado al lote. El receptor lo abre sin credenciales y consulta el origen declarado, las fechas y las evaluaciones disponibles, sin depender de una explicación por mensajes.» |
| **1:40–2:00 · Evidencia específica y cierre** | Volver a la computadora, abrir el QR propio de la inspección recién confirmada y escanearlo. Mostrar su foto y categoría. Si el segundo escaneo es lento, abrir la inspección desde el historial del pasaporte del lote y explicar que corresponde al enlace de su QR individual. | «El comprador puede consultar el lote o abrir una inspección específica con su propio QR. Aquí verifica la fotografía y la clasificación confirmada. Buscamos facilitar la evaluación del proveedor y futuras compras. RIKUY conecta origen, evidencia y decisión humana en un mismo recorrido.» |

La narración contiene 213 palabras, además de las acciones. Ensayar para mantener un ritmo natural y dejar tiempo al procesamiento y al escaneo. No acelerar hasta volver ilegibles las pantallas.

## 4. Mapa completo de campos y procedencia

Esta tabla es para el equipo; no hace falta leer todos los campos en dos minutos. Permite responder preguntas del jurado sin confundir datos, simulaciones y resultados.

### Ficha del lote, reutilizada por cada inspección

| Campo | De dónde sale | Dónde se ve |
| --- | --- | --- |
| Identificador del lote | Lote existente seleccionado | Inspector, dashboard y pasaportes |
| Producto y variedad | Palta/Hass del lote actual | Ficha y pasaportes |
| Empresa | Declaración en ficha | Dashboard y pasaportes |
| Fundo | Declaración en ficha | Dashboard y pasaportes |
| Ubicación | Declaración en ficha | Dashboard y pasaportes |
| Sector/parcela | Declaración opcional | Dashboard y pasaportes |
| Cosecha | Fecha declarada, opcional | Dashboard y pasaportes |
| Empaque | Fecha declarada, opcional; no anterior a cosecha | Dashboard y pasaportes |
| Demostración/dato declarado | Selección explícita de procedencia | Ficha pública |
| Responsable y actualización | Sesión actual y fecha del sistema | Ficha pública |
| Historial de cambios de ficha | Conservado internamente al editar | Persistencia interna; no hay una pantalla pública de auditoría de esos cambios |

Una nueva inspección selecciona el lote; no obliga a volver a introducir toda su ficha. La edición de la ficha sigue en Dashboard → Lotes. No mostrar un formulario de producción en el inspector como si ya existiera allí.

### Inspección

| Campo/elemento | Procedencia y alcance |
| --- | --- |
| Fotografía original | Archivo elegido/capturado para esa inspección |
| Evidencia analizada | Salida del modelo de condiciones visibles |
| Madurez visual | Clasificador experimental de cinco etapas |
| Puntuaciones y posibles condiciones | Salida experimental; no diagnóstico certificado |
| Orientación logística automática | Regla simulada; puede pedir revisión sin asignar días |
| Conteo de frutos | Manual opcional, no conteo automático de máscaras |
| Frutos con defectos observados | Manual opcional; requiere conteo para calcular porcentaje |
| Diámetro medio | Manual opcional con instrumento: calibrador o regla |
| Categoría A/B/C | Selección humana con motivo en análisis experimental |
| Retención | Decisión humana con motivo, sin pasaporte público |
| Motivo y notas | Información interna; no trasladarla automáticamente a clientes |
| Inspector, registro y confirmación | Sesión y fechas registradas |
| Modelo y versión | Registrados con el análisis |
| Identificador público propio | Enlace de esa inspección confirmada |

No existe campo funcional para peso, peso de cajas, número promedio por formato, semilla, pulpa, textura al tacto o adherencia de cáscara. No introducir esos valores en un texto libre y presentarlos como mediciones del modelo.

### Consulta pública

| QR | Ruta | Qué debe mostrar |
| --- | --- | --- |
| Del lote | `/l/<id-publico-del-lote>` | Ficha actual, última clasificación de una muestra, historial de inspecciones confirmadas publicadas y enlaces a evidencia |
| De inspección | `/p/<id-publico-de-inspeccion>` | Esa foto, ese análisis, clasificación confirmada, datos productivos actuales del lote, fechas y trazabilidad del registro |

El QR es un enlace; los datos y fotos publicados se consultan desde Vercel/Supabase. Dos inspecciones del mismo lote pueden tener fotos y resultados distintos. El QR del lote mantiene el mismo identificador mientras se actualiza su contenido.

La clasificación visible en el pasaporte de lote es la de una muestra reciente; no implica que todos sus frutos tengan la misma categoría.

## 5. Cómo encaja el recorrido solicitado con el MVP real

| Elemento de la historia solicitada | Estado actual | Tratamiento en la demo |
| --- | --- | --- |
| Jesús concede acceso al supervisor | Roles/permisos aún no implementados | Contexto narrado; sesión de demostración visible |
| Fruta llega en bines | Contexto de negocio; sin evento de recepción registrado | Una frase de apertura, no un registro de recepción inventado |
| Foto de media palta | Modelos preparados para apariencia de fruto entero | Usar entera para análisis; media palta solo como contexto manual, fuera del resultado automático |
| Color externo | El modelo usa apariencia visual; no hay una medición independiente de color | Hablar de madurez visual, no de un valor de color medido |
| Color de pulpa, tacto, semilla y cáscara | No implementados como resultados o campos estructurados | Explicar como ampliación futura si preguntan |
| Calibre y peso por intervalos | Diámetro manual disponible; peso y calibre comercial por peso no disponibles | Mostrar únicamente diámetro realmente medido; no equipararlo al calibre comercial |
| IA decide Estrella/Estándar/Descarte | No implementado | Mostrar A/B/C manual o retención; no renombrar como equivalentes sin criterios aprobados |
| Cálculo de cajas y paltas por formato | No implementado | Objetivo de evolución, no animación ni resultado simulado presentado como real |
| Exportación | No existe módulo de despacho ni aprobación de exportación | Hablar de consulta por un receptor; el QR no prueba que hubo exportación |
| Pasaporte y dos QR | Implementados; requieren publicación operativa | Parte principal del cierre en vivo |
| Mercadona vuelve a comprar y recomienda | Hipótesis comercial, no resultado comprobado | Hablar de confianza para evaluar futuras compras, sin afirmar pedidos ni recomendaciones |

Para usar en el futuro Estrella/Estándar/Descarte o calcular formatos de caja, primero hay que definir criterios, registrar peso y formato, implementar reglas y probarlas. No es un cambio de texto del pitch.

## 6. Si piden mostrar también la simulación logística

El guion principal prioriza la trazabilidad hasta ambos QR. No intentar explicar todas las simulaciones dentro de los mismos 120 segundos.

Alternativa: sustituir diez segundos del bloque de clasificación por abrir el detalle del dashboard y señalar A/B/C logísticos. Decir:

> «Podemos explorar destinos con ventanas de tiempo simuladas. Son escenarios de demostración; no una vida útil medida ni aprobación de exportación».

No confundir estos escenarios con las categorías comerciales A/B/C. Si se aplica un escenario manual, no altera la predicción original de la imagen.

## 7. Contingencias para mantener la demo en dos minutos

- **Análisis demora más de lo ensayado:** decir «El procesamiento continúa; voy a mostrar una inspección ya confirmada de respaldo». Desde ese momento usar su propio QR y su propio historial, sin mezclarlo con la nueva captura.
- **Resultado incierto:** decir «Aquí el sistema se abstiene y el supervisor debe revisar». No sustituir la etiqueta ni asegurar que la muestra es apta para exportación.
- **Publicación falla:** no compartir el QR nuevo como si estuviera listo. Usar un reporte previamente publicado y explicar que se trata del respaldo.
- **Cámara denegada:** el lector público permite subir una imagen del QR o pegar su enlace. Tenerlo preparado.
- **Segundo escaneo tarda:** abrir el detalle desde el historial del pasaporte del lote. Mostrar brevemente el QR individual y explicar que lleva a ese mismo registro.
- **Falta cosecha/empaque:** mostrar «No registrado». No inventar fechas para completar la pantalla.

## 8. Cierre B2B alternativo

> «El objetivo de RIKUY es que calidad y el receptor consulten la misma evidencia: de dónde viene el lote, qué muestra se revisó y quién confirmó la decisión. Hoy demostramos ese recorrido conectado; el siguiente paso es validar desempeño en planta e incorporar criterios de empaque y logística reales».

La demo presenta una herramienta de registro y apoyo a revisión. No demuestra todavía ahorro económico, compra recurrente, certificación sanitaria ni aptitud de exportación.
