import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { CommentForm } from './CommentForm';
import { Comment } from './DiskusWidget';
import { widgetUser } from '../lib/auth';


interface Props {
  comment: Comment;
  repliesMap: Map<string, Comment[]>;
  onReply: (content: string, name: string, email: string, parentId?: string, trap?: string) => Promise<void>;
  onLike: (id: string, isUnlike: boolean) => Promise<boolean>;
  apiUrl: string;
  depth?: number;
  onDelete: (id: string) => Promise<void>;
  onPin?: (id: string, isPinned: boolean) => Promise<void>;
  requireLogin?: boolean;
}

export function CommentThread({ comment, repliesMap, onReply, onLike, apiUrl, depth = 0, onDelete, onPin, requireLogin }: Props) {
  const showReplyForm = useSignal(false);
  const showMenu = useSignal(false);
  const replies = repliesMap.get(comment.id) || [];
  
  // Local state for liking
  const hasLiked = useSignal(false);
  const localLikesCount = useSignal(comment.likesCount);

  useEffect(() => {
    const likedComments = JSON.parse(localStorage.getItem('diskus_liked_comments') || '[]');
    if (likedComments.includes(comment.id)) {
      hasLiked.value = true;
    }
  }, [comment.id]);

  const handleLikeClick = async () => {
    const likedComments = JSON.parse(localStorage.getItem('diskus_liked_comments') || '[]');
    
    if (hasLiked.value) {
      hasLiked.value = false;
      localLikesCount.value = Math.max(0, localLikesCount.value - 1);
      const success = await onLike(comment.id, true);
      if (success) {
        const newLiked = likedComments.filter((id: string) => id !== comment.id);
        localStorage.setItem('diskus_liked_comments', JSON.stringify(newLiked));
      } else {
        hasLiked.value = true;
        localLikesCount.value++;
      }
    } else {
      hasLiked.value = true;
      localLikesCount.value++;
      const success = await onLike(comment.id, false);
      if (success) {
        localStorage.setItem('diskus_liked_comments', JSON.stringify([...likedComments, comment.id]));
      } else {
        hasLiked.value = false;
        localLikesCount.value = Math.max(0, localLikesCount.value - 1);
      }
    }
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (secs < 60) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
  };

  const isAuthor = comment.isAuthor;
  const dicebearUrl = `https://api.dicebear.com/10.x/thumbs/svg?seed=${comment.avatarSeed}`;

  return (
    <div class={`relative ${depth > 0 ? 'mt-6' : ''}`}>
      <div class="flex gap-4">
        {/* Avatar */}
        <div class="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 mt-1 border border-gray-200 dark:border-gray-700 relative z-10">
           <img src={dicebearUrl} alt={comment.authorName} class="w-full h-full object-cover opacity-90 dark:opacity-80" />
        </div>
        
        {/* Content */}
        <div class="flex-1 min-w-0 relative">
          <div class="mb-2 pr-6">
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-bold text-[15px] text-gray-900 dark:text-gray-100 truncate block">{comment.authorName}</span>
              {comment.isPinned && (
                <span class="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 shadow-sm">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                  PINNED
                </span>
              )}
              {isAuthor && <span class="bg-[#10b981] dark:bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-sm">AUTHOR</span>}
            </div>
            <div class="text-[13px] text-gray-400 dark:text-gray-500 mt-0.5 whitespace-nowrap">{timeAgo(comment.createdAt)}</div>
          </div>
          
          {widgetUser.value && ((widgetUser.value.avatarSeed && widgetUser.value.avatarSeed === comment.avatarSeed) || widgetUser.value.role === 'admin' || widgetUser.value.role === 'user') && (
            <div class="absolute right-0 top-0">
              <button onClick={() => showMenu.value = !showMenu.value} class="text-gray-400 hover:text-gray-600 outline-none">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
              </button>
              {showMenu.value && (
                <div class="absolute right-0 mt-1 w-32 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg py-1 z-20 text-sm">
                  {(widgetUser.value.role === 'admin' || widgetUser.value.role === 'user') && depth === 0 && onPin && comment.status === 'approved' && (
                    <button onClick={() => { showMenu.value = false; onPin(comment.id, !comment.isPinned); }} class="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors">
                      {comment.isPinned ? 'Unpin' : 'Pin to top'}
                    </button>
                  )}
                  <button onClick={() => { showMenu.value = false; onDelete(comment.id); }} class="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium transition-colors">Delete</button>
                </div>
              )}
            </div>
          )}
          
          <div class="diskus-prose text-[15px] leading-relaxed text-gray-800 dark:text-gray-200 break-words" dangerouslySetInnerHTML={{ __html: comment.htmlContent }} />
          
          {/* Actions */}
          <div class="flex items-center gap-4 mt-3">
            <button onClick={handleLikeClick} class={`flex items-center gap-1.5 text-[14px] ${hasLiked.value ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'} transition-colors`}>
              <svg class="w-[18px] h-[18px]" fill={hasLiked.value ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
              <span class={hasLiked.value ? 'font-medium' : ''}>{localLikesCount.value}</span>
            </button>
            {depth < 2 && (
              <>
                <div class="w-px h-[14px] bg-gray-200 dark:bg-gray-700"></div>
                <button onClick={() => showReplyForm.value = !showReplyForm.value} class="text-[14px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                  Reply
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showReplyForm.value && (
        <div class="mt-4 mb-2 md:ml-14">
          <CommentForm onSubmit={onReply} parentId={comment.id} onCancel={() => showReplyForm.value = false} apiUrl={apiUrl} requireLogin={requireLogin} />
        </div>
      )}

      {replies.length > 0 && depth < 2 && (
        <div class="mt-6 ml-5 pl-4 md:pl-6 border-l-2 border-gray-200 dark:border-gray-800 relative pb-2 transition-colors duration-300">
          <div class="space-y-6">
            {replies.map((reply) => (
              <div key={reply.id} class="relative">
                <CommentThread comment={reply} repliesMap={repliesMap} onReply={onReply} onLike={onLike} onDelete={onDelete} apiUrl={apiUrl} depth={depth + 1} requireLogin={requireLogin} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
