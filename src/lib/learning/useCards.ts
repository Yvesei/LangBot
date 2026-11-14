import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { listCards } from './cardApi';
import { applyPending, legacyCards, loadOutbox } from './storage';
import { showUnverifiedCards } from './importLegacyBatch';
import {
  persistQueue,
  processQueue,
  removeCardsForMessage,
  showSaveError,
  updateCards,
  type Operation,
  type Scope,
} from './cardSync';
import type { StudyCard } from './schema';

function useCardScope(userId: string | null) {
  const scopes = useRef(new Map<string, Scope>());
  if (userId && !scopes.current.has(userId)) {
    scopes.current.set(userId, {
      userId,
      queue: loadOutbox(userId),
      running: false,
      blocked: false,
      imported: false,
      unmatched: [],
      controller: null,
    });
  }
  return userId ? scopes.current.get(userId)! : null;
}

function useCardLoadNotice(userId: string | null, error: boolean, retry: () => void) {
  useEffect(() => {
    if (error && userId) {
      toast.error('Could not load your cards.', {
        id: `cards-load-${userId}`,
        duration: Infinity,
        action: {
          label: 'Retry',
          onClick: retry,
        },
      });
    }
    return () => {
      if (userId) {
        toast.dismiss(`cards-load-${userId}`);
      }
    };
  }, [error, retry, userId]);
}

export function useCards(userId: string | null) {
  const client = useQueryClient();
  const scope = useCardScope(userId);
  const active = useRef(userId);
  active.current = userId;
  const context = useMemo(
    () => ({
      client,
      active,
    }),
    [client],
  );
  const query = useQuery({
    queryKey: ['cards', userId],
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,

    queryFn: async ({ signal }) =>
      applyPending((await listCards(userId!, signal)).cards, scope?.queue ?? []),
  });
  const { refetch } = query;

  const retry = useCallback(() => void refetch(), [refetch]);
  useCardLoadNotice(userId, query.isError, retry);

  useEffect(() => {
    active.current = userId;
    return () => {
      if (active.current === userId) {
        active.current = null;
      }
    };
  }, [userId]);
  useEffect(() => {
    if (!scope || !query.isSuccess) {
      return;
    }
    if (!scope.imported) {
      scope.imported = true;
      const pendingImports = new Set(
        scope.queue.flatMap((op) =>
          op.kind === 'import' || op.kind === 'claim' ? [op.card.id] : [],
        ),
      );
      scope.queue.push(
        ...legacyCards()
          .filter(({ card }) => !pendingImports.has(card.id))
          .map(({ card, raw }): Operation => ({
            kind: 'import',
            card,
            raw,
          })),
      );
      persistQueue(scope);
    }
    showUnverifiedCards(scope, context);
    if (scope.blocked) {
      showSaveError(scope, context);
    } else {
      void processQueue(scope, context);
    }
    return () => {
      scope.controller?.abort();
      toast.dismiss(`cards-save-${scope.userId}`);
      toast.dismiss(`cards-unverified-${scope.userId}`);
    };
  }, [scope, query.isSuccess, context]);

  const setCards = useCallback(
    (update: React.SetStateAction<StudyCard[]>) => {
      if (scope && active.current === scope.userId) {
        updateCards(scope, context, update);
      }
    },
    [context, scope],
  );

  const removeForMessage = useCallback(
    (sourceMessageId: string) => {
      if (scope && active.current === scope.userId) {
        removeCardsForMessage(scope, context, sourceMessageId);
      }
    },
    [context, scope],
  );
  return {
    cards: query.data ?? [],
    setCards,
    removeCardsForMessage: removeForMessage,
  };
}
