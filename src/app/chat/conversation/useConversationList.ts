import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  deleteSavedChat,
  listConversations,
  renameSavedConversation,
} from '@/lib/chat/saved';

type ChatPage = Awaited<ReturnType<typeof listConversations>>;
type ChatPages = InfiniteData<ChatPage, number>;
type Change = { id: string; title?: string };

function updatePages(data: ChatPages | undefined, change: Change) {
  if (!data) {
    return data;
  }
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      conversations:
        change.title === undefined
          ? page.conversations.filter((chat) => chat.id !== change.id)
          : page.conversations.map((chat) =>
              chat.id === change.id
                ? {
                    ...chat,
                    title: change.title!,
                  }
                : chat,
            ),
    })),
  };
}

function rollbackPages(
  current: ChatPages | undefined,
  previous: ChatPages | undefined,
  change: Change,
) {
  if (!current || !previous) {
    return current;
  }
  const pageIndex = previous.pages.findIndex((page) =>
    page.conversations.some((chat) => chat.id === change.id),
  );
  const oldPage = previous.pages[pageIndex];
  const originalIndex =
    oldPage?.conversations.findIndex((chat) => chat.id === change.id) ?? -1;
  const original = oldPage?.conversations[originalIndex];
  if (!original) {
    return current;
  }
  return {
    ...current,
    pages: current.pages.map((page, index) => {
      if (change.title !== undefined) {
        return {
          ...page,
          conversations: page.conversations.map((chat) =>
            chat.id === change.id && chat.title === change.title
              ? {
                  ...chat,
                  title: original.title,
                }
              : chat,
          ),
        };
      }
      if (
        index !== pageIndex ||
        current.pages.some((item) =>
          item.conversations.some((chat) => chat.id === change.id),
        )
      ) {
        return page;
      }
      const conversations = [...page.conversations];
      conversations.splice(originalIndex, 0, original);
      return {
        ...page,
        conversations,
      };
    }),
  };
}

export function useConversationList(userId: string | null) {
  const client = useQueryClient();
  const key = ['conversations', userId] as const;
  const mutationKey = ['conversation-change', userId] as const;
  const query = useInfiniteQuery({
    queryKey: key,

    queryFn: ({ pageParam, signal }) => listConversations(pageParam, signal),
    initialPageParam: 0,

    getNextPageParam: (last, pages) =>
      last.hasMore
        ? pages.reduce((offset, page) => offset + page.conversations.length, 0)
        : undefined,
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
  const mutation = useMutation({
    mutationKey,

    mutationFn: async (change: Change) => {
      if (change.title === undefined) {
        await deleteSavedChat(change.id);
      } else {
        await renameSavedConversation(change.id, change.title);
      }
    },

    onMutate: async (change) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<ChatPages>(key);
      client.setQueryData<ChatPages>(key, (data) => updatePages(data, change));
      return { previous };
    },

    onError: (_error, change, context) => {
      if (!client.getQueryState(key)) {
        return;
      }
      client.setQueryData<ChatPages>(key, (current) =>
        rollbackPages(current, context?.previous, change),
      );
      toast.error(
        change.title === undefined
          ? 'Could not delete this chat.'
          : 'Could not rename this chat.',
      );
    },

    onSettled: () => {
      if (client.isMutating({ mutationKey }) === 1) {
        void client.invalidateQueries({ queryKey: key });
      }
    },
  });
  return {
    owner: userId,
    ready: !userId || Boolean(query.data),
    conversations: query.data?.pages.flatMap((page) => page.conversations) ?? [],
    hasMore: Boolean(query.hasNextPage),
    messageCount: query.data?.pages[0]?.messageCount ?? 0,
    error: query.isError ? 'Your chats could not be loaded.' : '',

    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },

    rename: (id: string, title: string) =>
      mutation.mutate({
        id,
        title,
      }),

    deleteChat: (id: string) => mutation.mutateAsync({ id }),

    reload: () => void client.invalidateQueries({ queryKey: key }),
  };
}
