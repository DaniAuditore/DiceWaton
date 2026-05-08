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
    <div className="field-stack">
      <label htmlFor={id} className="field-stack__label">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="field-stack__hint">
          {hint}
        </p>
      ) : null}
      <div data-field-error-id={errorId} data-field-hint-id={hintId}>
        {children}
      </div>
    </div>
  );
}
