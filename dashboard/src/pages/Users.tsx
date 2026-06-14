import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Users as UsersIcon, Loader2, RefreshCw, Trash2, AlertTriangle } from 'lucide-preact';
import { api } from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function Users() {
  const users = useSignal<any[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);

  const userToDelete = useSignal<{id: string, name: string} | null>(null);
  const deleteLoading = useSignal(false);

  const confirmDeleteUser = async () => {
    if (!userToDelete.value) return;
    deleteLoading.value = true;
    try {
      await api.deleteUser(userToDelete.value.id);
      userToDelete.value = null;
      await fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete user');
    } finally {
      deleteLoading.value = false;
    }
  };

  const fetchUsers = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.getUsers();
      users.value = response.users || [];
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch users';
    } finally {
      loading.value = false;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div class="max-w-7xl mx-auto space-y-8">
      <PageHeader 
        title="Registered Users" 
        description="Manage all users who have registered to comment on your websites"
        action={
          <Button variant="secondary" onClick={fetchUsers}>
            <RefreshCw class={`w-4 h-4 mr-2 ${loading.value ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        }
      />

      <Card noPadding class="overflow-hidden">
        {loading.value ? (
          <div class="flex justify-center items-center h-48 text-gray-400">
            <Loader2 class="w-8 h-8 animate-spin" />
          </div>
        ) : error.value ? (
          <div class="flex flex-col justify-center items-center h-48 text-red-500 gap-3">
            <p>{error.value}</p>
            <Button variant="secondary" onClick={fetchUsers}>
              Try Again
            </Button>
          </div>
        ) : users.value.length === 0 ? (
          <div class="flex flex-col items-center justify-center py-20 text-center px-4">
            <div class="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6">
              <UsersIcon class="w-8 h-8" />
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No users found</h3>
            <p class="text-gray-500 dark:text-gray-400 text-sm max-w-[250px] mb-8">There are no registered commenters yet.</p>
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead class="bg-gray-50/50 dark:bg-[#1f1f22] text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th class="px-6 py-4">User</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-6 py-4">Joined</th>
                  <th class="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                {users.value.map((user) => (
                  <tr key={user.id} class="hover:bg-gray-50/50 dark:hover:bg-[#1f1f22] transition-colors">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#18181b] flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                           <img src={`https://api.dicebear.com/10.x/thumbs/svg?seed=${encodeURIComponent(user.email)}`} alt={user.name} class="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div class="font-bold text-gray-900 dark:text-gray-100">{user.name}</div>
                          <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      {user.isVerified ? (
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Verified
                        </span>
                      ) : (
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 font-medium">
                      {new Date(user.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => userToDelete.value = { id: user.id, name: user.name }}
                        class="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {userToDelete.value && (
        <div class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
          <Card class="max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200" noPadding>
            <div class="p-8 text-center">
              <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 ring-8 ring-red-50/50">
                <AlertTriangle class="w-8 h-8" strokeWidth={2.5} />
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Delete User?</h3>
              <p class="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                Are you sure you want to delete the user <span class="font-bold text-gray-800 dark:text-gray-200">{userToDelete.value.name}</span>? 
                This action is <b>permanent</b> and cannot be undone.
              </p>
              
              <div class="flex gap-3 justify-center w-full">
                <Button 
                  variant="secondary"
                  class="flex-1"
                  onClick={() => userToDelete.value = null}
                  disabled={deleteLoading.value}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  class="flex-1"
                  onClick={confirmDeleteUser}
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
