import { h } from 'preact';

interface CardProps extends h.JSX.HTMLAttributes<HTMLDivElement> {
  children: preact.ComponentChildren;
  noPadding?: boolean;
}

export function Card({ children, noPadding = false, class: className, ...props }: CardProps) {
  return (
    <div 
      class={`bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden ${
        noPadding ? '' : 'p-6'
      } ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  icon?: preact.ComponentChild;
  action?: preact.ComponentChild;
  class?: string;
}

export function CardHeader({ title, description, icon, action, class: className }: CardHeaderProps) {
  return (
    <div class={`flex items-start justify-between mb-6 ${className || ''}`}>
      <div class="flex items-center gap-3">
        {icon && (
          <div class="text-blue-500">
            {icon}
          </div>
        )}
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{title}</h2>
          {description && <p class="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {action && (
        <div class="shrink-0 ml-4">
          {action}
        </div>
      )}
    </div>
  );
}
