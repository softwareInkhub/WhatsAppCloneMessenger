import React, { useState } from "react";
import { format } from "date-fns";
import { User } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { safeDate, getInitials, formatLastSeen } from "@/lib/utils";
import ContactProfile from "./ContactProfile";

interface ContactItemProps {
  contact: User;
  onClick: () => void;
}

export default function ContactItem({ contact, onClick }: ContactItemProps) {
  const [showProfile, setShowProfile] = useState(false);
  const { messages } = useChat();
  const { currentUser } = useAuth();
  
  // Find latest message with this contact
  const latestMessage = messages.filter(
    (message) => message.senderId === contact.id || message.receiverId === contact.id
  ).sort((a, b) => {
    const dateA = safeDate(a.createdAt).getTime();
    const dateB = safeDate(b.createdAt).getTime();
    return dateB - dateA;
  })[0];
  
  // Format message preview
  const getMessagePreview = () => {
    if (!latestMessage) return "Start a conversation";
    
    if (latestMessage.type === "text") {
      return latestMessage.content.length > 30
        ? `${latestMessage.content.slice(0, 30)}...`
        : latestMessage.content;
    } else if (latestMessage.type === "image") {
      return "📷 Image";
    } else if (latestMessage.type === "video") {
      return "🎥 Video";
    } else if (latestMessage.type === "audio") {
      return "🎵 Audio";
    } else if (latestMessage.type === "document") {
      return "📄 Document";
    }
    
    return "Message";
  };
  
  // Format time
  const formatTime = (date: Date) => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
      return format(date, "h:mm a");
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return format(date, "EEEE"); // Day name
    } else {
      return format(date, "MM/dd/yyyy");
    }
  };
  
  // Check if user is online (last seen within 5 minutes)
  const isOnline = contact.lastSeen && safeDate(contact.lastSeen).getTime() > Date.now() - 1000 * 60 * 5;

  // Count unread messages from this contact
  const unreadCount = messages.filter(
    message => 
      message.senderId === contact.id && 
      message.status !== 'read' &&
      currentUser?.id === message.receiverId
  ).length;
  
  // Get thumbnail image for unread message (only first unread)
  const getMessageThumbnail = () => {
    if (unreadCount === 0) return null;
    
    const unreadMessage = messages.find(
      message => 
        message.senderId === contact.id && 
        message.status !== 'read' &&
        currentUser?.id === message.receiverId
    );
    
    if (!unreadMessage) return null;
    
    // For image messages, extract thumbnail from content
    if (unreadMessage.type === 'image') {
      try {
        const imageData = JSON.parse(unreadMessage.content);
        return imageData.url;
      } catch (e) {
        return null;
      }
    }
    
    return null;
  };
  
  const messageThumbnail = getMessageThumbnail();
  
  // Handle profile view (stop event propagation)
  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowProfile(true);
  };
  
  return (
    <>
      <div 
        className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
        onClick={onClick}
      >
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={contact.profilePicture || ""} alt={contact.username} />
            <AvatarFallback>{getInitials(contact.username)}</AvatarFallback>
          </Avatar>
          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${
            isOnline ? "bg-green-500" : "bg-gray-400"
          } border-2 border-white dark:border-gray-800`}></span>
        </div>
        
        <div className="ml-3 flex-1 flex flex-col min-w-0">
          <div className="flex justify-between items-baseline">
            <span className="font-medium truncate">{contact.username}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {latestMessage && latestMessage.createdAt ? formatTime(safeDate(latestMessage.createdAt)) : ""}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {getMessagePreview()}
            </span>
            
            {/* Unread message count badge */}
            {unreadCount > 0 && (
              <Badge className="h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                {unreadCount}
              </Badge>
            )}
          </div>

          {/* Message thumbnail for images (only shown if unread) */}
          {messageThumbnail && (
            <div className="mt-1 relative">
              <img 
                src={messageThumbnail} 
                alt="Message Preview" 
                className="h-12 w-12 object-cover rounded-md border border-gray-200" 
              />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-white dark:border-gray-800"></span>
            </div>
          )}
        </div>
        
        {/* Show profile info button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="ml-1 text-gray-400 hover:text-gray-500"
          onClick={handleProfileClick}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </Button>
      </div>

      {/* Contact profile dialog */}
      <ContactProfile 
        contact={contact} 
        open={showProfile} 
        onOpenChange={setShowProfile} 
      />
    </>
  );
}