import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Upload, Loader2, FileText, Plus, Trash2, GripVertical, AlertCircle,
  Save, Send, Eye, Edit3, Copy, ArrowLeft, Link2, X,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FormDraft, FormQuestion, FormSection, QuestionType,
  QUESTION_TYPE_LABELS, aiResponseToDraft, emptyDraft, emptyQuestion,
  emptySection, newId, saveFormDraft,
} from '@/lib/formExtractor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Mode = 'edit' | 'preview';

const FormExtractor: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'super_admin' || user?.role === 'change_manager';

  const [draft, setDraft] = useState<FormDraft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>('edit');
  const [showAssign, setShowAssign] = useState(false);
  const [savedFormId, setSavedFormId] = useState<string | null>(null);

  if (!canManage) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto py-20 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h1 className="font-heading text-xl font-bold">Access restricted</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Only Admins and Change Managers can create forms.
          </p>
        </div>
      </AppLayout>
    );
  }

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File too large (max 25MB)');
      return;
    }
    setUploading(true);
    setExtracting(true);
    try {
      const buf = await file.arrayBuffer();
      // Convert to base64 (chunked to avoid call stack overflow)
      const bytes = new Uint8Array(buf);
      let binary = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
      }
      const fileBase64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('extract-form-from-document', {
        body: { fileBase64, fileName: file.name, mimeType: file.type },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const aiForm = (data as any).form;
      const newDraft = aiResponseToDraft(aiForm, file.name);
      setDraft(newDraft);
      toast.success('Form extracted — review and edit before saving.');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Extraction failed');
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const updateDraft = (patch: Partial<FormDraft>) => setDraft(d => d ? { ...d, ...patch } : d);

  const updateSection = (sid: string, patch: Partial<FormSection>) =>
    setDraft(d => d ? { ...d, sections: d.sections.map(s => s.id === sid ? { ...s, ...patch } : s) } : d);

  const addSection = () =>
    setDraft(d => d ? { ...d, sections: [...d.sections, emptySection()] } : d);

  const deleteSection = (sid: string) =>
    setDraft(d => d ? { ...d, sections: d.sections.length === 1 ? d.sections : d.sections.filter(s => s.id !== sid) } : d);

  const updateQuestion = (sid: string, qid: string, patch: Partial<FormQuestion>) =>
    setDraft(d => d ? {
      ...d,
      sections: d.sections.map(s => s.id !== sid ? s : {
        ...s, questions: s.questions.map(q => q.id === qid ? { ...q, ...patch } : q),
      }),
    } : d);

  const addQuestion = (sid: string) =>
    setDraft(d => d ? {
      ...d,
      sections: d.sections.map(s => s.id !== sid ? s : { ...s, questions: [...s.questions, emptyQuestion()] }),
    } : d);

  const deleteQuestion = (sid: string, qid: string) =>
    setDraft(d => d ? {
      ...d,
      sections: d.sections.map(s => s.id !== sid ? s : { ...s, questions: s.questions.filter(q => q.id !== qid) }),
    } : d);

  const duplicateQuestion = (sid: string, qid: string) =>
    setDraft(d => d ? {
      ...d,
      sections: d.sections.map(s => {
        if (s.id !== sid) return s;
        const idx = s.questions.findIndex(q => q.id === qid);
        if (idx < 0) return s;
        const copy = { ...s.questions[idx], id: newId(), label: s.questions[idx].label + ' (copy)' };
        const next = [...s.questions];
        next.splice(idx + 1, 0, copy);
        return { ...s, questions: next };
      }),
    } : d);

  const reorderQuestions = (sid: string, oldIdx: number, newIdx: number) =>
    setDraft(d => d ? {
      ...d,
      sections: d.sections.map(s => s.id !== sid ? s : { ...s, questions: arrayMove(s.questions, oldIdx, newIdx) }),
    } : d);

  const handleSave = async (publish: boolean) => {
    if (!draft) return;
    setSaving(true);
    try {
      const next: FormDraft = { ...draft, status: publish ? 'published' : 'draft' };
      const id = await saveFormDraft(next, user?.id);
      setSavedFormId(id);
      setDraft({ ...next, id });
      toast.success(publish ? 'Form published.' : 'Draft saved.');
      setShowAssign(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Upload screen ----------
  if (!draft) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto py-10">
          <button onClick={() => navigate('/manage/content')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Content Library
          </button>
          <h1 className="font-heading text-3xl font-bold">Document → Form Extractor</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Upload a DOCX or PDF. AMP will extract the title, instructions, questions, scales,
            and completion message into a clean editable form.
          </p>

          <label className={`mt-8 block border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${uploading ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-secondary/50'}`}>
            <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} disabled={uploading} />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="font-medium">{extracting ? 'Extracting form structure with AI…' : 'Uploading…'}</p>
                <p className="text-xs text-muted-foreground">This usually takes 5–15 seconds.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <p className="font-medium">Drop a file or click to upload</p>
                <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD · max 25MB</p>
              </div>
            )}
          </label>

          <button onClick={() => setDraft(emptyDraft())}
            className="mt-4 text-sm text-muted-foreground hover:text-primary">
            …or start with a blank form
          </button>
        </div>
      </AppLayout>
    );
  }

  // ---------- Editor ----------
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mx-3 px-3 rounded-lg">
          <button onClick={() => { if (confirm('Discard this form and start over?')) setDraft(null); }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> New extraction
          </button>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-card">
              <button onClick={() => setMode('edit')}
                className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 ${mode === 'edit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => setMode('preview')}
                className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 ${mode === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
            </div>
            <button onClick={() => handleSave(false)} disabled={saving}
              className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save draft
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50">
              <Send className="w-3.5 h-3.5" /> Publish
            </button>
          </div>
        </div>

        {/* Header card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl shadow-sm border-t-4 border-t-primary p-6 mb-4">
          {mode === 'edit' ? (
            <>
              <input value={draft.title} onChange={e => updateDraft({ title: e.target.value })}
                className="w-full font-heading text-2xl font-bold bg-transparent border-0 border-b border-transparent focus:border-primary focus:outline-none pb-1"
                placeholder="Form title" />
              <textarea value={draft.purpose || ''} onChange={e => updateDraft({ purpose: e.target.value })}
                placeholder="Purpose / description"
                rows={2}
                className="w-full mt-3 text-sm text-muted-foreground bg-transparent border-0 border-b border-transparent focus:border-primary focus:outline-none resize-none" />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                <MetaField label="Activity type" value={draft.activityType} onChange={v => updateDraft({ activityType: v })} />
                <MetaField label="Phase" value={draft.phase} onChange={v => updateDraft({ phase: v })} />
                <MetaField label="Focus" value={draft.focus} onChange={v => updateDraft({ focus: v })} />
              </div>

              <div className="mt-4">
                <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">User instruction</label>
                <textarea value={draft.userInstruction || ''} onChange={e => updateDraft({ userInstruction: e.target.value })}
                  rows={2}
                  className="w-full mt-1 text-sm rounded-lg border border-border bg-background p-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Instructions shown to the user…" />
              </div>
            </>
          ) : (
            <>
              <h1 className="font-heading text-3xl font-bold">{draft.title}</h1>
              {draft.purpose && <p className="text-sm text-muted-foreground mt-2">{draft.purpose}</p>}
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                {draft.activityType && <Pill>{draft.activityType}</Pill>}
                {draft.phase && <Pill>{draft.phase}</Pill>}
                {draft.focus && <Pill>{draft.focus}</Pill>}
              </div>
              {draft.userInstruction && (
                <div className="mt-4 p-3 rounded-lg bg-secondary/60 text-sm text-foreground">
                  {draft.userInstruction}
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Sections */}
        {draft.sections.map((section, sIdx) => (
          <SectionBlock
            key={section.id}
            section={section}
            sectionIndex={sIdx}
            totalSections={draft.sections.length}
            mode={mode}
            onUpdate={(patch) => updateSection(section.id, patch)}
            onDelete={() => deleteSection(section.id)}
            onAddQuestion={() => addQuestion(section.id)}
            onUpdateQuestion={(qid, patch) => updateQuestion(section.id, qid, patch)}
            onDeleteQuestion={(qid) => deleteQuestion(section.id, qid)}
            onDuplicateQuestion={(qid) => duplicateQuestion(section.id, qid)}
            onReorder={(oldIdx, newIdx) => reorderQuestions(section.id, oldIdx, newIdx)}
          />
        ))}

        {mode === 'edit' && (
          <button onClick={addSection}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add section
          </button>
        )}

        {/* Completion message */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 mt-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">Completion message</p>
          {mode === 'edit' ? (
            <textarea value={draft.completionMessage || ''} onChange={e => updateDraft({ completionMessage: e.target.value })}
              rows={3}
              className="w-full text-sm rounded-lg border border-border bg-background p-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Shown to the user after they submit…" />
          ) : (
            <p className="text-sm text-foreground">{draft.completionMessage || <span className="text-muted-foreground italic">(none)</span>}</p>
          )}
        </div>
      </div>

      <AssignDialog
        open={showAssign && !!savedFormId}
        formId={savedFormId}
        onClose={() => setShowAssign(false)}
      />
    </AppLayout>
  );
};

// -------- Subcomponents --------

const MetaField: React.FC<{ label: string; value?: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</label>
    <input value={value || ''} onChange={e => onChange(e.target.value)}
      className="w-full mt-1 text-sm rounded-lg border border-border bg-background p-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
  </div>
);

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{children}</span>
);

const SectionBlock: React.FC<{
  section: FormSection;
  sectionIndex: number;
  totalSections: number;
  mode: Mode;
  onUpdate: (patch: Partial<FormSection>) => void;
  onDelete: () => void;
  onAddQuestion: () => void;
  onUpdateQuestion: (qid: string, patch: Partial<FormQuestion>) => void;
  onDeleteQuestion: (qid: string) => void;
  onDuplicateQuestion: (qid: string) => void;
  onReorder: (oldIdx: number, newIdx: number) => void;
}> = ({ section, sectionIndex, totalSections, mode, onUpdate, onDelete, onAddQuestion, onUpdateQuestion, onDeleteQuestion, onDuplicateQuestion, onReorder }) => {

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = section.questions.findIndex(q => q.id === active.id);
    const newIdx = section.questions.findIndex(q => q.id === over.id);
    if (oldIdx >= 0 && newIdx >= 0) onReorder(oldIdx, newIdx);
  };

  const showSectionHeader = mode === 'edit' || section.title || section.description || totalSections > 1;

  return (
    <div className="mb-4">
      {showSectionHeader && (
        <div className="bg-card border border-border rounded-2xl shadow-sm p-5 mb-3">
          {mode === 'edit' ? (
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <input value={section.title} onChange={e => onUpdate({ title: e.target.value })}
                  placeholder={`Section ${sectionIndex + 1} title (optional)`}
                  className="w-full font-heading text-lg font-semibold bg-transparent border-0 border-b border-transparent focus:border-primary focus:outline-none pb-1" />
                <textarea value={section.description || ''} onChange={e => onUpdate({ description: e.target.value })}
                  rows={1} placeholder="Section description"
                  className="w-full mt-2 text-sm text-muted-foreground bg-transparent border-0 focus:outline-none resize-none" />
              </div>
              {totalSections > 1 && (
                <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1" title="Delete section">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <>
              {section.title && <h2 className="font-heading text-lg font-semibold">{section.title}</h2>}
              {section.description && <p className="text-sm text-muted-foreground mt-1">{section.description}</p>}
            </>
          )}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={section.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
          {section.questions.map((q, idx) => (
            <SortableQuestion
              key={q.id}
              question={q}
              index={idx}
              mode={mode}
              onUpdate={(patch) => onUpdateQuestion(q.id, patch)}
              onDelete={() => onDeleteQuestion(q.id)}
              onDuplicate={() => onDuplicateQuestion(q.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {mode === 'edit' && (
        <button onClick={onAddQuestion}
          className="w-full mt-2 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Add question
        </button>
      )}
    </div>
  );
};

const SortableQuestion: React.FC<{
  question: FormQuestion;
  index: number;
  mode: Mode;
  onUpdate: (patch: Partial<FormQuestion>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}> = ({ question, index, mode, onUpdate, onDelete, onDuplicate }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style}
      className="bg-card border border-border rounded-2xl shadow-sm p-5 mb-3 group">
      {mode === 'edit' && (
        <div className="flex items-center justify-between mb-3">
          <button {...attributes} {...listeners}
            className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
            title="Drag to reorder">
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            {question.needsReview && (
              <span className="px-2 py-0.5 rounded-full bg-amp-warning/10 text-amp-warning text-xs font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Needs review
              </span>
            )}
            {typeof question.extractionConfidence === 'number' && (
              <span className="text-xs text-muted-foreground">
                {Math.round(question.extractionConfidence * 100)}% conf
              </span>
            )}
            <select value={question.type} onChange={e => onUpdate({ type: e.target.value as QuestionType })}
              className="text-xs rounded-md border border-border bg-background px-2 py-1">
              {Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button onClick={onDuplicate} className="text-muted-foreground hover:text-foreground p-1" title="Duplicate">
              <Copy className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <QuestionBody question={question} index={index} mode={mode} onUpdate={onUpdate} />

      {mode === 'edit' && question.type !== 'section_header' && (
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-end gap-3 text-xs">
          <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={question.required}
              onChange={e => onUpdate({ required: e.target.checked })} />
            Required
          </label>
        </div>
      )}
    </div>
  );
};

const QuestionBody: React.FC<{
  question: FormQuestion;
  index: number;
  mode: Mode;
  onUpdate: (patch: Partial<FormQuestion>) => void;
}> = ({ question, index, mode, onUpdate }) => {
  if (mode === 'edit') {
    return (
      <>
        <input value={question.label} onChange={e => onUpdate({ label: e.target.value })}
          className="w-full font-medium text-base bg-transparent border-0 border-b border-border focus:border-primary focus:outline-none pb-1"
          placeholder="Question text" />
        <input value={question.helpText || ''} onChange={e => onUpdate({ helpText: e.target.value })}
          className="w-full mt-2 text-xs text-muted-foreground bg-transparent border-0 focus:outline-none"
          placeholder="Help text (optional)" />
        <div className="mt-4">
          <QuestionEditor question={question} onUpdate={onUpdate} />
        </div>
      </>
    );
  }

  // Preview mode
  return (
    <>
      <p className="font-medium text-base">
        <span className="text-muted-foreground mr-2">Q{index + 1}.</span>
        {question.label}
        {question.required && <span className="text-destructive ml-1">*</span>}
      </p>
      {question.helpText && <p className="text-xs text-muted-foreground mt-1">{question.helpText}</p>}
      <div className="mt-3"><QuestionPreview question={question} /></div>
    </>
  );
};

const QuestionEditor: React.FC<{ question: FormQuestion; onUpdate: (patch: Partial<FormQuestion>) => void }> = ({ question, onUpdate }) => {
  const t = question.type;
  if (t === 'short_text') return <input disabled placeholder="Short answer text" className="w-full text-sm border-b border-dashed border-border bg-transparent py-1" />;
  if (t === 'paragraph') return <textarea disabled placeholder="Long answer text" rows={2} className="w-full text-sm border-b border-dashed border-border bg-transparent py-1 resize-none" />;
  if (t === 'date') return <input type="date" disabled className="text-sm rounded border border-border bg-background px-2 py-1" />;
  if (t === 'time') return <input type="time" disabled className="text-sm rounded border border-border bg-background px-2 py-1" />;
  if (t === 'yes_no') return (
    <div className="flex gap-3 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5"><input type="radio" disabled /> Yes</span>
      <span className="flex items-center gap-1.5"><input type="radio" disabled /> No</span>
    </div>
  );
  if (t === 'section_header') return <p className="text-xs text-muted-foreground italic">(visual section header — no input)</p>;

  if (t === 'multiple_choice' || t === 'checkbox' || t === 'dropdown') {
    const options = question.options || [];
    return (
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {t === 'checkbox' ? '☐' : t === 'dropdown' ? `${i + 1}.` : '○'}
            </span>
            <input value={opt} onChange={e => {
              const next = [...options]; next[i] = e.target.value; onUpdate({ options: next });
            }} className="flex-1 text-sm bg-transparent border-b border-border focus:border-primary focus:outline-none py-1" />
            <button onClick={() => onUpdate({ options: options.filter((_, j) => j !== i) })}
              className="text-muted-foreground hover:text-destructive">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button onClick={() => onUpdate({ options: [...options, `Option ${options.length + 1}`] })}
          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
          <Plus className="w-3 h-3" /> Add option
        </button>
      </div>
    );
  }

  if (t === 'likert') {
    const scale = question.scale || { min: 1, max: 5, labels: {} };
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1">
            From <input type="number" value={scale.min} min={0} max={10}
              onChange={e => onUpdate({ scale: { ...scale, min: parseInt(e.target.value) || 0 } })}
              className="w-14 rounded border border-border bg-background px-1.5 py-0.5" />
          </label>
          <label className="flex items-center gap-1">
            to <input type="number" value={scale.max} min={2} max={20}
              onChange={e => onUpdate({ scale: { ...scale, max: parseInt(e.target.value) || 5 } })}
              className="w-14 rounded border border-border bg-background px-1.5 py-0.5" />
          </label>
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: scale.max - scale.min + 1 }, (_, i) => {
            const k = String(scale.min + i);
            return (
              <div key={k} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-center text-muted-foreground">{k}</span>
                <input value={scale.labels?.[k] || ''}
                  placeholder={`Label for ${k} (optional)`}
                  onChange={e => onUpdate({ scale: { ...scale, labels: { ...(scale.labels || {}), [k]: e.target.value } } })}
                  className="flex-1 text-sm bg-transparent border-b border-border focus:border-primary focus:outline-none py-1" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const QuestionPreview: React.FC<{ question: FormQuestion }> = ({ question }) => {
  const t = question.type;
  if (t === 'short_text') return <input className="w-full text-sm rounded border border-border bg-background px-2 py-1.5" placeholder="Your answer" />;
  if (t === 'paragraph') return <textarea rows={3} className="w-full text-sm rounded border border-border bg-background px-2 py-1.5" placeholder="Your answer" />;
  if (t === 'date') return <input type="date" className="text-sm rounded border border-border bg-background px-2 py-1" />;
  if (t === 'time') return <input type="time" className="text-sm rounded border border-border bg-background px-2 py-1" />;
  if (t === 'yes_no') return (
    <div className="flex gap-4 text-sm">
      <label className="flex items-center gap-1.5"><input type="radio" name={question.id} /> Yes</label>
      <label className="flex items-center gap-1.5"><input type="radio" name={question.id} /> No</label>
    </div>
  );
  if (t === 'section_header') return null;
  if (t === 'multiple_choice' || t === 'checkbox') {
    return (
      <div className="space-y-1.5">
        {(question.options || []).map((o, i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <input type={t === 'checkbox' ? 'checkbox' : 'radio'} name={question.id} /> {o}
          </label>
        ))}
      </div>
    );
  }
  if (t === 'dropdown') {
    return (
      <select className="text-sm rounded border border-border bg-background px-2 py-1.5">
        <option value="">Select…</option>
        {(question.options || []).map((o, i) => <option key={i}>{o}</option>)}
      </select>
    );
  }
  if (t === 'likert') {
    const scale = question.scale || { min: 1, max: 5, labels: {} };
    const values = Array.from({ length: scale.max - scale.min + 1 }, (_, i) => scale.min + i);
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          {values.map(v => (
            <label key={v} className="flex flex-col items-center gap-1 flex-1 text-xs">
              <span className="text-muted-foreground">{v}</span>
              <input type="radio" name={question.id} />
            </label>
          ))}
        </div>
        {scale.labels && (
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{scale.labels[String(scale.min)] || ''}</span>
            <span>{scale.labels[String(scale.max)] || ''}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Inline post-save assign-to-journey-item picker
const AssignDialog: React.FC<{ open: boolean; formId: string | null; onClose: () => void }> = ({ open, formId, onClose }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.from('journey_items')
      .select('id, title, type, journey_id, journeys(name, initiatives(name))')
      .order('updated_at', { ascending: false }).limit(50)
      .then(({ data }) => { setItems(data || []); setLoading(false); });
  }, [open]);

  const assign = async (jiId: string) => {
    if (!formId) return;
    setAssigning(jiId);
    try {
      const { error } = await supabase.from('forms').update({ journey_item_id: jiId }).eq('id', formId);
      if (error) throw error;
      toast.success('Form attached to journey item.');
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to attach');
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Attach to a journey item (optional)
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Pick a journey item to surface this form to assigned users. You can skip this and assign it later.
        </p>
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (
          <div className="space-y-1.5 mt-2">
            {items.length === 0 && <p className="text-sm text-muted-foreground italic py-4 text-center">No journey items yet.</p>}
            {items.map(it => (
              <button key={it.id} onClick={() => assign(it.id)} disabled={assigning === it.id}
                className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary/50 transition-colors flex items-center justify-between disabled:opacity-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{it.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {it.journeys?.initiatives?.name || ''} · {it.journeys?.name || ''} · {it.type}
                  </p>
                </div>
                {assigning === it.id && <Loader2 className="w-4 h-4 animate-spin" />}
              </button>
            ))}
          </div>
        )}
        <button onClick={onClose} className="mt-3 w-full py-2 text-sm text-muted-foreground hover:text-foreground">Skip for now</button>
      </DialogContent>
    </Dialog>
  );
};

export default FormExtractor;
