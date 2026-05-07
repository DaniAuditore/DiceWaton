
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
  return (
    <BrowserRouter>
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
