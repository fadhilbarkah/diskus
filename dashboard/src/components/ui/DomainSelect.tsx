import { useState, useRef, useEffect } from 'preact/hooks';
import { ChevronDown, Search, Check, Globe } from 'lucide-preact';

interface Site {
  id: string;
  domain: string;
  [key: string]: any;
}

interface DomainSelectProps {
  sites: Site[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function DomainSelect({ sites, selectedId, onSelect }: DomainSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedSite = sites.find(s => s.id === selectedId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reset search when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredSites = sites.filter(site => 
    site.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div class="relative w-56 sm:w-64" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        class={`w-full flex items-center justify-between border ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20 dark:ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'} rounded-lg px-4 py-1.5 bg-white dark:bg-[#18181b] text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-all focus:outline-none`}
      >
        <div class="flex items-center gap-2 truncate">
          <Globe class="w-4 h-4 text-gray-400 shrink-0" />
          <span class="truncate">{selectedSite ? selectedSite.domain : 'Select a website...'}</span>
        </div>
        <ChevronDown class={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div class="absolute z-50 w-full mt-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden flex flex-col">
          <div class="p-2 border-b border-gray-100 dark:border-gray-800">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                class="w-full bg-gray-50 dark:bg-[#1f1f22] border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-[#18181b] rounded-lg pl-9 pr-4 py-2 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none transition-all"
                placeholder="Search websites..."
                value={searchQuery}
                onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              />
            </div>
          </div>
          
          <div class="overflow-y-auto max-h-60 p-1">
            {filteredSites.length > 0 ? (
              filteredSites.map(site => (
                <button
                  key={site.id}
                  onClick={() => {
                    onSelect(site.id);
                    setIsOpen(false);
                  }}
                  class={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selectedId === site.id ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  <span class="truncate">{site.domain}</span>
                  {selectedId === site.id && <Check class="w-4 h-4 shrink-0" />}
                </button>
              ))
            ) : (
              <div class="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">
                No websites found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
