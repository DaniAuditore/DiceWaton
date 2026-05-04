import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../stores/useGameStore';

export function ControllerView() {
  const { roomId, roomPin, setRoom, setIdentity, gameContext, playerId } = useGameStore();
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');

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
      config: { presence: { key: playerId || 'controller' } }
    });

    channel
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
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
    };
  }, [roomId, playerId, playerName]);

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 4) {
      setError('PIN must be 4 characters');
      return;
    }
    if (!playerName.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const pId = authData.user?.id;

      if (!pId) {
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-xl shadow-lg text-center">
        {!roomId ? (
          <>
            <h1 className="text-3xl font-bold mb-6">Join Game</h1>
            
            {error && (
              <div className="bg-red-500/20 text-red-300 p-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={joinRoom} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your Name"
                  maxLength={16}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-4 text-xl text-center focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                  placeholder="Enter 4-char PIN"
                  maxLength={4}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-4 text-2xl text-center font-mono uppercase tracking-widest focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading || pinInput.length !== 4 || !playerName.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-900 p-4 rounded-lg">
              <p className="text-slate-400 text-sm mb-1">Connected to Room</p>
              <p className="text-2xl font-mono font-bold text-indigo-400">{roomPin}</p>
            </div>
            
            <div className="border-t border-slate-700 pt-6">
              <h2 className="text-xl font-semibold mb-4">Controller</h2>
              <div className="bg-slate-900 p-6 rounded-lg">
                <p className="text-slate-400 text-sm mb-2">Current Context:</p>
                <p className="text-lg font-bold text-emerald-400">{gameContext}</p>
              </div>
              {/* TODO: Add actionable buttons here based on context */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
