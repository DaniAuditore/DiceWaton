import React, { useState, useRef } from 'react';
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No pudimos completar la autenticación.';
      setError(message);
      setUiStatus('auth', 'error', message);
      requestAnimationFrame(() => summaryRef.current?.focus());
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    emailRef.current?.focus();
  }, []);

  return (
    <div className="auth-shell">
      <section className="app-card auth-card" aria-labelledby="auth-title">
        <header className="auth-brand">
          <div className="auth-brand__mark" aria-hidden="true">
            🎲
          </div>
          <p className="screen-kicker">Acceso seguro</p>
          <h1 id="auth-title" className="app-title app-title--compact">
            DiceWaton
          </h1>
          <p className="app-lead app-lead--compact">
            {isSignUp ? 'Creá una cuenta nueva' : 'Ingresá para unirte a una sala'}
          </p>
          <p className="surface-panel__copy">
            {intendedPin
              ? `Después de ingresar vas a poder unirte con el PIN ${intendedPin}.`
              : 'Unirse a una sala puede requerir iniciar sesión primero.'}
          </p>
        </header>

        {error ? (
          <div ref={summaryRef} tabIndex={-1}>
            <AlertBanner tone="error" title="No pudimos completar la autenticación" message={error} />
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="form-stack" noValidate>
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

          <Button type="submit" loading={loading} className="ui-button--full">
            {isSignUp ? 'Crear cuenta' : 'Ingresar'}
          </Button>
        </form>

        <div className="auth-card__footer">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="auth-card__toggle"
          >
            {isSignUp ? '¿Ya tenés cuenta? Ingresá' : '¿No tenés cuenta? Creala'}
          </button>
          <Link to="/" className="auth-card__link">
            Volver al inicio
          </Link>
        </div>
      </section>
    </div>
  );
}
