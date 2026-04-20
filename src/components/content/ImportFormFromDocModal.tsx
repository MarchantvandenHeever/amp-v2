import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, X, Plus, Trash2, Sparkles } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface Field {
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  helpText?: string;
}

const FIELD_TYPES = [
  'short_text', 'long_text', 'number', 'select', 'multi_select',
  'checkbox', 'radio', 'rating', 'date', 'email',
];

export const ImportFormFromDocModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formType, setFormType] = useState<'standard_form' | 'confidence_form'>('standard_form');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Extracted preview
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const hasPreview = fields.length > 0;

  const reset = () => {
    setFile(null); setFields([]); setTitle(''); setDescription('');
    setExtracting(false); setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { toast.error('File must be under 20MB'); return; }
    setFile(f);
  };

  const extract = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('formType', formType);
      const { data, error } = await supabase.functions.invoke('extract-form-from-document', { body: fd });
      if (error) throw error;
      if (!data?.fields?.length) throw new Error('No fields detected');
      setTitle(data.title || file.name.replace(/\.[^.]+$/, ''));
      setDescription(data.description || '');
      setFields(data.fields);
      toast.success(`Extracted ${data.fields.length} fields`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to extract form');
    } finally {
      setExtracting(false);
    }
  };

  const updateField = (i: number, patch: Partial<Field>) => {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  };
  const removeField = (i: number) => setFields(prev => prev.filter((_, idx) => idx !== i));
  const addField = () => setFields(prev => [...prev, { label: 'New question', type: 'short_text', required: false }]);

  const save = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!fields.length) { toast.error('Add at least one field'); return; }
    setSaving(true);
    const body = JSON.stringify({ fields }, null, 2);
    const { error } = await supabase.from('content_items').insert({
      title: title.trim(),
      description: description.trim() || null,
      content_body: body,
      type: formType,
      status,
    });
    setSaving(false);
    if (error) { toast.error('Failed to save form'); return; }
    toast.success('Form created from document');
    onCreated();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Generate Form from Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {!hasPreview && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Form type</label>
                  <select value={formType} onChange={e => setFormType(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="standard_form">Standard form</option>
                    <option value="confidence_form">Confidence form</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Document</label>
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md" onChange={onFile} className="hidden" />
                {!file ? (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full mt-1 border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload PDF, DOCX, or TXT</span>
                    <span className="text-xs text-muted-foreground/60">Max 20MB · AI will extract form fields</span>
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

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={handleClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
                <button onClick={extract} disabled={!file || extracting}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                  {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {extracting ? 'Extracting…' : 'Extract Fields'}
                </button>
              </div>
            </>
          )}

          {hasPreview && (
            <>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
                Review and edit the extracted fields before saving. {fields.length} fields detected.
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Fields</label>
                  <button onClick={addField} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add field
                  </button>
                </div>
                {fields.map((f, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-card">
                    <div className="flex items-start gap-2">
                      <input value={f.label} onChange={e => updateField(i, { label: e.target.value })}
                        className="flex-1 px-2 py-1.5 rounded border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                        placeholder="Question label" />
                      <select value={f.type} onChange={e => updateField(i, { type: e.target.value })}
                        className="px-2 py-1.5 rounded border border-border bg-background text-xs focus:outline-none">
                        {FIELD_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                      </select>
                      <button onClick={() => removeField(i)} className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {(f.type === 'select' || f.type === 'multi_select' || f.type === 'radio') && (
                      <input value={(f.options || []).join(', ')}
                        onChange={e => updateField(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        placeholder="Comma-separated options"
                        className="w-full px-2 py-1.5 rounded border border-border bg-background text-xs focus:outline-none" />
                    )}
                    {f.type === 'rating' && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Min</span>
                        <input type="number" value={f.min ?? 1} onChange={e => updateField(i, { min: Number(e.target.value) })}
                          className="w-16 px-2 py-1 rounded border border-border bg-background" />
                        <span className="text-muted-foreground">Max</span>
                        <input type="number" value={f.max ?? 5} onChange={e => updateField(i, { max: Number(e.target.value) })}
                          className="w-16 px-2 py-1 rounded border border-border bg-background" />
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" checked={!!f.required} onChange={e => updateField(i, { required: e.target.checked })} />
                      Required
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center gap-2 pt-2">
                <button onClick={() => { setFields([]); setTitle(''); setDescription(''); }}
                  className="text-xs text-muted-foreground hover:text-foreground">
                  ← Start over
                </button>
                <div className="flex gap-2">
                  <button onClick={handleClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
                  <button onClick={save} disabled={saving}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Saving…' : 'Save Form'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
