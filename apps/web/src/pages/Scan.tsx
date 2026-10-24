import { useEffect, useRef, useState } from 'react';
import { Camera, ImageUp, ScanLine, ArrowRight } from 'lucide-react';
import { Brand, Button, Notice } from '../components/ui';

function reportPath(value: string) {
  const url = new URL(value, window.location.origin);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('El código no contiene un enlace de reporte RIKUY.');
  const match = /^\/(p|l)\/([a-zA-Z0-9-]{1,80})\/?$/.exec(url.pathname);
  if (!match) throw new Error('El código no corresponde a un pasaporte de inspección. Usa el QR generado al confirmar.');
  return '/' + match[1] + '/' + match[2];
}
async function decode(source: CanvasImageSource, width: number, height: number) {
  const scale = Math.min(1, 1600 / Math.max(width, height));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('El navegador no puede leer esta imagen.');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { default: jsQR } = await import('jsqr');
  return jsQR(pixels.data, pixels.width, pixels.height)?.data;
}
export default function Scan({ navigate }: { navigate: (path: string) => void }) {
  const video = useRef<HTMLVideoElement>(null); const input = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null); const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const mounted = useRef(true); const generation = useRef(0);
  const [camera, setCamera] = useState(false); const [starting, setStarting] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [link, setLink] = useState('');
  function stop() { generation.current++; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; if (timer.current) clearTimeout(timer.current); if (video.current) video.current.srcObject = null; }
  useEffect(() => {
    mounted.current = true;
    const hide = () => { if (document.hidden) { stop(); setCamera(false); setStarting(false); } };
    document.addEventListener('visibilitychange', hide);
    return () => { mounted.current = false; stop(); document.removeEventListener('visibilitychange', hide); };
  }, []);
  function open(value: string) { const path = reportPath(value); stop(); navigate(path); }
  async function start() {
    setError(''); setStarting(true); stop(); const token = generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara requiere HTTPS y un navegador compatible. Puedes subir una foto del QR.');
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (!mounted.current || token !== generation.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media; video.current!.srcObject = media; await video.current!.play(); setCamera(true);
      const tick = async () => {
        if (!mounted.current || token !== generation.current) return;
        try {
          const v = video.current;
          if (v && v.readyState >= 2 && v.videoWidth) { const value = await decode(v, v.videoWidth, v.videoHeight); if (token !== generation.current) return; if (value) { try { open(value); return; } catch (e) { setError((e as Error).message); } } }
        } catch { setError('No se pudo leer la cámara. Puedes detenerla y subir una foto.'); }
        if (mounted.current && token === generation.current) timer.current = setTimeout(tick, 250);
      };
      void tick();
    } catch (e) { if (mounted.current && token === generation.current) { stop(); setCamera(false); setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Permiso de cámara denegado. Puedes habilitarlo en el navegador o subir una imagen del QR.' : (e as Error).message); } }
    finally { if (mounted.current) setStarting(false); }
  }
  async function upload(file?: File) {
    if (!file) return;
    stop(); setCamera(false); setStarting(false); setError(''); setBusy(true);
    let bitmap: ImageBitmap | undefined;
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) throw new Error('Selecciona una imagen JPG, PNG o WebP de hasta 12 MB.');
      bitmap = await createImageBitmap(file);
      const value = await decode(bitmap, bitmap.width, bitmap.height);
      if (!mounted.current) return;
      if (!value) throw new Error('No encontramos un QR legible. Recorta la imagen alrededor del código y vuelve a intentarlo.');
      open(value);
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { bitmap?.close(); if (mounted.current) setBusy(false); if (input.current) input.current.value = ''; }
  }
  return <div className="passport-shell"><header className="passport-header"><Brand compact/><span className="demo-pill">CONSULTA PÚBLICA</span></header><main className="passport-main scan-main"><span className="scan-symbol"><ScanLine size={38}/></span><span className="eyebrow">PASAPORTE DE INSPECCIÓN</span><h1>Escanea y conoce la muestra</h1><p>Usa el QR de una inspección RIKUY para consultar su lote, fotografía y clasificación confirmada. Sin cuenta ni instalación.</p><section className="card scan-actions"><Button onClick={() => void start()} busy={starting} disabled={busy || camera}><Camera size={20}/> Escanear con cámara</Button><Button variant="secondary" onClick={() => input.current?.click()} busy={busy} disabled={starting}><ImageUp size={20}/> Subir imagen del QR</Button><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Imagen del código QR" hidden onChange={e => void upload(e.target.files?.[0])}/><p className="caption">JPG, PNG o WebP · hasta 12 MB. La imagen se lee en tu navegador y no se sube al servidor.</p></section><section hidden={!camera} className="scan-camera"><video ref={video} muted playsInline aria-label="Cámara para leer el código QR"/><p role="status">Centra el QR completo, con buena luz y sin reflejos.</p><Button variant="secondary" onClick={() => { stop(); setCamera(false); }}>Detener cámara</Button></section>{error && <Notice error>{error}</Notice>}<details className="card"><summary>¿Ya tienes el enlace del reporte?</summary><form className="scan-link" onSubmit={e => { e.preventDefault(); setError(''); try { open(link.trim()); } catch (e) { setError((e as Error).message); } }}><label className="field">Enlace de la inspección<input type="text" required value={link} onChange={e => setLink(e.target.value)} placeholder="https://…/p/…"/></label><Button type="submit" variant="secondary">Consultar reporte <ArrowRight size={18}/></Button></form></details><p className="caption">Cada lote y cada inspección confirmada tienen su propio QR. El reporte debe estar publicado para poder consultarlo aquí.</p></main></div>;
}
