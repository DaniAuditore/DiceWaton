import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Dice5 } from 'lucide-react';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Supabase might require email confirmation, but we'll assume auto-confirm or that the user is notified by the SDK response/email.
        setError('Check your email for the confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4 font-mono text-cyan-50">
      <div className="w-full max-w-md rounded-xl border border-cyan-900/50 bg-gray-900/80 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-8 flex flex-col items-center justify-center">
          <div className="mb-4 rounded-full bg-cyan-950 p-4 shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-800/50">
            <Dice5 className="h-10 w-10 text-cyan-400" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            DiceWaton
          </h2>
          <p className="mt-2 text-sm text-cyan-400/60">
            {isSignUp ? 'Create a new account' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-950/50 border border-red-900/50 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-cyan-300">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 block w-full rounded-md border border-cyan-900/50 bg-gray-950 px-4 py-3 text-cyan-100 placeholder-cyan-800/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="player@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cyan-300">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block w-full rounded-md border border-cyan-900/50 bg-gray-950 px-4 py-3 text-cyan-100 placeholder-cyan-800/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-gray-950 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-sm text-cyan-500 hover:text-cyan-300 transition-colors"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
