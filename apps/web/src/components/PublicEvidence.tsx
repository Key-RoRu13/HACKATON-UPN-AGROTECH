import { useEffect, useState } from 'react';
import { Expand } from 'lucide-react';
import { Button, Modal, Notice } from './ui';
import type { PublicRecord } from '../lib/api';

export default function PublicEvidence({ record, en, reload }: { record: PublicRecord; en: boolean; reload: () => void }) {
  const [analyzed, setAnalyzed] = useState(false); const [expanded, setExpanded] = useState(false); const [failed, setFailed] = useState(false); const [loaded, setLoaded] = useState(false);
  const t = (es: string, english: string) => en ? english : es;
  const src = analyzed && record.analyzedPhotoUrl ? record.analyzedPhotoUrl : record.photoUrl;
  useEffect(() => { setFailed(false); setLoaded(false); }, [src]);
  const image = <img className="public-photo" src={src} alt={t('Fotografía de la muestra de palta', 'Avocado sample photograph')} onError={() => setFailed(true)} onLoad={() => setLoaded(true)}/>;
  return <section className="public-photo-section"><div className="section-title"><h2>{t('La muestra inspeccionada', 'The inspected sample')}</h2><button className="icon-button" disabled={failed || !loaded} aria-label={t('Ampliar fotografía', 'Enlarge photograph')} onClick={() => setExpanded(true)}><Expand size={19}/></button></div>
    {record.analyzedPhotoUrl && <div className="segments"><button type="button" aria-pressed={!analyzed} onClick={() => setAnalyzed(false)}>{t('Original', 'Original')}</button><button type="button" aria-pressed={analyzed} onClick={() => setAnalyzed(true)}>{t('Analizada', 'Analyzed')}</button></div>}
    <p className="caption">{analyzed ? t('Evidencia analizada de esta inspección', 'Analyzed evidence from this inspection') : t('Fotografía original de esta inspección', 'Original photograph from this inspection')}</p>
    {failed || !src ? <div className="card"><Notice error>{t('No se pudo cargar esta fotografía. El enlace de acceso puede haber caducado o la conexión puede haber fallado.', 'This photograph could not load. The access link may have expired or the connection may have failed.')}</Notice><Button variant="secondary" onClick={reload}>{t('Actualizar fotografías', 'Refresh photographs')}</Button></div> : <>{!loaded && <p role="status">{t('Cargando fotografía…', 'Loading photograph…')}</p>}{image}</>}
    <p className="caption">{record.photoKind === 'illustration' ? t('Fotografía ilustrativa · Datos de demostración.', 'Illustrative photograph · Demonstration data.') : record.result.mode === 'experimental' ? t('Esta es la fotografía guardada para el identificador de este reporte. La máscara analizada delimita el fruto, no la superficie dañada.', 'This photograph is saved for this report identifier. The analyzed mask outlines the fruit, not the damaged area.') : t('Fotografía cargada por el inspector. Análisis de demostración.', 'Photograph uploaded by the inspector. Demonstration analysis.')}</p>
    {expanded && <Modal title={t('Fotografía de la muestra', 'Sample photograph')} onClose={() => setExpanded(false)}>{image}</Modal>}
  </section>;
}
