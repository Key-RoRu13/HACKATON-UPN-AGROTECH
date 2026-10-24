# Componentes y alcance verificable de RIKUY

| Componente | Implementación | Procedencia y límite |
| --- | --- | --- |
| Captura | Cámara/archivo, revisión, original/analizada, ampliar | Una palta por foto; conservar captura al fallar |
| Condiciones visibles | Segmentador entrenado, máscaras y puntuaciones | Dataset de defectos; sin clase sana; no certifica ausencia de daño |
| Madurez visual | Clasificador experimental de cinco etapas Hass | Excel original y partición por fruto; no mide firmeza interna |
| Incertidumbre | Umbral provisional; sin etiqueta si no se supera | Las puntuaciones se muestran y no son probabilidades calibradas |
| Conteo de la muestra | Registro manual opcional | Las detecciones no equivalen al número total de frutos |
| Defectos observados | Registro manual y porcentaje con denominador | Una misma palta puede tener varias detecciones; no contar máscaras como frutos únicos |
| Diámetro medio | Registro manual con instrumento | No inferido de píxeles ni equivalente al calibre comercial por peso |
| Clasificación comercial | Selección A/B/C o retención, con motivo | Decisión humana; faltan criterios de comprador para automatizar reglas |
| Historial y evidencia | Registro persistido y versiones de modelo por inspección | No se recalculan silenciosamente inspecciones anteriores |
| Dashboard y CSV | Mismo registro, fuente de mediciones y madurez | Lotes/origen/sesión son datos de demostración |
| Pasaporte y QR | Datos confirmados y campos públicos | Publicación Vercel/Supabase implementada; verificar cámara física y acceso desde otro teléfono en cada entorno |
| Orientación logística A/B/C | Regla automática simulada a partir de etapas Hass, guardada por inspección | A: 14 días; B: 7; C: 3, arbitrarios. Incertidumbre, etapa 5 o detecciones requieren revisión sin días; no equivale a categoría comercial |
| Comparación de destinos | Dashboard, parámetros revisables y escenario persistido | Simulación interna; no publica días en QR ni valida exportación |
| Vida útil | Auditoría temporal de datos, sin días publicados en la app | 52 trayectorias sin evento final observado; falta modelo temporal evaluado y condiciones conocidas |
| Datos de ejemplo | Camino de demostración explícito | No reemplaza un fallo de inferencia |
| Despliegue y accesos | Gestión e inferencia locales; pasaportes públicos Vercel/Supabase | Falta proteger accesos internos; no hay cumplimiento o certificación garantizados |

Las mediciones manuales no se presentan como predicciones. El dataset nuevo amplía la resolución de madurez y mejora la trazabilidad de las etiquetas; por sí solo no aporta peso, escala física, temperatura real de la planta ni precisión externa garantizada.
