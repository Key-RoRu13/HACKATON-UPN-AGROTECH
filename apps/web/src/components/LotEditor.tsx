import { useState } from 'react';
import { api, publicLotUrl, type Lot } from '../lib/api';
import { Button, Notice, QR } from './ui';
import ProductionInfo from './ProductionInfo';

export default function LotEditor({ lot, refresh }: { lot: Lot; refresh: () => Promise<void> }) {
  const p = lot.production;
  const [editing, setEditing] = useState(false); const [qr, setQr] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [values, setValues] = useState({ company: lot.company, farm: p?.farm || '', location: p?.location || '', sector: p?.sector || '', harvestDate: p?.harvestDate || '', packingDate: p?.packingDate || '', demonstration: p?.demonstration ?? true });
  function edit() { const p = lot.production; setValues({ company: lot.company, farm: p?.farm || '', location: p?.location || '', sector: p?.sector || '', harvestDate: p?.harvestDate || '', packingDate: p?.packingDate || '', demonstration: p?.demonstration ?? true }); setEditing(true); setError(''); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const response = await api<{ publication: { status: string } }>(`/lots/${lot.id}/profile`, { method: 'POST', body: JSON.stringify(values) });
      await refresh(); setEditing(false);
      setMessage(response.publication.status === 'published' ? 'Ficha guardada y publicada.' : response.publication.status === 'failed' ? 'Ficha guardada localmente. La publicación falló: comprueba la tabla de lotes de Supabase y reintenta.' : 'Ficha guardada localmente. Configura Supabase para publicarla en Internet.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function publish() {
    setBusy(true); setError('');
    try { await api(`/lots/${lot.id}/publish`, { method: 'POST', body: '{}' }); setMessage('Pasaporte del lote publicado.'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="lot-editor"><ProductionInfo lot={lot}/>{editing ? <form className="card" onSubmit={save}><h3>Ficha productiva · {lot.id}</h3><p className="caption">Estos campos son públicos al guardar y publicar. El responsable se registra desde la sesión actual.</p><div className="manual-fields">{[['company','Empresa responsable'],['farm','Fundo'],['location','Ubicación productiva'],['sector','Parcela o sector']].map(([key,label]) => <label className="field" key={key}>{label}<input required={key !== 'sector'} maxLength={180} value={values[key as 'company']} onChange={e => setValues({ ...values, [key]: e.target.value })}/></label>)}<label className="field">Fecha de cosecha<input type="date" value={values.harvestDate} onChange={e => setValues({ ...values, harvestDate: e.target.value })}/></label><label className="field">Fecha de empaque<input type="date" min={values.harvestDate || undefined} value={values.packingDate} onChange={e => setValues({ ...values, packingDate: e.target.value })}/></label><label className="production-checkbox"><input type="checkbox" checked={values.demonstration} onChange={e => setValues({ ...values, demonstration: e.target.checked })}/> Datos de demostración</label></div><p className="caption">Las fechas son opcionales; dejar vacío significa «No registrado». No introducir fechas inventadas como datos reales.</p><div className="lot-editor-actions"><Button type="submit" busy={busy}>Guardar ficha y publicar</Button><Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>Cancelar</Button></div></form> : <div className="lot-editor-actions"><Button variant="secondary" onClick={edit}>Editar ficha productiva</Button><Button variant="ghost" busy={busy} onClick={() => void publish()}>Publicar / actualizar lote</Button><Button variant="secondary" disabled={!lot.publicId} onClick={() => setQr(!qr)}>QR del lote</Button></div>}{error && <Notice error>{error}</Notice>}{message && <p role="status">{message}</p>}{qr && lot.publicId && <section className="card"><h3>QR estable del lote</h3><p className="caption">Publica la ficha antes de compartirlo. El enlace conserva el mismo identificador y reúne únicamente inspecciones confirmadas.</p><QR url={publicLotUrl(lot.publicId)}/></section>}</div>;
}
