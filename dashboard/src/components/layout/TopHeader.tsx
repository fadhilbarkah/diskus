import type { Signal } from "@preact/signals";
import { Search } from "lucide-preact";
import { useEffect } from "preact/hooks";
import { globalSearchQuery } from "../../lib/store";

export function TopHeader({
  activePage,
  isCollapsed,
}: {
  activePage: Signal<string>;
  isCollapsed: Signal<boolean>;
}) {
  // Clear search query when navigating between pages
  useEffect(() => {
    globalSearchQuery.value = "";
  }, [activePage.value]);

  const getSearchPlaceholder = () => {
    switch (activePage.value) {
      case "comments":
        return "Search comments...";
      case "websites":
        return "Search websites...";
      case "users":
        return "Search users...";
      case "settings":
        return "Search settings...";
      default:
        return "Search...";
    }
  };

  const showSearch = true;

  return (
    <header
      class={`fixed top-0 right-0 h-14 bg-white dark:bg-[#18181b] border-b border-gray-100 dark:border-gray-800 z-40 transition-all duration-300 ${isCollapsed.value ? "left-0 md:left-16" : "left-0 md:left-64"}`}
    >
      <div class="w-full h-full px-4 md:px-8">
        <div class="max-w-6xl mx-auto h-full flex items-center justify-between">
          {/* Mobile Logo */}
          <div class="md:hidden flex items-center h-full shrink-0 mr-4">
            <div class="w-8 h-8 flex items-center justify-center">
              <img src="/favicon.svg" alt="Diskus Logo" class="w-8 h-8" />
            </div>
          </div>

          {/* Space for left-side header items if needed */}
          <div class="flex-1 flex items-center h-full"></div>

          {/* Contextual Search (Moved to right) */}
          <div class="flex items-center justify-end shrink-0 h-full">
            {showSearch && (
              <div class="relative w-56 sm:w-64">
                <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder={getSearchPlaceholder()}
                  value={globalSearchQuery.value}
                  onInput={(e) => (globalSearchQuery.value = (e.target as HTMLInputElement).value)}
                  class="pl-9 pr-4 py-1.5 bg-gray-50 dark:bg-[#1f1f22] border-none rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/20 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded bg-white dark:bg-[#27272a] font-medium hidden sm:inline-block shadow-sm">
                  ⌘K
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
