import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Message } from "@shared/schema";

interface MessageInputProps {
  contactId: string;
}

export default function MessageInput({ contactId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const { currentUser } = useAuth();
  const { addMessage, sendTypingStatus, typingContacts, setMessages } = useChat();
  const { toast } = useToast();
  
  // Check if the current contact is typing
  const isContactTyping = typingContacts[contactId];
  
  const mutation = useMutation({
    mutationFn: (content: string) => 
      sendMessage({ 
        receiverId: contactId,
        content,
        type: 'text',
        status: 'sent' // Adding required status field
      }, currentUser!.id),
    onMutate: async (content) => {
      // Optimistic update - create temporary message with pending state
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        senderId: currentUser!.id,
        receiverId: contactId,
        content,
        type: 'text' as const,
        status: 'sent' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add optimistic message to UI immediately
      addMessage(optimisticMessage);
      
      // Clear message input and typing status
      setMessage("");
      sendTypingStatus(false);
      
      return { tempId, optimisticMessage };
    },
    onSuccess: (data, _, context) => {
      if (!context) return;
      
      // Replace temporary message with real one from server
      const { tempId } = context;
      
      // Update message in state
      setMessages(prev => 
        prev.map(msg => msg.id === tempId ? data : msg)
      );
    },
    onError: (error, _, context) => {
      if (context) {
        // Remove failed optimistic message
        setMessages(prev => prev.filter(msg => msg.id !== context.tempId));
      }
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    },
  });
  
  const handleSendMessage = () => {
    if (!message.trim()) return;
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to send messages",
        variant: "destructive",
      });
      return;
    }
    
    mutation.mutate(message);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Debounce input changes to send typing status
  useEffect(() => {
    if (message.trim() && contactId) {
      // Send typing status when user starts typing
      sendTypingStatus(true);
    }
  }, [message, contactId]);
  
  return (
    <div className="bg-white dark:bg-dark-surface p-3 border-t border-gray-200 dark:border-gray-800">
      {isContactTyping && (
        <div className="flex items-center mb-2 text-xs text-muted-foreground">
          <div className="flex space-x-1 items-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '600ms' }}></div>
          </div>
          <span className="ml-2">Typing...</span>
        </div>
      )}
      <div className="flex items-center">
        <Button variant="ghost" size="icon" title="Add emoji">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </Button>
        <Button variant="ghost" size="icon" title="Attach file">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
          </svg>
        </Button>
        
        <div className="flex-1 mx-2">
          <Input
            type="text"
            placeholder="Type a message"
            className="w-full py-2 px-3 rounded-full bg-gray-100 dark:bg-gray-800"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <Button
          variant="default"
          size="icon"
          className="rounded-full bg-primary hover:bg-primary-dark"
          onClick={handleSendMessage}
          disabled={mutation.isPending || !message.trim()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </Button>
      </div>
    </div>
  );
}
