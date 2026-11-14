import { z } from 'zod';
import { STUDY_KEY, studyCardSchema, type StudyCard } from './schema';
import type { Operation } from './cardSync';

// Legacy records are kept as raw values so unrecognized data is never discarded.
export function legacyCards(): { card: StudyCard; raw: unknown }[] {
  try {
    const values: unknown = JSON.parse(localStorage.getItem(STUDY_KEY) ?? '[]');
    if (!Array.isArray(values)) {
      return [];
    }
    return values.flatMap((raw: unknown) => {
      const parsed = studyCardSchema.safeParse(raw);
      return parsed.success
        ? [
            {
              card: parsed.data,
              raw,
            },
          ]
        : [];
    });
  } catch {
    return [];
  }
}

export function removeImportedCard(raw: unknown) {
  const stored = localStorage.getItem(STUDY_KEY);
  if (!stored) {
    return;
  }
  const values: unknown = JSON.parse(stored);
  if (!Array.isArray(values)) {
    return;
  }
  const index = values.findIndex(
    (value: unknown) => JSON.stringify(value) === JSON.stringify(raw),
  );
  if (index < 0) {
    return;
  }
  values.splice(index, 1);
  if (values.length) {
    localStorage.setItem(STUDY_KEY, JSON.stringify(values));
  } else {
    localStorage.removeItem(STUDY_KEY);
  }
}

export function applyPending(cards: StudyCard[], queue: Operation[]) {
  return queue.reduce((current, operation) => {
    if (operation.kind === 'delete') {
      return current.filter((card) => card.id !== operation.id);
    }
    if (operation.kind === 'deleteSource') {
      return current.filter((card) => card.sourceMessageId !== operation.sourceMessageId);
    }
    if (operation.kind === 'save') {
      return [...current.filter((card) => card.id !== operation.card.id), operation.card];
    }
    return current;
  }, cards);
}

const operationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('save'),
    card: studyCardSchema,
  }),
  z.object({
    kind: z.literal('delete'),
    id: z.string().max(100),
  }),
  z.object({
    kind: z.literal('deleteSource'),
    sourceMessageId: z.string().max(100),
  }),
  z.object({
    kind: z.literal('import'),
    card: studyCardSchema,
    raw: z.unknown(),
  }),
  z.object({
    kind: z.literal('claim'),
    card: studyCardSchema,
    raw: z.unknown(),
  }),
]);

let tabId: string | undefined;

function currentTabId() {
  if (tabId) {
    return tabId;
  }
  try {
    const navigation = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;
    const prior =
      navigation?.type === 'reload' ? sessionStorage.getItem('langbot-card-tab') : null;
    tabId = prior ?? crypto.randomUUID();
    sessionStorage.setItem('langbot-card-tab', tabId);
    return tabId;
  } catch {
    return null;
  }
}

function key(userId: string, currentTab: string) {
  return `langbot-card-outbox-${userId}-${currentTab}`;
}

export function loadOutbox(userId: string, currentTab = currentTabId()): Operation[] {
  try {
    if (!currentTab) {
      return [];
    }
    const parsed = z
      .array(operationSchema)
      .safeParse(JSON.parse(localStorage.getItem(key(userId, currentTab)) ?? '[]'));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function saveOutbox(
  userId: string,
  queue: Operation[],
  currentTab = currentTabId(),
) {
  try {
    if (!currentTab) {
      return false;
    }
    if (!queue.length) {
      localStorage.removeItem(key(userId, currentTab));
    } else {
      localStorage.setItem(key(userId, currentTab), JSON.stringify(queue));
    }
    return true;
  } catch {
    return false;
  }
}
