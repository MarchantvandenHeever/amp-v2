

# AMP Journey Builder Agent — Implementation Plan

## Summary
Embed an AI-powered journey orchestration and insight layer into the existing AMP platform across 4 connected capabilities: Journey Builder Agent, End-User Support Agent, Insight Mining Layer, and Recommendation/Intervention Agent.

---

## Phase 1: Database Schema & Edge Functions

### New Tables (via migrations)

1. **`agent_conversations`** — Tracks AI chat sessions for both CM and end-user agents
   - id, user_id, initiative_id, journey_id (nullable), context_type (builder | support), status, created_at, updated_at

2. **`agent_messages`** — Individual messages within conversations
   - id, conversation_id, role (user | assistant | system), content, structured_output (jsonb, for extracted signals), created_at

3. **`insight_records`** — Structured insight objects mined from behaviour and agent interactions
   - id, initiative_id, journey_id, milestone_id, journey_item_id, user_id, persona, team, insight_type, topic, summary, severity, confidence_score, inferred_dimension (participation | ownership | confidence), inferred_issue, supporting_evidence_summary, suggested_intervention, source_type, status (new | reviewed | actioned | dismissed), created_at

4. **`recommendation_records`** — AI-generated recommendations for journey changes
   - id, initiative_id, journey_id, milestone_id, recommendation_type, title, description, rationale, linked_insight_ids (uuid[]), impacted_personas (text[]), impacted_items (uuid[]), expected_impact, severity, priority, proposed_change_json (jsonb), review_status (pending | approved | dismissed | saved), approved_by, applied_at, created_at

5. **`ai_change_log`** — Version history when AI recommendations are applied
   - id, recommendation_id, journey_id, journey_item_id, change_type, before_state (jsonb), after_state (jsonb), rationale, approved_by, rolled_back_at, created_at

6. **`prompt_templates`** — Configurable AI prompt templates
   - id, template_key, template_text, category, created_at, updated_at

### RLS Policies
- Conversations/messages: users see own; change_managers + admins see all within their initiatives
- Insights/recommendations: change_managers + admins can read/manage; end_users cannot access
- Change log: read for change_managers + admins

### Edge Functions (Lovable AI Gateway)

1. **`ai-journey-builder`** — CM-facing agent for journey generation/refinement
   - Receives initiative context, personas, milestones, existing journey structure
   - Returns structured journey suggestions with rationale, score dimension tags, milestone links
   - Uses tool-calling for structured output

2. **`ai-support-agent`** — End-user-facing contextual support
   - Receives user's journey context, current items, persona
   - Streams conversational responses
   - Extracts structured signals (confusion, hesitation, confidence) from each interaction via tool-calling
   - Saves signals as insight_records

3. **`ai-insight-miner`** — Batch/async insight extraction
   - Analyses agent_messages, activity_events, score_history, reminders
   - Generates clustered insight_records
   - Called on-demand or periodically

4. **`ai-recommendation-engine`** — Generates recommendations from insights
   - Clusters insights by journey/persona
   - Produces recommendation_records with proposed_change_json
   - Called after insight mining

---

## Phase 2: Frontend — Journey Builder Agent Panel

### Changes to `src/pages/manage/JourneyBuilder.tsx`
- Add an **AI Assistant side panel** (collapsible drawer on the right)
- Chat interface for CM to describe what they need
- Structured suggestion cards showing:
  - Suggested journey items with type, title, description
  - Rationale for each item
  - Score dimension tag (P/O/C)
  - Linked milestone
  - "Insert into Journey" / "Edit" / "Dismiss" actions
- One-click insert writes directly to `journey_items` table
- New component: `src/components/ai/JourneyBuilderAgent.tsx`

### New Sidebar Nav Items (change_manager role)
- "AI Recommendations" → `/manage/recommendations`
- "Insight Console" → `/manage/insights`

---

## Phase 3: Frontend — End-User Support Agent

### Changes to End-User Layout
- Add a floating AI assistant button (bottom-right) visible on all end-user pages
- Opens a chat drawer/modal
- Contextual: knows user's current journey, assigned items, scores
- Every message is saved to `agent_messages` with structured signal extraction
- New component: `src/components/ai/SupportAgentChat.tsx`

---

## Phase 4: Frontend — Insight Console & Recommendation Inbox

### New Page: `/manage/insights` — User Insight Console
- Top confusion themes (grouped by topic)
- Repeated support requests
- Low-confidence / weak-ownership patterns
- Reminder dependency metrics
- Stalled workflow items
- Filters by persona, team, initiative, severity
- Link from insight → recommendation
- New component: `src/pages/manage/InsightConsole.tsx`

### New Page: `/manage/recommendations` — AI Recommendation Inbox
- List of pending recommendations with:
  - Title, reason, severity/priority
  - Linked insights
  - Affected persona/group
  - Expected impact
  - Actions: Apply, Edit & Apply, Dismiss, Save for Later
- "Apply" creates an `ai_change_log` entry, modifies the journey_items/journeys tables
- New component: `src/pages/manage/Recommendations.tsx`

### Enhanced: `/manage/risk` — Delivery Risk Manager
- Add AI-enriched section showing:
  - Predictive risk flags from insight mining
  - Sentiment/alignment analysis
  - Micro-improvement suggestions
  - Links to recommendations

---

## Phase 5: Version History & Change Log

### New Page: `/manage/ai-changelog`
- Chronological list of AI-applied changes
- Before/after state diff
- Who approved, when applied
- Rollback button (restores `before_state` from change log)

---

## Phase 6: Seed Data

- Sample insight_records across multiple insight_types
- Sample recommendation_records in various review_statuses
- Sample agent_conversations with extracted signals
- All marked with metadata `{ "is_sample": true }`

---

## Technical Details

### AI Model
- All edge functions use Lovable AI Gateway (`google/gemini-3-flash-preview` default)
- Journey builder uses tool-calling for structured output (journey items, rationale, score tags)
- Support agent streams responses; post-processes each exchange for signal extraction
- Insight miner and recommendation engine use non-streaming structured output

### File Structure (new files)
```text
supabase/functions/ai-journey-builder/index.ts
supabase/functions/ai-support-agent/index.ts
supabase/functions/ai-insight-miner/index.ts
supabase/functions/ai-recommendation-engine/index.ts
src/components/ai/JourneyBuilderAgent.tsx
src/components/ai/SupportAgentChat.tsx
src/components/ai/InsightCard.tsx
src/components/ai/RecommendationCard.tsx
src/components/ai/ChangeLogEntry.tsx
src/pages/manage/InsightConsole.tsx
src/pages/manage/Recommendations.tsx
src/pages/manage/AIChangeLog.tsx
src/hooks/useAIAgent.ts
src/hooks/useInsights.ts
src/hooks/useRecommendations.ts
```

### Existing Files Modified
- `src/components/layout/Sidebar.tsx` — Add nav items for CM role
- `src/App.tsx` — Add routes
- `src/pages/manage/JourneyBuilder.tsx` — Add AI panel toggle
- `src/pages/manage/RiskInsights.tsx` — Add AI-enriched risk section
- `src/components/layout/AppLayout.tsx` — Add floating support agent for end_users
- `src/hooks/useSupabaseData.ts` — Add hooks for new tables

### Implementation Order
1. Database migrations (all 6 tables + RLS)
2. Edge functions (4 functions)
3. Journey Builder Agent panel (CM-facing)
4. End-User Support Agent (floating chat)
5. Insight Console page
6. Recommendation Inbox page
7. Enhanced Risk page
8. AI Change Log page
9. Seed data
10. Integration testing

This is a large build. I recommend implementing in the order above, validating each phase before proceeding.

