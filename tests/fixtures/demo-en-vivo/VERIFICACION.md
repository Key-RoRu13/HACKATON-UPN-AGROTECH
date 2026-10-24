# Verificación del kit · 17 de octubre de 2026

Ejecutado en esta laptop, con los pesos actuales, sin publicar ni modificar los registros del usuario.

| Comprobación | Resultado |
| --- | --- |
| `ml/.venv/bin/python scripts/verificar-demo.py` | 5/5 casos reproducidos con inferencia real en CPU. |
| Integridad de fotografías | Cinco hashes SHA-256 coinciden con originales y manifiesto. |
| Madurez | Etapas 1, 3 y 5; caso no concluyente; error conocido de referencia 2 predicha 1. |
| Evidencia analizada | Cinco imágenes anotadas generadas por el detector. |
| Mediciones y categoría automática | Permanecen nulas; requiere revisión humana. |
| `npm test` | 23 pruebas aprobadas; API con almacenamiento temporal y proveedores cloud simulados, sin publicación real. |

La primera ejecución de `npm test` no pudo completar las pruebas que abren puertos dentro del sandbox restringido; al repetir con permiso para los servidores temporales, las 23 pasaron.

No se verificaron en esta tarea el escaneo con cámara física, el Wi-Fi del evento, la publicación real en Supabase ni el acceso de un jurado desde su celular. Requieren el ensayo descrito en README.md. Los cinco casos seleccionados no representan una medición de exactitud ni una validación externa. La alerta repetida `Suffocation` permanece visible y pendiente de revisión del modelo.
