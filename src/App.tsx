
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { HostView } from './routes/HostView';
import { ControllerView } from './routes/ControllerView';
import './App.css';

function Home() {
  return (
    <main className="app-shell">
      <section className="app-card app-card--hero" aria-labelledby="home-title">
        <header className="app-hero">
          <p className="app-kicker">Mesa rolera digital</p>
          <h1 id="home-title" className="app-title">DiceWaton</h1>
          <p className="app-lead">
            Creá una sala como host o entrá con el PIN para tirar dados y usar macros en tiempo real.
          </p>
          <p className="app-note">
            Diseñado mobile-first, con foco en legibilidad, feedback inmediato y conexión visible.
          </p>
        </header>

        <div className="app-feature-grid" aria-label="Capacidades principales">
          <article className="app-feature-card">
            <h2 className="app-feature-title">Host</h2>
            <p className="app-feature-copy">Abrí la mesa, compartí el PIN y marcá el contexto de juego sin perder claridad.</p>
          </article>
          <article className="app-feature-card">
            <h2 className="app-feature-title">Jugador</h2>
            <p className="app-feature-copy">Unite con tu nombre y PIN, tirá dados y seguí el estado de la sala en vivo.</p>
          </article>
          <article className="app-feature-card">
            <h2 className="app-feature-title">PWA</h2>
            <p className="app-feature-copy">La app puede abrir sin conexión; las acciones en vivo requieren internet.</p>
          </article>
        </div>

        <div className="app-cta-group" aria-label="Acciones principales">
          <Link to="/host" className="app-cta app-cta--primary">
            Crear una sala
          </Link>
          <Link to="/controller" className="app-cta app-cta--secondary">
            Unirse como jugador
          </Link>
        </div>
      </section>
    </main>
  );
}

function NotFound() {
  return (
    <main className="app-shell">
      <section className="app-card app-card--narrow app-card--centered" aria-labelledby="not-found-title">
        <p className="app-kicker">404</p>
        <h1 id="not-found-title" className="app-title app-title--compact">Página no encontrada</h1>
        <p className="app-lead app-lead--compact">La ruta que intentaste abrir no existe o ya no está disponible.</p>
        <Link to="/" className="app-cta app-cta--primary app-cta--full">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}

function App() {
  const [isOffline, setIsOffline] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [applyUpdate, setApplyUpdate] = useState<null | (() => void)>(null);

  useEffect(() => {
    const syncOnlineState = () => setIsOffline(!navigator.onLine);
    const onOfflineReady = () => setOfflineReady(true);
    const onUpdateAvailable = (event: Event) => {
      const customEvent = event as CustomEvent<{ applyUpdate?: () => void }>;
      setApplyUpdate(() => customEvent.detail?.applyUpdate ?? null);
    };

    syncOnlineState();
    window.addEventListener('online', syncOnlineState);
    window.addEventListener('offline', syncOnlineState);
    window.addEventListener('pwa:offline-ready', onOfflineReady as EventListener);
    window.addEventListener('pwa:update-available', onUpdateAvailable as EventListener);

    return () => {
      window.removeEventListener('online', syncOnlineState);
      window.removeEventListener('offline', syncOnlineState);
      window.removeEventListener('pwa:offline-ready', onOfflineReady as EventListener);
      window.removeEventListener('pwa:update-available', onUpdateAvailable as EventListener);
    };
  }, []);

  return (
    <BrowserRouter>
      {(isOffline || offlineReady || applyUpdate) && (
        <div className="pwa-status-banner" role="status" aria-live="polite">
          {isOffline && <span>Sin conexión. Podés abrir DiceWaton en caché, pero salas, unión y tiradas en vivo requieren internet.</span>}
          {!isOffline && offlineReady && <span>DiceWaton puede abrir sin conexión. Salas, unión y tiradas en vivo requieren internet.</span>}
          {applyUpdate && (
            <button type="button" onClick={applyUpdate} className="pwa-update-button">
              Actualizar app
            </button>
          )}
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostView />} />
        <Route path="/controller" element={<ControllerView />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
