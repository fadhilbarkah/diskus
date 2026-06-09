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

function getVisitorId(): string {
  if (typeof window === 'undefined') return 'unknown-visitor';
  try {
    let visitorId = localStorage.getItem('diskus_visitor_id');
    if (!visitorId) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        visitorId = crypto.randomUUID();
      } else {
        visitorId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
      }
      localStorage.setItem('diskus_visitor_id', visitorId);
    }
    return visitorId;
  } catch (err) {
    return 'fallback-visitor-' + Math.random().toString(36).substring(2);
  }
}

function embedHeaders(extra: Record<string, string> = {}, token?: string | null): Record<string, string> {
  const headers: Record<string, string> = { ...extra, 'X-Visitor-Id': getVisitorId() };
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
  const totalCount = useSignal(0);

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
      
      if (data.comments) {
        if (isLoadMore) {
          comments.value = [...comments.value, ...data.comments];
        } else {
          comments.value = data.comments;
        }
        hasMore.value = data.hasMore;
        if (data.total !== undefined) {
          totalCount.value = data.total;
        } else {
          totalCount.value = comments.value.length;
        }
        if (data.config?.requireLogin !== undefined) {
          requireLogin.value = data.config.requireLogin;
        }
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
        const newComment = data.comment;
        comments.value = [...comments.value, newComment];
        totalCount.value += 1;
        return true;
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
        comments.value = comments.value.filter(c => c.id !== id);
        totalCount.value = Math.max(0, totalCount.value - 1);
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

  const handleLike = async (id: string, isUnlike: boolean): Promise<boolean> => {
    try {
      const headers = embedHeaders({}, embedTokenStr);
      if (widgetToken.peek()) {
        headers['Authorization'] = `Bearer ${widgetToken.peek()}`;
      }
      
      const res = await fetch(`${apiUrl}/widget/comments/${id}/${isUnlike ? 'unlike' : 'like'}?api_key=${encodeURIComponent(apiKey)}${embedQueryParam(embedTokenStr)}`, {
        method: 'POST',
        headers,
      });
      if (!isUnlike && res.status === 409) return true; // Already liked
      if (isUnlike && res.status === 404) return true; // Already unliked
      return res.ok;
    } catch (err) {
      console.error(err);
      return false;
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
    totalCount,
    fetchComments,
    addComment,
    deleteComment,
    togglePin,
    handleLike
  };
}
