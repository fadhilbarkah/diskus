import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Users as UsersIcon, Loader2 } from 'lucide-preact';
import { api } from '../lib/api';

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
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <UsersIcon class="w-7 h-7 text-blue-600" />
          Registered Users
        </h2>
        <button
          onClick={fetchUsers}
          class="text-sm font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
        >
          Refresh
        </button>
      </div>

      <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading.value ? (
          <div class="flex justify-center items-center h-48 text-gray-400">
            <Loader2 class="w-8 h-8 animate-spin" />
          </div>
        ) : error.value ? (
          <div class="flex flex-col justify-center items-center h-48 text-red-500 gap-3">
            <p>{error.value}</p>
            <button onClick={fetchUsers} class="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors cursor-pointer">
              Try Again
            </button>
          </div>
        ) : users.value.length === 0 ? (
          <div class="flex flex-col items-center justify-center py-16 text-center px-4">
            <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
              <UsersIcon class="w-8 h-8 text-gray-400" />
            </div>
            <h3 class="text-gray-900 font-bold mb-1">No users found</h3>
            <p class="text-gray-500 text-sm max-w-[250px]">There are no registered commenters yet.</p>
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
                        <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                           <img src={`https://api.dicebear.com/10.x/thumbs/svg?seed=${encodeURIComponent(user.email)}`} alt={user.name} class="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div class="font-semibold text-gray-900">{user.name}</div>
                          <div class="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
