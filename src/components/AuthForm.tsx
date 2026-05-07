import React, { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertBanner } from './ui/AlertBanner';
import { Button } from './ui/Button';
import { FieldError } from './ui/FieldError';
import { FormField } from './ui/FormField';
import { TextInput } from './ui/TextInput';
import { useUiStore } from '../stores/useUiStore';
import { Link } from 'react-router-dom';

type AuthFormProps = {
  intendedPin?: string | null;
};

export function AuthForm({ intendedPin }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const emailRef = useRef<HTMLInputElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const setUiStatus = useUiStore((state) => state.setStatus);
  const clearUiStatus = useUiStore((state) => state.clearStatus);

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = 'El email es obligatorio.';
    if (!password.trim()) nextErrors.password = 'La contraseña es obligatoria.';
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setError('Revisá los campos obligatorios para continuar.');
      setUiStatus('auth', 'error', 'Revisá los campos obligatorios para continuar.');
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setLoading(true);
    setError(null);
    clearUiStatus('auth');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('Revisá tu email para confirmar la cuenta.');
        setUiStatus('auth', 'success', 'Revisá tu email para confirmar la cuenta.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setUiStatus('auth', 'success', 'Ingreso exitoso.');
      }
    } catch (err: any) {
      setError(err.message);
      setUiStatus('auth', 'error', err.message);
      requestAnimationFrame(() => summaryRef.current?.focus());
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    emailRef.current?.focus();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4 font-mono text-cyan-50">
      <div className="w-full max-w-md rounded-xl border border-cyan-900/50 bg-gray-900/80 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-8 flex flex-col items-center justify-center">
          <div className="mb-4 rounded-full bg-cyan-950 p-4 shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-800/50">
            <span className="text-3xl" aria-hidden="true">🎲</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            DiceWaton
          </h2>
            <p className="mt-2 text-sm text-cyan-400/60">
              {isSignUp ? 'Creá una cuenta nueva' : 'Ingresá para unirte a una sala'}
            </p>
            <p className="mt-2 text-center text-xs text-cyan-100/70">
              {intendedPin
                ? `Después de ingresar vas a poder unirte con el PIN ${intendedPin}.`
                : 'Unirse a una sala puede requerir iniciar sesión primero.'}
            </p>
        </div>

        {error && (
          <div ref={summaryRef} tabIndex={-1}>
            <AlertBanner tone="error" title="No pudimos completar la autenticación" message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <FormField id="auth-email" label="Correo electrónico" error={fieldErrors.email}>
            <TextInput
              ref={emailRef}
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
              placeholder="player@example.com"
            />
            <FieldError id="auth-email-error" message={fieldErrors.email} />
          </FormField>

          <FormField id="auth-password" label="Contraseña" error={fieldErrors.password}>
            <TextInput
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
              placeholder="••••••••"
            />
            <FieldError id="auth-password-error" message={fieldErrors.password} />
          </FormField>

          <Button
            type="submit"
            loading={loading}
            className="w-full justify-center bg-cyan-400 text-gray-950 hover:bg-cyan-300"
          >
            {isSignUp ? 'Crear cuenta' : 'Ingresar'}
          </Button>
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
              ? '¿Ya tenés cuenta? Ingresá'
              : '¿No tenés cuenta? Creala'}
          </button>
          <div className="mt-4">
            <Link to="/" className="text-sm text-cyan-500 hover:text-cyan-300 transition-colors">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
