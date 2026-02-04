import { chatDB, type StoredMessage } from './indexedDB';

export interface PaginatedMessages {
    messages: StoredMessage[];
    hasMore: boolean;
    totalCount: number;
}

const MESSAGE_PAGE_SIZE = 50; // Load 50 messages at a time
const INITIAL_LOAD_SIZE = 30; // Initial load is smaller for faster first paint

/**
 * Load messages with pagination support
 * @param chatId Chat ID to load messages from
 * @param offset How many messages to skip (for pagination)
 * @param limit How many messages to load
 */
export async function getPagedMessages(
    chatId: string,
    offset: number = 0,
    limit: number = MESSAGE_PAGE_SIZE
): Promise<PaginatedMessages> {
    // Get all messages (from cache if possible)
    const allMessages = await chatDB.getMessages(chatId);

    // Sort by creation date
    const sorted = allMessages.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const totalCount = sorted.length;
    const paged = sorted.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;

    return {
        messages: paged,
        totalCount,
        hasMore
    };
}

/**
 * Load initial messages (smaller batch for faster render)
 */
export async function getInitialMessages(chatId: string): Promise<PaginatedMessages> {
    return getPagedMessages(chatId, 0, INITIAL_LOAD_SIZE);
}

/**
 * Load next page of messages
 */
export async function getNextPage(
    chatId: string,
    currentCount: number
): Promise<PaginatedMessages> {
    return getPagedMessages(chatId, currentCount, MESSAGE_PAGE_SIZE);
}

/**
 * Load messages around a specific message ID (for jump-to-message)
 */
export async function getMessagesAround(
    chatId: string,
    messageId: string,
    contextSize: number = 25
): Promise<PaginatedMessages> {
    const allMessages = await chatDB.getMessages(chatId);
    const sorted = allMessages.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const targetIndex = sorted.findIndex(m => m.id === messageId);
    if (targetIndex === -1) {
        // Message not found, return initial
        return getInitialMessages(chatId);
    }

    // Load contextSize messages before and after
    const start = Math.max(0, targetIndex - contextSize);
    const end = Math.min(sorted.length, targetIndex + contextSize + 1);

    const messages = sorted.slice(start, end);

    return {
        messages,
        totalCount: sorted.length,
        hasMore: end < sorted.length
    };
}
