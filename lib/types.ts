export type LogKind = "feeding" | "diaper" | "sleep" | "weight" | "symptom";

export type TriageLevel = "green" | "yellow" | "red";

export type BabyProfile = {
  id: string;
  name: string;
  dateOfBirth: string;
  timezone: string;
  weightLbs?: number;
};

export type AgeContext = {
  days: number;
  weeks: number;
  months: number;
  label: string;
  bucket: "newborn" | "sixWeeks" | "threeMonthsPlus" | "fourToSixMonths" | "olderInfant";
};

export type CareLog = {
  id: string;
  babyId: string;
  kind: LogKind;
  createdAt: string;
  occurredAt: string;
  summary: string;
  rawText: string;
  details: Record<string, string | number | boolean | null>;
};

export type SavedAiSummary = {
  id: string;
  babyId: string;
  provider: "chatgpt" | "claude" | "gemini" | "other";
  createdAt: string;
  title: string;
  pastedResponse: string;
  parentNote: string;
};

export type PlanningStatus = "planned" | "done" | "skip";

export type PlanningActivity = {
  id: string;
  title: string;
  category: "health" | "feeding" | "sleep" | "safety" | "care" | "development";
  timing: "now" | "soon" | "later";
  why: string;
  action: string;
  afterDone: string;
  sourceLabel?: string;
  sourceUrl?: string;
  requiresDoctorCallout?: boolean;
};

export type PlanningActivityState = {
  activityId: string;
  status: PlanningStatus;
  note: string;
  completedAt?: string;
};

export type UserFacingResponse = {
  markdown: string;
  triage: TriageLevel;
};

export type SystemUxPayload = {
  ageContext: AgeContext;
  ui: {
    activePanel: "daily-summary" | "question" | "symptom" | "log" | "ai-summary";
    autocomplete: Record<string, string[]>;
    suggestedActions: string[];
    safetyBadges: string[];
  };
  db: {
    proposedWrites: Array<{
      table: string;
      action: "insert" | "update";
      values: Record<string, unknown>;
    }>;
  };
  logic: {
    matchedRules: string[];
    triage: TriageLevel;
    flags: string[];
    nextReminder?: string;
  };
};

export type EngineResponse = {
  userFacingContent: UserFacingResponse;
  systemUxPayload: SystemUxPayload;
};

export type ExpectationSection = {
  title: string;
  items: string[];
};

export type ExpectationPlan = {
  dayNumber: number;
  weekNumber: number;
  ageLabel: string;
  stageTitle: string;
  todayHeadline: string;
  today: ExpectationSection[];
  lifeGuide: ExpectationSection[];
  thisWeek: ExpectationSection[];
  watchWindows: string[];
  doctorChecklist: string[];
  matchedRules: string[];
};
