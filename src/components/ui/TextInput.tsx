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
      className={`block w-full rounded-md border bg-gray-950 px-4 py-3 text-cyan-100 placeholder-cyan-800/60 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        invalid
          ? 'border-red-700 focus:border-red-500 focus:ring-red-500/40'
          : 'border-cyan-900/50 focus:border-cyan-500 focus:ring-cyan-500/40'
      } ${className}`.trim()}
    />
  );
});
