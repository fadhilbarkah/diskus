import { h } from 'preact';
import type { JSX } from 'preact';

interface InputProps extends JSX.HTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  type?: string;
  value?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}

export function Input({ label, error, class: className, ...props }: InputProps) {
  return (
    <div class="w-full">
      {label && (
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        class={`w-full px-4 py-3 bg-gray-50/50 hover:bg-gray-50 border border-gray-200/60 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 shadow-sm ${
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''
        } ${className || ''}`}
        {...props}
      />
      {error && <p class="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
