import { forwardRef, type InputHTMLAttributes } from 'react';

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { invalid = false, className = '', ...props },
  ref
) {
  return (
    <input
      {...props}
      ref={ref}
      aria-invalid={invalid ? 'true' : 'false'}
      className={`ui-input ${invalid ? 'ui-input--invalid' : ''} ${className}`.trim()}
    />
  );
});
