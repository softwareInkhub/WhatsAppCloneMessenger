import React, { useRef, useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { Message } from "@shared/schema";
import { formatMessageTime, safeDate } from "@/lib/utils";
import { File, FileText, Film, Music, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const { currentUser } = useAuth();
  const { highlightedMessageId } = useChat();
  const messageRef = useRef<HTMLDivElement>(null);
  const isSent = message.senderId === currentUser?.id;
  const isHighlighted = message.id === highlightedMessageId;
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  // Scroll to the message when it's highlighted
  useEffect(() => {
    if (isHighlighted && messageRef.current) {
      // Use requestAnimationFrame to ensure the DOM has been painted
      requestAnimationFrame(() => {
        messageRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "center" 
        });
      });
      
      // Add a visual pulse effect by toggling a class
      if (messageRef.current) {
        messageRef.current.classList.add('message-highlight-pulse');
        
        // Remove the pulse effect after animation completes
        setTimeout(() => {
          if (messageRef.current) {
            messageRef.current.classList.remove('message-highlight-pulse');
          }
        }, 2000);
      }
    }
  }, [isHighlighted]);
  
  // Format time for display using our utility function
  const formatTime = (date: Date | string | null | undefined) => {
    return format(safeDate(date), "h:mm a");
  };
  
  return (
    <div className={`flex items-end ${isSent ? "justify-end" : ""}`}>
      <div
        ref={messageRef}
        className={`rounded-lg p-3 max-w-[80%] shadow-sm ${
          isSent
            ? "bg-chat-sent dark:bg-primary-dark text-gray-800 dark:text-white"
            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
        } ${isHighlighted ? "ring-2 ring-orange-400 dark:ring-orange-500" : ""}`}
      >
        {/* Message content based on type */}
        {message.type === "text" && <p>{message.content}</p>}
        
        {message.type === "image" && (
          <div className="mb-2">
            <div 
              className="rounded-lg overflow-hidden cursor-pointer" 
              onClick={() => setIsImageModalOpen(true)}
            >
              <img 
                src={message.content} 
                alt="Image message" 
                className="max-w-full h-auto max-h-[300px] object-contain" 
              />
            </div>
            <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
              <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-transparent border-none">
                <img 
                  src={message.content} 
                  alt="Image full view" 
                  className="w-full h-auto max-h-[90vh] object-contain"
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
        
        {message.type === "video" && (
          <div className="mb-2">
            <div className="rounded-lg overflow-hidden">
              <video 
                src={message.content} 
                controls
                className="max-w-full h-auto max-h-[300px]"
              >
                Your browser does not support video playback.
              </video>
            </div>
          </div>
        )}
        
        {message.type === "audio" && (
          <div className="mb-2 flex items-center">
            <Music className="h-5 w-5 mr-2 flex-shrink-0" />
            <audio 
              src={message.content} 
              controls
              className="max-w-full"
            >
              Your browser does not support audio playback.
            </audio>
          </div>
        )}
        
        {message.type === "document" && (
          <div className="mb-2">
            <a 
              href={message.content}
              target="_blank"
              rel="noopener noreferrer" 
              className="flex items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <FileText className="h-6 w-6 mr-2 flex-shrink-0 text-blue-500" />
              <div className="overflow-hidden">
                <p className="truncate text-sm font-medium">Document</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Click to open
                </p>
              </div>
              <ExternalLink className="h-4 w-4 ml-2 flex-shrink-0" />
            </a>
          </div>
        )}
        
        {/* Message metadata */}
        {isSent ? (
          <div className="flex justify-end items-center mt-1 space-x-1">
            <span className="text-xs text-gray-500 dark:text-gray-300">
              {formatTime(message.createdAt)}
            </span>
            {/* Status indicators */}
            {message.status === "sent" && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
            {message.status === "delivered" && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L7 17L2 12"></path>
                <path d="M22 6L11 17L10 16"></path>
              </svg>
            )}
            {message.status === "read" && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L7 17L2 12"></path>
                <path d="M22 6L11 17L10 16"></path>
              </svg>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right block">
            {formatTime(message.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}
