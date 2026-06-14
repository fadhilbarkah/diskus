import { useSignal } from '@preact/signals';
import { api } from '../lib/api';
import { globalSearchQuery } from '../lib/store';
import { ArrowLeft, Save, Lock, Shield, Mail, Globe, Database } from 'lucide-preact';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';

interface WebsiteSettingsDetailProps {
  site: any;
  onBack: () => void;
  onUpdate: () => void;
}

export function WebsiteSettingsDetail({ site, onBack, onUpdate }: WebsiteSettingsDetailProps) {
  const requireLoginSetting = useSignal(site?.requireLogin || false);
  const enableEmailSetting = useSignal(site?.enableEmail || false);
  const commentsLimitSetting = useSignal(site?.commentsLimit || 10);
  const requireModerationSetting = useSignal(site?.requireModeration || false);
  const enabledSocialLoginsSetting = useSignal<string[]>(site?.enabledSocialLogins || []);
  
  const settingsLoading = useSignal(false);
  const exporting = useSignal(false);
  const importing = useSignal(false);
  const notification = useSignal<{message: string, type: 'success'|'error'} | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    notification.value = { message, type };
    setTimeout(() => { notification.value = null; }, 4000);
  };

  const handleExport = async () => {
    exporting.value = true;
    try {
      const data = await api.exportComments(site.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diskus-export-${site.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Export successful', 'success');
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      exporting.value = false;
    }
  };

  const handleImport = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    importing.value = true;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importComments(site.id, data);
      showNotification('Import successful', 'success');
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      importing.value = false;
      (e.target as HTMLInputElement).value = '';
    }
  };

  const handleUpdateSite = async (e: Event) => {
    e.preventDefault();
    settingsLoading.value = true;
    try {
      await api.updateSite(site.id, {
        requireLogin: requireLoginSetting.value,
        enableEmail: enableEmailSetting.value,
        commentsLimit: commentsLimitSetting.value,
        requireModeration: requireModerationSetting.value,
        enabledSocialLogins: enabledSocialLoginsSetting.value
      });
      showNotification('Settings updated successfully', 'success');
      onUpdate();
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Failed to update website settings', 'error');
    } finally {
      settingsLoading.value = false;
    }
  };

  return (
    <div class="animate-in fade-in duration-300">
      {/* Notifications */}
      {notification.value && (
        <div class={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border transition-all duration-300 transform translate-y-0 opacity-100 ${notification.value.type === 'success' ? 'bg-white dark:bg-[#18181b] border-green-100 dark:border-green-900/30 text-gray-800 dark:text-gray-100' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-300'}`}>
          {notification.value.type === 'success' ? (
            <div class="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
            </div>
          ) : (
            <div class="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </div>
          )}
          <span class="text-sm font-medium">{notification.value.message}</span>
        </div>
      )}

      <div class="max-w-3xl mx-auto pb-12">
        <PageHeader
          title="Website Settings"
          description={site.domain}
          mobileRow={true}
          action={
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft class="w-4 h-4 mr-2" /> Back
            </Button>
          }
        />

        <form onSubmit={handleUpdateSite} class="space-y-6">
          {(() => {
            const q = globalSearchQuery.value.toLowerCase();
            const showAuth = !q || 'authentication login guest social google github'.includes(q);
            const showModeration = !q || 'moderation display approve limit'.includes(q);
            const showEmail = !q || 'email notifications notify'.includes(q);
            const showData = !q || 'data management export import json xml disqus'.includes(q);

            if (!showAuth && !showModeration && !showEmail && !showData) {
              return <div class="text-center py-20 text-gray-500">No settings match your search.</div>;
            }

            return (
              <>
                {showAuth && (
                  <Card>
            <CardHeader
              title="Authentication"
              description="Configure how visitors log in to post comments."
              icon={<Lock class="w-5 h-5" />}
            />
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label class={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${!requireLoginSetting.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-[#27272a]'}`}>
                <div class="pt-0.5">
                  <input 
                    type="radio" 
                    name="auth_mode" 
                    checked={!requireLoginSetting.value} 
                    onChange={() => requireLoginSetting.value = false} 
                    class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500 cursor-pointer" 
                  />
                </div>
                <div>
                  <div class={`font-medium text-sm ${!requireLoginSetting.value ? 'text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>Guest & Login Allowed</div>
                  <div class={`text-xs mt-1 leading-relaxed ${!requireLoginSetting.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>Visitors can post comments as Guests without creating an account.</div>
                </div>
              </label>
              
              <label class={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${requireLoginSetting.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-[#27272a]'}`}>
                <div class="pt-0.5">
                  <input 
                    type="radio" 
                    name="auth_mode" 
                    checked={requireLoginSetting.value} 
                    onChange={() => requireLoginSetting.value = true} 
                    class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500 cursor-pointer" 
                  />
                </div>
                <div>
                  <div class={`font-medium text-sm ${requireLoginSetting.value ? 'text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>Login Required</div>
                  <div class={`text-xs mt-1 leading-relaxed ${requireLoginSetting.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>Visitors must log in or register an account first to post comments.</div>
                </div>
              </label>
            </div>
            
            <div class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Social Logins</h3>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <label class={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${enabledSocialLoginsSetting.value.includes('google') ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-[#27272a]'}`}>
                  <input 
                    type="checkbox" 
                    checked={enabledSocialLoginsSetting.value.includes('google')} 
                    onChange={(e) => {
                      if ((e.target as HTMLInputElement).checked) {
                        enabledSocialLoginsSetting.value = [...enabledSocialLoginsSetting.value, 'google'];
                      } else {
                        enabledSocialLoginsSetting.value = enabledSocialLoginsSetting.value.filter(p => p !== 'google');
                      }
                    }} 
                    class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 cursor-pointer" 
                  />
                  <span class={`flex items-center font-medium text-sm ${enabledSocialLoginsSetting.value.includes('google') ? 'text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    <svg class="w-4 h-4 mr-1.5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                  </span>
                </label>
                <label class={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${enabledSocialLoginsSetting.value.includes('github') ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-[#27272a]'}`}>
                  <input 
                    type="checkbox" 
                    checked={enabledSocialLoginsSetting.value.includes('github')} 
                    onChange={(e) => {
                      if ((e.target as HTMLInputElement).checked) {
                        enabledSocialLoginsSetting.value = [...enabledSocialLoginsSetting.value, 'github'];
                      } else {
                        enabledSocialLoginsSetting.value = enabledSocialLoginsSetting.value.filter(p => p !== 'github');
                      }
                    }} 
                    class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 cursor-pointer" 
                  />
                  <span class={`flex items-center font-medium text-sm ${enabledSocialLoginsSetting.value.includes('github') ? 'text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    <svg class={`w-4 h-4 mr-1.5 ${enabledSocialLoginsSetting.value.includes('github') ? 'text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                    </svg>
                    GitHub
                  </span>
                </label>
              </div>
            </div>
          </Card>
          )}

          {showModeration && (
            <Card>
              <CardHeader
              title="Moderation & Display"
              description="Control how comments are approved and displayed."
              icon={<Shield class="w-5 h-5" />}
            />
            <div class="space-y-6">
              <label class={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${requireModerationSetting.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-[#27272a]'}`}>
                <div class="pt-0.5">
                  <input 
                    type="checkbox" 
                    checked={requireModerationSetting.value} 
                    onChange={(e) => requireModerationSetting.value = (e.target as HTMLInputElement).checked} 
                    class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 cursor-pointer" 
                  />
                </div>
                <div>
                  <div class={`font-medium text-sm ${requireModerationSetting.value ? 'text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>Require Moderation</div>
                  <div class={`text-xs mt-1 leading-relaxed ${requireModerationSetting.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>New comments from visitors will be pending until you approve them manually.</div>
                </div>
              </label>

              <div>
                <label class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Initial Comments Limit</label>
                <div class="flex items-center gap-3">
                  <input 
                    type="number" 
                    min="1"
                    value={commentsLimitSetting.value} 
                    onInput={(e) => commentsLimitSetting.value = parseInt((e.target as HTMLInputElement).value, 10)} 
                    class="block w-24 py-2 px-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors" 
                  />
                  <div class="text-xs text-gray-500 dark:text-gray-400">root comments to show before the "Load More" button.</div>
                </div>
              </div>
            </div>
          </Card>
          )}

          {showEmail && (
            <Card>
              <CardHeader
              title="Email Notifications"
              description="Stay updated when visitors interact with your website."
              icon={<Mail class="w-5 h-5" />}
            />
            <label class={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${enableEmailSetting.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-[#27272a]'}`}>
              <div class="pt-0.5">
                <input 
                  type="checkbox" 
                  checked={enableEmailSetting.value} 
                  onChange={(e) => enableEmailSetting.value = (e.target as HTMLInputElement).checked} 
                  class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 cursor-pointer" 
                />
              </div>
              <div>
                <div class={`font-medium text-sm ${enableEmailSetting.value ? 'text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>Notify on New Comments</div>
                <div class={`text-xs mt-1 leading-relaxed ${enableEmailSetting.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>Receive an email automatically whenever someone posts a new comment on your website.</div>
                </div>
              </label>
            </Card>
            )}

            {showData && (
              <Card>
            <CardHeader
              title="Data Management"
              description="Export or import comments specifically for this website."
              icon={<Database class="w-5 h-5" />}
            />
            <div class="space-y-6 flex flex-col flex-1">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-auto pt-2">
                <Button onClick={handleExport} disabled={exporting.value} type="button" fullWidth style={{ backgroundColor: 'transparent', color: 'currentColor', border: '1px solid currentColor' }} class="text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700">
                  {exporting.value ? 'Exporting...' : 'Export Data (JSON)'}
                </Button>

                <div class="relative">
                  <input title="Import JSON" type="file" accept=".json" onChange={handleImport} disabled={importing.value} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                  <Button type="button" disabled={importing.value} fullWidth>
                    {importing.value ? 'Importing...' : 'Import Data (JSON)'}
                  </Button>
                </div>

                <div class="relative">
                  <input title="Import Disqus XML" type="file" accept=".xml,.gz,.xml.gz" onChange={async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;

                    importing.value = true;
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      await api.importDisqusComments(site.id, formData);
                      showNotification('Disqus XML import successful', 'success');
                    } catch (err: any) {
                      showNotification(err.message, 'error');
                    } finally {
                      importing.value = false;
                      (e.target as HTMLInputElement).value = '';
                    }
                  }} disabled={importing.value} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                  <Button type="button" disabled={importing.value} fullWidth style={{ backgroundColor: '#2e9fff' }} class="text-white hover:bg-[#1d82db]">
                    {importing.value ? 'Importing...' : 'Import from Disqus'}
                  </Button>
                </div>
                  </div>
                </div>
              </Card>
              )}
              </>
            );
          })()}

          <div class="pt-4">
            <Button type="submit" disabled={settingsLoading.value} fullWidth>
              <Save class="w-4 h-4 mr-2" />
              {settingsLoading.value ? 'Saving...' : 'Save Website Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
