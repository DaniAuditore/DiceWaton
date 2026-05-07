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
      <section className="app-card app-card--wide" aria-labelledby="host-title">
        <header className="screen-header">
          <div className="screen-header__copy">
            <p className="screen-kicker">Sala del host</p>
            <h1 id="host-title" className="screen-title">Administrar sala</h1>
            <p className="screen-lead">
              Creá la sala, compartí el PIN y seguí la actividad en vivo con una jerarquía clara.
            </p>
          </div>
          <Link to="/" className="screen-back-link">Volver al inicio</Link>
        </header>

        <div className="status-stack" role="group" aria-label="Estado de la sala">
          <ScopedStatus scope="host-room" />
          <ScopedStatus scope="host-realtime" />
        </div>

        {!isOnline ? (
          <AlertBanner
            tone="warning"
            title="Acciones en vivo no disponibles"
            message="DiceWaton puede quedar abierto, pero crear salas y enviar contexto requiere internet."
          />
        ) : null}

        {error ? <AlertBanner tone="error" title="No se pudo crear la sala" message={error} onRetry={createRoom} /> : null}

        {!roomId ? (
          <section className="surface-panel surface-panel--centered" aria-labelledby="host-create-room-title">
            <p className="screen-kicker">Preparación</p>
            <h2 id="host-create-room-title" className="surface-panel__title">Todavía no hay una sala activa</h2>
            <p className="surface-panel__copy">
              Creá una sala para generar el PIN y habilitar la sincronización en tiempo real.
            </p>
            <Button onClick={createRoom} loading={loading} disabled={!isOnline} className="w-full sm:w-auto">
              Crear sala
            </Button>
          </section>
        ) : (
          <div className="operational-grid">
            <div className="operational-panel operational-panel--sticky panel-stack">
              <section className="surface-panel" aria-labelledby="host-pin-title">
                <header className="surface-panel__header">
                  <div>
                    <p className="screen-kicker">PIN compartido</p>
                    <h2 id="host-pin-title" className="surface-panel__title">Compartí este código</h2>
                  </div>
                </header>
                <div className="pin-display" aria-label={`PIN de sala ${roomPin}`}>
                  {roomPin}
                </div>
                <p className="surface-panel__copy pin-copy">
                  Los jugadores lo ingresan en “Unirse a sala”.
                </p>
                <div className="control-cluster pin-actions">
                  <Button type="button" variant="secondary" onClick={copyRoomPin} aria-label={`Copiar PIN ${roomPin}`}>
                    Copiar PIN
                  </Button>
                  <Button type="button" variant="secondary" onClick={shareRoomPin}>
                    Compartir invitación
                  </Button>
                </div>
                <ScopedStatus scope="room-pin" className="status-stack" />
              </section>

              <section className="surface-panel" aria-labelledby="host-players-title">
                <header className="surface-panel__header">
                  <div>
                    <p className="screen-kicker">Presencia</p>
                    <h2 id="host-players-title" className="surface-panel__title">Jugadores ({controllers.length})</h2>
                  </div>
                </header>
                {controllers.length === 0 ? (
                  <p className="empty-state">Esperando que se unan jugadores...</p>
                ) : (
                  <ul className="room-member-list">
                    {controllers.map((p, i) => (
                      <li key={i} className="room-member">
                        <span className="room-member__name">{p.name}</span>
                        <span className="room-member__status">Conectado</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="surface-panel" aria-labelledby="host-context-title">
                <header className="surface-panel__header">
                  <div>
                    <p className="screen-kicker">Estado de la mesa</p>
                    <h2 id="host-context-title" className="surface-panel__title">Contexto de juego</h2>
                  </div>
                </header>
                <p className="surface-panel__copy">
                  Estos cambios se envían en vivo a los controles conectados.
                </p>
                <div className="control-cluster">
                  <Button type="button" variant="secondary" disabled={!isOnline} onClick={() => broadcastContext('EXPLORATION')}>
                    Exploración
                  </Button>
                  <Button type="button" variant="secondary" disabled={!isOnline} onClick={() => broadcastContext('COMBAT')}>
                    Combate
                  </Button>
                  <Button type="button" variant="secondary" disabled={!isOnline} onClick={() => broadcastContext('SOCIAL')}>
                    Social
                  </Button>
                </div>
                {!isOnline ? <p className="support-note">Conectate a internet para enviar contexto.</p> : null}
                <ScopedStatus scope="host-context" className="status-stack" />
              </section>

              <section className="surface-panel surface-panel--compact">
                <header className="surface-panel__header">
                  <div>
                    <p className="screen-kicker">Sesión</p>
                    <h2 className="surface-panel__title">Controles de la sala</h2>
                  </div>
                </header>
                <div className="room-controls">
                  <Button type="button" variant="danger" onClick={closeRoom}>Cerrar sala</Button>
                  <Link to="/" className="screen-back-link">Volver al inicio</Link>
                </div>
              </section>
            </div>

            <div className="operational-panel operational-panel--stack">
              <DiceLog logs={logs} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
