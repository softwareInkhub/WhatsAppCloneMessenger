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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<User[]>([]);
  const [activeContact, setActiveContact] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(ContactRequest & { sender?: User })[]>([]);
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
        const data = JSON.parse(event.data);
        
        // Handle different message types
        switch (data.type) {
          case 'NEW_MESSAGE':
            handleNewMessage(data.data);
            break;
          case 'MESSAGES_READ':
            handleMessagesRead(data.data);
            break;
          case 'CONTACT_REQUEST':
            handleContactRequest(data.data);
            break;
          case 'CONTACT_REQUEST_ACCEPTED':
            handleContactRequestAccepted(data.data);
            break;
          default:
            console.log("Unknown message type:", data.type);
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

  // Handle incoming messages
  const handleNewMessage = (message: Message) => {
    // Add message to state
    addMessage(message);
    
    // Show notification if message is from someone other than active contact
    if (activeContact?.id !== message.senderId) {
      const sender = contacts.find(c => c.id === message.senderId);
      toast({
        title: `New message from ${sender?.username || 'Unknown'}`,
        description: message.content.length > 30 ? `${message.content.slice(0, 30)}...` : message.content,
      });
    }
  };

  // Handle message status updates
  const handleMessagesRead = (data: { readBy: string, messages: string[] }) => {
    updateMessageStatus(data.messages, "read");
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

  return (
    <ChatContext.Provider
      value={{
        contacts,
        activeContact,
        messages,
        pendingRequests,
        loading,
        setActiveContact,
        setContacts,
        refreshContacts,
        refreshMessages,
        refreshPendingRequests,
        addMessage,
        updateMessageStatus,
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
