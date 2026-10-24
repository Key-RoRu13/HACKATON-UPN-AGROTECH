import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Camera, ChartNoAxesCombined, ExternalLink, Leaf, ScanLine, ShieldCheck } from 'lucide-react';
import { api, setPublicBaseUrl, type Inspection, type Lot } from './lib/api';
import { Brand, Button, Loading, Notice } from './components/ui';
import Inspector from './pages/Inspector';
import Dashboard from './pages/Dashboard';
import LotPassport from './pages/LotPassport';
import Passport from './pages/Passport';
import Scan from './pages/Scan';

export type AppData = { lots: Lot[]; inspections: Inspection[]; refresh: () => Promise<void>; navigate: (path: string) => void };
export default function App() {
  const [path, setPath] = useState(window.location.pathname); const [lots, setLots] = useState<Lot[]>([]); const [inspections, setInspections] = useState<Inspection[]>([]); const [error, setError] = useState(''); const [ready, setReady] = useState(false);
  const navigate = useCallback((next: string) => { window.history.pushState({}, '', next); setPath(next); window.scrollTo({ top: 0 }); }, []);
  useEffect(() => { const pop = () => { setPath(window.location.pathname); window.scrollTo(0, 0); }; window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop); }, []);
  const refresh = useCallback(async () => { try { const [l, i, config] = await Promise.all([api<Lot[]>('/lots'), api<Inspection[]>('/inspections'), api<{ publicBaseUrl: string }>('/config')]); setPublicBaseUrl(config.publicBaseUrl); setLots(l); setInspections(i); setError(''); setReady(true); } catch (e) { setError((e as Error).message); throw e; } }, []);
  const isScan = path === '/consultar' || path === '/escanear';
  const isLotPassport = path.startsWith('/l/');
  const isPublic = path.startsWith('/p/') || isScan || isLotPassport;
  useEffect(() => { if (isPublic) return; void refresh().catch(() => {}); const timer = window.setInterval(() => void refresh().catch(() => {}), 5000); return () => window.clearInterval(timer); }, [refresh, isPublic]);
  if (isLotPassport) return <LotPassport id={decodeURIComponent(path.slice(3))}/>;
  if (isScan) return <Scan navigate={navigate}/>;
  if (isPublic) return <Passport id={decodeURIComponent(path.slice(3))}/>;
  const data = { lots, inspections, refresh, navigate };
  if (!ready) return <main className="startup"><Brand/>{error ? <><Notice error>{error}</Notice><Button onClick={() => void refresh().catch(() => {})}>Reintentar conexión</Button></> : <Loading/>}</main>;
  return <>{error && <div className="connection-alert" role="alert">{error} Los últimos registros siguen visibles. <button onClick={() => void refresh().catch(() => {})}>Reintentar</button></div>}{path.startsWith('/inspector') ? <Inspector {...data} path={path}/> : path.startsWith('/dashboard') ? <Dashboard {...data} path={path}/> : path === '/' ? <main className="launcher"><header><Brand/><span className="demo-pill">MVP · PALTA HASS</span></header><section className="launcher-hero"><span className="eyebrow">DEL CAMPO A UNA DECISIÓN CLARA</span><h1>Una muestra.<br/>Tres formas de <em>ver su historia.</em></h1><p>Inspección visual asistida y trazabilidad de palta. Un mismo registro para el inspector, calidad y quien recibe el producto.</p><div className="launcher-tags"><span><ShieldCheck size={16}/> Confirmación humana</span><span><Leaf size={16}/> Palta · Hass</span></div></section><div className="product-grid">{[{ icon: Camera, n: '01', title: 'Inspeccionar', text: 'Selecciona un lote, carga una fotografía y confirma su clasificación.', route: '/inspector', action: 'Abrir app del inspector' }, { icon: ChartNoAxesCombined, n: '02', title: 'Gestionar', text: 'Consulta las muestras, revisa pendientes y sigue cada inspección.', route: '/dashboard', action: 'Abrir dashboard' }, { icon: ScanLine, n: '03', title: 'Consultar', text: 'Explora el reporte público que se abre al escanear el código QR.', route: '/consultar', action: 'Escanear QR de inspección' }].map(p => <article className="product-card" key={p.n}><div><p.icon size={28}/><span>{p.n}</span></div><h2>{p.title}</h2><p>{p.text}</p><Button variant="secondary" onClick={() => navigate(p.route)}>{p.action}<ArrowRight size={18}/></Button></article>)}</div><Notice>Lotes y sesión de demostración. Las fotos cargadas se analizan con visión experimental; la foto ilustrativa usa datos preparados. La clasificación comercial la confirma el inspector.</Notice><footer>RIKUY <span>Agroexportadora Demo · <ExternalLink size={13}/> Prototipo funcional</span></footer></main> : <main className="startup"><h1>Página no encontrada</h1><Button onClick={() => navigate('/')}>Volver al inicio</Button></main>}</>;
}
