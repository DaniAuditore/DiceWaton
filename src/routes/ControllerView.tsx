import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RealtimeChannel, type Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useGameStore, type GameContext } from '../stores/useGameStore';
import { DiceTray } from '../components/DiceTray';
import { MacroManager } from '../components/MacroManager';
import { AuthForm } from '../components/AuthForm';
import { DiceLog, type RollEvent } from '../components/DiceLog';
import { AlertBanner } from '../components/ui/AlertBanner';
import { Button } from '../components/ui/Button';
import { FieldError } from '../components/ui/FieldError';
import { FormField } from '../components/ui/FormField';
import { ScopedStatus } from '../components/ui/ScopedStatus';
import { TextInput } from '../components/ui/TextInput';
import { useUiStore } from '../stores/useUiStore';

export function ControllerView() {
  const { roomId, roomPin, setRoom, setIdentity, gameContext, updateGameState, playerId, reset } = useGameStore();
  const [searchParams] = useSearchParams();
  const intendedPin = searchParams.get('pin')?.slice(0, 4).toUpperCase() ?? null;
  const [pinInput, setPinInput] = useState(intendedPin ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logs, setLogs] = useState<RollEvent[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; pin?: string }>({});
  const [realtimeReady, setRealtimeReady] = useState(false);
  const [showRecovery, setShowRecovery] = useState(Boolean(roomId && roomPin));
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const channelRef = useRef<RealtimeChannel | null>(null);
  const setUiStatus = useUiStore((state) => state.setStatus);

  type AuthSessionResponse = { data: { session: Session | null } };
  type BroadcastPayload = { payload: { context: unknown } };

  const getJoinErrorMessage = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'No pudimos completar la acción.';

    if (message === 'Not authenticated') {
      return 'Necesitás iniciar sesión para unirte a la sala.';
    }

    if (message === 'Room not found') {
      return 'No encontramos una sala con ese PIN.';
    }

    return message;
  };

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: AuthSessionResponse) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (intendedPin && !roomId) {
      setUiStatus('controller-join', 'empty', `PIN ${intendedPin} preparado. Iniciá sesión y confirmá tu nombre para unirte.`);
    }
  }, [intendedPin, roomId, setUiStatus]);

  useEffect(() => {
    if (!roomId) return;
    
    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: playerId || 'controller' }, broadcast: { self: true } }
    });

    channelRef.current = channel;
    setUiStatus('controller-realtime', 'loading', 'Conectando con la sala...');

    channel
      .on('broadcast', { event: 'game_state_update' }, ({ payload }: BroadcastPayload) => {
        updateGameState(payload.context as GameContext, []);
        setUiStatus('controller-realtime', 'success', `Contexto actualizado: ${payload.context}.`);
      })
      .on('broadcast', { event: 'dice_roll' }, ({ payload }: { payload: unknown }) => {
        setLogs(prev => [payload as RollEvent, ...prev].slice(0, 50));
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeReady(true);
          setUiStatus('controller-realtime', 'success', 'Conectado a la sala en tiempo real.');
          const { data } = await supabase.auth.getUser();
          await channel.track({ 
            id: data.user?.id, 
            name: playerName || `Player ${Math.floor(Math.random() * 1000)}`, 
            isHost: false 
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
      setRealtimeReady(false);
    };
  }, [roomId, playerId, playerName, setUiStatus, updateGameState]);

  const joinRoom = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      setError('Necesitás internet para unirte a una sala en tiempo real.');
      setUiStatus('controller-join', 'error', 'Necesitás internet para unirte a una sala en tiempo real.');
      return;
    }

    const nextErrors: { name?: string; pin?: string } = {};
    if (pinInput.length !== 4) {
      nextErrors.pin = 'El PIN debe tener 4 caracteres.';
    }
    if (!playerName.trim()) {
      nextErrors.name = 'El nombre es obligatorio.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError('Revisá los datos para unirte a la sala.');
      setUiStatus('controller-join', 'error', 'Revisá los datos para unirte a la sala.');
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});
    setUiStatus('controller-join', 'loading', 'Uniéndote a la sala...');
    try {
      const pId = session?.user?.id;

      if (!pId) {
        setUiStatus('controller-join', 'error', 'Necesitás iniciar sesión antes de unirte. Conservamos el PIN para que lo uses después.');
        throw new Error('Not authenticated');
      }

      setIdentity(pId, false);

      const { data, error } = await supabase
        .from('active_rooms')
        .select('*')
        .eq('pin', pinInput.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Room not found');
        }
        throw error;
      }

      setRoom(data.id, data.pin);
      setShowRecovery(false);
      setUiStatus('controller-join', 'success', 'Ingreso exitoso a la sala.');
    } catch (err: unknown) {
      const message = getJoinErrorMessage(err);
      setError(message);
      setUiStatus('controller-join', 'error', message);
    } finally {
      setLoading(false);
    }
  }, [isOnline, pinInput, playerName, setIdentity, setRoom, session?.user?.id, setUiStatus]);

  const leaveRoom = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setLogs([]);
    setRealtimeReady(false);
    reset();
    setShowRecovery(false);
    setUiStatus('controller-join', 'success', 'Saliste de la sala. Tu sesión sigue abierta.');
  }, [reset, setUiStatus]);

  const continueStoredRoom = useCallback(() => {
    setShowRecovery(false);
    setUiStatus('controller-join', 'success', `Continuás en la sala ${roomPin}.`);
  }, [roomPin, setUiStatus]);

  const handleRoll = useCallback((diceType: string, result: number, details?: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'dice_roll',
        payload: {
          id: crypto.randomUUID(),
          playerName,
          diceType,
          result,
          timestamp: Date.now(),
          details,
        }
      });
    }
  }, [playerName]);

  const canSubmitJoin = useMemo(() => isOnline && !loading && pinInput.length === 4 && Boolean(playerName.trim()), [isOnline, loading, pinInput.length, playerName]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-cyan-400">Cargando...</div>
      </div>
    );
  }

  if (!session) {
    return <AuthForm intendedPin={intendedPin ?? roomPin} />;
  }

  return (
    <main className="app-shell">
      <section className={`app-card text-center ${roomId ? 'app-card--wide' : ''}`}>
        {!roomId ? (
          <>
            <h1 className="text-3xl font-bold mb-6">Unirse a sala</h1>
            <div className="mb-4 text-left">
              <Link to="/" className="text-sm text-slate-300 hover:text-white underline underline-offset-4">Volver al inicio</Link>
            </div>
            <p className="mb-4 text-sm text-slate-300">Ingresá tu nombre y el PIN. Si no iniciaste sesión, primero te vamos a pedir autenticarte.</p>
            <ScopedStatus scope="controller-join" />
            {!isOnline ? (
              <AlertBanner
                tone="warning"
                title="Unirse requiere internet"
                message="Podés abrir DiceWaton sin conexión, pero entrar a una sala y tirar dados en vivo requiere red."
              />
            ) : null}
             
            {error ? <AlertBanner tone="error" title="No pudimos unirte a la sala" message={error} /> : null}

            <form onSubmit={joinRoom} className="space-y-4" noValidate>
              <FormField id="controller-name" label="Tu nombre" error={fieldErrors.name}>
                <TextInput
                  id="controller-name"
                  type="text"
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Tu nombre"
                  maxLength={16}
                  invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'controller-name-error' : undefined}
                  className="text-xl text-center"
                />
                <FieldError id="controller-name-error" message={fieldErrors.name} />
              </FormField>
              <FormField id="controller-pin" label="PIN de sala" error={fieldErrors.pin}>
                <TextInput
                  id="controller-pin"
                  type="text"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.toUpperCase());
                    if (fieldErrors.pin) setFieldErrors((prev) => ({ ...prev, pin: undefined }));
                  }}
                  placeholder="Ingresá el PIN de 4 caracteres"
                  maxLength={4}
                  invalid={Boolean(fieldErrors.pin)}
                  aria-describedby={fieldErrors.pin ? 'controller-pin-error' : undefined}
                  className="text-2xl text-center font-mono uppercase tracking-widest"
                />
                <FieldError id="controller-pin-error" message={fieldErrors.pin} />
              </FormField>
              <Button
                type="submit"
                disabled={!canSubmitJoin}
                loading={loading}
                className="w-full"
              >
                Unirse a la sala
              </Button>
            </form>
            
            <button 
              onClick={() => supabase.auth.signOut()} 
              className="mt-6 text-sm text-slate-400 hover:text-white"
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <div className="operational-grid">
            {showRecovery ? (
              <AlertBanner
                tone="info"
                title="Sala guardada encontrada"
                message={`Encontramos la sala ${roomPin}. Podés continuar o salir sin cerrar sesión.`}
              />
            ) : null}
            {showRecovery ? (
              <div className="control-cluster sm:justify-center md:col-span-2">
                <Button type="button" onClick={continueStoredRoom}>Continuar en sala {roomPin}</Button>
                <Button type="button" variant="secondary" onClick={leaveRoom}>Salir</Button>
              </div>
            ) : null}
            <div className="operational-panel operational-panel--sticky bg-slate-900 p-4 rounded-lg flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
              <div>
                <p className="text-slate-400 text-sm mb-1 text-left">Conectado a la sala</p>
                <p className="text-2xl font-mono font-bold text-indigo-400">{roomPin}</p>
              </div>
              <div className="flex flex-col gap-2 text-right">
                <button 
                  onClick={leaveRoom} 
                  className="text-sm text-slate-300 hover:text-white"
                >
                  Salir de esta sala
                </button>
                <button 
                  onClick={() => supabase.auth.signOut()} 
                  className="text-sm text-slate-400 hover:text-white"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
            <div className="operational-panel space-y-4">
            <ScopedStatus scope="controller-realtime" />
            <ScopedStatus scope="controller-join" />
            {!isOnline ? (
              <AlertBanner
                tone="warning"
                title="Tiradas en vivo no disponibles"
                message="Conectate a internet para sincronizar la sala y enviar tiradas."
              />
            ) : null}
              
            <div className="border-t border-slate-700 pt-6">
                <h2 className="text-xl font-semibold mb-4">Controlador</h2>
              <div className="bg-slate-900 p-6 rounded-lg mb-6">
                  <p className="text-slate-400 text-sm mb-2">Contexto actual:</p>
                <p className="text-lg font-bold text-emerald-400">{gameContext}</p>
              </div>
              <DiceTray
                onRoll={handleRoll}
                disabled={!realtimeReady}
                disabledMessage={isOnline ? 'Esperá a que la sala confirme la conexión en tiempo real antes de tirar.' : 'Necesitás internet para tirar dados en vivo en esta sala.'}
              />
              <MacroManager onRoll={handleRoll} />
              <DiceLog logs={logs} />
            </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
