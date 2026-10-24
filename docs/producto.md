# RIKUY · propuesta de valor y alcance

RIKUY conecta la inspección de una muestra de palta Hass con una decisión humana documentada y un pasaporte accesible por QR. Busca reducir la dispersión de fotografías, fichas y resultados entre quienes inspeccionan, supervisan y reciben un lote.

## Usuarios y recorrido

1. El inspector selecciona un lote, carga una fotografía de un fruto entero y revisa la captura.
2. Dos modelos independientes estiman condiciones visibles y madurez. La interfaz conserva la fotografía original, la evidencia anotada, las puntuaciones y la versión de cada modelo.
3. Una persona revisa, registra mediciones opcionales y confirma una clasificación comercial A/B/C con motivo, o retiene la muestra. Las mediciones manuales se guardan separadas del resultado automático.
4. Gestión consulta el registro compartido, filtra inspecciones y mantiene la ficha productiva del lote: empresa, fundo, ubicación, sector, cosecha y empaque. No hay que rellenar la ficha de origen en cada inspección.
5. La publicación copia los campos autorizados y las fotografías a Supabase. Ante un fallo, conserva la inspección confirmada y permite reintentar.
6. Un receptor abre el QR sin instalar una aplicación ni iniciar sesión. El QR individual identifica una inspección; el QR del lote identifica su ficha y el historial de inspecciones confirmadas.

Una muestra no certifica el estado de todo el lote. La ficha productiva es información declarada, con responsable y fecha; no es certificación de origen ni prueba de despacho o recepción.

## Datos y separación de responsabilidades

| Información | Fuente |
| --- | --- |
| Madurez visual de cinco etapas | Clasificador experimental Hass |
| Condiciones visibles y máscaras | Segmentador experimental |
| Categoría comercial y motivo | Revisión humana |
| Conteo, defectos observados y diámetro | Registro manual opcional, con procedencia e instrumento cuando corresponde |
| Empresa, fundo y fechas productivas | Declaración asociada al lote |
| Días de duración y comparación de destinos | Simulación interna identificada |

La confirmación no transforma días simulados en vida útil real. La selección A/B/C de un escenario logístico tampoco equivale a una categoría comercial.

## Qué puede demostrarse

- Inspector web adaptable al celular y dashboard con un mismo registro persistente.
- Carga de fotografías, inferencia local real, alternancia original/analizada y ampliación.
- Validación de formularios, recuperación ante fallos y confirmación con auditoría.
- Historial, filtros, CSV, ficha productiva y dos tipos de pasaporte QR.
- Consulta pública por enlace, cámara o imagen del QR; evidencia alojada en almacenamiento privado con enlaces firmados.

## Límites actuales

No hay autenticación real de usuarios internos, gestión de permisos, integración de sensores, packing automático ni proceso de exportación implementado. El servidor administrativo se usa en un entorno controlado. La publicación pública es una copia de registros confirmados, no una migración de toda la operación a la nube.

La visión se evaluó con datos del mismo estudio y necesita validación con fotos propias. Las puntuaciones no son probabilidades calibradas; un resultado de alta puntuación puede ser incorrecto. El detector no tiene clase sana y sus alertas no constituyen diagnósticos.

No se miden peso, firmeza, pulpa, semilla, adherencia ni vida útil a partir de estas fotos. Los escenarios de 14/7/3 días son ejemplos arbitrarios internos. No se presentan como predicciones ni como recomendaciones de exportación.

La sesión de Ana Torres y los lotes de ejemplo son demostración. Los nombres de potenciales compradores utilizados en un pitch no representan clientes o ventas comprobados.

## Próximos pasos del producto

1. Evaluación externa por fruto, con fotografías de planta y referencias independientes.
2. Autenticación, permisos y persistencia administrativa adecuada antes de abrir la gestión a Internet.
3. Definir criterios comerciales con especialistas y compradores; ampliar mediciones sin inventarlas.
4. Investigar duración únicamente con datos temporales, condiciones de almacenamiento y validación apropiada.

[Arquitectura](arquitectura.md) · [Guion de presentación](guion-demo.md) · [Volver al proyecto](../README.md)
