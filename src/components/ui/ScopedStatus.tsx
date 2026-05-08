import { useEffect } from 'react';
import { AlertBanner } from './AlertBanner';
import { type UiStatus, useUiStore } from '../../stores/useUiStore';

type ScopedStatusProps = {
  scope: string;
  className?: string;
};

const statusTone: Record<Exclude<UiStatus, 'idle' | 'empty'>, 'error' | 'warning' | 'info' | 'success'> = {
  loading: 'info',
  success: 'success',
  error: 'error',
  offline: 'warning',
};

const statusTitle: Record<Exclude<UiStatus, 'idle'>, string> = {
  loading: 'Estado: en progreso',
  success: 'Estado: listo',
  empty: 'Estado: sin datos todavía',
  error: 'Necesita atención',
  offline: 'Conexión requerida',
};

const autoHideDurations: Partial<Record<UiStatus, number>> = {
  success: 2800,
  empty: 3200,
};

export function ScopedStatus({ scope, className = '' }: ScopedStatusProps) {
  const status = useUiStore((state) => state.statusByScope[scope]);
  const message = useUiStore((state) => state.messageByScope[scope]);
  const clearStatus = useUiStore((state) => state.clearStatus);

  useEffect(() => {
    if (!status || status === 'idle') {
      return;
    }

    const autoHideDelay = autoHideDurations[status];
    if (!autoHideDelay) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearStatus(scope);
    }, autoHideDelay);

    return () => window.clearTimeout(timeoutId);
  }, [clearStatus, scope, status]);

  if (!status || status === 'idle') {
    return null;
  }

  const tone = status === 'empty' ? 'info' : statusTone[status];

  return (
    <div className={className} data-testid={`scoped-status-${scope}`}>
      <AlertBanner
        tone={tone}
        title={statusTitle[status]}
        message={message || statusTitle[status]}
        onDismiss={status === 'loading' ? undefined : () => clearStatus(scope)}
      />
    </div>
  );
}
