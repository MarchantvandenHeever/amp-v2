import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useContentItems } from '@/hooks/useSupabaseData';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Video, Image, Mic, MessageSquare, Star, Plus, Search, Loader2, ExternalLink, Eye, X, Download } from 'lucide-react';
import { NewContentModal } from '@/components/content/NewContentModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const typeIcons: Record<string, React.ElementType> = {
  document: FileText,
  video: Video,
  image: Image,
  audio: Mic,
  standard_form: MessageSquare,
  confidence_form: Star,
  announcement: FileText,
};

interface ContentItem {
  id: string;
  title: string;
  type: string;
  status: string;
  description: string | null;
  content_body: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

const ContentLibrary: React.FC = () => {
  const { data: contentItems, isLoading, refetch } = useContentItems();
  const [search, setSearch] = React.useState('');
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<ContentItem | null>(null);

  const filtered = (contentItems || []).filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const renderPreview = (item: ContentItem) => {
    if (item.file_url) {
      if (item.type === 'image') {
        return <img src={item.file_url} alt={item.title} className="w-full rounded-lg max-h-64 object-contain bg-secondary" />;
      }
      if (item.type === 'video') {
        return <video src={item.file_url} controls className="w-full rounded-lg max-h-64" />;
      }
      if (item.type === 'audio') {
        return <audio src={item.file_url} controls className="w-full mt-2" />;
      }
      return (
        <a href={item.file_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
          <Download className="w-4 h-4" /> Download File <ExternalLink className="w-3 h-3" />
        </a>
      );
    }
    return null;
  };

  const renderContentBody = (item: ContentItem) => {
    if (!item.content_body) return null;
    const isForm = item.type === 'standard_form' || item.type === 'confidence_form';
    if (isForm) {
      try {
        const form = JSON.parse(item.content_body);
        return (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Form Fields</p>
            {form.fields?.map((f: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{f.type}{f.options ? `: ${f.options.join(', ')}` : ''}{f.min != null ? ` (${f.min}–${f.max})` : ''}</p>
              </div>
            ))}
          </div>
        );
      } catch {
        return <pre className="text-xs bg-secondary/50 p-3 rounded-lg overflow-auto whitespace-pre-wrap">{item.content_body}</pre>;
      }
    }
    return <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.content_body}</p>;
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Content Library</h1>
            <p className="text-sm text-muted-foreground mt-1">{(contentItems || []).length} content items</p>
          </div>
          <button onClick={() => setShowNew(true)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4 inline mr-1" /> Add Content
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search content..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item, i) => {
            const Icon = typeIcons[item.type] || FileText;
            const hasAsset = !!item.file_url || !!item.content_body;
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setSelected(item as ContentItem)}
                className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="capitalize">{item.type.replace('_', ' ')}</span>
                      {hasAsset && <span className="text-primary">● Has content</span>}
                      {item.description && <span>· {item.description.slice(0, 40)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.status === 'published' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                    }`}>{item.status}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <NewContentModal open={showNew} onClose={() => setShowNew(false)} onCreated={() => refetch()} />

      {/* Content Preview Dialog */}
      <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {(() => { const Icon = typeIcons[selected.type] || FileText; return (
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  ); })()}
                  <div>
                    <DialogTitle className="font-heading">{selected.title}</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{selected.type.replace('_', ' ')} · {selected.status}</p>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {selected.description && (
                  <p className="text-sm text-foreground">{selected.description}</p>
                )}
                {renderPreview(selected)}
                {renderContentBody(selected)}
                {!selected.file_url && !selected.content_body && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No content asset attached yet</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ContentLibrary;
