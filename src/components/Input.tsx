import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, id, className = '', ...props }: InputProps) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-left">
      <span className="font-mono text-xs uppercase tracking-wide text-muted">{label}</span>
      <input
        id={id}
        className={`rounded-xl border border-white/60 bg-white/50 px-4 py-3 text-ink outline-none transition-colors focus:border-brand ${className}`}
        {...props}
      />
    </label>
  );
}
