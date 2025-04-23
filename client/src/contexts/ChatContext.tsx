import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { Message, User, ContactRequest } from "@shared/schema";
import { getContacts, getPendingContactRequests, getMessages } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { safeDate } from "@/lib/utils";

interface ChatContextType {
  contacts: User[];
  activeContact: User | null;
  messages: Message[];
  pendingRequests: (ContactRequest & { sender?: User })[];
  typingContacts: Record<string, boolean>; // Map of userId -> isTyping status
  loading: {
    contacts: boolean;
    messages: boolean;
    pendingRequests: boolean;
  };
  setActiveContact: (contact: User | null) => void;
  setContacts: React.Dispatch<React.SetStateAction<User[]>>;
  refreshContacts: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  refreshPendingRequests: () => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageIds: string[], status: "delivered" | "read") => void;
  sendTypingStatus: (isTyping: boolean) => void; // Send typing status to active contact
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<User[]>([]);
  const [activeContact, setActiveContact] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(ContactRequest & { sender?: User })[]>([]);
  const [typingContacts, setTypingContacts] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState({
    contacts: false,
    messages: false,
    pendingRequests: false,
  });
  
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      // Disconnect if not authenticated
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // Create WebSocket connection with explicit path
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws?userId=${currentUser.id}`;
    console.log("Connecting to WebSocket:", wsUrl);
    
    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log("WebSocket connection established");
    };
    
    ws.onmessage = (event) => {
      try {
        // Guard against null or non-string data
        if (!event.data) {
          console.error("Received empty WebSocket message");
          return;
        }
        
        // Safely try to parse the JSON data
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (parseError) {
          console.error("Failed to parse WebSocket message:", parseError, event.data);
          return;
        }
        
        // Handle different message types - optimized with shorter type names
        const type = data.type || data.t; // Support both formats
        const payload = data.data || data.d || {}; // Support both formats, default to empty object
        
        // Log the message type
        if (type) {
          console.log(`WebSocket message received: ${type}`);
        } else {
          console.warn("Received WebSocket message without type:", data);
          return; // Skip processing messages without a type
        }
        
        // Process based on message type
        switch (type) {
          case 'NEW_MESSAGE':
          case 'MSG': // Shortened format
            handleNewMessage(payload);
            break;
            
          case 'MESSAGES_READ':
          case 'READ': // Shortened format
            handleMessagesRead(payload);
            break;
            
          case 'CONTACT_REQUEST':
          case 'REQ': // Shortened format
            handleContactRequest(payload);
            break;
            
          case 'CONTACT_REQUEST_ACCEPTED':
          case 'REQ_ACC': // Shortened format
            handleContactRequestAccepted(payload);
            break;
            
          case 'TYPING':
            // Extract typing data with fallbacks for ALL possible field names
            // Support both full field names AND compressed field names
            // it = isTyping, s = senderId
            const isTyping = payload.isTyping !== undefined ? payload.isTyping : 
                            (payload.it !== undefined ? payload.it : false);
                            
            const senderId = payload.senderId || payload.sender_id || payload.s || '';
            
            // Only process if we have a valid sender ID
            if (senderId) {
              handleTypingStatus(senderId, isTyping);
            } else if (payload.s && typeof payload.s === 'string') {
              // Try once more with the compressed format directly
              handleTypingStatus(payload.s, payload.it);
            } else {
              console.warn("Typing event missing sender ID:", payload);
            }
            break;
            
          case 'CONN': // Connection confirmation
            // Log confirmation, but don't fail if id is missing
            console.log("WebSocket connection confirmed:", payload.id || 'unknown ID');
            break;
            
          default:
            console.log("Unknown message type:", type);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
        // Continue running even after an error - don't crash the WebSocket connection
      }
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      // We'll handle reconnection in the onclose handler
    };
    
    ws.onclose = () => {
      console.log("WebSocket connection closed");
      
      // Try to reconnect after a delay if we're still authenticated
      if (isAuthenticated && currentUser) {
        setTimeout(() => {
          console.log("Attempting to reconnect WebSocket...");
          if (wsRef.current === ws) {
            wsRef.current = null;
            
            // Create new connection with explicit path
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws?userId=${currentUser.id}`;
            console.log("Reconnecting to WebSocket:", wsUrl);
            
            const newWs = new WebSocket(wsUrl);
            wsRef.current = newWs;
          }
        }, 3000);
      }
    };
    
    wsRef.current = ws;
    
    // Load initial data
    refreshContacts();
    refreshPendingRequests();
    
    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, currentUser]);

  // Load messages when active contact changes
  useEffect(() => {
    if (activeContact) {
      refreshMessages();
    } else {
      setMessages([]);
    }
  }, [activeContact]);

  // Handle incoming messages with robust error handling for all message formats
  const handleNewMessage = (message: any) => {
    try {
      // Validate that we received a proper message object to prevent crashes
      if (!message || typeof message !== 'object') {
        console.error("Received invalid message object:", message);
        return;
      }
      
      // Support for BOTH full field names AND compressed field names
      // s = senderId, r = receiverId, c = content, t = type, st = status, ts = timestamp
      const id = message.id;
      const senderId = message.senderId || message.sender_id || message.s;
      const receiverId = message.receiverId || message.receiver_id || message.r;
      const content = message.content || message.c || '';
      const type = message.type || message.t || 'text';
      const status = message.status || message.st || 'sent';
      const timestamp = message.timestamp || message.ts || message.createdAt || message.created_at || new Date().toISOString();
      const createdAt = message.createdAt || message.created_at || timestamp;
      const updatedAt = message.updatedAt || message.updated_at || timestamp;
      
      // Check for minimum required fields to ensure it's a valid message
      if (!id || !senderId) {
        console.error("Message missing minimum required fields:", message);
        return;
      }
      
      // Normalize data format to handle all possible message formats
      // Only include properties that exist in the Message type
      const normalizedMessage: Message = {
        id,
        senderId,
        receiverId: receiverId || currentUser?.id || '',
        content,
        type: type as any, // Type assertion to satisfy TypeScript
        status: status as any, // Type assertion to satisfy TypeScript
        createdAt,
        updatedAt
      };
      
      // Add message to state
      addMessage(normalizedMessage);
      
      // Show notification if message is from someone other than active contact
      if (activeContact?.id !== normalizedMessage.senderId) {
        // Look up sender in contacts
        const sender = contacts.find(c => c.id === normalizedMessage.senderId);
        
        // Show toast notification with sender name and partial message
        toast({
          title: `New message from ${sender?.username || 'Unknown'}`,
          description: normalizedMessage.content && normalizedMessage.content.length > 30 
            ? `${normalizedMessage.content.slice(0, 30)}...` 
            : (normalizedMessage.content || 'New message'),
        });
      }
    } catch (error) {
      console.error("Error handling new message:", error, "message:", message);
    }
  };

  // Handle message status updates
  const handleMessagesRead = (data: any) => {
    // Safely handle different message formats and prevent errors that crash the interface
    try {
      // Guard against null or undefined data
      if (!data) {
        console.error("Received empty data in handleMessagesRead");
        return;
      }
      
      // Check the shape of the data and handle different possible formats
      const messageIds = data.messages || data.messageIds || [];
      
      // Make sure it's actually an array before trying to use it
      if (!Array.isArray(messageIds)) {
        console.error("Expected messages array but received:", typeof messageIds, data);
        return;
      }
      
      // Only update if we have actual message IDs
      if (messageIds.length > 0) {
        updateMessageStatus(messageIds, "read");
      }
    } catch (error) {
      console.error("Error in handleMessagesRead:", error, "data:", data);
    }
  };

  // Handle incoming contact requests with error prevention
  const handleContactRequest = (requestData: any) => {
    try {
      // Validate input data
      if (!requestData || typeof requestData !== 'object') {
        console.error("Received invalid contact request:", requestData);
        return;
      }
      
      // Check if we have both the request and sender info
      if (!requestData.id || !requestData.sender) {
        console.error("Contact request missing required fields:", requestData);
        return;
      }
      
      // Make sure the sender has a username for the notification
      const senderUsername = requestData.sender.username || 'Someone';
      
      // Add to pending requests
      setPendingRequests(prev => [...prev, requestData]);
      
      // Show notification
      toast({
        title: "New contact request",
        description: `${senderUsername} sent you a contact request`,
      });
    } catch (error) {
      console.error("Error handling contact request:", error, "data:", requestData);
    }
  };

  // Handle accepted contact requests with error prevention
  const handleContactRequestAccepted = (data: any) => {
    try {
      // Validate input data
      if (!data || typeof data !== 'object') {
        console.error("Received invalid contact request acceptance:", data);
        return;
      }
      
      // Check if we have both the request and contact info
      if (!data.request || !data.contact) {
        console.error("Contact request acceptance missing required fields:", data);
        return;
      }
      
      // Make sure the contact has a username for the notification
      const contactUsername = data.contact.username || 'Someone';
      
      // Add the new contact directly to the contacts list
      setContacts(prev => {
        // Check if contact already exists to prevent duplicates
        if (prev.some(c => c.id === data.contact.id)) {
          return prev;
        }
        return [...prev, data.contact];
      });
      
      // Remove from pending requests if present
      if (data.request.id) {
        setPendingRequests(prev => prev.filter(req => req.id !== data.request.id));
      }
      
      // Show notification
      toast({
        title: "Contact request accepted",
        description: `${contactUsername} accepted your contact request`,
      });
    } catch (error) {
      console.error("Error handling contact request acceptance:", error, "data:", data);
    }
  };

  // Refresh contacts list
  const refreshContacts = async () => {
    if (!currentUser) return;
    
    setLoading(prev => ({ ...prev, contacts: true }));
    try {
      const contactsList = await getContacts(currentUser.id);
      setContacts(contactsList);
    } catch (error) {
      console.error("Failed to load contacts:", error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, contacts: false }));
    }
  };

  // Refresh messages with active contact
  const refreshMessages = async () => {
    if (!currentUser || !activeContact) return;
    
    setLoading(prev => ({ ...prev, messages: true }));
    try {
      const messagesList = await getMessages(activeContact.id, currentUser.id);
      setMessages(messagesList);
    } catch (error) {
      console.error("Failed to load messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  };

  // Refresh pending contact requests
  const refreshPendingRequests = async () => {
    if (!currentUser) return;
    
    setLoading(prev => ({ ...prev, pendingRequests: true }));
    try {
      const requests = await getPendingContactRequests(currentUser.id);
      setPendingRequests(requests);
    } catch (error) {
      console.error("Failed to load pending requests:", error);
      toast({
        title: "Error",
        description: "Failed to load contact requests",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, pendingRequests: false }));
    }
  };

  // Add a new message to the state
  const addMessage = (message: Message) => {
    setMessages(prev => {
      // Check if message already exists
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      
      return [...prev, message].sort((a, b) => {
        const dateA = safeDate(a.createdAt).getTime();
        const dateB = safeDate(b.createdAt).getTime();
        return dateA - dateB;
      });
    });
  };

  // Update message status
  const updateMessageStatus = (messageIds: string[], status: "delivered" | "read") => {
    setMessages(prev => 
      prev.map(message => 
        messageIds.includes(message.id) 
          ? { ...message, status } 
          : message
      )
    );
  };

  // Handle typing indicator - with debounce to prevent too many WebSocket messages
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Send typing status to the active contact
  const sendTypingStatus = (isTyping: boolean) => {
    if (!wsRef.current || !activeContact || !currentUser || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Send typing status via WebSocket
    wsRef.current.send(JSON.stringify({
      t: 'TYPING', // Using short message type for bandwidth efficiency
      d: {
        recipientId: activeContact.id,
        isTyping
      }
    }));

    // If typing, automatically set to false after 3 seconds of inactivity
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(false);
      }, 3000);
    }
  };

  // Handle typing indicator update from server with robust error handling
  const handleTypingStatus = (senderId: any, isTyping: any) => {
    try {
      // Validate sender ID
      if (!senderId || typeof senderId !== 'string') {
        console.error("Invalid sender ID in typing status:", senderId);
        return;
      }
      
      // Validate isTyping (coerce to boolean if needed)
      const typingStatus = isTyping === true || isTyping === 'true' || isTyping === 1;
      
      // Update typing contacts state
      setTypingContacts(prev => ({
        ...prev,
        [senderId]: typingStatus
      }));
      
      // If typing indicator is set to false, clear it after 1.5 seconds
      // This ensures a smooth UX without abrupt disappearance
      if (!typingStatus) {
        setTimeout(() => {
          setTypingContacts(prev => {
            // Additional null/undefined check for robustness
            if (!prev) return {};
            
            // Check if the typing status is still false
            if (prev[senderId] === false) {
              const newState = {...prev};
              delete newState[senderId];
              return newState;
            }
            return prev;
          });
        }, 1500);
      }
    } catch (error) {
      console.error("Error handling typing status:", error, "senderId:", senderId, "isTyping:", isTyping);
    }
  };

  // We don't need this secondary WebSocket handler since we already updated the main one

  return (
    <ChatContext.Provider
      value={{
        contacts,
        activeContact,
        messages,
        pendingRequests,
        typingContacts,
        loading,
        setActiveContact,
        setContacts,
        refreshContacts,
        refreshMessages,
        refreshPendingRequests,
        addMessage,
        updateMessageStatus,
        sendTypingStatus
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
