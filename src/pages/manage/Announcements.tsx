import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { announcements } from '@/data/mockData';
import { Plus, Megaphone } from 'lucide-react';

const AnnouncementManagement: React.FC = () => (
  <AppLayout>
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Communicate with users and drive action</p>
        </div>
        <button className="px-4 py-2 rounded-lg amp-gradient-primary text-primary-foreground text-sm font-medium">
          <Plus className="w-4 h-4 inline mr-1" /> New Announcement
        </button>
      </div>
      <div className="space-y-3">
        {announcements.map(ann => (
          <div key={ann.id} className="bg-card border border-border rounded-xl p-5 amp-shadow-card">
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
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ann.active ? 'bg-amp-success/10 text-amp-success' : 'bg-secondary text-muted-foreground'}`}>
                    {ann.active ? 'Active' : 'Expired'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{ann.message}</p>
                <p className="text-xs text-muted-foreground mt-2">{ann.date}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </AppLayout>
);

export default AnnouncementManagement;
