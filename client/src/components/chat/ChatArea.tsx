import React, { useEffect, useRef } from "react";
import { useChat } from "@/contexts/ChatContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import MessageItem from "./MessageItem";
import MessageInput from "./MessageInput";
import { format } from "date-fns";
import { safeDate } from "@/lib/utils";

interface ChatAreaProps {
  onBackToContacts: () => void;
  isMobile: boolean;
}

export default function ChatArea({ onBackToContacts, isMobile }: ChatAreaProps) {
  const { activeContact, messages, loading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Group messages by date with proper date handling to prevent invalid date errors
  const groupedMessages = messages.reduce((groups, message) => {
    // Convert the date safely, handling all edge cases
    let dateObj: Date;
    try {
      // Use direct instantiation first (faster)
      if (typeof message.createdAt === 'string') {
        dateObj = new Date(message.createdAt);
      } else if (message.createdAt instanceof Date) {
        dateObj = message.createdAt;
      } else {
        // Fall back to current date if null/undefined
        dateObj = new Date();
      }
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        dateObj = new Date(); // Use current date as fallback if invalid
      }
    } catch (e) {
      // Handle any unexpected errors
      console.error("Error parsing date:", e);
      dateObj = new Date();
    }
    
    const dateStr = dateObj.toDateString();
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(message);
    return groups;
  }, {} as Record<string, typeof messages>);
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.slice(0, 2).toUpperCase();
  };
  
  // Format date for display with safe handling
  const formatDate = (dateString: string) => {
    try {
      // Direct date conversion is safer than using safeDate here
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Unknown date";
      }
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      } else {
        return format(date, "MMMM d, yyyy");
      }
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Unknown date";
    }
  };
  
  // Show welcome screen if no active contact
  if (!activeContact) {
    return (
      <main className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 h-full">
        <div className="h-full flex flex-col items-center justify-center p-4">
          <div className="h-32 w-32 rounded-full bg-primary-dark flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Welcome to WhatsPe</h2>
          <p className="text-center text-text-secondary dark:text-gray-400 max-w-md">
            Select a contact to start messaging or add a new contact to expand your network.
          </p>
        </div>
      </main>
    );
  }
  
  return (
    <main className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 h-full">
      {/* Chat Header */}
      <header className="bg-white dark:bg-dark-surface p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-3" 
              onClick={onBackToContacts}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </Button>
          )}
          
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={activeContact.profilePicture || ""} alt={activeContact.username} />
              <AvatarFallback>{getInitials(activeContact.username)}</AvatarFallback>
            </Avatar>
            {/* Online status indicator with safe date handling */}
            <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ${
              (() => {
                try {
                  const lastSeenDate = typeof activeContact.lastSeen === 'string' 
                    ? new Date(activeContact.lastSeen)
                    : activeContact.lastSeen instanceof Date 
                      ? activeContact.lastSeen 
                      : new Date();
                  
                  return lastSeenDate.getTime() > Date.now() - 1000 * 60 * 5 
                    ? "bg-green-500" 
                    : "bg-gray-400";
                } catch (e) {
                  return "bg-gray-400";
                }
              })()
            } border-2 border-white dark:border-gray-900`}></span>
          </div>
          
          <div className="ml-3">
            <div className="font-medium">{activeContact.username}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {(() => {
                try {
                  const lastSeenDate = typeof activeContact.lastSeen === 'string' 
                    ? new Date(activeContact.lastSeen)
                    : activeContact.lastSeen instanceof Date 
                      ? activeContact.lastSeen 
                      : new Date();
                  
                  return lastSeenDate.getTime() > Date.now() - 1000 * 60 * 5 
                    ? "Online" 
                    : `Last seen ${format(lastSeenDate, "h:mm a")}`;
                } catch (e) {
                  return "Last seen recently";
                }
              })()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" title="Voice call">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </Button>
          <Button variant="ghost" size="icon" title="Video call">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
          </Button>
          <Button variant="ghost" size="icon" title="More options">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </Button>
        </div>
      </header>
      
      {/* Messages Container */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ 
          backgroundImage: 'url(https://i.pinimg.com/originals/7e/56/04/7e5604954d9573ec1fc8ce9a3d7e1465.jpg)',
          backgroundRepeat: 'repeat'
        }}
      >
        {/* Loading indicator */}
        {loading.messages && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
        
        {/* Empty state */}
        {!loading.messages && messages.length === 0 && (
          <div className="flex justify-center items-center h-24 bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">
              No messages yet. Start the conversation!
            </p>
          </div>
        )}
        
        {/* Messages grouped by date */}
        {Object.keys(groupedMessages).map((date) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex justify-center mb-4">
              <span className="bg-white dark:bg-gray-800 px-4 py-1 rounded-full text-xs text-gray-500 dark:text-gray-400 shadow-sm">
                {formatDate(date)}
              </span>
            </div>
            
            {/* Messages for this date */}
            <div className="space-y-4">
              {groupedMessages[date].map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
            </div>
          </div>
        ))}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <MessageInput contactId={activeContact.id} />
    </main>
  );
}
