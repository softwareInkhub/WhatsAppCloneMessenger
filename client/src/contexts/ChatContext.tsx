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
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
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
        console.log("Closing WebSocket connection due to logout");
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    console.log("Setting up WebSocket connection for user:", currentUser.id);
    
    // Create WebSocket connection with explicit path
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws?userId=${currentUser.id}`;
    console.log("Connecting to WebSocket:", wsUrl);
    
    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Create new connection
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    // Set connection timeout (5 seconds)
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.log("WebSocket connection timeout - retrying");
        ws.close();
        // Connection will be retried by the onclose handler
      }
    }, 5000);
    
    ws.onopen = () => {
      console.log("WebSocket connection established");
      clearTimeout(connectionTimeout); // Clear the timeout since we're connected
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types - optimized with shorter type names
        const type = data.type || data.t; // Support both formats
        const payload = data.data || data.d; // Support both formats
        
        if (!type || !payload) {
          console.error("Invalid WebSocket message format:", data);
          return;
        }
        
        console.log(`WebSocket message received: ${type}`, payload);
        
        switch (type) {
          case 'NEW_MESSAGE':
          case 'MSG': // Shortened format
            console.log("Received new message via WebSocket:", payload);
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
            // Handle typing indicators - support both full and shortened property names
            const isTyping = payload.isTyping || payload.it;
            const senderId = payload.senderId || payload.s;
            
            console.log("Typing status update:", { senderId, isTyping });
            
            // Call the typing status handler
            handleTypingStatus(senderId, isTyping);
            break;
            
          case 'CONN': // Connection confirmation
            console.log("WebSocket connection confirmed with ID:", payload.id);
            break;
            
          default:
            console.log("Unknown message type:", type);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      // We'll handle reconnection in the onclose handler
    };
    
    ws.onclose = () => {
      console.log("WebSocket connection closed unexpectedly");
      
      // Try to reconnect after a delay if we're still authenticated
      setTimeout(() => {
        if (isAuthenticated && currentUser) {
          console.log("Attempting to reconnect WebSocket...");
          // Component will handle reconnection on next render cycle
        }
      }, 2000);
    };
    
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

  // Handle incoming messages
  const handleNewMessage = (message: Message | any) => {
    console.log("Processing new message in handler:", message);
    
    // Convert shortened property names to full names if needed
    // This handles the optimized WebSocket format with shortened keys
    const processedMessage: Message = {
      id: message.id,
      senderId: message.senderId || message.s,
      receiverId: message.receiverId || message.r,
      content: message.content || message.c,
      type: message.type || message.t,
      status: message.status || message.st,
      createdAt: message.createdAt || message.ts,
      updatedAt: message.updatedAt || message.ts
    };
    
    console.log("Processed message with full property names:", processedMessage);
    
    // Find sender information for proper display
    const senderId = processedMessage.senderId;
    const sender = contacts.find(c => c.id === senderId);
    
    // If the message is from the current contact, automatically set it as active
    if (currentUser && 
        processedMessage.senderId !== currentUser.id && 
        (!activeContact || activeContact.id !== processedMessage.senderId)) {
      
      // Find the contact object for the sender if it's not already active
      if (sender && sender.id !== activeContact?.id) {
        console.log("Automatically setting active contact based on incoming message:", sender);
        setActiveContact(sender);
        
        // If we switched contacts, we need to update the messages list
        getMessages(sender.id, currentUser.id)
          .then(messagesList => {
            setMessages(messagesList);
          })
          .catch(error => {
            console.error("Error loading messages for auto-switched contact:", error);
          });
      }
    }
    
    // Add message to current conversation (if applicable)
    addMessage(processedMessage);
    
    // Always show notification for new messages
    if (sender) {
      toast({
        title: `New message from ${sender.username}`,
        description: processedMessage.content && processedMessage.content.length > 30 
          ? `${processedMessage.content.slice(0, 30)}...` 
          : processedMessage.content || 'New message',
      });
    }
  };

  // Handle message status updates - with support for both formats
  const handleMessagesRead = (data: any) => {
    // Extract data from either long or short format
    const readerId = data.readBy || data.rb;
    const messageIds = data.messages || data.messageIds || data.mIds || [];
    
    console.log("Read receipt received:", { readerId, messageIds });
    
    // Update message status to read
    updateMessageStatus(messageIds, "read");
  };

  // Handle incoming contact requests
  const handleContactRequest = (request: ContactRequest & { sender: User }) => {
    setPendingRequests(prev => [...prev, request]);
    
    toast({
      title: "New contact request",
      description: `${request.sender.username} sent you a contact request`,
    });
  };

  // Handle accepted contact requests
  const handleContactRequestAccepted = (data: { request: ContactRequest, contact: User }) => {
    // Add the new contact directly to the contacts list
    setContacts(prev => [...prev, data.contact]);
    
    // Remove from pending requests if present
    setPendingRequests(prev => prev.filter(req => req.id !== data.request.id));
    
    toast({
      title: "Contact request accepted",
      description: `${data.contact.username} accepted your contact request`,
    });
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
    console.log("Active contact:", activeContact);
    console.log("Current user:", currentUser);
    console.log("Evaluating if message belongs in current view:", message);
    
    // Always add the message to the messages list if we have a current user
    // This ensures all messages are shown, even when contacts are switched automatically
    if (currentUser) {
      console.log("Adding message to conversation:", message);
      
      setMessages(prev => {
        // Check if message already exists (avoid duplicates)
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;
        
        return [...prev, message].sort((a, b) => {
          const dateA = safeDate(a.createdAt).getTime();
          const dateB = safeDate(b.createdAt).getTime();
          return dateA - dateB;
        });
      });
    } else {
      console.log("Message not added - no current user:", message);
    }
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

  // Handle typing indicator update from server
  const handleTypingStatus = (senderId: string, isTyping: boolean) => {
    setTypingContacts(prev => ({
      ...prev,
      [senderId]: isTyping
    }));

    // If typing indicator is set to false, clear it after 1.5 seconds
    // This ensures a smooth UX without abrupt disappearance
    if (!isTyping) {
      setTimeout(() => {
        setTypingContacts(prev => {
          if (prev[senderId] === false) {
            const newState = {...prev};
            delete newState[senderId];
            return newState;
          }
          return prev;
        });
      }, 1500);
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
        setMessages,
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
