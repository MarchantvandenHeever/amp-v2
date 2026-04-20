// Shared types + helpers for the Document → Form Extractor / Form Builder
import { supabase } from '@/integrations/supabase/client';

export type QuestionType =
  | 'short_text' | 'paragraph' | 'multiple_choice' | 'checkbox'
  | 'dropdown' | 'likert' | 'yes_no' | 'date' | 'time' | 'section_header';

export interface ScaleConfig {
  min: number;
  max: number;
  labels?: Record<string, string>;
}

export interface FormQuestion {
  id: string; // local UUID for editor; replaced on save
  label: string;
  type: QuestionType;
  required: boolean;
  helpText?: string;
  options?: string[];
  scale?: ScaleConfig;
  needsReview?: boolean;
  extractionConfidence?: number;
  scored?: boolean;
  mandatory?: boolean;
  scoreDimension?: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
}

export interface FormDraft {
  id?: string;
  title: string;
  activityType?: string;
  phase?: string;
  focus?: string;
  purpose?: string;
  userInstruction?: string;
  completionMessage?: string;
  sections: FormSection[];
  status: 'draft' | 'published';
  sourceDocumentName?: string;
  extractionConfidence?: number;
  contentItemId?: string | null;
  journeyItemId?: string | null;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: 'Short answer',
  paragraph: 'Paragraph',
  multiple_choice: 'Multiple choice',
  checkbox: 'Checkboxes',
  dropdown: 'Dropdown',
  likert: 'Linear scale (Likert)',
  yes_no: 'Yes / No',
  date: 'Date',
  time: 'Time',
  section_header: 'Section header',
};

export function newId() {
  return (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function emptyQuestion(type: QuestionType = 'short_text'): FormQuestion {
  const base: FormQuestion = { id: newId(), label: 'Untitled question', type, required: false };
  if (type === 'multiple_choice' || type === 'checkbox' || type === 'dropdown') {
    base.options = ['Option 1'];
  }
  if (type === 'likert') {
    base.scale = { min: 1, max: 5, labels: { '1': 'Strongly disagree', '5': 'Strongly agree' } };
  }
  return base;
}

export function emptySection(): FormSection {
  return { id: newId(), title: '', description: '', questions: [] };
}

export function emptyDraft(): FormDraft {
  return {
    title: 'Untitled form',
    sections: [emptySection()],
    status: 'draft',
  };
}

// Convert AI response into our local FormDraft (assigning ids)
export function aiResponseToDraft(payload: any, sourceDocumentName?: string): FormDraft {
  const sections: FormSection[] = (payload.sections || []).map((s: any) => ({
    id: newId(),
    title: s.title || '',
    description: s.description || '',
    questions: (s.questions || []).map((q: any) => ({
      id: newId(),
      label: q.label || 'Untitled question',
      type: (q.type as QuestionType) || 'short_text',
      required: !!q.required,
      helpText: q.helpText || '',
      options: Array.isArray(q.options) ? q.options : undefined,
      scale: q.scale && typeof q.scale.min === 'number' && typeof q.scale.max === 'number'
        ? { min: q.scale.min, max: q.scale.max, labels: q.scale.labels || {} }
        : undefined,
      needsReview: !!q.needsReview,
      extractionConfidence: typeof q.extractionConfidence === 'number' ? q.extractionConfidence : undefined,
    })),
  }));
  return {
    title: payload.title || 'Untitled form',
    activityType: payload.activityType || '',
    phase: payload.phase || '',
    focus: payload.focus || '',
    purpose: payload.purpose || '',
    userInstruction: payload.userInstruction || '',
    completionMessage: payload.completionMessage || '',
    extractionConfidence: typeof payload.extractionConfidence === 'number' ? payload.extractionConfidence : undefined,
    sections: sections.length ? sections : [emptySection()],
    status: 'draft',
    sourceDocumentName,
  };
}

export async function saveFormDraft(draft: FormDraft, createdById?: string): Promise<string> {
  // Upsert form row
  const formRow = {
    title: draft.title,
    activity_type: draft.activityType || null,
    phase: draft.phase || null,
    focus: draft.focus || null,
    purpose: draft.purpose || null,
    user_instruction: draft.userInstruction || null,
    completion_message: draft.completionMessage || null,
    status: draft.status,
    source_document_name: draft.sourceDocumentName || null,
    extraction_confidence: draft.extractionConfidence ?? 0,
    content_item_id: draft.contentItemId || null,
    journey_item_id: draft.journeyItemId || null,
    created_by: createdById || null,
  };

  let formId = draft.id;
  if (formId) {
    const { error } = await supabase.from('forms').update(formRow).eq('id', formId);
    if (error) throw error;
    // Wipe existing sections (cascade clears questions)
    await supabase.from('form_sections').delete().eq('form_id', formId);
  } else {
    const { data, error } = await supabase.from('forms').insert(formRow).select('id').single();
    if (error || !data) throw error || new Error('Failed to create form');
    formId = data.id;
  }

  // Insert sections
  for (let s = 0; s < draft.sections.length; s++) {
    const sec = draft.sections[s];
    const { data: secRow, error: secErr } = await supabase.from('form_sections').insert({
      form_id: formId,
      title: sec.title || null,
      description: sec.description || null,
      order_index: s,
    }).select('id').single();
    if (secErr || !secRow) throw secErr || new Error('Failed to create section');

    if (sec.questions.length === 0) continue;
    const questionRows = sec.questions.map((q, idx) => ({
      section_id: secRow.id,
      label: q.label,
      type: q.type,
      required: q.required,
      scale: q.scale ? (q.scale as any) : null,
      options: q.options ? (q.options as any) : null,
      help_text: q.helpText || null,
      needs_review: !!q.needsReview,
      extraction_confidence: q.extractionConfidence ?? 0,
      scored: !!q.scored,
      mandatory: !!q.mandatory,
      score_dimension: q.scoreDimension || null,
      order_index: idx,
    }));
    const { error: qErr } = await supabase.from('form_questions').insert(questionRows);
    if (qErr) throw qErr;
  }

  return formId!;
}
