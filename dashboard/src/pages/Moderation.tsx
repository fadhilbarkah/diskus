import { Search, ChevronLeft, ChevronRight, MoreHorizontal, ChevronDown, Pin, PinOff } from 'lucide-preact';
import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import { authState } from '../lib/auth';
import { selectedSiteId } from '../lib/store';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';

export function Moderation() {
  const activeTab = useSignal('all');
  const comments = useSignal<any[]>([]);
  const stats = useSignal({ total: 0, pending: 0, approved: 0, spam: 0, trash: 0 });
  const loading = useSignal(true);
  const selectedIds = useSignal<string[]>([]);
  const bulkAction = useSignal('');
  const openMenuId = useSignal<string | null>(null);
  
  // Filters
  const searchQuery = useSignal('');
  const filterPost = useSignal('All Posts');
  const sortBy = useSignal('newest');

  const tabs = [
    { name: 'All Comments', id: 'all', count: () => stats.value.total },
    { name: 'Pending', id: 'pending', count: () => stats.value.pending },
    { name: 'Approved', id: 'approved', count: () => stats.value.approved },
    { name: 'Spam', id: 'spam', count: () => stats.value.spam },
    { name: 'Trash', id: 'trash', count: () => stats.value.trash },
  ];

  const fetchData = async () => {
    loading.value = true;
    try {
      const [statsRes, commentsRes] = await Promise.all([
        api.getAnalytics(selectedSiteId.value),
        api.getComments(activeTab.value, selectedSiteId.value)
      ]);
      stats.value = statsRes;
      comments.value = commentsRes.comments;
    } catch (err) {
      console.error(err);
    } finally {
      loading.value = false;
    }
  };

  useEffect(() => {
    selectedIds.value = [];
    bulkAction.value = '';
    openMenuId.value = null;
    fetchData();
  }, [activeTab.value, selectedSiteId.value]);

  const toggleSelect = (id: string) => {
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter(i => i !== id);
    } else {
      selectedIds.value = [...selectedIds.value, id];
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction.value || selectedIds.value.length === 0) return;
    try {
      if (bulkAction.value === 'delete') {
        await api.deleteComments(selectedIds.value);
      } else {
        await api.bulkUpdateComments(selectedIds.value, bulkAction.value);
      }
      selectedIds.value = [];
      bulkAction.value = '';
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSingleAction = async (id: string, action: string) => {
    try {
      if (action === 'delete') {
        await api.deleteComments([id]);
      } else {
        await api.bulkUpdateComments([id], action);
      }
      openMenuId.value = null;
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    try {
      await api.togglePinComment(id, isPinned);
      comments.value = comments.value.map(c => c.id === id ? { ...c, isPinned } : c);
    } catch (err) {
      alert('Failed to update pin status');
    }
  };

  const toggleSelectAll = (e: any) => {
    if (e.target.checked) {
      selectedIds.value = comments.value.map(c => c.id);
    } else {
      selectedIds.value = [];
    }
  };

  // Build comment tree for visual hierarchy
  const renderComments = () => {
    let listToRender = comments.value;
    
    // Apply filters
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      listToRender = listToRender.filter(c => 
        c.authorName.toLowerCase().includes(q) || 
        c.authorEmail.toLowerCase().includes(q) || 
        c.content.toLowerCase().includes(q) || 
        (c.threadTitle && c.threadTitle.toLowerCase().includes(q))
      );
    }
    
    if (filterPost.value !== 'All Posts') {
      listToRender = listToRender.filter(c => c.threadTitle === filterPost.value);
    }
    
    // Sort
    listToRender = [...listToRender].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortBy.value === 'newest' ? timeB - timeA : timeA - timeB;
    });

    const isFiltering = searchQuery.value !== '' || filterPost.value !== 'All Posts';
    
    // Find comments whose parents are not in the current list
    const orphans = listToRender.filter(c => c.parentId && !listToRender.some(p => p.id === c.parentId));
    
    // Treat true roots and orphans as root comments
    const rootComments = isFiltering ? listToRender : listToRender.filter(c => !c.parentId || orphans.includes(c));
    const repliesMap = new Map<string, any[]>();
    
    if (!isFiltering) {
      listToRender.forEach(c => {
        if (c.parentId && !orphans.includes(c)) {
          const list = repliesMap.get(c.parentId) || [];
          list.push(c);
          repliesMap.set(c.parentId, list);
        }
      });
    }

    const renderNode = (c: any, depth: number = 0) => {
      const diffInMs = Math.max(0, Date.now() - new Date(c.createdAt).getTime());
      const diffInSecs = Math.floor(diffInMs / 1000);
      let timeStr = 'Just now';
      if (diffInSecs >= 86400) {
        const days = Math.floor(diffInSecs / 86400);
        timeStr = `${days} day${days > 1 ? 's' : ''} ago`;
      } else if (diffInSecs >= 3600) {
        const hours = Math.floor(diffInSecs / 3600);
        timeStr = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else if (diffInSecs >= 60) {
        const mins = Math.floor(diffInSecs / 60);
        timeStr = `${mins} min${mins > 1 ? 's' : ''} ago`;
      } else if (diffInSecs > 10) {
        timeStr = `${diffInSecs} secs ago`;
      }
      const replies = repliesMap.get(c.id) || [];
      const isSelected = selectedIds.value.includes(c.id);

      const statusColors: Record<string, string> = {
        approved: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-transparent',
        pending: 'bg-gray-100 dark:bg-[#27272a] text-gray-600 dark:text-gray-400 border-transparent',
        spam: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-transparent',
      };

      return (
        <div key={c.id} class={`relative ${depth === 0 ? 'border-b border-gray-100 dark:border-gray-800 last:border-0' : ''} ${openMenuId.value === c.id ? 'z-50' : 'z-0'}`}>
          {replies.length > 0 && (
            <div class="absolute w-px bg-gray-200 dark:bg-gray-700 z-0" style={{ left: `${depth * 32 + 68}px`, top: '36px', bottom: '24px' }}></div>
          )}
          <div class={`flex items-start gap-4 p-4 hover:bg-gray-50/50 dark:hover:bg-[#1f1f22] group relative ${openMenuId.value === c.id ? 'z-50' : 'z-0'}`}>
            <div class="pt-1 shrink-0 z-10 bg-white dark:bg-[#18181b]">
              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(c.id)} class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 dark:bg-[#1f1f22] text-blue-600 focus:ring-blue-500 cursor-pointer" />
            </div>
            
            <div class="flex flex-1 items-start gap-4 relative" style={{ marginLeft: `${depth * 32}px` }}>
              {depth > 0 && <div class="absolute h-px bg-gray-200 dark:bg-gray-700" style={{ left: '-12px', top: '20px', width: '12px' }}></div>}
              
              <div class={`w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white relative z-10 ${depth > 0 ? 'bg-cyan-100' : 'bg-blue-900'}`}>
                <img src={`https://api.dicebear.com/10.x/thumbs/svg?seed=${encodeURIComponent(c.authorEmail.trim().toLowerCase())}`} alt={c.authorName} class="w-full h-full object-cover" />
              </div>
              <div class={`flex-1 min-w-0 relative ${openMenuId.value === c.id ? 'z-50' : 'z-10'}`}>
                <div class="flex items-start justify-between mb-1 gap-2">
                  <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-sm text-gray-900 dark:text-gray-100">{c.authorName}</span>
                      {c.isAuthor && <span class="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">Author</span>}
                      {(c.threadTitle || c.threadKey) && (
                        <span class="bg-gray-100 dark:bg-[#27272a] text-gray-500 dark:text-gray-400 text-[10px] font-medium px-2 py-0.5 rounded max-w-[200px] truncate" title={c.threadTitle || c.threadKey}>
                          on: {c.threadTitle || c.threadKey}
                        </span>
                      )}
                    </div>
                    <span class="text-xs text-gray-400 dark:text-gray-500 font-medium">{timeStr}</span>
                  </div>
                  <div class="flex items-center gap-1 sm:gap-2 shrink-0">
                    <span class={`border text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-medium capitalize ${statusColors[c.status] || 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>{c.status}</span>
                    <div class="relative flex items-center">
                      {depth === 0 && c.status === 'approved' && (
                        <button 
                          onClick={() => handleTogglePin(c.id, !c.isPinned)} 
                          class={`p-1.5 rounded-md transition-colors cursor-pointer mr-1 ${c.isPinned ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#27272a]'}`}
                          title={c.isPinned ? "Unpin Comment" : "Pin Comment"}
                        >
                          {c.isPinned ? <PinOff class="w-4 h-4" /> : <Pin class="w-4 h-4" />}
                        </button>
                      )}
                      <button onClick={() => openMenuId.value = openMenuId.value === c.id ? null : c.id} class="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#27272a] transition-colors cursor-pointer"><MoreHorizontal class="w-4 h-4" /></button>
                      {openMenuId.value === c.id && (
                        <div class="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl py-1 z-20 text-sm">
                          {c.status !== 'approved' && c.status !== 'trash' && <button onClick={() => handleSingleAction(c.id, 'approved')} class="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#27272a] text-green-600 dark:text-green-400 font-medium cursor-pointer">Approve</button>}
                          {c.status !== 'spam' && c.status !== 'trash' && <button onClick={() => handleSingleAction(c.id, 'spam')} class="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#27272a] text-gray-700 dark:text-gray-300 font-medium cursor-pointer">Mark as Spam</button>}
                          {c.status === 'trash' && <button onClick={() => handleSingleAction(c.id, 'approved')} class="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#27272a] text-blue-600 dark:text-blue-400 font-medium cursor-pointer">Restore</button>}
                          {c.status !== 'trash' && <button onClick={() => handleSingleAction(c.id, 'trash')} class="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#27272a] text-gray-700 dark:text-gray-300 font-medium cursor-pointer">Move to Trash</button>}
                          {c.status === 'trash' && <button onClick={() => handleSingleAction(c.id, 'delete')} class="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-bold border-t border-gray-100 dark:border-gray-800 mt-1 pt-2 cursor-pointer">Delete Forever</button>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div class="diskus-prose text-sm text-gray-700 dark:text-gray-300 mt-1.5 leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: c.htmlContent || c.content }} />
              </div>
            </div>
          </div>
          
          {replies.length > 0 && (
            <div class="relative pb-2">
              {replies.map(reply => renderNode(reply, depth + 1))}
            </div>
          )}
        </div>
      );
    };

    return rootComments.map(c => renderNode(c));
  };



  return (
    <div class="max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col space-y-6">
      <PageHeader
        title="Comments"
        description="Manage all incoming comments"
        action={
          <div class="relative">
            <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input 
              type="text" 
              placeholder="Search comments..." 
              value={searchQuery.value} 
              onInput={(e) => searchQuery.value = (e.target as HTMLInputElement).value} 
              class="pl-10 pr-10 py-2.5 bg-white dark:bg-[#1f1f22] border border-gray-100 dark:border-gray-800 rounded-xl text-sm w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all text-gray-900 dark:text-gray-100 shadow-sm" 
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-800 px-1.5 py-0.5 rounded-md bg-gray-50 dark:bg-[#27272a] font-medium hidden sm:inline-block">⌘K</span>
          </div>
        }
      />

      {/* Main Content Area */}
      <Card noPadding class="flex flex-col flex-1 min-h-0 border-gray-100 dark:border-gray-800">
          {/* Mobile Tabs Dropdown */}
          <div class="md:hidden p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1f1f22]">
            <div class="relative">
              <select
                class="w-full appearance-none border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-10 bg-white dark:bg-[#18181b] font-semibold text-gray-700 dark:text-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all cursor-pointer"
                value={activeTab.value}
                onChange={(e) => activeTab.value = (e.target as HTMLSelectElement).value}
              >
                {tabs.map(tab => (
                  <option key={tab.id} value={tab.id}>
                    {tab.name} ({tab.count()})
                  </option>
                ))}
              </select>
              <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <ChevronDown class="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Desktop Tabs */}
          <div class="hidden md:flex border-b border-gray-100 dark:border-gray-800 px-2 overflow-x-auto pt-2">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => activeTab.value = tab.id}
                class={`px-4 py-3.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab.value === tab.id 
                    ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                {tab.name} 
                <span class={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  activeTab.value === tab.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-[#27272a] text-gray-500 dark:text-gray-400'
                }`}>{tab.count()}</span>
              </button>
            ))}
          </div>

          {/* Table Actions */}
          <div class="px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-4">
              <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.value.length === comments.value.length && comments.value.length > 0} class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 dark:bg-[#1f1f22] text-blue-600 focus:ring-blue-500 cursor-pointer" />
              <select class="border border-gray-200 dark:border-gray-700 rounded-lg text-sm px-3 py-2 bg-white dark:bg-[#18181b] outline-none font-medium text-gray-700 dark:text-gray-300 shadow-sm cursor-pointer" value={bulkAction.value} onChange={(e) => { bulkAction.value = (e.target as HTMLSelectElement).value; handleBulkAction(); }}>
                <option value="">Bulk Actions</option>
                <option value="approved">Approve</option>
                <option value="pending">Mark Pending</option>
                <option value="spam">Mark Spam</option>
                {activeTab.value !== 'trash' && <option value="trash">Move to Trash</option>}
                {activeTab.value === 'trash' && <option value="delete">Delete Permanently</option>}
              </select>
            </div>
            <div class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
              <span>{comments.value.length} items</span>
              <div class="flex items-center gap-1">
                <button class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-[#27272a] text-gray-600 dark:text-gray-400 cursor-pointer"><ChevronLeft class="w-4 h-4" /></button>
                <button class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-[#27272a] text-gray-600 dark:text-gray-400 cursor-pointer"><ChevronRight class="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* Comment Items */}
          <div class="flex-1 overflow-y-auto pb-4">
            {loading.value ? (
              <div class="text-center py-10 text-gray-400">Loading comments...</div>
            ) : comments.value.length === 0 ? (
              <div class="text-center py-10 text-gray-400">No comments found.</div>
            ) : (
              <div class="flex flex-col">
                {renderComments()}
              </div>
            )}
          </div>
      </Card>
    </div>
  );
}
