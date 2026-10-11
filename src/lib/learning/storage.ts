import { z } from 'zod';
import { STUDY_KEY, studyCardSchema, type StudyCard } from './schema';

const MAX_CARDS = 100;

export function loadCards(): StudyCard[] {
  try {
    const raw = localStorage.getItem(STUDY_KEY);

    if (!raw || raw.length > 500000) {
      return [];
    }

    return z.array(studyCardSchema).max(MAX_CARDS).parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveCards(cards: StudyCard[]): boolean {
  try {
    localStorage.setItem(STUDY_KEY, JSON.stringify(cards.slice(-MAX_CARDS)));
    return true;
  } catch {
    return false;
  }
}
