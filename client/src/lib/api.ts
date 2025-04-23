// API client with intelligent caching and network optimizations
import * as messageCache from './messageCache';
import { InsertUser, User } from '@shared/schema';

// Get messages between user and contact with caching
export async function getMessages(contactId: string, userId: string) {
  try {
    // First try to get messages from the cache
    const cachedMessages = await messageCache.getCachedMessages(userId, contactId);
    
    // Start the network request immediately but don't await it yet
    const fetchPromise = fetch(`/api/messages/${contactId}?userId=${userId}`);
    
    // Return cached messages immediately if available
    if (cachedMessages.length > 0) {
      console.log(`Retrieved ${cachedMessages.length} cached messages for conversation with ${contactId}`);
      
      // Continue handling the network request in the background
      fetchPromise
        .then(response => {
          if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
          return response.json();
        })
        .then(messages => {
          // Update cache with latest messages
          messageCache.cacheMessages(userId, contactId, messages);
        })
        .catch(error => {
          console.error('Error fetching messages from API:', error);
        });
      
      // Return the cached messages immediately
      return cachedMessages;
    }
    
    // If no cached data available, wait for the network request
    const response = await fetchPromise;
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    
    const messages = await response.json();
    
    // Cache the messages for future requests
    await messageCache.cacheMessages(userId, contactId, messages);
    
    return messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
}

// Get user contacts with caching
export async function getContacts(userId: string) {
  try {
    const response = await fetch(`/api/contacts?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    
    const contacts = await response.json();
    
    // Cache contacts for search functionality
    await messageCache.cacheContacts(contacts);
    
    return contacts;
  } catch (error) {
    console.error('Error getting contacts:', error);
    throw error;
  }
}

// Get pending contact requests
export async function getPendingContactRequests(userId: string) {
  try {
    const response = await fetch(`/api/contacts/requests/pending?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting pending contact requests:', error);
    throw error;
  }
}

// Send a new message and update cache
export async function sendMessage(message: any, userId: string) {
  try {
    const response = await fetch(`/api/messages?userId=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    
    const sentMessage = await response.json();
    
    // Update cache with the new message
    await messageCache.addMessageToCache(userId, sentMessage);
    
    return sentMessage;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Search messages (uses cache for fast local results)
export async function searchMessages(userId: string, query: string) {
  try {
    // First search local cache for immediate results
    const cachedResults = await messageCache.searchCachedMessages(userId, query);
    
    // Then get server results
    const response = await fetch(`/api/messages/search?userId=${userId}&query=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    
    const serverResults = await response.json();
    
    // Cache the server results for future searches
    for (const result of serverResults.results) {
      await messageCache.addMessageToCache(userId, result.message);
      await messageCache.cacheContacts([result.contact]);
    }
    
    // Return the server results (complete set)
    return serverResults;
  } catch (error) {
    console.error('Error searching messages:', error);
    throw error;
  }
}

// Clear all cached data (useful for logout)
export async function clearCachedData() {
  try {
    await messageCache.clearMessageCache();
  } catch (error) {
    console.error('Error clearing cached data:', error);
  }
}

// Auth functions
export async function requestOTP(phoneNumber: string) {
  try {
    const response = await fetch('/auth/request-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber }),
    });
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error requesting OTP:', error);
    throw error;
  }
}

export async function verifyOTP(phoneNumber: string, verificationCode: string) {
  try {
    const response = await fetch('/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber, verificationCode }),
    });
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
}

export async function registerUser(userData: InsertUser) {
  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

export async function logout() {
  try {
    const response = await fetch('/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
}

// Contact management
export async function acceptContactRequest(requestId: string, userId: string) {
  try {
    const response = await fetch(`/api/contacts/accept/${requestId}?userId=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error accepting contact request:', error);
    throw error;
  }
}

export async function rejectContactRequest(requestId: string, userId: string) {
  try {
    const response = await fetch(`/api/contacts/reject/${requestId}?userId=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error rejecting contact request:', error);
    throw error;
  }
}

// User search for adding contacts
export async function searchUsers(query: string, userId: string) {
  try {
    const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}&userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}

// Contact request functions
export async function sendContactRequest(receiverId: string, userId: string) {
  try {
    const response = await fetch('/api/contacts/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userId, 
        receiverId 
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending contact request:', error);
    throw error;
  }
}