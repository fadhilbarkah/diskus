import type { JSX } from "preact";

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
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <input
        class={`w-full px-4 py-3 bg-gray-50/50 dark:bg-[#1f1f22] hover:bg-gray-50 dark:hover:bg-[#27272a] border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:bg-white dark:focus:bg-[#18181b] focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm ${
          error
            ? "border-red-300 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20"
            : ""
        } ${className || ""}`}
        {...props}
      />
      {error && <p class="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
