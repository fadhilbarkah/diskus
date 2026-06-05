import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Moderation } from './pages/Moderation';
import { Websites } from './pages/Websites';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { authState } from './lib/auth';
import { TopHeader } from './components/layout/TopHeader';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';

export default function App() {
  const activePage = useSignal('comments');
  const isCollapsed = useSignal(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && isCollapsed.value) {
        isCollapsed.value = false;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Check initially
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!authState.isLoggedIn.value) {
    return <Login />;
  }

  return (
    <div class="flex min-h-screen font-sans bg-[#f8fafc]">
      <Sidebar activePage={activePage} isCollapsed={isCollapsed} />
      <TopHeader activePage={activePage} isCollapsed={isCollapsed} />
      <BottomNav activePage={activePage} />
      
      <main class={`flex-1 flex flex-col min-h-[calc(100vh-3.5rem)] mt-14 mb-[4.5rem] md:mb-0 w-full transition-all duration-300 ${isCollapsed.value ? 'md:ml-16' : 'md:ml-64'}`}>
        <div class="p-4 md:p-8 flex-1 overflow-y-auto">
          <div class="max-w-6xl mx-auto h-full">
            {activePage.value === 'comments' ? <Moderation /> : activePage.value === 'websites' ? <Websites /> : <Settings />}
          </div>
        </div>
      </main>
    </div>
  );
}
