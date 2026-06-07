import { useSignal } from '@preact/signals';
import { Comment } from '../components/DiskusWidget';
import { widgetToken } from '../lib/auth';

export function useComments(apiUrl: string, apiKey: string, threadKey: string) {
  const comments = useSignal<Comment[]>([]);
  const loading = useSignal(true);
  const error = useSignal('');
  const sortBy = useSignal<'newest' | 'oldest'>('newest');
  const notification = useSignal<{message: string, type: 'success'|'error'} | null>(null);
  const page = useSignal(1);
  const hasMore = useSignal(false);
  const requireLogin = useSignal(false);

  const showNotification = (message: string, type: 'success'|'error') => {
    notification.value = { message, type };
    setTimeout(() => { notification.value = null; }, 4000);
  };

  const fetchComments = async (isLoadMore = false) => {
    try {
      loading.value = true;
      if (!isLoadMore) page.value = 1;
      
      const res = await fetch(`${apiUrl}/widget/comments?api_key=${apiKey}&thread_key=${threadKey}&page=${page.value}`);
      if (!res.ok) throw new Error('Failed to load comments');
      
      const data = await res.json();
      
      if (isLoadMore) {
        const newMap = new Map(comments.value.map(c => [c.id, c]));
        data.comments.forEach((c: Comment) => newMap.set(c.id, c));
        comments.value = Array.from(newMap.values());
      } else {
        comments.value = data.comments;
      }
      
      hasMore.value = data.hasMore;

      if (data.config && data.config.requireLogin) {
        requireLogin.value = true;
      }
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

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
          showNotification('Comment added successfully.', 'success');
        } else {
          showNotification('Your comment is awaiting moderation.', 'success');
        }
        fetchComments(); // Refresh the comment list immediately
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to add comment, please try again.', 'error');
      }
    } catch (err) {
      showNotification('Network error occurred.', 'error');
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
        showNotification('Comment deleted.', 'success');
        fetchComments();
      } else {
        showNotification('Failed to delete comment.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const togglePin = async (id: string, isPinned: boolean) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (widgetToken.value) {
        headers['Authorization'] = `Bearer ${widgetToken.value}`;
      }
      const res = await fetch(`${apiUrl}/widget/comments/${id}/pin`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isPinned })
      });
      if (res.ok) {
        fetchComments();
      } else {
        showNotification('Failed to pin comment.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (id: string, isUnlike: boolean) => {
    try {
      await fetch(`${apiUrl}/widget/comments/${id}/${isUnlike ? 'unlike' : 'like'}`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  return {
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
  };
}
