import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAnnouncements } from '@/hooks/useSupabaseData';
import { Plus, Megaphone, Loader2 } from 'lucide-react';
import { PageHero, StatusChip } from '@/components/cl';

const AnnouncementManagement: React.FC = () => {
  const { data: announcements, isLoading } = useAnnouncements();

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="-m-6 mb-6">
        <PageHero
          title="Announcements"
          subtitle="Communicate with users and drive action"
          size="sm"
        >
          <div className="mt-4">
            <button className="px-4 py-2 rounded-full bg-white text-primary text-sm font-semibold hover:bg-white/90 transition-colors inline-flex items-center gap-1.5 w-fit">
              <Plus className="w-4 h-4" /> New Announcement
            </button>
          </div>
        </PageHero>
      </div>

      <div className="max-w-4xl mx-auto space-y-3">
        {announcements?.map(ann => (
          <div key={ann.id} className="cl-card p-5">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                ann.type === 'celebration' ? 'bg-amp-adoption/10' : ann.type === 'action' ? 'bg-amp-participation/10' : 'bg-amp-info/10'
              }`}>
                <Megaphone className={`w-4 h-4 ${
                  ann.type === 'celebration' ? 'text-amp-adoption' : ann.type === 'action' ? 'text-amp-participation' : 'text-amp-info'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{ann.title}</p>
                  <StatusChip tone={ann.active ? 'success' : 'neutral'}>
                    {ann.active ? 'Active' : 'Expired'}
                  </StatusChip>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{ann.message}</p>
                <p className="text-xs text-muted-foreground mt-2">{ann.date}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default AnnouncementManagement;
