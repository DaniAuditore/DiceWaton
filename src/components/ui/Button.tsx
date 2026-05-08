import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: ButtonVariant;
};

export function Button({ loading = false, variant = 'primary', disabled, className = '', children, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : 'false'}
      className={`ui-button ui-button--${variant} ${className}`.trim()}
    >
      {loading ? 'Procesando...' : children}
    </button>
  );
}
