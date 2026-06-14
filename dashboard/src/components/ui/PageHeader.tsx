import { h } from 'preact';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: preact.ComponentChild;
  mobileRow?: boolean;
}

export function PageHeader({ title, description, action, mobileRow = false }: PageHeaderProps) {
  return (
    <div class={`flex justify-between gap-4 mb-8 ${mobileRow ? 'flex-row items-center' : 'flex-col sm:flex-row sm:items-center'}`}>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h1>
        {description && <p class="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{description}</p>}
      </div>
      {action && (
        <div class="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
