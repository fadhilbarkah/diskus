import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import { userSites, selectedSiteId } from '../lib/store';
import { Globe, Key, Code, Plus, Trash2, Copy, Check, X, Settings as SettingsIcon, AlertTriangle } from 'lucide-preact';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';

export function Websites() {
  const sites = useSignal<any[]>([]);
  const loading = useSignal(true);
  const notification = useSignal<{message: string, type: 'success'|'error'} | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    notification.value = { message, type };
    setTimeout(() => { notification.value = null; }, 4000);
  };
  
  // Modals / Dialogs state
  const isAddModalOpen = useSignal(false);
  const newDomain = useSignal('');
  const addLoading = useSignal(false);

  const selectedSiteForEmbed = useSignal<any | null>(null);
  const copiedKey = useSignal<string | null>(null);
  const copiedEmbed = useSignal<boolean>(false);

  const selectedSiteForSettings = useSignal<any | null>(null);
  const requireLoginSetting = useSignal(false);
  const enableEmailSetting = useSignal(false);
  const commentsLimitSetting = useSignal(10);
  const requireModerationSetting = useSignal(false);
  const settingsLoading = useSignal(false);
  
  const siteToDelete = useSignal<{id: string, domain: string} | null>(null);
  const deleteLoading = useSignal(false);

  const handleUpdateSite = async (e: Event) => {
    e.preventDefault();
    if (!selectedSiteForSettings.value) return;
    settingsLoading.value = true;
    try {
      await api.updateSite(selectedSiteForSettings.value.id, {
        requireLogin: requireLoginSetting.value,
        enableEmail: enableEmailSetting.value,
        commentsLimit: commentsLimitSetting.value,
        requireModeration: requireModerationSetting.value
      });
      selectedSiteForSettings.value = null;
      await fetchSites();
      showNotification('Settings updated successfully', 'success');
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Failed to update website settings', 'error');
    } finally {
      settingsLoading.value = false;
    }
  };

  const fetchSites = async () => {
    loading.value = true;
    try {
      const res = await api.getSites();
      sites.value = res.sites;
      userSites.value = res.sites; // sync to global store
    } catch (err) {
      console.error(err);
    } finally {
      loading.value = false;
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleAddSite = async (e: Event) => {
    e.preventDefault();
    if (!newDomain.value.trim()) return;
    
    addLoading.value = true;
    try {
      // clean domain input (strip http:// or https:// and trailing slashes)
      let domain = newDomain.value.trim().toLowerCase();
      domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
      
      await api.createSite(domain);
      newDomain.value = '';
      isAddModalOpen.value = false;
      await fetchSites();
      showNotification('Website added successfully', 'success');
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Failed to add website', 'error');
    } finally {
      addLoading.value = false;
    }
  };

  const handleDeleteSite = (id: string, domain: string) => {
    siteToDelete.value = { id, domain };
  };

  const confirmDeleteSite = async () => {
    if (!siteToDelete.value) return;
    deleteLoading.value = true;
    try {
      await api.deleteSite(siteToDelete.value.id);
      if (selectedSiteId.value === siteToDelete.value.id) {
        selectedSiteId.value = null;
      }
      siteToDelete.value = null;
      await fetchSites();
      showNotification('Website deleted successfully', 'success');
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Failed to delete website', 'error');
    } finally {
      deleteLoading.value = false;
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    copiedKey.value = key;
    setTimeout(() => {
      copiedKey.value = null;
    }, 2000);
  };

  const handleCopyEmbed = (code: string) => {
    navigator.clipboard.writeText(code);
    copiedEmbed.value = true;
    setTimeout(() => {
      copiedEmbed.value = false;
    }, 2000);
  };

  return (
    <div class="max-w-7xl mx-auto space-y-8 relative">
      {notification.value && (
        <div class={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border transition-all duration-300 transform translate-y-0 opacity-100 ${notification.value.type === 'success' ? 'bg-white dark:bg-[#18181b] border-green-100 dark:border-green-900/30 text-gray-800 dark:text-gray-100' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-300'}`}>
          {notification.value.type === 'success' ? (
            <div class="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center shrink-0">
              <Check class="w-4 h-4" strokeWidth={3} />
            </div>
          ) : (
            <div class="w-8 h-8 rounded-full bg-red-100/50 text-red-500 flex items-center justify-center shrink-0">
              <AlertTriangle class="w-4 h-4" strokeWidth={3} />
            </div>
          )}
          <span class="text-sm font-medium">{notification.value.message}</span>
        </div>
      )}

      <PageHeader 
        title="Websites" 
        description="List of websites using your Diskus comment widget"
        action={
          <Button onClick={() => isAddModalOpen.value = true}>
            <Plus class="w-4 h-4 mr-2" /> Add Website
          </Button>
        }
      />

      {/* Grid of sites */}
      {loading.value ? (
        <div class="text-center py-20 text-gray-400">Loading websites...</div>
      ) : sites.value.length === 0 ? (
        <Card class="text-center py-16 max-w-xl mx-auto flex flex-col items-center">
          <div class="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6">
            <Globe class="w-8 h-8" />
          </div>
          <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No websites yet</h3>
          <p class="text-gray-500 dark:text-gray-400 text-sm mb-8">Add your first website to get a public API Key and install the comment widget.</p>
          <Button onClick={() => isAddModalOpen.value = true}>
            Add Website
          </Button>
        </Card>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.value.map(site => {
            return (
              <Card key={site.id} class="flex flex-col justify-between hover:shadow-md transition-shadow group">
                <div>
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                        <Globe class="w-6 h-6" />
                      </div>
                      <div>
                        <h3 class="font-bold text-gray-900 dark:text-gray-100 truncate max-w-[150px]">{site.domain}</h3>
                        <p class="text-xs text-gray-400 dark:text-gray-500">Added {new Date(site.createdAt).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteSite(site.id, site.domain)}
                      class="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Delete Website"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>

                  <div class="mt-8 space-y-3">
                    <div>
                      <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Public API Key</label>
                      <div class="flex items-center gap-2 bg-gray-50 dark:bg-[#1f1f22] border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300 font-mono select-all overflow-x-auto">
                        <Key class="w-4 h-4 shrink-0 text-gray-400" />
                        <span class="truncate">{site.publicApiKey}</span>
                        <button 
                          onClick={() => handleCopyKey(site.publicApiKey)}
                          class="ml-auto text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 shrink-0 transition-colors cursor-pointer bg-white dark:bg-[#27272a] p-1.5 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm"
                          title="Copy API Key"
                        >
                          {copiedKey.value === site.publicApiKey ? (
                            <Check class="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy class="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                  <Button 
                    variant="ghost" 
                    class="flex-1"
                    onClick={() => {
                      selectedSiteForSettings.value = site;
                      requireLoginSetting.value = site.requireLogin;
                      enableEmailSetting.value = site.enableEmail;
                      commentsLimitSetting.value = site.commentsLimit || 10;
                      requireModerationSetting.value = site.requireModeration ?? true;
                    }}
                  >
                    <SettingsIcon class="w-4 h-4 mr-2" /> Settings
                  </Button>
                  <Button 
                    variant="ghost" 
                    class="flex-1"
                    onClick={() => selectedSiteForEmbed.value = site}
                  >
                    <Code class="w-4 h-4 mr-2" /> Embed
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {isAddModalOpen.value && (
        <div class="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <Card class="max-w-md w-full shadow-lg" noPadding>
            <div class="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 class="font-bold text-gray-900 dark:text-gray-100 text-lg">Add Website</h3>
              <button 
                onClick={() => { isAddModalOpen.value = false; newDomain.value = ''; }}
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#27272a] transition-colors cursor-pointer"
              >
                <X class="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSite} class="p-6 space-y-6">
              <div>
                <Input 
                  label="Domain Name"
                  type="text" 
                  placeholder="e.g. myblog.com" 
                  required
                  value={newDomain.value}
                  onInput={(e) => newDomain.value = (e.target as HTMLInputElement).value}
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Enter your domain name without http:// or https://</p>
              </div>
              <div class="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => { isAddModalOpen.value = false; newDomain.value = ''; }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addLoading.value}
                >
                  {addLoading.value ? 'Adding...' : 'Add Website'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {selectedSiteForEmbed.value && (
        <div class="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <Card class="max-w-2xl w-full shadow-lg" noPadding>
            <div class="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Code class="w-5 h-5" />
                </div>
                <h3 class="font-bold text-gray-900 dark:text-gray-100 text-lg">Embed Code — {selectedSiteForEmbed.value.domain}</h3>
              </div>
              <button 
                onClick={() => selectedSiteForEmbed.value = null}
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#27272a] transition-colors cursor-pointer"
              >
                <X class="w-5 h-5" />
              </button>
            </div>
            <div class="p-8 space-y-8">
              <p class="text-sm text-gray-600 leading-relaxed">
                Copy the code below and paste it into your website's HTML wherever you want the Diskus comment widget to appear.
              </p>
              
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">HTML Embed Code</span>
                  <button 
                    onClick={() => {
                      const defaultApiUrl = 'http://localhost:3000/api/v1';
                      const apiUrl = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== defaultApiUrl
                        ? import.meta.env.VITE_API_URL
                        : `${window.location.origin}/api/v1`;
                      
                      handleCopyEmbed(`<!-- Diskus Comment Widget Embed -->
<div id="diskus-thread"
  data-api-key="${selectedSiteForEmbed.value.publicApiKey}"
  data-thread-key="YOUR_PAGE_SLUG"
  data-api-url="${apiUrl}">
</div>
<script async defer src="${window.location.origin}/widget/dist/embed.js"></script>`);
                    }}
                    class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors cursor-pointer"
                  >
                    {copiedEmbed.value ? (
                      <>
                        <Check class="w-3.5 h-3.5 text-green-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy class="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                
                <pre class="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed border shadow-inner">
{`<!-- Diskus Comment Widget Embed -->
<div id="diskus-thread"
  data-api-key="${selectedSiteForEmbed.value.publicApiKey}"
  data-thread-key="YOUR_PAGE_SLUG"
  data-api-url="${import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== 'http://localhost:3000/api/v1' ? import.meta.env.VITE_API_URL : `${window.location.origin}/api/v1`}">
</div>
<script async defer src="${window.location.origin}/widget/dist/embed.js"></script>`}
                </pre>
              </div>

              <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
                <div class="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">!</div>
                <div class="text-xs text-blue-800 leading-relaxed">
                  <strong class="block mb-0.5">Configuration Guide:</strong>
                  Replace <code class="bg-blue-100/50 px-1 py-0.5 rounded font-mono">YOUR_PAGE_SLUG</code> with the unique identifier for the page (e.g., URL slug or article ID) so comments for different pages don't mix.
                </div>
              </div>
            </div>
            <div class="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <Button 
                variant="secondary"
                onClick={() => selectedSiteForEmbed.value = null}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {selectedSiteForSettings.value && (
        <div class="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <Card class="max-w-2xl w-full shadow-lg" noPadding>
            <div class="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 class="font-bold text-gray-900 dark:text-gray-100 text-lg">Web Settings</h3>
              <button 
                onClick={() => selectedSiteForSettings.value = null}
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#27272a] transition-colors cursor-pointer"
              >
                <X class="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSite} class="p-6 flex flex-col gap-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Column 1 */}
                <div class="space-y-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Authentication Mode</label>
                    <div class="space-y-3">
                      <label class={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${!requireLoginSetting.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-[#27272a]'}`}>
                        <div class="pt-0.5">
                          <input 
                            type="radio" 
                            name="auth_mode" 
                            checked={!requireLoginSetting.value} 
                            onChange={() => requireLoginSetting.value = false} 
                            class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 dark:bg-[#1f1f22] focus:ring-blue-500 cursor-pointer" 
                          />
                        </div>
                        <div>
                          <div class={`font-medium text-sm ${!requireLoginSetting.value ? 'text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>Guest & Login Allowed</div>
                          <div class={`text-xs mt-1 ${!requireLoginSetting.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>Visitors can post comments as Guests without creating an account.</div>
                        </div>
                      </label>
                      <label class={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${requireLoginSetting.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-[#27272a]'}`}>
                        <div class="pt-0.5">
                          <input 
                            type="radio" 
                            name="auth_mode" 
                            checked={requireLoginSetting.value} 
                            onChange={() => requireLoginSetting.value = true} 
                            class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 dark:bg-[#1f1f22] focus:ring-blue-500 cursor-pointer" 
                          />
                        </div>
                        <div>
                          <div class={`font-medium text-sm ${requireLoginSetting.value ? 'text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>Login Required</div>
                          <div class={`text-xs mt-1 ${requireLoginSetting.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>Visitors must log in or register an account first to post comments.</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Email Notifications</label>
                    <div class="space-y-4">
                      <label class={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${enableEmailSetting.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-[#27272a]'}`}>
                        <div class="pt-0.5">
                          <input 
                            type="checkbox" 
                            checked={enableEmailSetting.value} 
                            onChange={(e) => enableEmailSetting.value = (e.target as HTMLInputElement).checked} 
                            class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 dark:bg-[#1f1f22] rounded focus:ring-blue-500 cursor-pointer" 
                          />
                        </div>
                        <div>
                          <div class={`font-medium text-sm ${enableEmailSetting.value ? 'text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>Notify on New Comments</div>
                          <div class={`text-xs mt-1 ${enableEmailSetting.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>Receive an email whenever someone posts a new comment.</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Column 2 */}
                <div class="space-y-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Moderation Mode</label>
                    <div class="space-y-3">
                      <label class={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${requireModerationSetting.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-[#27272a]'}`}>
                        <div class="pt-0.5">
                          <input 
                            type="checkbox" 
                            checked={requireModerationSetting.value} 
                            onChange={(e) => requireModerationSetting.value = (e.target as HTMLInputElement).checked} 
                            class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 dark:bg-[#1f1f22] rounded focus:ring-blue-500 cursor-pointer" 
                          />
                        </div>
                        <div>
                          <div class={`font-medium text-sm ${requireModerationSetting.value ? 'text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>Require Moderation</div>
                          <div class={`text-xs mt-1 ${requireModerationSetting.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>New comments from visitors will be pending until you approve them.</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Comments Limit</label>
                    <div class="space-y-3">
                      <input 
                        type="number" 
                        min="1"
                        value={commentsLimitSetting.value} 
                        onInput={(e) => commentsLimitSetting.value = parseInt((e.target as HTMLInputElement).value, 10)} 
                        class="block w-full py-2.5 px-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors" 
                      />
                      <div class="text-xs text-gray-500 dark:text-gray-400">Number of root comments to display initially before showing the "Load More" button.</div>
                    </div>
                  </div>
                </div>

              </div>

              <div class="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => selectedSiteForSettings.value = null}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={settingsLoading.value}
                >
                  {settingsLoading.value ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {siteToDelete.value && (
        <div class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
          <Card class="max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200" noPadding>
            <div class="p-8 text-center">
              <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 ring-8 ring-red-50/50">
                <AlertTriangle class="w-8 h-8" strokeWidth={2.5} />
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-3">Delete Website?</h3>
              <p class="text-gray-500 text-sm mb-8 leading-relaxed">
                Are you sure you want to delete the website <span class="font-bold text-gray-800">{siteToDelete.value.domain}</span>? 
                All comment data associated with this website will be <b>permanently deleted</b> and cannot be recovered.
              </p>
              
              <div class="flex gap-3 justify-center w-full">
                <Button 
                  variant="secondary"
                  class="flex-1"
                  onClick={() => siteToDelete.value = null}
                  disabled={deleteLoading.value}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  class="flex-1"
                  onClick={confirmDeleteSite}
                  disabled={deleteLoading.value}
                >
                  {deleteLoading.value ? 'Deleting...' : 'Yes, Delete'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
