import { useSignal } from '@preact/signals';
import { Comment } from '../components/DiskusWidget';
import { widgetToken } from '../lib/auth';
import { embedToken } from '../lib/embed';

function resolveEmbedToken(explicit?: string | null): string | null {
  return explicit || embedToken.value;
}

function embedQueryParam(token?: string | null): string {
  const value = resolveEmbedToken(token);
  return value ? `&embed_token=${encodeURIComponent(value)}` : '';
}

function embedHeaders(extra: Record<string, string> = {}, token?: string | null): Record<string, string> {
  const headers = { ...extra };
  const value = resolveEmbedToken(token);
  if (value) {
    headers['X-Diskus-Embed-Token'] = value;
  }
  return headers;
}

export function useComments(apiUrl: string, apiKey: string, threadKey: string, title?: string, embedTokenStr?: string) {
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
      
      const res = await fetch(`${apiUrl}/widget/comments?api_key=${apiKey}&thread_key=${threadKey}&page=${page.value}${title ? `&title=${encodeURIComponent(title)}` : ''}${embedQueryParam(embedTokenStr)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load comments');
      }
      
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
      const headers = embedHeaders({ 'Content-Type': 'application/json' }, embedTokenStr);
      if (widgetToken.value) {
        headers['Authorization'] = `Bearer ${widgetToken.value}`;
      }

      const res = await fetch(`${apiUrl}/widget/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ api_key: apiKey, thread_key: threadKey, title, content, authorName, authorEmail, parentId, _diskus_trap: trap })
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
      const headers = embedHeaders({}, embedTokenStr);
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
      const headers = embedHeaders({ 'Content-Type': 'application/json' }, embedTokenStr);
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
      await fetch(`${apiUrl}/widget/comments/${id}/${isUnlike ? 'unlike' : 'like'}?api_key=${encodeURIComponent(apiKey)}${embedQueryParam(embedTokenStr)}`, {
        method: 'POST',
        headers: embedHeaders({}, embedTokenStr),
      });
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
