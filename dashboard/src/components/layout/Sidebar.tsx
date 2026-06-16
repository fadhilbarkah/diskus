import type { Signal } from "@preact/signals";
import { ChevronLeft, ChevronRight, Globe, LogOut, MessageSquare, Users } from "lucide-preact";
import { authState, logout } from "../../lib/auth";

export function Sidebar({
  activePage,
  isCollapsed,
}: {
  activePage: Signal<string>;
  isCollapsed: Signal<boolean>;
}) {
  return (
    <aside
      class={`hidden md:flex ${isCollapsed.value ? "w-16" : "w-64"} bg-white dark:bg-[#18181b] border-r border-gray-100 dark:border-gray-800 h-screen fixed left-0 top-0 flex-col font-sans z-50 transition-all duration-300 ease-out`}
    >
      {/* Logo and Collapse Toggle */}
      {isCollapsed.value ? (
        <div class="h-14 flex items-center justify-center border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div
            onClick={() => (isCollapsed.value = false)}
            class="w-8 h-8 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            title="Expand Sidebar"
          >
            <img src="/favicon.svg" alt="Diskus Logo" class="w-8 h-8" />
          </div>
        </div>
      ) : (
        <div class="h-14 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 flex items-center justify-center shrink-0">
              <img src="/favicon.svg" alt="Diskus Logo" class="w-8 h-8" />
            </div>
            <span class="font-bold text-[16px] text-gray-900 dark:text-gray-100 tracking-tight">
              Diskus
            </span>
          </div>
          <button
            onClick={() => (isCollapsed.value = true)}
            class="hidden md:block text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#27272a] p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>
        </div>
      )}

      <nav
        class={`flex-1 py-6 space-y-1.5 overflow-y-auto flex flex-col ${isCollapsed.value ? "px-0 items-center" : "px-4"}`}
      >
        {isCollapsed.value && (
          <button
            onClick={() => (isCollapsed.value = false)}
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer mb-2"
            title="Expand Sidebar"
          >
            <ChevronRight class="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => (activePage.value = "comments")}
          class={`flex items-center transition-colors cursor-pointer ${
            isCollapsed.value
              ? `w-12 h-12 rounded-2xl justify-center shrink-0 ${activePage.value === "comments" ? "bg-[#F0F5FF] dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-[#27272a] hover:text-gray-900 dark:hover:text-gray-100"}`
              : `w-full px-3 py-2.5 gap-3 rounded-xl text-sm font-medium ${activePage.value === "comments" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-[#27272a] hover:text-gray-900 dark:hover:text-gray-100"}`
          }`}
          title={isCollapsed.value ? "Comments" : ""}
        >
          <MessageSquare
            class={`shrink-0 ${isCollapsed.value ? "w-6 h-6" : "w-5 h-5"} ${activePage.value === "comments" ? "text-blue-600" : ""}`}
          />
          {!isCollapsed.value && <span>Comments</span>}
        </button>

        <button
          onClick={() => (activePage.value = "websites")}
          class={`flex items-center transition-colors cursor-pointer ${
            isCollapsed.value
              ? `w-12 h-12 rounded-2xl justify-center shrink-0 ${activePage.value === "websites" ? "bg-[#F0F5FF] dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-[#27272a] hover:text-gray-900 dark:hover:text-gray-100"}`
              : `w-full px-3 py-2.5 gap-3 rounded-xl text-sm font-medium ${activePage.value === "websites" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-[#27272a] hover:text-gray-900 dark:hover:text-gray-100"}`
          }`}
          title={isCollapsed.value ? "Websites" : ""}
        >
          <Globe
            class={`shrink-0 ${isCollapsed.value ? "w-6 h-6" : "w-5 h-5"} ${activePage.value === "websites" ? "text-blue-600" : ""}`}
          />
          {!isCollapsed.value && <span>Websites</span>}
        </button>

        <button
          onClick={() => (activePage.value = "users")}
          class={`flex items-center transition-colors cursor-pointer ${
            isCollapsed.value
              ? `w-12 h-12 rounded-2xl justify-center shrink-0 ${activePage.value === "users" ? "bg-[#F0F5FF] dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-[#27272a] hover:text-gray-900 dark:hover:text-gray-100"}`
              : `w-full px-3 py-2.5 gap-3 rounded-xl text-sm font-medium ${activePage.value === "users" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-[#27272a] hover:text-gray-900 dark:hover:text-gray-100"}`
          }`}
          title={isCollapsed.value ? "Users" : ""}
        >
          <Users
            class={`shrink-0 ${isCollapsed.value ? "w-6 h-6" : "w-5 h-5"} ${activePage.value === "users" ? "text-blue-600" : ""}`}
          />
          {!isCollapsed.value && <span>Users</span>}
        </button>
      </nav>

      <div
        class={`p-4 mt-auto border-t border-gray-100 dark:border-gray-800 shrink-0 ${isCollapsed.value ? "px-2" : ""}`}
      >
        <div
          class={`bg-white dark:bg-[#1f1f22] rounded-[20px] p-2 flex items-center justify-between transition-colors duration-200 ${isCollapsed.value ? "flex-col gap-4 py-4 border-none bg-gray-50/80 dark:bg-[#1f1f22]" : "border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#27272a]"}`}
        >
          <button
            onClick={() => (activePage.value = "settings")}
            class={`flex items-center gap-3 min-w-0 text-left cursor-pointer group flex-1 ${isCollapsed.value ? "justify-center w-full" : ""}`}
          >
            <div
              class={`rounded-full overflow-hidden shrink-0 select-none bg-blue-100 flex items-center justify-center transition-all duration-300 ${isCollapsed.value ? "w-10 h-10" : "w-10 h-10"}`}
            >
              <img
                src={`https://api.dicebear.com/10.x/thumbs/svg?seed=${encodeURIComponent(authState.user.value?.email || "admin")}`}
                alt="Profile"
                class="w-full h-full object-cover"
              />
            </div>
            {!isCollapsed.value && (
              <div class="flex flex-col min-w-0">
                <span
                  class="text-sm font-bold text-gray-900 dark:text-gray-100 truncate max-w-[110px]"
                  title={authState.user.value?.name || authState.user.value?.email}
                >
                  {authState.user.value?.name ||
                    authState.user.value?.email?.split("@")[0] ||
                    "User"}
                </span>
                <span class="text-[11px] text-gray-500 dark:text-gray-400 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Settings
                </span>
              </div>
            )}
          </button>
          <button
            onClick={logout}
            class={`text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${isCollapsed.value ? "w-full flex justify-center hover:bg-gray-200 dark:hover:bg-[#27272a]" : "hover:bg-gray-100 dark:hover:bg-[#27272a]"}`}
            title="Logout"
          >
            {isCollapsed.value ? <LogOut class="w-5 h-5" /> : <LogOut class="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
