import type { Signal } from '@preact/signals';
import { MessageSquare, Globe, Settings as SettingsIcon, LogOut, Users } from 'lucide-preact';
import { logout } from '../../lib/auth';

export function BottomNav({ activePage }: { activePage: Signal<string> }) {
  const items = [
    { id: 'comments', label: 'Comments', icon: MessageSquare },
    { id: 'websites', label: 'Websites', icon: Globe },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <nav class="md:hidden fixed bottom-0 left-0 right-0 h-[4.5rem] pb-2 bg-white border-t border-gray-100 z-50 flex items-center justify-around px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = activePage.value === item.id;
        return (
          <button
            key={item.id}
            onClick={() => activePage.value = item.id}
            class={`flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-900'}`}
          >
            <Icon class={`w-[22px] h-[22px] ${isActive ? 'text-blue-600 stroke-[2.5]' : 'stroke-2'}`} />
            <span class={`text-[10px] font-medium tracking-wide ${isActive ? 'text-blue-600' : ''}`}>{item.label}</span>
          </button>
        );
      })}
      <button
        onClick={logout}
        class="flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50/50 rounded-xl m-1"
      >
        <LogOut class="w-[22px] h-[22px] stroke-2" />
        <span class="text-[10px] font-medium tracking-wide">Logout</span>
      </button>
    </nav>
  );
}
