import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, FileText, Loader2 } from 'lucide-react';

interface NewContentModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const contentTypes = [
  { value: 'document', label: 'Document', accept: '.pdf,.doc,.docx,.txt,.md' },
  { value: 'video', label: 'Video', accept: 'video/*' },
  { value: 'image', label: 'Image', accept: 'image/*' },
  { value: 'audio', label: 'Audio', accept: 'audio/*' },
  { value: 'standard_form', label: 'Standard Form', accept: '' },
  { value: 'confidence_form', label: 'Confidence Form', accept: '' },
  { value: 'announcement', label: 'Announcement', accept: '' },
];

export const NewContentModal: React.FC<NewContentModalProps> = ({ open, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [type, setType] = useState('document');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentType = contentTypes.find(t => t.value === type);
  const isFormType = type === 'standard_form' || type === 'confidence_form';
  const hasFileUpload = !isFormType && type !== 'announcement';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 20 * 1024 * 1024) {
        toast.error('File must be under 20MB');
        return;
      }
      setFile(selected);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!file) return null;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('content-assets').upload(path, file);
    setUploading(false);
    if (error) {
      toast.error('File upload failed');
      return null;
    }
    const { data: urlData } = supabase.storage.from('content-assets').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);

    let fileUrl: string | null = null;
    if (file) {
      fileUrl = await uploadFile();
      if (!fileUrl && file) { setSaving(false); return; }
    }

    const { error } = await supabase.from('content_items').insert({
      title: title.trim(),
      description: description.trim() || null,
      content_body: contentBody.trim() || null,
      type,
      status,
      file_url: fileUrl,
    });
    setSaving(false);
    if (error) { toast.error('Failed to create content'); return; }
    toast.success('Content created');
    setTitle(''); setDescription(''); setContentBody(''); setType('document'); setStatus('draft'); setFile(null);
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Add Content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Getting Started with Copilot" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Type</label>
              <select value={type} onChange={e => { setType(e.target.value); setFile(null); }}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                {contentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          {/* File Upload Area */}
          {hasFileUpload && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Upload File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept={currentType?.accept || '*'}
                onChange={handleFileSelect}
                className="hidden"
              />
              {!file ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full mt-1 border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload a file</span>
                  <span className="text-xs text-muted-foreground/60">Max 20MB · {currentType?.accept || 'Any file'}</span>
                </button>
              ) : (
                <div className="mt-1 border border-border rounded-lg p-3 flex items-center gap-3 bg-secondary/30">
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => setFile(null)} className="p-1 hover:bg-secondary rounded">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Content Body */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">
              {isFormType ? 'Form Definition (JSON)' : 'Content Body'}
            </label>
            <textarea value={contentBody} onChange={e => setContentBody(e.target.value)} rows={4}
              placeholder={isFormType ? '{"fields": [...]}' : 'Enter content text, notes, or description...'}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving || uploading}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
              {(saving || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploading ? 'Uploading...' : saving ? 'Creating...' : 'Add Content'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
