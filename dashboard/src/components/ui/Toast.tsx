import { signal } from "@preact/signals";
import { X } from "lucide-preact";

export const toastMessage = signal<string | null>(null);

export function showToast(message: string, duration = 3000) {
  toastMessage.value = message;
  setTimeout(() => {
    if (toastMessage.value === message) {
      toastMessage.value = null;
    }
  }, duration);
}

export function Toast() {
  if (!toastMessage.value) return null;

  return (
    <div class="fixed bottom-4 right-4 z-50 transition-all duration-300 transform translate-y-0 opacity-100">
      <div class="bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <span>{toastMessage.value}</span>
        <button
          onClick={() => (toastMessage.value = null)}
          class="text-gray-400 hover:text-white dark:text-gray-500 dark:hover:text-gray-900 focus:outline-none"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
