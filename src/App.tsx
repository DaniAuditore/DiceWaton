import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { HostView } from './routes/HostView';
import { ControllerView } from './routes/ControllerView';
import './App.css';

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-xl shadow-lg text-center space-y-8">
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
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostView />} />
        <Route path="/controller" element={<ControllerView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
