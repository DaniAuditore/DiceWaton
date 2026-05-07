type AlertBannerTone = 'error' | 'warning' | 'info' | 'success';

type AlertBannerProps = {
  tone?: AlertBannerTone;
  title?: string;
  message: string;
  onRetry?: () => void;
};

const toneClasses: Record<AlertBannerTone, string> = {
  error: 'bg-red-950/50 border-red-900/50 text-red-300',
  warning: 'bg-amber-950/40 border-amber-800/50 text-amber-200',
  info: 'bg-sky-950/40 border-sky-900/50 text-sky-200',
  success: 'bg-emerald-950/40 border-emerald-900/50 text-emerald-200',
};

export function AlertBanner({ tone = 'info', title, message, onRetry }: AlertBannerProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-4 rounded-md border p-4 text-sm ${toneClasses[tone]}`}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded border border-current px-2 py-1 text-xs font-semibold"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
