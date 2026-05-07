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
  const channelRef = useRef<any>(null);
  const setUiStatus = useUiStore((state) => state.setStatus);

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
  }, [setIdentity, setRoom, setUiStatus]);

  const broadcastContext = useCallback((newContext: string) => {
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
  }, [setUiStatus]);

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
      <section className="app-card text-center">
        <h1 className="text-3xl font-bold mb-6">Administrar sala</h1>
        <div className="mb-4 text-left">
          <Link to="/" className="text-sm text-slate-300 hover:text-white underline underline-offset-4">Volver al inicio</Link>
        </div>
        <ScopedStatus scope="host-room" />
        <ScopedStatus scope="host-realtime" />
        
        {error ? <AlertBanner tone="error" title="No se pudo crear la sala" message={error} onRetry={createRoom} /> : null}

        {!roomId ? (
          <Button
            onClick={createRoom}
            loading={loading}
            className="w-full"
          >
            Crear sala
          </Button>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-slate-400 text-sm mb-1">PIN de sala</p>
              <div className="text-5xl font-mono font-bold tracking-widest text-indigo-400 bg-slate-900 p-4 rounded-lg">
                {roomPin}
              </div>
              <p className="mt-2 text-sm text-slate-300">Compartí este PIN: los jugadores lo ingresan en “Unirse a sala”.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
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
              <div className="flex gap-2">
                 <button onClick={() => broadcastContext('EXPLORATION')} className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-sm">Exploración</button>
                 <button onClick={() => broadcastContext('COMBAT')} className="bg-red-900 hover:bg-red-800 px-3 py-1 rounded text-sm text-red-100">Combate</button>
                  <button onClick={() => broadcastContext('SOCIAL')} className="bg-blue-900 hover:bg-blue-800 px-3 py-1 rounded text-sm text-blue-100">Social</button>
              </div>
              <ScopedStatus scope="host-context" className="mt-3 text-left" />
            </div>

            <div className="border-t border-slate-700 pt-6">
               <h2 className="text-xl font-semibold mb-4">Actividad de juego</h2>
              <DiceLog logs={logs} />
            </div>

            <div className="border-t border-slate-700 pt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
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
