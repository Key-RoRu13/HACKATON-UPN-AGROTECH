# Publicación permanente del pasaporte

Ruta elegida: despliegue gratuito del pasaporte en Vercel + Supabase; ver [instrucciones](../deployment/GRATUITO.md). Lo siguiente describe la alternativa de servidor/proxy propio, no necesaria para la ruta gratuita.

Estado: preparación local. No hay dominio ni despliegue publicado todavía.

El jurado escanea con la cámara del teléfono o su lector QR habitual; abre `/p/<identificador>` por HTTPS y no instala RIKUY.

## Dos accesos

- Servidor interno: `npm start`, puerto 3001. Incluye inspector, dashboard, persistencia e inferencia Python. No publicar este puerto sin proteger las rutas internas.
- Puerta pública: `npm run public:gateway`, puerto 3002, enlazado a loopback. Publicar mediante un proxy HTTPS en el mismo host. Solo permite GET de pasaportes, endpoint público, archivos de interfaz y fotografías de inspecciones confirmadas.
- Configurar en el proceso interno `PUBLIC_BASE_URL=https://dominio-del-pasaporte`. El inspector obtiene esta configuración al cargar; sus QR usan el dominio público.
- `INTERNAL_ORIGIN` en la puerta pública apunta al servidor interno (por defecto http://127.0.0.1:3001). Su puerto se configura con `PUBLIC_PORT`.

La puerta pública es una opción para servidor/VPS con ambos procesos y proxy local. Plataformas que exigen escuchar en 0.0.0.0 o un solo proceso necesitan adaptar el empaquetado cuando se conozca el hosting. No hay proveedor asumido.

## Requisitos del servidor interno

Node 22, build de React (`npm ci` y `npm run build`), entorno Python y pesos de ambos modelos si se desea analizar desde el servidor. Mantener un volumen persistente para `DATA_DIR` (registros y uploads); el disco efímero perdería evidencia al reiniciar o desplegar. No publicar datasets, entorno Python ni archivos internos como recursos web.

La configuración de ejemplo en `.env.example` no se carga automáticamente: configurar variables en el servicio/proveedor. Reiniciar procesos al cambiar configuración. El dominio debe resolver al proxy con TLS válido.

## Comprobación final en hosting

1. Crear una inspección y confirmarla desde el acceso interno protegido.
2. Comprobar que su QR contiene HTTPS y el dominio permanente.
3. Escanear desde un teléfono con datos móviles, sin depender de la Wi-Fi de la computadora.
4. Verificar fotografía, clasificación, lote y enlace compartido.
5. Reiniciar el servicio y comprobar que la inspección y sus imágenes siguen disponibles.
6. Verificar que el dominio público rechaza dashboard, inspector, APIs internas y operaciones POST.

La lectura desde un teléfono real y la disponibilidad permanente están pendientes hasta contar con hosting. Las pruebas de navegador locales no las sustituyen.

## Plataforma todavía por elegir

Vercel proporciona subdominio `vercel.app`, pero el servidor actual no se puede publicar allí sin adaptar persistencia e inferencia: utiliza archivos locales y un subproceso Python con modelos. Vercel puede alojar la interfaz si se añade un backend y almacenamiento externos.

Una alternativa con menos cambios es un servidor con Node/Python y disco persistente. Render proporciona subdominio `onrender.com`; sus discos persistentes requieren un servicio de pago. No se ha contratado ningún plan ni creado un proyecto. Confirmar presupuesto y recursos de CPU/memoria antes de desplegar. Documentación revisada: https://vercel.com/docs/functions/runtimes, https://vercel.com/docs/deployments/generated-urls, https://render.com/docs/web-services, https://render.com/docs/disks.
