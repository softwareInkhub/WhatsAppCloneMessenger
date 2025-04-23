// Message caching service using IndexedDB
// This service provides device-side caching for instant search and message retrieval

interface DBSchema {
  messages: {
    key: string; // Composite key: userId + contactId + messageId
    value: {
      id: string;
      senderId: string;
      receiverId: string;
      content: string;
      type: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      contactId: string; // The ID of the conversation partner
      userId: string;    // The ID of the current user
    };
    indexes: {
      'by-conversation': [string, string]; // [userId, contactId]
      'by-content': string; // Content for full-text search
      'by-date': string;    // createdAt for sorting
    };
  };
  contacts: {
    key: string; // Contact ID
    value: any;  // Contact object
  };
}

// Helper for handling DB version changes and schema upgrades
const DB_VERSION = 1;
const DB_NAME = 'whatspe-message-cache';

// Connection promise to reuse across the app
let dbPromise: Promise<IDBDatabase> | null = null;

// Initialize the database connection
export async function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      console.error('IndexedDB not supported');
      reject(new Error('IndexedDB not supported'));
      return;
    }

    console.log('Opening message cache database...');
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as any).error);
      reject((event.target as any).error);
    };

    request.onsuccess = (event) => {
      console.log('Message cache database opened successfully');
      resolve((event.target as any).result);
    };

    request.onupgradeneeded = (event) => {
      console.log('Creating/upgrading message cache database schema...');
      const db = (event.target as any).result as IDBDatabase;

      // Messages store with indexes for search
      if (!db.objectStoreNames.contains('messages')) {
        const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
        
        // Create composite index for conversation lookup
        messagesStore.createIndex('by-conversation', ['userId', 'contactId'], { unique: false });
        
        // Create index for content search
        messagesStore.createIndex('by-content', 'content', { unique: false });
        
        // Create index for date sorting
        messagesStore.createIndex('by-date', 'createdAt', { unique: false });
      }

      // Contacts store for quick contact lookups
      if (!db.objectStoreNames.contains('contacts')) {
        db.createObjectStore('contacts', { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

// Store messages in cache
export async function cacheMessages(userId: string, contactId: string, messages: any[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');

    // Prepare messages for storage with the conversation reference
    const preprocessedMessages = messages.map(message => ({
      ...message,
      userId,
      contactId: message.senderId === userId ? message.receiverId : message.senderId
    }));

    // Store each message
    for (const message of preprocessedMessages) {
      store.put(message);
    }

    // Return a promise that resolves when the transaction completes
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as any).error);
    });
  } catch (error) {
    console.error('Error caching messages:', error);
    throw error;
  }
}

// Store contacts in cache
export async function cacheContacts(contacts: any[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('contacts', 'readwrite');
    const store = tx.objectStore('contacts');

    // Store each contact
    for (const contact of contacts) {
      store.put(contact);
    }

    // Return a promise that resolves when the transaction completes
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as any).error);
    });
  } catch (error) {
    console.error('Error caching contacts:', error);
    throw error;
  }
}

// Get cached messages for a conversation
export async function getCachedMessages(userId: string, contactId: string): Promise<any[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('messages', 'readonly');
    const store = tx.objectStore('messages');
    const index = store.index('by-conversation');

    // Get all messages for this conversation
    const request = index.getAll([userId, contactId]);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        // Sort by date before returning
        const messages = request.result || [];
        messages.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateA - dateB;
        });
        resolve(messages);
      };
      request.onerror = (e) => reject((e.target as any).error);
    });
  } catch (error) {
    console.error('Error getting cached messages:', error);
    return [];
  }
}

// Get cached contact by ID
export async function getCachedContact(contactId: string): Promise<any | null> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('contacts', 'readonly');
    const store = tx.objectStore('contacts');
    const request = store.get(contactId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject((e.target as any).error);
    });
  } catch (error) {
    console.error('Error getting cached contact:', error);
    return null;
  }
}

// Search cached messages
export async function searchCachedMessages(userId: string, query: string): Promise<Array<{message: any, contact: any}>> {
  if (!query || query.trim().length < 2) return [];
  
  try {
    const db = await openDatabase();
    const tx = db.transaction(['messages', 'contacts'], 'readonly');
    const messagesStore = tx.objectStore('messages');
    const contactsStore = tx.objectStore('contacts');

    // Get all messages (we'll filter in memory for better search)
    const request = messagesStore.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const messages = request.result || [];
        const lowerQuery = query.toLowerCase();
        
        // Filter messages that match search terms
        const matchingMessages = messages.filter((msg: any) => 
          msg.userId === userId && 
          msg.content.toLowerCase().includes(lowerQuery)
        );
        
        // Get contacts for each matching message
        const results: Array<{message: any, contact: any}> = [];
        
        for (const message of matchingMessages) {
          const contactId = message.senderId === userId ? message.receiverId : message.senderId;
          
          // Get contact (can optimize with a Map if needed for larger sets)
          const contactRequest = contactsStore.get(contactId);
          
          // Convert to promise for cleaner handling
          const contact = await new Promise((resolveContact) => {
            contactRequest.onsuccess = () => resolveContact(contactRequest.result || null);
            contactRequest.onerror = () => resolveContact(null);
          });
          
          if (contact) {
            results.push({ message, contact });
          }
        }
        
        // Sort by date (newest first)
        results.sort((a, b) => {
          const dateA = new Date(a.message.createdAt).getTime();
          const dateB = new Date(b.message.createdAt).getTime();
          return dateB - dateA;
        });
        
        resolve(results);
      };
      request.onerror = (e) => reject((e.target as any).error);
    });
  } catch (error) {
    console.error('Error searching cached messages:', error);
    return [];
  }
}

// Clear all cached data (useful for logout)
export async function clearMessageCache(): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(['messages', 'contacts'], 'readwrite');
    tx.objectStore('messages').clear();
    tx.objectStore('contacts').clear();

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as any).error);
    });
  } catch (error) {
    console.error('Error clearing message cache:', error);
    throw error;
  }
}

// Add a new message to the cache
export async function addMessageToCache(userId: string, message: any): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');

    // Add conversation reference
    const enhancedMessage = {
      ...message,
      userId,
      contactId: message.senderId === userId ? message.receiverId : message.senderId
    };

    store.put(enhancedMessage);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as any).error);
    });
  } catch (error) {
    console.error('Error adding message to cache:', error);
    throw error;
  }
}

// Update message status in cache
export async function updateCachedMessageStatus(messageId: string, status: string): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    
    // Get the message first
    const request = store.get(messageId);
    
    request.onsuccess = () => {
      if (request.result) {
        const message = request.result;
        message.status = status;
        store.put(message);
      }
    };

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as any).error);
    });
  } catch (error) {
    console.error('Error updating cached message status:', error);
    throw error;
  }
}