import type { Chat, Message, MessageStats, MessageBranch } from '../types';

const DB_NAME = 'AIChatDB';
const DB_VERSION = 5; // Incremented to add models field

interface StoredChat {
  id: string;
  title: string;
  mode: 'auto' | 'manual';
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  totalCost: number;
  totalTokens: number;
  models: string[]; // Track which models were used in this chat
}

interface StoredMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  attachments?: string;
  createdAt: Date;
  stats?: MessageStats;
  // Tree branching fields
  parentId?: string | null;
  branchId?: string;
  branchIndex?: number;
  isEdited?: boolean;
  editedAt?: Date;
  // Auto-save field for partial responses
  isPartial?: boolean;
}

interface StoredBranch {
  id: string;
  chatId: string;
  rootMessageId: string;
  name: string;
  createdAt: Date;
  messageCount: number;
}

// Simple in-memory cache for frequently accessed data
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxSize = 100;
  private ttl = 30000; // 30 seconds TTL

  get(key: string): any | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.data;
  }

  set(key: string, data: any) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(keyPrefix: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

class ChatDatabase {
  private db: IDBDatabase | null = null;
  private cache = new QueryCache();

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        // Chats store
        if (!db.objectStoreNames.contains('chats')) {
          const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('chatId', 'chatId', { unique: false });
          messageStore.createIndex('createdAt', 'createdAt', { unique: false });
          messageStore.createIndex('parentId', 'parentId', { unique: false });
          messageStore.createIndex('branchId', 'branchId', { unique: false });
        } else {
          // For existing messages store, ensure all indexes exist (migration)
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          if (transaction) {
            const messageStore = transaction.objectStore('messages');
            if (!messageStore.indexNames.contains('parentId')) {
              messageStore.createIndex('parentId', 'parentId', { unique: false });
            }
            if (!messageStore.indexNames.contains('branchId')) {
              messageStore.createIndex('branchId', 'branchId', { unique: false });
            }
          }
        }

        // Branches store (for tree-based edit history)
        if (!db.objectStoreNames.contains('branches')) {
          const branchStore = db.createObjectStore('branches', { keyPath: 'id' });
          branchStore.createIndex('chatId', 'chatId', { unique: false });
          branchStore.createIndex('rootMessageId', 'rootMessageId', { unique: false });
        }
      };
    });
  }

  // Chat operations
  async getAllChats(): Promise<StoredChat[]> {
    // Check cache first
    const cacheKey = 'allChats';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats'], 'readonly');
      const store = transaction.objectStore('chats');
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev');

      const chats: StoredChat[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          chats.push(cursor.value);
          cursor.continue();
        } else {
          // Cache the result
          this.cache.set(cacheKey, chats);
          resolve(chats);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getChat(chatId: string): Promise<StoredChat | null> {
    // Check cache first
    const cacheKey = `chat:${chatId}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached;
    
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats'], 'readonly');
      const store = transaction.objectStore('chats');
      const request = store.get(chatId);

      request.onsuccess = () => {
        const result = request.result || null;
        this.cache.set(cacheKey, result);
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveChat(chat: StoredChat): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats'], 'readwrite');
      const store = transaction.objectStore('chats');
      const request = store.put(chat);

      request.onsuccess = () => {
        // Invalidate relevant caches
        this.cache.invalidate('allChats');
        this.cache.invalidate(`chat:${chat.id}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteChat(chatId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats', 'messages', 'branches'], 'readwrite');
      const chatStore = transaction.objectStore('chats');
      const messageStore = transaction.objectStore('messages');
      const branchStore = transaction.objectStore('branches');
      
      // Delete chat
      chatStore.delete(chatId);

      // Delete associated messages
      const msgIndex = messageStore.index('chatId');
      const msgRequest = msgIndex.openCursor(chatId);

      msgRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          messageStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      // Delete associated branches
      const branchIndex = branchStore.index('chatId');
      const branchRequest = branchIndex.openCursor(chatId);

      branchRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          branchStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        // Invalidate relevant caches
        this.cache.invalidate('allChats');
        this.cache.invalidate(`chat:${chatId}`);
        this.cache.invalidate(`messages:${chatId}`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Message operations
  async getMessages(chatId: string): Promise<StoredMessage[]> {
    // Check cache first
    const cacheKey = `messages:${chatId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('chatId');
      const request = index.openCursor(chatId);

      const messages: StoredMessage[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          messages.push(cursor.value);
          cursor.continue();
        } else {
          // Sort by createdAt
          messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          // Cache the result
          this.cache.set(cacheKey, messages);
          resolve(messages);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getMessage(messageId: string): Promise<StoredMessage | null> {
    // Check cache first
    const cacheKey = `message:${messageId}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached;
    
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const request = store.get(messageId);

      request.onsuccess = () => {
        const result = request.result || null;
        this.cache.set(cacheKey, result);
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveMessage(message: StoredMessage): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const request = store.put(message);

      request.onsuccess = () => {
        // Invalidate relevant caches
        this.cache.invalidate(`messages:${message.chatId}`);
        this.cache.invalidate(`message:${message.id}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const request = store.delete(messageId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get all sibling messages (different versions at the same tree position)
  async getSiblingMessages(parentId: string | null, chatId: string): Promise<StoredMessage[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      // Use the parentId index for efficient lookup
      const index = store.index('parentId');
      const request = index.openCursor(parentId);

      const messages: StoredMessage[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const msg = cursor.value as StoredMessage;
          // Filter by chatId to ensure we're only getting siblings from the same chat
          if (msg.chatId === chatId) {
            messages.push(msg);
          }
          cursor.continue();
        } else {
          // Sort by branchIndex to maintain order
          messages.sort((a, b) => (a.branchIndex || 0) - (b.branchIndex || 0));
          resolve(messages);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Get child messages of a given message
  async getChildMessages(parentId: string): Promise<StoredMessage[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('parentId');
      const request = index.openCursor(parentId);

      const messages: StoredMessage[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          messages.push(cursor.value);
          cursor.continue();
        } else {
          // Sort by createdAt
          messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          resolve(messages);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async updateChatStats(
    chatId: string,
    stats: { messageCount: number; totalCost: number; totalTokens: number; models?: string[] }
  ): Promise<void> {
    const chat = await this.getChat(chatId);
    if (chat) {
      chat.messageCount = stats.messageCount;
      chat.totalCost = stats.totalCost;
      chat.totalTokens = stats.totalTokens;
      if (stats.models) {
        // Merge new models with existing ones, keeping unique values
        // Handle case where chat.models might be undefined (old data)
        const existingModels = chat.models || [];
        chat.models = [...new Set([...existingModels, ...stats.models])];
      }
      chat.updatedAt = new Date();
      await this.saveChat(chat);
    }
  }

  // Create a new version (sibling) of an existing message
  async createMessageVersion(
    originalMessageId: string,
    newContent: string,
  ): Promise<{ userMessage: StoredMessage; assistantMessage?: StoredMessage } | null> {
    if (!this.db) await this.init();

    const originalMessage = await this.getMessage(originalMessageId);
    if (!originalMessage || originalMessage.role !== 'user') return null;

    const chatId = originalMessage.chatId;
    const parentId = originalMessage.parentId ?? null;

    // Get all siblings to determine the next branch index
    const siblings = await this.getSiblingMessages(parentId, chatId);
    const newBranchIndex = siblings.length;

    // Create new user message version
    const newUserMessage: StoredMessage = {
      id: crypto.randomUUID(),
      chatId,
      role: 'user',
      content: newContent,
      attachments: originalMessage.attachments,
      createdAt: new Date(),
      parentId,
      branchId: crypto.randomUUID(),
      branchIndex: newBranchIndex,
      isEdited: true,
      editedAt: new Date()
    };

    await this.saveMessage(newUserMessage);

    return { userMessage: newUserMessage };
  }

  // Get the active path from root to a given message
  async getMessagePath(messageId: string): Promise<StoredMessage[]> {
    const path: StoredMessage[] = [];
    let currentId: string | null = messageId;

    while (currentId) {
      const message = await this.getMessage(currentId);
      if (!message) break;
      path.unshift(message);
      currentId = message.parentId ?? null;
    }

    return path;
  }

  // Branch operations
  async createBranch(
    chatId: string,
    rootMessageId: string,
    name: string
  ): Promise<StoredBranch> {
    if (!this.db) await this.init();

    const branch: StoredBranch = {
      id: crypto.randomUUID(),
      chatId,
      rootMessageId,
      name,
      createdAt: new Date(),
      messageCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['branches'], 'readwrite');
      const store = transaction.objectStore('branches');
      const request = store.put(branch);

      request.onsuccess = () => resolve(branch);
      request.onerror = () => reject(request.error);
    });
  }

  async getBranchesForChat(chatId: string): Promise<StoredBranch[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['branches'], 'readonly');
      const store = transaction.objectStore('branches');
      const index = store.index('chatId');
      const request = index.openCursor(chatId);

      const branches: StoredBranch[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          branches.push(cursor.value);
          cursor.continue();
        } else {
          resolve(branches);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Delete all messages after a given message (for regeneration)
  async deleteMessagesAfter(messageId: string, chatId: string): Promise<void> {
    if (!this.db) await this.init();

    const messagesToDelete: string[] = [];
    
    // Get all messages in chat
    const allMessages = await this.getMessages(chatId);
    
    // Build a map of message relationships
    const childrenMap = new Map<string, string[]>();
    allMessages.forEach(msg => {
      if (msg.parentId) {
        const siblings = childrenMap.get(msg.parentId) || [];
        siblings.push(msg.id);
        childrenMap.set(msg.parentId, siblings);
      }
    });

    // Recursively collect all descendants
    const collectDescendants = (id: string) => {
      const children = childrenMap.get(id) || [];
      children.forEach(childId => {
        messagesToDelete.push(childId);
        collectDescendants(childId);
      });
    };

    collectDescendants(messageId);

    // Delete all collected messages
    for (const id of messagesToDelete) {
      await this.deleteMessage(id);
    }
  }

  // Clear all data
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats', 'messages', 'branches'], 'readwrite');
      transaction.objectStore('chats').clear();
      transaction.objectStore('messages').clear();
      transaction.objectStore('branches').clear();
      
      transaction.oncomplete = () => {
        // Clear the cache to ensure fresh data on next fetch
        this.cache.clear();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const chatDB = new ChatDatabase();
export type { StoredChat, StoredMessage, StoredBranch };
