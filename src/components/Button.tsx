import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
};

export function Button({ loading, loadingText, children, disabled, className = '', ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`w-full rounded-2xl bg-gradient-to-r from-brand to-brand-2 px-5 py-3.5 font-bold text-white transition-opacity disabled:opacity-60 ${className}`}
      style={{ boxShadow: '0 8px 18px -6px rgba(91,108,255,.6)' }}
      {...props}
    >
      {loading ? (loadingText ?? children) : children}
    </button>
  );
}
