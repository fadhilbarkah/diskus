import type { JSX } from "preact";

interface ButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  children: preact.ComponentChildren;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: (e: any) => void;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  children,
  class: className,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-lg";

  const variants = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600 border border-transparent dark:bg-blue-600 dark:hover:bg-blue-700",
    secondary:
      "bg-white dark:bg-[#1f1f22] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#27272a] hover:border-gray-300 dark:hover:border-gray-600",
    danger:
      "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-100 dark:border-red-500/20",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 border border-transparent dark:bg-red-600 dark:hover:bg-red-700",
    ghost:
      "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1f1f22] hover:text-gray-900 dark:hover:text-gray-100 focus:ring-gray-500 dark:focus:ring-gray-400",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const classes = [baseStyles, variants[variant], sizes[size], fullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button class={classes} {...props}>
      {children}
    </button>
  );
}
