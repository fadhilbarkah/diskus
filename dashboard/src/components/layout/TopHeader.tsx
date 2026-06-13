import { useSignal } from '@preact/signals';
import { ChevronDown, Plus, Globe } from 'lucide-preact';
import { userSites, selectedSiteId } from '../../lib/store';
import { api } from '../../lib/api';
import { useEffect } from 'preact/hooks';
import type { Signal } from '@preact/signals';

export function TopHeader({ activePage, isCollapsed }: { activePage: Signal<string>, isCollapsed: Signal<boolean> }) {
  const isDropdownOpen = useSignal(false);

  const fetchGlobalSites = async () => {
    try {
      const res = await api.getSites();
      userSites.value = res.sites;
      
      const siteExists = res.sites.some((s: any) => s.id === selectedSiteId.value);
      if ((!selectedSiteId.value || !siteExists) && res.sites.length > 0) {
        selectedSiteId.value = res.sites[0].id;
      } else if (!siteExists) {
        selectedSiteId.value = null;
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGlobalSites();
  }, []);

  const currentSite = userSites.value.find(s => s.id === selectedSiteId.value);

  return (
    <header class={`fixed top-0 right-0 h-14 bg-white dark:bg-[#18181b] border-b border-gray-100 dark:border-gray-800 z-40 flex items-center transition-all duration-300 ${isCollapsed.value ? 'left-0 md:left-16' : 'left-0 md:left-64'}`}>
      {/* Mobile Logo */}
      <div class="md:hidden flex items-center px-4 h-full">
        <div class="w-8 h-8 flex items-center justify-center shrink-0">
          <img src="/favicon.svg" alt="Diskus Logo" class="w-8 h-8" />
        </div>
      </div>

      {/* Site Selector */}
      <div class="flex-1 px-4 md:px-6 flex items-center justify-end md:justify-start gap-4">
        <div class="relative">
          <button 
            onClick={() => isDropdownOpen.value = !isDropdownOpen.value}
            class={`flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#27272a] px-2 py-1.5 rounded-lg transition-colors`}
            title={currentSite ? currentSite.domain : 'Select Tenant'}
          >
            <Globe class="w-4 h-4 text-gray-400" />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[140px] truncate">
              {currentSite ? currentSite.domain : 'Select Website'}
            </span>
            <ChevronDown class={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen.value ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen.value && (
            <>
              <div class="fixed inset-0 z-40" onClick={() => isDropdownOpen.value = false}></div>
              <div class="absolute top-full right-0 md:left-0 md:right-auto mt-1 bg-white dark:bg-[#1f1f22] border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl z-50 py-2 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 w-64">
                {userSites.value.map(site => (
                  <button 
                    key={site.id}
                    onClick={() => { selectedSiteId.value = site.id; isDropdownOpen.value = false; }}
                    class={`w-full text-left px-4 py-2 text-sm truncate transition-colors cursor-pointer ${selectedSiteId.value === site.id ? 'bg-gray-100 dark:bg-[#27272a] text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#27272a] hover:text-gray-900 dark:hover:text-gray-100'}`}
                  >
                    {site.domain}
                  </button>
                ))}
                <div class="border-t border-gray-100/80 my-1"></div>
                <button 
                  onClick={() => { activePage.value = 'websites'; isDropdownOpen.value = false; }}
                  class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#27272a] flex items-center gap-2 cursor-pointer font-medium transition-colors"
                >
                  <Plus class="w-4 h-4" /> Manage Sites
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
