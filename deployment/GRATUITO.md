# Pasaporte público: Vercel + Supabase

Guía para reproducir la publicación implementada. Inspector, gestión y modelos permanecen locales; la web pública consulta las copias publicadas. La disponibilidad y cuotas dependen del proveedor y del plan elegido.

## Qué se publica

Inspector, dashboard e inferencia siguen locales. Al confirmar, si Supabase está configurado, se suben únicamente los campos públicos y fotos de esa inspección. El jurado consulta la copia confirmada desde Vercel y Supabase sin depender de la computadora. Los escenarios logísticos simulados, notas y motivos privados no se envían.

El bucket es privado. La función de Vercel devuelve enlaces de imagen firmados de una hora; recargar el reporte renueva esos enlaces. El QR mantiene el identificador del reporte y no caduca junto con una URL de imagen.

## Configurar Supabase

1. Crear un proyecto Free en https://supabase.com/dashboard.
2. Ejecutar `deployment/supabase.sql` en SQL Editor. Crea tabla y bucket privados; no necesita habilitar lectura anónima.
3. Configurar `SUPABASE_URL` y `SUPABASE_SECRET_KEY` en el entorno del servidor local. Obtener la URL del proyecto desde Connect/Data API y la clave `sb_secret_…` desde Settings → API Keys. También se mantiene compatibilidad con la variable antigua `SUPABASE_SERVICE_ROLE_KEY`. La clave es secreta: no ponerla en frontend, Git ni chat. `.env.example` no se carga automáticamente. Puede usarse Node con `--env-file` y un archivo local ignorado, o variables del proceso.

## Configurar Vercel

1. Crear cuenta y proyecto en https://vercel.com. Importar el repositorio, usando la raíz del proyecto. No subir datasets, modelos ni `.data` al repositorio.
2. La configuración `vercel.json` compila React y publica `apps/web/dist`; `api/passport.mjs` consulta Supabase. No se publica el servidor ML.
3. Agregar `SUPABASE_URL` y `SUPABASE_SECRET_KEY` como variables de servidor y desplegar. No usar prefijo `VITE_` para estas claves.
4. Copiar la URL de producción asignada `https://<proyecto>.vercel.app` (el nombre concreto depende de disponibilidad) y configurar `PUBLIC_BASE_URL` con ella en el servidor local. Reiniciarlo y recargar el inspector/dashboard.

## Primeros reportes y recorrido

- Iniciar el servidor local con las variables configuradas y ejecutar `npm run publish:passports` para sincronizar inspecciones ya confirmadas, incluido el ejemplo. Es una operación explícita de publicación, no un entrenamiento.
- Las nuevas confirmaciones publican automáticamente si hay configuración. Si falla la red, la inspección se conserva local y muestra un aviso con reintento. No hace falta volver a confirmar.
- Abrir el QR del reporte publicado desde un teléfono con datos móviles. Verificar lote, clasificación, original/analizada e idioma.
- Apagar el servidor local y recargar el reporte desde el teléfono para verificar independencia. Esta comprobación debe repetirse en cada despliegue con un teléfono físico.

## Límites

Es una copia pública de registros confirmados, no una migración completa del dashboard a la nube. Los cambios de código requieren nuevo despliegue. La app no permite editar inspecciones confirmadas; si en el futuro se añade revocación, debe implementarse también la eliminación/revocación en Supabase. Si las cuotas gratuitas o la disponibilidad del proveedor se agotan, el reporte puede no estar disponible. Mantener los originales locales.

Documentación: https://vercel.com/docs/deployments/generated-urls y https://supabase.com/docs/guides/storage.

## Arranque local con archivo de variables

Crear `.env` en la raíz con `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y, cuando exista, `PUBLIC_BASE_URL`. No incluir comillas tipográficas ni prefijos `VITE_`. `.env` está ignorado por Git.

```sh
node --env-file=.env scripts/dev.mjs
```

En otra terminal, publicar confirmados existentes:

```sh
node --env-file=.env scripts/publish-passports.mjs
```

Si no hay repositorio GitHub preparado, Vercel también permite desplegar desde la carpeta con su CLI (`npx vercel login`, `npx vercel`, configurar variables del proyecto y `npx vercel --prod`). La configuración debe usar la raíz del proyecto, no solo `apps/web`, porque la función pública vive en `api/`.

## Entrada pública con lector QR

La raíz del despliegue redirige a `/consultar`, donde el jurado puede activar cámara, subir imagen JPG/PNG/WebP del QR (hasta 12 MB) o pegar un enlace. `/escanear` ofrece la misma pantalla. Los enlaces directos `/p/<id>` siguen abriendo la inspección correspondiente sin pasar por el lector.

La lectura se realiza en el navegador; la imagen del QR no se envía al servidor. El lector extrae el identificador de un enlace de pasaporte y consulta ese reporte en la instancia actual de RIKUY; no navega automáticamente hacia dominios externos contenidos en otros códigos. La cámara requiere HTTPS/localhost y permiso del usuario. La disponibilidad en un teléfono físico debe probarse después del despliegue.

Para publicar estos cambios, ejecutar `npx vercel --prod` desde la raíz del proyecto vinculado. No se ha ejecutado automáticamente el despliegue desde esta tarea.

## Ampliación: ficha productiva y QR estable del lote

1. En Supabase → SQL Editor, ejecutar `deployment/002_lot_passports.sql`. Añade la tabla privada `rikuy_lot_passports`; no elimina ni reemplaza las inspecciones ni las fotos existentes.
2. Reiniciar el servidor local con `.env`. Se asigna de forma persistente un identificador público a cada lote existente.
3. Abrir Dashboard → Lotes → Editar ficha productiva. Registrar empresa, fundo, ubicación, sector y fechas; indicar si son datos de demostración. Fechas ausentes se muestran como «No registrado».
4. Guardar ficha y publicar. Se actualiza el contexto productivo de los reportes ya publicados del mismo lote sin volver a cargar sus fotos. Se conserva un historial interno de fichas anteriores al editar.
5. Usar Publicar / actualizar lote para reintentar o sincronizar un lote sin cambios de ficha. El QR del lote abre `/l/<id>` y reúne solo inspecciones confirmadas que ya estén publicadas en la nube.
6. Ejecutar `npx vercel --prod` para desplegar la vista de lote y las nuevas rutas. El lector de QR admite códigos de lote y de inspección.
7. Escanear el QR del lote y abrir una inspección de su historial: debe mostrar su propia fotografía y análisis. Los QR individuales mantienen sus identificadores.

Si falta la nueva tabla, la publicación del lote falla de forma explícita. La publicación de una inspección individual puede seguir funcionando y mostrará un aviso separado del lote pendiente. La empresa/origen de la ficha es información declarada por el usuario, no validada automáticamente; la sesión responsable actual continúa siendo de demostración.
