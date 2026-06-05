import { useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { User, Lock } from 'lucide-preact';
import { api } from '../lib/api';
import { authState, updateUser } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';

export function Settings() {
  const loading = useSignal(true);
  const savingProfile = useSignal(false);
  const savingPassword = useSignal(false);
  
  const name = useSignal('');
  const email = useSignal('');
  
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

      <PageHeader 
        title="Settings" 
        description="Manage your preferences and profile details" 
      />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader 
            title="Profile Information" 
            description="Update your account's profile information and email address."
            icon={<User class="w-5 h-5" />}
          />
          
          <div class="flex items-center gap-4 mb-6">
            <div class="w-16 h-16 rounded-full overflow-hidden shrink-0 select-none border border-gray-100 bg-gray-50 shadow-sm">
              <img src={`https://api.dicebear.com/10.x/thumbs/svg?seed=${encodeURIComponent(email.value || 'admin')}`} alt="Avatar" class="w-full h-full object-cover" />
            </div>
            <div>
              <h3 class="font-medium text-gray-900 text-sm">Avatar</h3>
              <p class="text-xs text-gray-500 mt-0.5">Your avatar is generated based on your email.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} class="space-y-4">
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

            <div class="pt-4">
              <Button type="submit" disabled={savingProfile.value} fullWidth>
                {savingProfile.value ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader 
            title="Change Password" 
            description="Ensure your account is using a long, random password."
            icon={<Lock class="w-5 h-5" />}
          />
          
          <form onSubmit={handleUpdatePassword} class="space-y-4">
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

            <div class="pt-4">
              <Button type="submit" disabled={savingPassword.value} fullWidth>
                {savingPassword.value ? 'Saving...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
