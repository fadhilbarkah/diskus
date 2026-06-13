import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Moderation } from './pages/Moderation';
import { Websites } from './pages/Websites';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { authState } from './lib/auth';
import { TopHeader } from './components/layout/TopHeader';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { Toast } from './components/ui/Toast';
import { X } from 'lucide-preact';

export default function App() {
  const activePage = useSignal('comments');
  const isCollapsed = useSignal(false);
  const isDemo = useSignal(false);
  const dismissBanner = useSignal(sessionStorage.getItem('diskus_demo_dismissed') === 'true');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && isCollapsed.value) {
        isCollapsed.value = false;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Check initially
    
    // Check demo status
    fetch((import.meta.env.VITE_API_URL || '/api/v1') + '/demo')
      .then(res => res.json())
      .then(data => {
        if (data.demo) isDemo.value = true;
      })
      .catch(console.error);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!authState.isLoggedIn.value) {
    return <Login />;
  }

  return (
    <div class="flex min-h-screen font-sans bg-[#f8fafc] dark:bg-[#0f0f11]">
      {isDemo.value && !dismissBanner.value && (
        <div class="fixed top-0 left-0 right-0 z-[100] bg-blue-600 text-white px-4 py-2 flex items-center justify-center text-sm font-medium">
          <span>
            🔒 Demo Mode — write operations are disabled.{' '}
            <a href="https://github.com/fadhilbarkah/diskus" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-100 ml-1">
              Deploy your own instance &rarr;
            </a>
          </span>
          <button 
            onClick={() => { dismissBanner.value = true; sessionStorage.setItem('diskus_demo_dismissed', 'true'); }}
            class="absolute right-4 hover:bg-blue-700 p-1 rounded transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      )}
      
      <Sidebar activePage={activePage} isCollapsed={isCollapsed} />
      <TopHeader activePage={activePage} isCollapsed={isCollapsed} />
      <BottomNav activePage={activePage} />
      
      <main class={`flex-1 flex flex-col min-h-[calc(100vh-3.5rem)] mt-14 mb-[4.5rem] md:mb-0 w-full transition-all duration-300 ${isCollapsed.value ? 'md:ml-16' : 'md:ml-64'} ${isDemo.value && !dismissBanner.value ? 'pt-8' : ''}`}>
        <div class="p-4 md:p-8 flex-1 overflow-y-auto">
          <div class="max-w-6xl mx-auto h-full">
            {activePage.value === 'comments' ? <Moderation /> : activePage.value === 'websites' ? <Websites /> : activePage.value === 'users' ? <Users /> : <Settings />}
          </div>
        </div>
      </main>
      
      <Toast />
    </div>
  );
}
