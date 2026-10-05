import type { StudyCard } from '@/lib/learning';

export interface PracticeFeedback {
  correct: boolean;
  feedback: string;
}

export interface PracticeSummary {
  due: StudyCard[];
  card: StudyCard | undefined;
  nextDue: number | null;
  attempts: number;
  successes: number;
}
