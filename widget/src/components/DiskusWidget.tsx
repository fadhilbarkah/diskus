import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { CommentForm } from './CommentForm';
import { CommentThread } from './CommentThread';
import { widgetToken } from '../lib/auth';

export interface Comment {
  id: string;
  parentId: string | null;
  authorName: string;
  authorEmail: string;
  content: string;
  htmlContent: string;
  status: string;
  likesCount: number;
  createdAt: string; // ISO String from backend
  isAuthor?: boolean;
}

export function DiskusWidget({ apiKey, threadKey, apiUrl }: { apiKey: string, threadKey: string, apiUrl: string }) {
  const comments = useSignal<Comment[]>([]);
  const loading = useSignal(true);
  const error = useSignal('');
  const sortBy = useSignal<'newest' | 'oldest'>('newest');
  const notification = useSignal<{message: string, type: 'success'|'error'} | null>(null);
  const visibleCount = useSignal(5);
  const isDark = useSignal(false);
  const requireLogin = useSignal(false);

  const showNotification = (message: string, type: 'success'|'error') => {
    notification.value = { message, type };
    setTimeout(() => { notification.value = null; }, 4000);
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`${apiUrl}/widget/comments?api_key=${apiKey}&thread_key=${threadKey}`);
      if (!res.ok) throw new Error('Failed to load comments');
      const data = await res.json();
      comments.value = data.comments;
      if (data.config && data.config.requireLogin) {
        requireLogin.value = true;
      }
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  useEffect(() => {
    fetchComments();
    
    // Dark mode detection logic
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const checkDark = () => {
      const hasDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      // Set to dark if host has dark class, or if it has no class but system is dark
      const hostHasLightClass = document.documentElement.classList.contains('light') || document.body.classList.contains('light');
      
      if (hasDarkClass) {
        isDark.value = true;
      } else if (hostHasLightClass) {
        isDark.value = false;
      } else {
        isDark.value = prefersDark.matches;
      }
    };
    
    checkDark();
    prefersDark.addEventListener('change', checkDark);
    
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => {
      prefersDark.removeEventListener('change', checkDark);
      observer.disconnect();
    };
  }, []);

  const addComment = async (content: string, authorName: string, authorEmail: string, parentId?: string, trap?: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (widgetToken.value) {
        headers['Authorization'] = `Bearer ${widgetToken.value}`;
      }

      const res = await fetch(`${apiUrl}/widget/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ api_key: apiKey, thread_key: threadKey, content, authorName, authorEmail, parentId, _diskus_trap: trap })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.comment && data.comment.status === 'approved') {
          showNotification('Komentar berhasil ditambahkan.', 'success');
        } else {
          showNotification('Komentar Anda sedang menunggu persetujuan admin.', 'success');
        }
        fetchComments(); // Refresh the comment list immediately
      } else {
        showNotification('Gagal mengirim komentar, silakan coba lagi.', 'error');
      }
    } catch (err) {
      showNotification('Terjadi kesalahan jaringan.', 'error');
    }
  };

  const deleteComment = async (id: string) => {
    try {
      const headers: Record<string, string> = {};
      if (widgetToken.value) {
        headers['Authorization'] = `Bearer ${widgetToken.value}`;
      }
      const res = await fetch(`${apiUrl}/widget/comments/${id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        showNotification('Komentar dihapus.', 'success');
        fetchComments();
      } else {
        showNotification('Gagal menghapus komentar.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading.value) return <div class="p-4 text-gray-500">Loading comments...</div>;
  if (error.value) return <div class="p-4 text-red-500">{error.value}</div>;

  const topLevelComments = comments.value.filter(c => !c.parentId);
  topLevelComments.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return sortBy.value === 'newest' ? tb - ta : ta - tb;
  });

  const repliesMap = new Map<string, Comment[]>();
  comments.value.forEach(c => {
    if (c.parentId) {
      const list = repliesMap.get(c.parentId) || [];
      list.push(c);
      repliesMap.set(c.parentId, list);
    }
  });

  const handleLike = async (id: string, isUnlike: boolean) => {
    try {
      await fetch(`${apiUrl}/widget/comments/${id}/${isUnlike ? 'unlike' : 'like'}`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  const visibleTopLevelComments = topLevelComments.slice(0, visibleCount.value);

  return (
    <div class={`${isDark.value ? 'dark' : ''}`}>
      <div class="diskus-widget font-sans text-gray-900 dark:text-gray-100 bg-white dark:bg-[#121212] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 md:p-8 max-w-3xl mx-auto transition-colors duration-300">
        {notification.value && (
        <div class={`mb-4 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm animate-fade-in-down ${notification.value.type === 'success' ? 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]' : 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'}`}>
          <div class="flex items-center gap-2">
            {notification.value.type === 'success' ? (
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ) : (
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            )}
            <span class="text-sm font-medium">{notification.value.message}</span>
          </div>
          <button onClick={() => notification.value = null} class="text-current opacity-60 hover:opacity-100">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      )}
      
      <div class="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-100">
        <h3 class="text-xl font-bold flex items-center gap-2 dark:text-white shrink-0">
          Comments
          <span class="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium px-2.5 py-0.5 rounded-full">{comments.value.length}</span>
        </h3>
        
        {comments.value.length > 0 && (
          <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
            <span class="font-medium">Sort by:</span>
            <select class="bg-transparent font-medium text-gray-900 dark:text-gray-200 outline-none cursor-pointer" value={sortBy.value} onChange={(e) => sortBy.value = (e.target as HTMLSelectElement).value as any}>
              <option value="newest" class="dark:bg-gray-800">Newest</option>
              <option value="oldest" class="dark:bg-gray-800">Oldest</option>
            </select>
          </div>
        )}
      </div>

      <div class="mb-10">
        <CommentForm onSubmit={addComment} apiUrl={apiUrl} requireLogin={requireLogin.value} />
      </div>

      {loading.value && <div class="py-8 flex justify-center"><div class="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin"></div></div>}
      
      <div class="space-y-6">
        {visibleTopLevelComments.map(c => (
          <CommentThread key={c.id} comment={c} repliesMap={repliesMap} onReply={addComment} onLike={handleLike} onDelete={deleteComment} apiUrl={apiUrl} requireLogin={requireLogin.value} />
        ))}
        {!loading.value && comments.value.length === 0 && (
          <div class="text-center py-12 bg-gray-50 dark:bg-gray-800/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
            <div class="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <svg class="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            </div>
            <p class="text-gray-500 dark:text-gray-400 font-medium">No comments yet. Be the first to start the conversation!</p>
          </div>
        )}
      </div>

      {visibleCount.value < topLevelComments.length && (
        <div class="mt-12 text-center border-t border-gray-100 dark:border-gray-800 pt-6">
          <button onClick={() => visibleCount.value += 5} class="text-[14px] font-medium text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white flex items-center justify-center gap-1.5 mx-auto bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 px-6 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 transition-colors">
            Load more replies <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
