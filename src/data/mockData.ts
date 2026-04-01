// AMP v2 Mock Data — Microsoft Copilot Adoption Scenario

export type UserRole = 'super_admin' | 'change_manager' | 'team_lead' | 'end_user';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  team?: string;
  persona?: string;
  scores: {
    participation: number;
    ownership: number;
    confidence: number;
    adoption: number;
  };
  streak: number;
  points: number;
  badges: string[];
  riskFlags?: string[];
  profile?: string; // behavioral profile description
}

export interface Initiative {
  id: string;
  name: string;
  description: string;
  customer: string;
  status: 'active' | 'planning' | 'completed';
  startDate: string;
  endDate: string;
  phase: 'design_build' | 'training_testing' | 'post_go_live';
  milestones: Milestone[];
  progress: number;
  userCount: number;
}

export interface Milestone {
  id: string;
  name: string;
  weight: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed';
  progress: number;
}

export interface Journey {
  id: string;
  name: string;
  description: string;
  initiativeId: string;
  milestoneId: string;
  status: 'active' | 'draft' | 'completed';
  weight: number;
  items: JourneyItem[];
  progress: number;
}

export interface JourneyItem {
  id: string;
  type: 'content' | 'activity' | 'form' | 'confidence_check' | 'evidence_upload' | 'reflection' | 'scenario';
  title: string;
  description: string;
  weight: number;
  duration: string;
  mandatory: boolean;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  contributesTo: ('participation' | 'ownership' | 'confidence')[];
  dueDate?: string;
  completedDate?: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'info' | 'action' | 'celebration';
  active: boolean;
}

export interface RiskFlag {
  id: string;
  userId: string;
  userName: string;
  team: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

// ============ USERS ============

// Initiative is ~46% through (Jan 15 – Jun 30, current Apr 1).
// Max possible adoption ≈ 46. All P/O/C and adoption scores honour this cap.
export const demoUsers: DemoUser[] = [
  {
    id: 'u-admin', name: 'Sarah Chen', email: 'sarah.chen@ampplatform.com',
    role: 'super_admin', team: 'Platform', persona: 'Admin',
    scores: { participation: 0, ownership: 0, confidence: 0, adoption: 0 },
    streak: 0, points: 0, badges: [],
  },
  {
    id: 'u-cm', name: 'James Mitchell', email: 'james.mitchell@acmecorp.com',
    role: 'change_manager', team: 'Change Office', persona: 'Change Manager',
    scores: { participation: 0, ownership: 0, confidence: 0, adoption: 0 },
    streak: 0, points: 0, badges: [],
  },
  {
    id: 'u-tl1', name: 'Rachel Torres', email: 'rachel.torres@acmecorp.com',
    role: 'team_lead', team: 'Sales', persona: 'Manager',
    scores: { participation: 44, ownership: 40, confidence: 38, adoption: 40 },
    streak: 12, points: 720, badges: ['Started', 'Consistent Contributor', 'On-Time Finisher'],
  },
  {
    id: 'u-tl2', name: 'David Kim', email: 'david.kim@acmecorp.com',
    role: 'team_lead', team: 'Marketing', persona: 'Manager',
    scores: { participation: 38, ownership: 34, confidence: 32, adoption: 34 },
    streak: 5, points: 490, badges: ['Started', 'Consistent Contributor'],
  },
  // End users — scores capped at ~46 (journey progress ceiling)
  {
    id: 'u1', name: 'Alex Morgan', email: 'alex.morgan@acmecorp.com',
    role: 'end_user', team: 'Sales', persona: 'Power User',
    scores: { participation: 46, ownership: 44, confidence: 42, adoption: 44 },
    streak: 18, points: 1170, badges: ['Started', 'Consistent Contributor', 'On-Time Finisher', 'Evidence Submitted'],
    profile: 'Strong all-round adopter — near-perfect at current progress point',
  },
  {
    id: 'u2', name: 'Maria Santos', email: 'maria.santos@acmecorp.com',
    role: 'end_user', team: 'Sales', persona: 'Power User',
    scores: { participation: 42, ownership: 18, confidence: 24, adoption: 24 },
    streak: 7, points: 445, badges: ['Started', 'Consistent Contributor'],
    riskFlags: ['High participation / low ownership'],
    profile: 'High participation / low ownership',
  },
  {
    id: 'u3', name: 'Tom Bradley', email: 'tom.bradley@acmecorp.com',
    role: 'end_user', team: 'Sales', persona: 'Standard User',
    scores: { participation: 20, ownership: 36, confidence: 16, adoption: 25 },
    streak: 2, points: 310, badges: ['Started'],
    riskFlags: ['High ownership / low confidence'],
    profile: 'High ownership / low confidence',
  },
  {
    id: 'u4', name: 'Lisa Huang', email: 'lisa.huang@acmecorp.com',
    role: 'end_user', team: 'Sales', persona: 'Standard User',
    scores: { participation: 36, ownership: 30, confidence: 40, adoption: 34 },
    streak: 9, points: 560, badges: ['Started', 'Confidence Builder'],
    riskFlags: ['Overconfidence'],
    profile: 'Overconfident user',
  },
  {
    id: 'u5', name: 'Ryan Cooper', email: 'ryan.cooper@acmecorp.com',
    role: 'end_user', team: 'Marketing', persona: 'Power User',
    scores: { participation: 32, ownership: 26, confidence: 28, adoption: 28 },
    streak: 3, points: 390, badges: ['Started'],
    riskFlags: ['Heavy reminder dependence'],
    profile: 'Reminder-dependent user',
  },
  {
    id: 'u6', name: 'Emma Wilson', email: 'emma.wilson@acmecorp.com',
    role: 'end_user', team: 'Marketing', persona: 'Standard User',
    scores: { participation: 12, ownership: 8, confidence: 10, adoption: 10 },
    streak: 0, points: 90, badges: [],
    riskFlags: ['Inactivity drop-off', 'Low participation / low ownership'],
    profile: 'Disengaging user',
  },
  {
    id: 'u7', name: 'James Park', email: 'james.park@acmecorp.com',
    role: 'end_user', team: 'Marketing', persona: 'Power User',
    scores: { participation: 28, ownership: 26, confidence: 24, adoption: 26 },
    streak: 6, points: 325, badges: ['Started', 'Consistent Contributor'],
    profile: 'Improving user over time',
  },
  {
    id: 'u8', name: 'Priya Patel', email: 'priya.patel@acmecorp.com',
    role: 'end_user', team: 'Sales', persona: 'Reluctant User',
    scores: { participation: 14, ownership: 10, confidence: 8, adoption: 10 },
    streak: 0, points: 105, badges: [],
    riskFlags: ['Low participation / low ownership', 'Evidence missing'],
    profile: 'Disengaging user',
  },
  {
    id: 'u9', name: 'Carlos Rivera', email: 'carlos.rivera@acmecorp.com',
    role: 'end_user', team: 'Marketing', persona: 'Standard User',
    scores: { participation: 38, ownership: 34, confidence: 32, adoption: 34 },
    streak: 10, points: 525, badges: ['Started', 'Consistent Contributor', 'On-Time Finisher'],
    profile: 'Strong all-round adopter',
  },
  {
    id: 'u10', name: 'Sophie Laurent', email: 'sophie.laurent@acmecorp.com',
    role: 'end_user', team: 'Sales', persona: 'Power User',
    scores: { participation: 40, ownership: 36, confidence: 34, adoption: 36 },
    streak: 8, points: 590, badges: ['Started', 'Consistent Contributor', 'Evidence Submitted'],
    profile: 'Improving user over time',
  },
  {
    id: 'u11', name: 'Nathan Brooks', email: 'nathan.brooks@acmecorp.com',
    role: 'end_user', team: 'Marketing', persona: 'Reluctant User',
    scores: { participation: 18, ownership: 14, confidence: 20, adoption: 17 },
    streak: 1, points: 160, badges: ['Started'],
    riskFlags: ['Unstable confidence'],
    profile: 'Reminder-dependent user',
  },
  {
    id: 'u12', name: 'Aisha Johnson', email: 'aisha.johnson@acmecorp.com',
    role: 'end_user', team: 'Sales', persona: 'Standard User',
    scores: { participation: 30, ownership: 24, confidence: 22, adoption: 24 },
    streak: 4, points: 360, badges: ['Started'],
    profile: 'Improving user over time',
  },
  {
    id: 'u13', name: 'Oliver Schmidt', email: 'oliver.schmidt@acmecorp.com',
    role: 'end_user', team: 'Marketing', persona: 'Power User',
    scores: { participation: 45, ownership: 42, confidence: 40, adoption: 42 },
    streak: 15, points: 1050, badges: ['Started', 'Consistent Contributor', 'On-Time Finisher', 'Evidence Submitted'],
    profile: 'Strong all-round adopter',
  },
];

export const endUsers = demoUsers.filter(u => u.role === 'end_user');
export const teamLeads = demoUsers.filter(u => u.role === 'team_lead');

// ============ INITIATIVES ============

export const initiatives: Initiative[] = [
  {
    id: 'init-1',
    name: 'Microsoft Copilot Rollout',
    description: 'Enterprise-wide adoption of Microsoft 365 Copilot across Sales and Marketing. Driving behavioural embedment of AI-assisted workflows into daily operations.',
    customer: 'Acme Corporation',
    status: 'active',
    startDate: '2026-01-15',
    endDate: '2026-06-30',
    phase: 'training_testing',
    progress: 58,
    userCount: 14,
    milestones: [
      { id: 'ms-1', name: 'Foundation & Awareness', weight: 25, startDate: '2026-01-15', endDate: '2026-02-28', status: 'completed', progress: 100 },
      { id: 'ms-2', name: 'Hands-On Enablement', weight: 40, startDate: '2026-03-01', endDate: '2026-04-30', status: 'active', progress: 62 },
      { id: 'ms-3', name: 'Embedment & Ownership', weight: 35, startDate: '2026-05-01', endDate: '2026-06-30', status: 'upcoming', progress: 0 },
    ],
  },
  {
    id: 'init-2',
    name: 'Digital Workspace Transformation',
    description: 'Preparing teams for the shift to cloud-first collaboration and automated workflows. Building confidence in new tools and processes.',
    customer: 'Acme Corporation',
    status: 'active',
    startDate: '2026-02-01',
    endDate: '2026-08-31',
    phase: 'design_build',
    progress: 32,
    userCount: 14,
    milestones: [
      { id: 'ms-4', name: 'Discovery & Readiness', weight: 30, startDate: '2026-02-01', endDate: '2026-03-31', status: 'completed', progress: 100 },
      { id: 'ms-5', name: 'Pilot & Iterate', weight: 40, startDate: '2026-04-01', endDate: '2026-06-30', status: 'active', progress: 25 },
      { id: 'ms-6', name: 'Scale & Sustain', weight: 30, startDate: '2026-07-01', endDate: '2026-08-31', status: 'upcoming', progress: 0 },
    ],
  },
];

// ============ JOURNEYS ============

export const journeys: Journey[] = [
  {
    id: 'j-1', name: 'Copilot Basics', description: 'Foundational understanding and first interactions with Microsoft Copilot.',
    initiativeId: 'init-1', milestoneId: 'ms-1', status: 'completed', weight: 30, progress: 100,
    items: [
      { id: 'ji-1', type: 'content', title: 'Welcome to Copilot', description: 'Introduction video on what Copilot can do for you.', weight: 10, duration: '5 min', mandatory: true, status: 'completed', contributesTo: ['participation'], completedDate: '2026-01-20' },
      { id: 'ji-2', type: 'content', title: 'Copilot in Your Daily Workflow', description: 'How Copilot integrates with Word, Excel, Outlook, and Teams.', weight: 15, duration: '8 min', mandatory: true, status: 'completed', contributesTo: ['participation'], completedDate: '2026-01-22' },
      { id: 'ji-3', type: 'form', title: 'Initial Readiness Check', description: 'Rate your current comfort level with AI tools.', weight: 15, duration: '3 min', mandatory: true, status: 'completed', contributesTo: ['confidence'], completedDate: '2026-01-24' },
      { id: 'ji-4', type: 'activity', title: 'First Copilot Prompt', description: 'Write your first Copilot prompt in Word or Outlook.', weight: 30, duration: '10 min', mandatory: true, status: 'completed', contributesTo: ['participation', 'ownership'], completedDate: '2026-01-28' },
      { id: 'ji-5', type: 'reflection', title: 'First Impressions', description: 'Share your initial thoughts on using Copilot.', weight: 15, duration: '5 min', mandatory: false, status: 'completed', contributesTo: ['ownership', 'confidence'], completedDate: '2026-01-30' },
      { id: 'ji-6', type: 'confidence_check', title: 'Baseline Confidence', description: 'Assess your confidence in using Copilot independently.', weight: 15, duration: '3 min', mandatory: true, status: 'completed', contributesTo: ['confidence'], completedDate: '2026-02-01' },
    ],
  },
  {
    id: 'j-2', name: 'Copilot in Practice', description: 'Apply Copilot to real work scenarios and build practical skills.',
    initiativeId: 'init-1', milestoneId: 'ms-2', status: 'active', weight: 40, progress: 45,
    items: [
      { id: 'ji-7', type: 'content', title: 'Advanced Prompting Techniques', description: 'Learn to craft effective prompts for better results.', weight: 10, duration: '12 min', mandatory: true, status: 'completed', contributesTo: ['participation'], completedDate: '2026-03-05' },
      { id: 'ji-8', type: 'activity', title: 'Summarise a Meeting', description: 'Use Copilot to summarise a real Teams meeting.', weight: 20, duration: '15 min', mandatory: true, status: 'completed', contributesTo: ['participation', 'ownership'], completedDate: '2026-03-10' },
      { id: 'ji-9', type: 'evidence_upload', title: 'Submit Your Summary', description: 'Upload the meeting summary you created with Copilot.', weight: 20, duration: '5 min', mandatory: true, status: 'in_progress', contributesTo: ['ownership'], dueDate: '2026-04-05' },
      { id: 'ji-10', type: 'scenario', title: 'Email Draft Challenge', description: 'Given a scenario, draft a professional email using Copilot.', weight: 20, duration: '10 min', mandatory: true, status: 'available', contributesTo: ['ownership', 'confidence'], dueDate: '2026-04-12' },
      { id: 'ji-11', type: 'confidence_check', title: 'Mid-Journey Confidence', description: 'How confident are you applying Copilot independently?', weight: 15, duration: '3 min', mandatory: true, status: 'locked', contributesTo: ['confidence'], dueDate: '2026-04-18' },
      { id: 'ji-12', type: 'reflection', title: 'What Changed?', description: 'Reflect on how your work habits have shifted since using Copilot.', weight: 15, duration: '5 min', mandatory: false, status: 'locked', contributesTo: ['ownership', 'confidence'], dueDate: '2026-04-25' },
    ],
  },
  {
    id: 'j-3', name: 'Copilot Ownership', description: 'Demonstrate independent mastery and coach others.',
    initiativeId: 'init-1', milestoneId: 'ms-3', status: 'draft', weight: 30, progress: 0,
    items: [
      { id: 'ji-13', type: 'activity', title: 'Teach a Colleague', description: 'Help a teammate learn a Copilot skill you\'ve mastered.', weight: 25, duration: '20 min', mandatory: true, status: 'locked', contributesTo: ['ownership'], dueDate: '2026-05-10' },
      { id: 'ji-14', type: 'evidence_upload', title: 'Workflow Improvement Evidence', description: 'Document a workflow you improved using Copilot.', weight: 25, duration: '15 min', mandatory: true, status: 'locked', contributesTo: ['ownership'], dueDate: '2026-05-20' },
      { id: 'ji-15', type: 'scenario', title: 'Complex Scenario Challenge', description: 'Solve a multi-step business scenario using Copilot.', weight: 25, duration: '20 min', mandatory: true, status: 'locked', contributesTo: ['ownership', 'confidence'], dueDate: '2026-06-01' },
      { id: 'ji-16', type: 'confidence_check', title: 'Final Confidence Assessment', description: 'Final self-assessment of your Copilot readiness.', weight: 25, duration: '5 min', mandatory: true, status: 'locked', contributesTo: ['confidence'], dueDate: '2026-06-15' },
    ],
  },
];

// ============ ANNOUNCEMENTS ============

export const announcements: Announcement[] = [
  { id: 'a-1', title: '🚀 Copilot Enablement Phase 2 is Live', message: 'The Hands-On Enablement milestone is now active. Complete your next micro-action to build momentum.', date: '2026-03-01', type: 'action', active: true },
  { id: 'a-2', title: '🏆 Congratulations to Our Top Adopters', message: 'Alex Morgan and Oliver Schmidt have achieved Ownership Builder status. Adoption is evidenced through behaviour!', date: '2026-03-15', type: 'celebration', active: true },
  { id: 'a-3', title: '📋 New: Evidence Upload Now Available', message: 'You can now upload evidence of your Copilot usage. Show us how you\'re applying AI in your daily work.', date: '2026-03-20', type: 'info', active: true },
];

// ============ RISK FLAGS ============

export const riskFlags: RiskFlag[] = [
  { id: 'rf-1', userId: 'u2', userName: 'Maria Santos', team: 'Sales', type: 'High participation / low ownership', severity: 'high', description: 'Actively consuming content but not applying it to real work tasks.', recommendation: 'Add proof-based task' },
  { id: 'rf-2', userId: 'u3', userName: 'Tom Bradley', team: 'Sales', type: 'High ownership / low confidence', severity: 'medium', description: 'Completing tasks but self-rated confidence remains low.', recommendation: 'Trigger manager coaching' },
  { id: 'rf-3', userId: 'u6', userName: 'Emma Wilson', team: 'Marketing', type: 'Inactivity drop-off', severity: 'high', description: 'No activity for 14+ days. Risk of full disengagement.', recommendation: 'Increase reminders' },
  { id: 'rf-4', userId: 'u4', userName: 'Lisa Huang', team: 'Sales', type: 'Overconfidence', severity: 'medium', description: 'Self-rated confidence exceeds demonstrated performance.', recommendation: 'Add repetition cycle' },
  { id: 'rf-5', userId: 'u5', userName: 'Ryan Cooper', team: 'Marketing', type: 'Heavy reminder dependence', severity: 'medium', description: 'Only acts after receiving reminders. Low self-initiated engagement.', recommendation: 'Boost starter reinforcement' },
  { id: 'rf-6', userId: 'u8', userName: 'Priya Patel', team: 'Sales', type: 'Evidence missing', severity: 'high', description: 'No evidence uploads despite completed activities. Ownership not demonstrated.', recommendation: 'Simplify journey' },
  { id: 'rf-7', userId: 'u11', userName: 'Nathan Brooks', team: 'Marketing', type: 'Unstable confidence', severity: 'low', description: 'Confidence scores fluctuating significantly between checks.', recommendation: 'Add repetition cycle' },
];

// ============ SCORE TREND DATA ============

// Score trends: 11 weeks of a 24-week initiative. Ideal adoption = (week/24)*100.
// Actual adoption must always be ≤ idealAdoption at each point.
export const scoreTrends = [
  { week: 'W1', participation: 8, ownership: 4, confidence: 6, adoption: 5, idealAdoption: 4 },
  { week: 'W2', participation: 14, ownership: 8, confidence: 10, adoption: 10, idealAdoption: 8 },
  { week: 'W3', participation: 18, ownership: 12, confidence: 13, adoption: 14, idealAdoption: 13 },
  { week: 'W4', participation: 22, ownership: 16, confidence: 16, adoption: 17, idealAdoption: 17 },
  { week: 'W5', participation: 26, ownership: 19, confidence: 18, adoption: 20, idealAdoption: 21 },
  { week: 'W6', participation: 28, ownership: 22, confidence: 20, adoption: 22, idealAdoption: 25 },
  { week: 'W7', participation: 30, ownership: 24, confidence: 22, adoption: 24, idealAdoption: 29 },
  { week: 'W8', participation: 33, ownership: 27, confidence: 25, adoption: 27, idealAdoption: 33 },
  { week: 'W9', participation: 36, ownership: 30, confidence: 28, adoption: 30, idealAdoption: 38 },
  { week: 'W10', participation: 38, ownership: 32, confidence: 30, adoption: 32, idealAdoption: 42 },
  { week: 'W11', participation: 40, ownership: 34, confidence: 32, adoption: 34, idealAdoption: 46 },
];

export const teamComparison = [
  { team: 'Sales', participation: 68, ownership: 60, confidence: 56, adoption: 60 },
  { team: 'Marketing', participation: 58, ownership: 52, confidence: 54, adoption: 54 },
];

// ============ BADGES ============

export const allBadges = [
  { id: 'b-1', name: 'Started', description: 'Completed your first micro-action', icon: '🌱', tier: 'Starter' },
  { id: 'b-2', name: 'Consistent Contributor', description: 'Maintained a 5-day streak', icon: '🔥', tier: 'Contributor' },
  { id: 'b-3', name: 'On-Time Finisher', description: 'Completed 5+ items before due date', icon: '⏱️', tier: 'Contributor' },
  { id: 'b-4', name: 'Evidence Submitted', description: 'Uploaded your first evidence of application', icon: '📎', tier: 'Owner' },
  { id: 'b-5', name: 'Ownership Builder', description: 'Achieved ownership score above 75', icon: '🏗️', tier: 'Owner' },
  { id: 'b-6', name: 'Confidence Builder', description: 'Achieved confidence score above 75', icon: '💪', tier: 'Leader' },
];

// ============ HELPER ============

export function getAdoptionScore(p: number, o: number, c: number, phase: Initiative['phase'] = 'training_testing'): number {
  const weights = {
    design_build: { p: 0.35, o: 0.35, c: 0.30 },
    training_testing: { p: 0.20, o: 0.40, c: 0.40 },
    post_go_live: { p: 0.10, o: 0.45, c: 0.45 },
  };
  const w = weights[phase];
  return Math.round(p * w.p + o * w.o + c * w.c);
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Developing';
  if (score >= 40) return 'Emerging';
  return 'At Risk';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-amp-success';
  if (score >= 60) return 'text-amp-info';
  if (score >= 40) return 'text-amp-warning';
  return 'text-amp-risk';
}

export function getTierFromPoints(points: number): string {
  if (points >= 2000) return 'Leader';
  if (points >= 1000) return 'Owner';
  if (points >= 500) return 'Contributor';
  return 'Starter';
}
