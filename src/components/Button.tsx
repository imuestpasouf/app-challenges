import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
};

export function Button({ loading, loadingText, children, disabled, className = '', ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`w-full rounded-2xl bg-gradient-to-r from-brand to-brand-2 px-5 py-3.5 font-heading font-bold text-white shadow-card transition-opacity disabled:opacity-60 ${className}`}
      {...props}
    >
      {loading ? (loadingText ?? children) : children}
    </button>
  );
}
