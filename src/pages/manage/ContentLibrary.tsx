import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useContentItems } from '@/hooks/useSupabaseData';
import { motion } from 'framer-motion';
import { FileText, Video, Image, Mic, MessageSquare, Star, Plus, Search, Loader2 } from 'lucide-react';
import { NewContentModal } from '@/components/content/NewContentModal';

const typeIcons: Record<string, React.ElementType> = {
  document: FileText,
  video: Video,
  image: Image,
  audio: Mic,
  standard_form: MessageSquare,
  confidence_form: Star,
  announcement: FileText,
};

const ContentLibrary: React.FC = () => {
  const { data: contentItems, isLoading, refetch } = useContentItems();
  const [search, setSearch] = React.useState('');
  const [showNew, setShowNew] = useState(false);

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

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Content Library</h1>
            <p className="text-sm text-muted-foreground mt-1">{(contentItems || []).length} content items</p>
          </div>
          <button onClick={() => setShowNew(true)} className="px-4 py-2 rounded-lg amp-gradient-primary text-primary-foreground text-sm font-medium">
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
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-4 amp-shadow-card hover:amp-shadow-card-hover transition-shadow cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="capitalize">{item.type.replace('_', ' ')}</span>
                      {item.description && <span>· {item.description.slice(0, 50)}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    item.status === 'published' ? 'bg-amp-success/10 text-amp-success' : 'bg-secondary text-muted-foreground'
                  }`}>{item.status}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <NewContentModal open={showNew} onClose={() => setShowNew(false)} onCreated={() => refetch()} />
    </AppLayout>
  );
};

export default ContentLibrary;
