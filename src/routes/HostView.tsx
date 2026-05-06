import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../stores/useGameStore';
import { DiceLog, type RollEvent } from '../components/DiceLog';
import { generatePin } from '../utils/pin';

export function HostView() {
  const { roomId, roomPin, setRoom, setIdentity, playerId } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [logs, setLogs] = useState<RollEvent[]>([]);
  const channelRef = useRef<any>(null);

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
      throw new Error('Not authenticated');
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
    };
  }, [roomId, playerId]);

  const createRoom = async () => {
    setLoading(true);
    setError(null);
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const broadcastContext = (newContext: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'game_state_update',
        payload: { context: newContext }
      });
    }
  };

  const controllers = players.filter(p => !p.isHost);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-xl shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-6">Host a Game</h1>
        
        {error && (
          <div className="bg-red-500/20 text-red-300 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {!roomId ? (
          <button
            onClick={createRoom}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-slate-400 text-sm mb-1">Room PIN</p>
              <div className="text-5xl font-mono font-bold tracking-widest text-indigo-400 bg-slate-900 p-4 rounded-lg">
                {roomPin}
              </div>
            </div>
            
            <div className="border-t border-slate-700 pt-6">
              <h2 className="text-xl font-semibold mb-4">Players ({controllers.length})</h2>
              {controllers.length === 0 ? (
                <div className="text-slate-400 text-sm italic">
                  Waiting for players to join...
                </div>
              ) : (
                <ul className="space-y-2">
                  {controllers.map((p, i) => (
                    <li key={i} className="bg-slate-700 p-3 rounded-lg flex items-center justify-between">
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-xs text-emerald-400">Connected</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-700 pt-6">
              <h2 className="text-xl font-semibold mb-4">Set Context</h2>
              <div className="flex gap-2">
                <button onClick={() => broadcastContext('EXPLORATION')} className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-sm">Exploration</button>
                <button onClick={() => broadcastContext('COMBAT')} className="bg-red-900 hover:bg-red-800 px-3 py-1 rounded text-sm text-red-100">Combat</button>
                <button onClick={() => broadcastContext('SOCIAL')} className="bg-blue-900 hover:bg-blue-800 px-3 py-1 rounded text-sm text-blue-100">Social</button>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-6">
              <h2 className="text-xl font-semibold mb-4">Game Activity</h2>
              <DiceLog logs={logs} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
