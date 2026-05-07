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

export function ScopedStatus({ scope, className = '' }: ScopedStatusProps) {
  const status = useUiStore((state) => state.statusByScope[scope]);
  const message = useUiStore((state) => state.messageByScope[scope]);

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
      />
    </div>
  );
}
