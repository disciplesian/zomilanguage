import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, History as HistoryIcon, Search, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { SiteLayout, GlassCard } from '@/components/SiteLayout';
import { history, useHistory } from '@/lib/history';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Filter = 'all' | 'favorites' | 'toEnglish' | 'toZomi';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'toEnglish', label: 'Zomi → English' },
  { id: 'toZomi', label: 'English → Zomi' },
];

const HistoryPage = () => {
  const items = useHistory();
  const [query, setQuery] = useState<string>('');
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter === 'favorites' && !i.isFavorite) return false;
      if (filter === 'toEnglish' && i.targetLanguage !== 'english') return false;
      if (filter === 'toZomi' && i.targetLanguage !== 'zomi') return false;
      return !q || i.sourceText.toLowerCase().includes(q) || i.translatedText.toLowerCase().includes(q);
    });
  }, [items, query, filter]);

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-3xl px-4 pt-5 sm:px-6 md:pt-10">
        <div className="mb-4 flex items-center">
          <h1 className="flex-1 text-[28px] font-bold tracking-tight sm:text-3xl">History</h1>
          {items.length > 0 && (
            <button type="button" onClick={() => setConfirmClear(true)} className="min-h-11 rounded-full px-4 text-sm font-semibold text-[#ff8a8a] hover:bg-white/5">
              Clear all
            </button>
          )}
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.08] px-4">
          <Search className="h-5 w-5 text-white/60" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search history"
            aria-label="Search history"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="min-h-12 flex-1 bg-transparent text-base text-white placeholder:text-white/50 focus:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                'min-h-9 shrink-0 rounded-full border px-4 text-sm font-semibold',
                filter === f.id ? 'border-[#00f0ff]/50 bg-[#00f0ff]/15 text-[#00f0ff]' : 'border-white/20 bg-white/[0.06] text-white/80'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <HistoryIcon className="h-12 w-12 text-white/45" aria-hidden="true" />
            <p className="mt-3 text-xl font-bold">{items.length === 0 ? 'No translations yet' : 'Nothing found'}</p>
            <p className="mt-1 text-white/75">
              {items.length === 0 ? 'Your translations are saved here automatically.' : 'Try a different word or filter.'}
            </p>
            {items.length === 0 && (
              <Link to="/" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#00f0ff] px-5 text-sm font-semibold text-[#0b1020]">
                Start translating
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((item) => (
              <li key={item.id}>
                <GlassCard tint="purple" className="p-4">
                  <div className="flex items-center text-xs text-white/70">
                    <span className="flex-1 font-semibold">
                      {item.sourceLanguage === 'zomi' ? 'Zomi' : 'English'} → {item.targetLanguage === 'zomi' ? 'Zomi' : 'English'}
                    </span>
                    <time>{new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
                  </div>
                  <p className="mt-2 line-clamp-3 text-white/80">{item.sourceText}</p>
                  <p className="mt-1 line-clamp-4 font-semibold">{item.translatedText}</p>
                  <div className="mt-2 flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => history.toggleFavorite(item.id)}
                      aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
                    >
                      <Star className={cn('h-5 w-5', item.isFavorite ? 'fill-[#fff200] text-[#fff200]' : 'text-white/70')} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(item.translatedText).then(() => toast.success('Copied'));
                      }}
                      aria-label="Copy translation"
                      className="flex h-11 w-11 items-center justify-center rounded-full text-[#00f0ff] hover:bg-white/10"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => history.remove(item.id)}
                      aria-label="Delete"
                      className="flex h-11 w-11 items-center justify-center rounded-full text-[#ff8a8a] hover:bg-white/10"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </GlassCard>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent className="border-white/15 bg-[#252a41] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all history?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/75">
              This removes every saved translation in this browser. It can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-transparent text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => history.clear()} className="bg-[#ff5e5e] text-white hover:bg-[#ff5e5e]/90">
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SiteLayout>
  );
};

export default HistoryPage;
