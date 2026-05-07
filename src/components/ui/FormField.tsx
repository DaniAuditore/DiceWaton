import type { ReactNode } from 'react';

type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-cyan-300">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-cyan-400/80">
          {hint}
        </p>
      ) : null}
      <div className="mt-2" data-field-error-id={errorId} data-field-hint-id={hintId}>
        {children}
      </div>
    </div>
  );
}
