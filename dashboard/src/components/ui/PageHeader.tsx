import { h } from 'preact';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: preact.ComponentChild;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
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
