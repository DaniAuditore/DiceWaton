type AlertBannerTone = 'error' | 'warning' | 'info' | 'success';

type AlertBannerProps = {
  tone?: AlertBannerTone;
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  dismissLabel?: string;
};

const toneClasses: Record<AlertBannerTone, string> = {
  error: 'alert-banner--error',
  warning: 'alert-banner--warning',
  info: 'alert-banner--info',
  success: 'alert-banner--success',
};

export function AlertBanner({ tone = 'info', title, message, onRetry, onDismiss, dismissLabel = 'Cerrar' }: AlertBannerProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`alert-banner ${toneClasses[tone]}`}
    >
      <div className="alert-banner__copy">
        {title ? <p className="alert-banner__title">{title}</p> : null}
        <p className="alert-banner__message">{message}</p>
      </div>

      <div className="alert-banner__actions">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="ui-button ui-button--secondary ui-button--small alert-banner__retry"
          >
            Reintentar
          </button>
        ) : null}
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="ui-button ui-button--secondary ui-button--small alert-banner__dismiss"
          >
            {dismissLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
