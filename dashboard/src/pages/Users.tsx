import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Users as UsersIcon, Loader2, RefreshCw } from 'lucide-preact';
import { api } from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function Users() {
  const users = useSignal<any[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);

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
            <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
              <UsersIcon class="w-8 h-8" />
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">No users found</h3>
            <p class="text-gray-500 text-sm max-w-[250px] mb-8">There are no registered commenters yet.</p>
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-600">
              <thead class="bg-gray-50/50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th class="px-6 py-4">User</th>
                  <th class="px-6 py-4">Joined</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                {users.value.map((user) => (
                  <tr key={user.id} class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                           <img src={`https://api.dicebear.com/10.x/thumbs/svg?seed=${encodeURIComponent(user.email)}`} alt={user.name} class="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div class="font-bold text-gray-900">{user.name}</div>
                          <div class="text-xs text-gray-500 mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">
                      {new Date(user.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
