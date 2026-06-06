import { useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { User, Lock, Database, Mail } from 'lucide-preact';
import { api } from '../lib/api';
import { selectedSiteId } from '../lib/store';
import { authState, updateUser } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';

export function Settings() {
  const loading = useSignal(true);
  const savingProfile = useSignal(false);
  const savingPassword = useSignal(false);
  const savingIntegrations = useSignal(false);
  const exporting = useSignal(false);
  const importing = useSignal(false);

  const name = useSignal('');
  const email = useSignal('');
  const resendApiKey = useSignal('');
  const resendSenderEmail = useSignal('');

  const currentPassword = useSignal('');
  const newPassword = useSignal('');
  const confirmPassword = useSignal('');

  const notification = useSignal<{ message: string, type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    notification.value = { message, type };
    setTimeout(() => { notification.value = null; }, 4000);
  };

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      loading.value = true;
      const data = await api.getAccount();
      name.value = data.name || '';
      email.value = data.email || '';
      resendApiKey.value = data.resendApiKey || '';
      resendSenderEmail.value = data.resendSenderEmail || '';

      // Update global auth state to reflect new name
      updateUser({ name: data.name, email: data.email });
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      loading.value = false;
    }
  };

  const handleUpdateProfile = async (e: Event) => {
    e.preventDefault();
    if (!email.value) {
      return showNotification('Email is required', 'error');
    }

    try {
      savingProfile.value = true;
      await api.updateAccount({ name: name.value, email: email.value });

      // Update global auth state and localStorage
      updateUser({ name: name.value, email: email.value });

      showNotification('Profile updated successfully', 'success');
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      savingProfile.value = false;
    }
  };

  const handleUpdateIntegrations = async (e: Event) => {
    e.preventDefault();
    try {
      savingIntegrations.value = true;
      await api.updateAccount({ resendApiKey: resendApiKey.value, resendSenderEmail: resendSenderEmail.value });
      showNotification('Integrations updated successfully', 'success');
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      savingIntegrations.value = false;
    }
  };

  const handleUpdatePassword = async (e: Event) => {
    e.preventDefault();
    if (newPassword.value !== confirmPassword.value) {
      return showNotification('New passwords do not match', 'error');
    }

    if (newPassword.value.length < 6) {
      return showNotification('New password must be at least 6 characters long', 'error');
    }

    try {
      savingPassword.value = true;
      await api.updateAccount({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value
      });
      showNotification('Password updated successfully', 'success');
      currentPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      savingPassword.value = false;
    }
  };

  const handleExport = async () => {
    if (!selectedSiteId.value) return;
    exporting.value = true;
    try {
      const data = await api.exportComments(selectedSiteId.value);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diskus-export-${selectedSiteId.value}.json`;
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
    if (!selectedSiteId.value) return;
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    importing.value = true;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importComments(selectedSiteId.value, data);
      showNotification('Import successful', 'success');
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      importing.value = false;
      (e.target as HTMLInputElement).value = '';
    }
  };

  if (loading.value) {
    return (
      <div class="h-full w-full flex items-center justify-center">
        <div class="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div class="animate-in fade-in duration-300">
      {notification.value && (
        <div class={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border transition-all duration-300 transform translate-y-0 opacity-100 ${notification.value.type === 'success' ? 'bg-white border-green-100 text-gray-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
          {notification.value.type === 'success' ? (
            <div class="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
            </div>
          ) : (
            <div class="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </div>
          )}
          <span class="text-sm font-medium">{notification.value.message}</span>
        </div>
      )}

      <div class="max-w-5xl mx-auto">
        <PageHeader
          title="Settings"
          description="Manage your preferences and profile details"
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <Card class="flex flex-col h-full">
            <CardHeader
              title="Profile Information"
              description="Update your account's profile information and email address."
              icon={<User class="w-5 h-5" />}
            />

            <div class="flex items-center gap-4 mb-4">
              <div class="w-16 h-16 rounded-full overflow-hidden shrink-0 select-none border border-gray-100 bg-gray-50 shadow-sm">
                <img src={`https://api.dicebear.com/10.x/thumbs/svg?seed=${encodeURIComponent(email.value || 'admin')}`} alt="Avatar" class="w-full h-full object-cover" />
              </div>
              <div>
                <h3 class="font-medium text-gray-900 text-sm">Avatar</h3>
                <p class="text-xs text-gray-500 mt-0.5">Your avatar is generated based on your email.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} class="space-y-4 flex flex-col flex-1">
              <Input
                label="Name"
                type="text"
                value={name.value}
                onInput={(e) => name.value = (e.target as HTMLInputElement).value}
                placeholder="Enter your name"
              />

              <Input
                label="Email"
                type="email"
                required
                value={email.value}
                onInput={(e) => email.value = (e.target as HTMLInputElement).value}
              />

              <div class="pt-4 mt-auto">
                <Button type="submit" disabled={savingProfile.value} fullWidth>
                  {savingProfile.value ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </Card>

          <Card class="flex flex-col h-full">
            <CardHeader
              title="Change Password"
              description="Ensure your account is using a long, random password."
              icon={<Lock class="w-5 h-5" />}
            />

            <form onSubmit={handleUpdatePassword} class="space-y-4 flex flex-col flex-1">
              <Input
                label="Current Password"
                type="password"
                required
                value={currentPassword.value}
                onInput={(e) => currentPassword.value = (e.target as HTMLInputElement).value}
              />

              <Input
                label="New Password"
                type="password"
                required
                minLength={6}
                value={newPassword.value}
                onInput={(e) => newPassword.value = (e.target as HTMLInputElement).value}
              />

              <Input
                label="Confirm Password"
                type="password"
                required
                minLength={6}
                value={confirmPassword.value}
                onInput={(e) => confirmPassword.value = (e.target as HTMLInputElement).value}
              />

              <div class="pt-4 mt-auto">
                <Button type="submit" disabled={savingPassword.value} fullWidth>
                  {savingPassword.value ? 'Saving...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <Card class="flex flex-col h-full">
            <CardHeader
              title="Integrations"
              description="Connect external services for email notifications."
              icon={<Mail class="w-5 h-5" />}
            />

            <form onSubmit={handleUpdateIntegrations} class="space-y-4 flex flex-col flex-1">
              <Input
                label="Resend API Key"
                type="password"
                placeholder="re_..."
                value={resendApiKey.value}
                onInput={(e) => resendApiKey.value = (e.target as HTMLInputElement).value}
              />

              <Input
                label="Sender Email"
                type="email"
                placeholder="e.g. notifications@yourdomain.com"
                value={resendSenderEmail.value}
                onInput={(e) => resendSenderEmail.value = (e.target as HTMLInputElement).value}
              />
              <p class="text-xs text-gray-500 mt-2">Required if you want to enable Email Notifications in your Web Settings. The Sender Email must be verified in your <a href="https://resend.com" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">Resend account</a>.</p>

              <div class="pt-4 mt-auto">
                <Button type="submit" disabled={savingIntegrations.value} fullWidth>
                  {savingIntegrations.value ? 'Saving...' : 'Save Integrations'}
                </Button>
              </div>
            </form>
          </Card>

          <Card class="flex flex-col h-full">
            <CardHeader
              title="Data Management"
              description="Export or Import comments for the currently selected website."
              icon={<Database class="w-5 h-5" />}
            />
            <div class="space-y-6 flex flex-col flex-1">
              <div class={`p-4 border rounded-xl text-sm ${selectedSiteId.value ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-orange-50 border-orange-100 text-orange-800'}`}>
                {selectedSiteId.value ? "These actions will only apply to the currently selected website." : "Please select a website from the top header to enable data management."}
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto pt-4">
                <Button onClick={handleExport} disabled={!selectedSiteId.value || exporting.value} type="button" fullWidth style={{ backgroundColor: 'transparent', color: '#4b5563', border: '1px solid #e5e7eb' }}>
                  {exporting.value ? 'Exporting...' : 'Export Data (JSON)'}
                </Button>

                <div class="relative">
                  <input type="file" accept=".json" onChange={handleImport} disabled={!selectedSiteId.value || importing.value} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                  <Button type="button" disabled={!selectedSiteId.value || importing.value} fullWidth>
                    {importing.value ? 'Importing...' : 'Import Data'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
