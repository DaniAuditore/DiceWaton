import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../stores/useGameStore';
import { DiceLog, type RollEvent } from '../components/DiceLog';
import { generatePin } from '../utils/pin';
import { AlertBanner } from '../components/ui/AlertBanner';
import { Button } from '../components/ui/Button';
import { ScopedStatus } from '../components/ui/ScopedStatus';
import { useUiStore } from '../stores/useUiStore';

export function HostView() {
  const { roomId, roomPin, setRoom, setIdentity, playerId, reset } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [logs, setLogs] = useState<RollEvent[]>([]);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const channelRef = useRef<any>(null);
  const setUiStatus = useUiStore((state) => state.setStatus);

  useEffect(() => {
    const syncOnlineState = () => setIsOnline(navigator.onLine);
    syncOnlineState();
    window.addEventListener('online', syncOnlineState);
    window.addEventListener('offline', syncOnlineState);

    return () => {
      window.removeEventListener('online', syncOnlineState);
      window.removeEventListener('offline', syncOnlineState);
    };
  }, []);

  const ensureAnonymousHostUser = async () => {
    let { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      const { error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) {
        throw signInError;
      }

      const refreshed = await supabase.auth.getUser();
      authData = refreshed.data;
    }

    if (!authData.user?.id) {
      throw new Error('No pudimos validar la sesión del host. Reintentá.');
    }

    return authData.user.id;
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await supabase.auth.signInAnonymously();
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (!roomId) return;
    
    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: playerId || 'host' }, broadcast: { self: true } }
    });

    channelRef.current = channel;
    setUiStatus('host-realtime', 'loading', 'Conectando sala en tiempo real...');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const newPlayers: any[] = [];
        for (const id in state) {
          newPlayers.push(...state[id]);
        }
        setPlayers(newPlayers);
      })
      .on('broadcast', { event: 'dice_roll' }, ({ payload }: { payload: unknown }) => {
        setLogs(prev => [payload as RollEvent, ...prev].slice(0, 50));
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          setUiStatus('host-realtime', 'success', 'Conectado en tiempo real.');
          const { data } = await supabase.auth.getUser();
          await channel.track({ 
            id: data.user?.id, 
            name: 'Host', 
            isHost: true 
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, [roomId, playerId, setUiStatus]);

  const createRoom = useCallback(async () => {
    if (!isOnline) {
      setUiStatus('host-room', 'error', 'Necesitás internet para crear una sala en tiempo real. Volvé a intentarlo cuando recuperes conexión.');
      return;
    }

    setLoading(true);
    setError(null);
    setUiStatus('host-room', 'loading', 'Creando sala...');
    try {
      const hostId = await ensureAnonymousHostUser();

      setIdentity(hostId, true);

      const pin = generatePin();

      const { data, error } = await supabase
        .from('active_rooms')
        .insert({
          pin,
          host_id: hostId,
        })
        .select()
        .single();

      if (error) throw error;

      setRoom(data.id, data.pin);
      setUiStatus('host-room', 'success', 'Sala creada correctamente.');
    } catch (err: any) {
      setError(err.message);
      setUiStatus('host-room', 'error', err.message);
    } finally {
      setLoading(false);
    }
  }, [isOnline, setIdentity, setRoom, setUiStatus]);

  const broadcastContext = useCallback((newContext: string) => {
    if (!isOnline) {
      setUiStatus('host-context', 'error', 'Necesitás internet para enviar cambios de contexto a la sala.');
      return;
    }

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'game_state_update',
        payload: { context: newContext }
      });
      setUiStatus('host-context', 'success', `Contexto enviado: ${newContext}.`);
    } else {
      setUiStatus('host-context', 'error', 'La sala todavía no está conectada. Reintentá en unos segundos.');
    }
  }, [isOnline, setUiStatus]);

  const closeRoom = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setPlayers([]);
    setLogs([]);
    reset();
    setUiStatus('host-room', 'success', 'Sala cerrada. Podés crear una nueva cuando quieras.');
  }, [reset, setUiStatus]);

  const copyRoomPin = useCallback(async () => {
    if (!roomPin) return;

    try {
      await navigator.clipboard.writeText(roomPin);
      setUiStatus('room-pin', 'success', `PIN ${roomPin} copiado al portapapeles.`);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = roomPin;
      textArea.setAttribute('readonly', 'true');
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textArea);
      setUiStatus(
        'room-pin',
        copied ? 'success' : 'error',
        copied ? `PIN ${roomPin} copiado al portapapeles.` : `No pudimos copiar el PIN. Copialo manualmente: ${roomPin}.`,
      );
    }
  }, [roomPin, setUiStatus]);

  const shareRoomPin = useCallback(async () => {
    if (!roomPin) return;

    const shareText = `Unite a mi sala de DiceWaton con el PIN ${roomPin}.`;
    if ('share' in navigator) {
      try {
        await navigator.share({ title: 'DiceWaton', text: shareText });
        setUiStatus('room-pin', 'success', 'Invitación compartida.');
        return;
      } catch {
        setUiStatus('room-pin', 'error', `No pudimos compartir. Copiá el PIN manualmente: ${roomPin}.`);
        return;
      }
    }

    await copyRoomPin();
  }, [copyRoomPin, roomPin, setUiStatus]);

  const controllers = useMemo(() => players.filter((p) => !p.isHost), [players]);

  return (
    <main className="app-shell">
      <section className={`app-card text-center ${roomId ? 'app-card--wide' : ''}`}>
        <h1 className="text-3xl font-bold mb-6">Administrar sala</h1>
        <div className="mb-4 text-left">
          <Link to="/" className="text-sm text-slate-300 hover:text-white underline underline-offset-4">Volver al inicio</Link>
        </div>
        <ScopedStatus scope="host-room" />
        <ScopedStatus scope="host-realtime" />
        {!isOnline ? (
          <AlertBanner
            tone="warning"
            title="Acciones en vivo no disponibles"
            message="DiceWaton puede quedar abierto, pero crear salas y enviar contexto requiere internet."
          />
        ) : null}
        
        {error ? <AlertBanner tone="error" title="No se pudo crear la sala" message={error} onRetry={createRoom} /> : null}

        {!roomId ? (
          <Button
            onClick={createRoom}
            loading={loading}
            disabled={!isOnline}
            className="w-full"
          >
            Crear sala
          </Button>
        ) : (
          <div className="operational-grid">
            <div className="operational-panel operational-panel--sticky space-y-6">
            <div>
              <p className="text-slate-400 text-sm mb-1">PIN de sala</p>
              <div className="text-5xl font-mono font-bold tracking-widest text-indigo-400 bg-slate-900 p-4 rounded-lg">
                {roomPin}
              </div>
              <p className="mt-2 text-sm text-slate-300">Compartí este PIN: los jugadores lo ingresan en “Unirse a sala”.</p>
              <div className="control-cluster mt-3 sm:justify-center">
                <Button type="button" variant="secondary" onClick={copyRoomPin} aria-label={`Copiar PIN ${roomPin}`}>
                  Copiar PIN
                </Button>
                <Button type="button" variant="secondary" onClick={shareRoomPin}>
                  Compartir invitación
                </Button>
              </div>
              <ScopedStatus scope="room-pin" className="mt-3 text-left" />
            </div>
            
            <div className="border-t border-slate-700 pt-6">
              <h2 className="text-xl font-semibold mb-4">Jugadores ({controllers.length})</h2>
               {controllers.length === 0 ? (
                 <div className="text-slate-400 text-sm italic">
                    Esperando que se unan jugadores...
                 </div>
              ) : (
                <ul className="space-y-2">
                  {controllers.map((p, i) => (
                    <li key={i} className="bg-slate-700 p-3 rounded-lg flex items-center justify-between">
                      <span className="font-semibold">{p.name}</span>
                       <span className="text-xs text-emerald-400">Conectado</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-700 pt-6">
               <h2 className="text-xl font-semibold mb-4">Contexto de juego</h2>
              <p className="mb-3 text-sm text-slate-400">Estos cambios se envían en vivo a los controles conectados.</p>
              <div className="control-cluster">
                 <button type="button" disabled={!isOnline} onClick={() => broadcastContext('EXPLORATION')} className="bg-slate-700 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50 px-3 py-2 rounded text-sm">Exploración</button>
                 <button type="button" disabled={!isOnline} onClick={() => broadcastContext('COMBAT')} className="bg-red-900 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 px-3 py-2 rounded text-sm text-red-100">Combate</button>
                  <button type="button" disabled={!isOnline} onClick={() => broadcastContext('SOCIAL')} className="bg-blue-900 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 px-3 py-2 rounded text-sm text-blue-100">Social</button>
              </div>
              {!isOnline ? <p className="mt-2 text-sm text-amber-200">Conectate a internet para enviar contexto.</p> : null}
              <ScopedStatus scope="host-context" className="mt-3 text-left" />
            </div>
            </div>

            <div className="operational-panel border-t border-slate-700 pt-6 md:border-t-0 md:pt-0">
               <h2 className="text-xl font-semibold mb-4">Actividad de juego</h2>
              <DiceLog logs={logs} />
            </div>

            <div className="operational-panel border-t border-slate-700 pt-6 control-cluster sm:justify-center md:col-span-2">
              <Button type="button" variant="danger" onClick={closeRoom}>Cerrar sala</Button>
              <Link to="/" className="rounded bg-slate-700 px-4 py-2 font-bold text-white transition-colors hover:bg-slate-600">
                Volver al inicio
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
