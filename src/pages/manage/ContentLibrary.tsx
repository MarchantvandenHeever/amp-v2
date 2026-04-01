import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { FileText, Video, Image, Mic, MessageSquare, Star, Plus, Search } from 'lucide-react';

const contentItems = [
  { id: 'c1', title: 'Welcome to Copilot', type: 'video', status: 'published', journey: 'Copilot Basics', duration: '5 min' },
  { id: 'c2', title: 'Copilot in Your Daily Workflow', type: 'document', status: 'published', journey: 'Copilot Basics', duration: '8 min' },
  { id: 'c3', title: 'Advanced Prompting Techniques', type: 'video', status: 'published', journey: 'Copilot in Practice', duration: '12 min' },
  { id: 'c4', title: 'Copilot Quick Reference Guide', type: 'document', status: 'published', journey: 'Copilot Basics', duration: '3 min' },
  { id: 'c5', title: 'Initial Readiness Check', type: 'form', status: 'published', journey: 'Copilot Basics', duration: '3 min' },
  { id: 'c6', title: 'Mid-Journey Confidence Check', type: 'confidence_form', status: 'published', journey: 'Copilot in Practice', duration: '3 min' },
  { id: 'c7', title: 'Final Confidence Assessment', type: 'confidence_form', status: 'draft', journey: 'Copilot Ownership', duration: '5 min' },
  { id: 'c8', title: 'Copilot Best Practices Infographic', type: 'image', status: 'published', journey: 'General', duration: '2 min' },
];

const typeIcons: Record<string, React.ElementType> = {
  document: FileText,
  video: Video,
  image: Image,
  audio: Mic,
  form: MessageSquare,
  confidence_form: Star,
};

const ContentLibrary: React.FC = () => {
  const [search, setSearch] = React.useState('');
  const filtered = contentItems.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Content Library</h1>
            <p className="text-sm text-muted-foreground mt-1">{contentItems.length} content items</p>
          </div>
          <button className="px-4 py-2 rounded-lg amp-gradient-primary text-primary-foreground text-sm font-medium">
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
                      <span>· {item.duration}</span>
                      <span>· {item.journey}</span>
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
    </AppLayout>
  );
};

export default ContentLibrary;
