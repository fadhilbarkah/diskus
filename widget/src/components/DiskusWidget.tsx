import { useEffect } from 'preact/hooks';
import { CommentForm } from './CommentForm';
import { CommentThread } from './CommentThread';
import { useComments } from '../hooks/useComments';
import { useTheme } from '../hooks/useTheme';

export interface Comment {
  id: string;
  parentId: string | null;
  authorName: string;
  avatarSeed: string;
  content: string;
  htmlContent: string;
  status: string;
  likesCount: number;
  createdAt: string; // ISO String from backend
  isPinned?: boolean;
  isAuthor?: boolean;
}

export function DiskusWidget({ apiKey, threadKey, apiUrl, title, embedToken: embedTokenStr }: { apiKey: string, threadKey: string, apiUrl: string, title?: string, embedToken?: string }) {
  const { isDark } = useTheme();
  
  const {
    comments,
    loading,
    error,
    sortBy,
    notification,
    page,
    hasMore,
    requireLogin,
    fetchComments,
    addComment,
    deleteComment,
    togglePin,
    handleLike
  } = useComments(apiUrl, apiKey, threadKey, title, embedTokenStr);

  useEffect(() => {
    fetchComments();
  }, []);

  if (loading.value && page.value === 1) return <div class="p-4 text-gray-500">Loading comments...</div>;
  if (error.value) return <div class="p-4 text-red-500">{error.value}</div>;

  const topLevelComments = comments.value.filter(c => !c.parentId);
  topLevelComments.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
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

  const visibleTopLevelComments = topLevelComments;

  return (
    <div class={`${isDark.value ? 'dark' : ''}`}>
      <div class="diskus-widget font-sans text-gray-900 dark:text-gray-100 bg-transparent p-4 md:px-0 pb-8 max-w-3xl mx-auto transition-colors duration-300">
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

      {loading.value && page.value === 1 && <div class="py-8 flex justify-center"><div class="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin"></div></div>}
      
      <div class="space-y-6">
        {visibleTopLevelComments.map(c => (
          <CommentThread key={c.id} comment={c} repliesMap={repliesMap} onReply={addComment} onLike={handleLike} onDelete={deleteComment} onPin={togglePin} apiUrl={apiUrl} requireLogin={requireLogin.value} />
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

      {hasMore.value && (
        <div class="mt-4 text-center">
          <button 
            onClick={() => { page.value += 1; fetchComments(true); }} 
            disabled={loading.value}
            class="w-full text-[14px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center justify-center gap-1.5 py-4 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading.value ? (
              <div class="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            ) : (
              <>Load more comments <svg class="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></>
            )}
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
