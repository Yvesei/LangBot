import { importCards } from './cardApi';
import { persistQueue, processQueue } from './cardSync';
import { applyPending, removeImportedCard } from './storage';
import type { Operation, Scope, SyncContext } from './cardSync';
import type { StudyCard } from './schema';
import { toast } from 'sonner';

type ImportOperation = Extract<Operation, { kind: 'import' | 'claim' }>;

export function showUnverifiedCards(scope: Scope, context: SyncContext) {
  if (!scope.unmatched.length) {
    return;
  }
  toast.info('Some cards in this browser could not be linked to this account.', {
    id: `cards-unverified-${scope.userId}`,
    duration: Infinity,
    action: {
      label: 'Import',

      onClick: () => {
        if (context.active.current !== scope.userId) {
          return;
        }
        scope.queue.push(
          ...scope.unmatched.splice(0).map((item): Operation => ({
            ...item,
            kind: 'claim',
          })),
        );
        persistQueue(scope);
        void processQueue(scope, context);
      },
    },
  });
}

function batchImports(queue: Operation[]) {
  const batch: ImportOperation[] = [];
  const ids = new Set<string>();
  const mode = queue[0]?.kind;
  for (const operation of queue) {
    if (
      (operation.kind !== 'import' && operation.kind !== 'claim') ||
      operation.kind !== mode ||
      batch.length === 100 ||
      ids.has(operation.card.id)
    ) {
      break;
    }
    const cards = [...batch.map((entry) => entry.card), operation.card];
    if (
      new TextEncoder().encode(
        JSON.stringify({
          cards,
          import: mode === 'claim' ? 'manual' : true,
        }),
      ).length > 131072
    ) {
      break;
    }
    batch.push(operation);
    ids.add(operation.card.id);
  }
  return batch;
}

export async function importLegacyBatch(
  scope: Scope,
  context: SyncContext,
  signal: AbortSignal,
) {
  const batch = batchImports(scope.queue);
  if (!batch.length) {
    throw new Error('A card is too large to import.');
  }
  const manual = batch[0]?.kind === 'claim';
  const response = await importCards(
    scope.userId,
    batch.map((item) => item.card),
    signal,
    manual,
  );
  if (context.active.current !== scope.userId || signal.aborted) {
    return false;
  }
  void context.client.cancelQueries({ queryKey: ['cards', scope.userId] });
  const confirmed = new Set(response.importedIds);
  const imported = batch.filter((item) => confirmed.has(item.card.id));
  const unmatched = batch.filter((item) => !confirmed.has(item.card.id));
  if (manual && unmatched.length) {
    toast.error('Some cards conflict with saved cards and remain in this browser.');
  }
  if (!manual && unmatched.length) {
    scope.unmatched.push(...unmatched);
    showUnverifiedCards(scope, context);
  }
  imported.forEach((item) => removeImportedCard(item.raw));
  context.client.setQueryData<StudyCard[]>(['cards', scope.userId], (current = []) => {
    const present = new Set(current.map((card) => card.id));
    const combined = [
      ...current,
      ...imported.map((item) => item.card).filter((card) => !present.has(card.id)),
    ];
    return applyPending(combined, scope.queue.slice(batch.length));
  });
  scope.queue.splice(0, batch.length);
  return true;
}
