import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteCards, deleteCardsForMessage, putCard } from './cardApi';
import { saveOutbox } from './storage';
import { importLegacyBatch } from './importLegacyBatch';
import type { StudyCard } from './schema';

export type Operation =
  | { kind: 'save'; card: StudyCard }
  | { kind: 'delete'; id: string }
  | { kind: 'deleteSource'; sourceMessageId: string }
  | { kind: 'import' | 'claim'; card: StudyCard; raw: unknown };

export type Scope = {
  userId: string;
  queue: Operation[];
  running: boolean;
  blocked: boolean;
  imported: boolean;
  unmatched: Extract<Operation, { kind: 'import' | 'claim' }>[];
  controller: AbortController | null;
};

export type SyncContext = { client: QueryClient; active: React.RefObject<string | null> };

export function persistQueue(scope: Scope) {
  if (!saveOutbox(scope.userId, scope.queue)) {
    toast.error('Card changes may be lost if you close this page.', {
      id: `cards-outbox-${scope.userId}`,
    });
  }
}

export function operations(before: StudyCard[], after: StudyCard[]): Operation[] {
  const previous = new Map(before.map((card) => [card.id, card]));
  const next = new Map(after.map((card) => [card.id, card]));
  return [
    ...before
      .filter((card) => !next.has(card.id))
      .map((card): Operation => ({
        kind: 'delete',
        id: card.id,
      })),
    ...after
      .filter((card) => JSON.stringify(previous.get(card.id)) !== JSON.stringify(card))
      .map((card): Operation => ({
        kind: 'save',
        card,
      })),
  ];
}

export function updateCards(
  scope: Scope,
  context: SyncContext,
  update: React.SetStateAction<StudyCard[]>,
) {
  const key = ['cards', scope.userId];
  const before = context.client.getQueryData<StudyCard[]>(key);
  if (!before) {
    const additions = typeof update === 'function' ? update([]) : update;
    scope.queue.push(...operations([], additions));
    persistQueue(scope);
    return;
  }
  const after = typeof update === 'function' ? update(before) : update;
  void context.client.cancelQueries({ queryKey: key });
  context.client.setQueryData(key, after);
  scope.queue.push(...operations(before, after));
  persistQueue(scope);
  void processQueue(scope, context);
}

export function removeCardsForMessage(
  scope: Scope,
  context: SyncContext,
  sourceMessageId: string,
) {
  const key = ['cards', scope.userId];
  const cards = context.client.getQueryData<StudyCard[]>(key);
  if (cards) {
    void context.client.cancelQueries({ queryKey: key });
    context.client.setQueryData(
      key,
      cards.filter((card) => card.sourceMessageId !== sourceMessageId),
    );
  }
  scope.queue.push({
    kind: 'deleteSource',
    sourceMessageId,
  });
  persistQueue(scope);
  void processQueue(scope, context);
}

export function showSaveError(scope: Scope, context: SyncContext) {
  toast.error('Could not save your cards.', {
    id: `cards-save-${scope.userId}`,
    duration: Infinity,
    action: {
      label: 'Retry',

      onClick: () => {
        scope.blocked = false;
        void processQueue(scope, context);
      },
    },
  });
}

async function runOperation(scope: Scope, operation: Operation, signal: AbortSignal) {
  if (operation.kind === 'deleteSource') {
    await deleteCardsForMessage(scope.userId, operation.sourceMessageId, signal);
    return;
  }
  if (operation.kind !== 'save') {
    throw new Error('This operation requires a batch.');
  }
  const result = await putCard(scope.userId, operation.card, signal);
  if (!result.importedIds.includes(operation.card.id)) {
    throw new Error('The card could not be saved.');
  }
}

function isImport(operation: Operation) {
  return operation.kind === 'import' || operation.kind === 'claim';
}

function pendingDeletes(queue: Operation[]) {
  const ids: string[] = [];
  for (const operation of queue) {
    if (operation.kind !== 'delete' || ids.length === 100) {
      break;
    }
    if (
      new TextEncoder().encode(JSON.stringify({ ids: [...ids, operation.id] })).length >
      32768
    ) {
      break;
    }
    ids.push(operation.id);
  }
  return ids;
}

function refreshCardsIfNeeded(scope: Scope, context: SyncContext) {
  if (!context.client.getQueryData(['cards', scope.userId])) {
    void context.client.invalidateQueries({ queryKey: ['cards', scope.userId] });
  }
}

async function processNext(scope: Scope, context: SyncContext) {
  const operation = scope.queue[0]!;
  const controller = new AbortController();
  scope.controller = controller;
  try {
    if (isImport(operation)) {
      const finished = await importLegacyBatch(scope, context, controller.signal);
      persistQueue(scope);
      return finished;
    }
    const ids = operation.kind === 'delete' ? pendingDeletes(scope.queue) : [];
    if (ids.length) {
      await deleteCards(scope.userId, ids, controller.signal);
    } else {
      await runOperation(scope, operation, controller.signal);
    }
    if (context.active.current !== scope.userId || controller.signal.aborted) {
      return false;
    }
    void context.client.cancelQueries({ queryKey: ['cards', scope.userId] });
    scope.queue.splice(0, ids.length || 1);
    persistQueue(scope);
    refreshCardsIfNeeded(scope, context);
    return true;
  } catch {
    if (context.active.current === scope.userId && !controller.signal.aborted) {
      scope.blocked = true;
      showSaveError(scope, context);
    }
    return false;
  } finally {
    scope.controller = null;
  }
}

export async function processQueue(scope: Scope, context: SyncContext) {
  if (scope.running || scope.blocked || context.active.current !== scope.userId) {
    return;
  }
  scope.running = true;
  while (scope.queue.length && context.active.current === scope.userId) {
    if (!(await processNext(scope, context))) {
      break;
    }
  }
  scope.running = false;
  if (!scope.queue.length) {
    toast.dismiss(`cards-save-${scope.userId}`);
    return;
  }
  if (!scope.blocked && context.active.current === scope.userId) {
    void processQueue(scope, context);
  }
}
