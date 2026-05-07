
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { HostView } from './routes/HostView';
import { ControllerView } from './routes/ControllerView';
import './App.css';

function Home() {
  return (
    <main className="app-shell">
      <section className="app-card text-center space-y-8">
        <h1 className="text-4xl font-bold text-indigo-400">TTRPG Jackbox</h1>
        <p className="text-slate-400">Welcome! Are you hosting a new game or joining an existing one?</p>
        
        <div className="flex flex-col space-y-4">
          <Link
            to="/host"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-4 rounded-lg transition-colors text-lg"
          >
            Host a Game
          </Link>
          <Link
            to="/controller"
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-4 rounded-lg transition-colors text-lg"
          >
            Join as Player
          </Link>
        </div>
      </section>
    </main>
  );
}

function NotFound() {
  return (
    <main className="app-shell">
      <section className="app-card text-center space-y-6" aria-labelledby="not-found-title">
        <h1 id="not-found-title" className="text-3xl font-bold text-amber-300">Página no encontrada</h1>
        <p className="text-slate-300">La ruta que intentaste abrir no existe o ya no está disponible.</p>
        <Link
          to="/"
          className="w-full inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
        >
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
          {isOffline && <span>Sin conexión. Usando versión en caché cuando esté disponible.</span>}
          {!isOffline && offlineReady && <span>Modo offline listo para esta app.</span>}
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
