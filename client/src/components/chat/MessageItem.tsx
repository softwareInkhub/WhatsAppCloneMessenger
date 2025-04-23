import React from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Message } from "@shared/schema";
import { formatFileSize } from "@/lib/utils";

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const { currentUser } = useAuth();
  const isSent = message.senderId === currentUser?.id;
  
  // Extract file data from message content for attachments
  const getFileData = () => {
    if (message.type !== 'text') {
      try {
        return JSON.parse(message.content);
      } catch (e) {
        return null;
      }
    }
    return null;
  };
  
  const fileData = getFileData();
  
  // Format time for display
  const formatTime = (dateString: string | Date) => {
    return format(new Date(dateString), "h:mm a");
  };
  
  return (
    <div className={`flex items-end ${isSent ? "justify-end" : ""}`}>
      <div
        className={`rounded-lg p-3 max-w-[80%] shadow-sm ${
          isSent
            ? "bg-chat-sent dark:bg-primary-dark text-gray-800 dark:text-white"
            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
        }`}
      >
        {/* Message content based on type */}
        {message.type === "text" && <p>{message.content}</p>}
        
        {message.type === "image" && fileData && (
          <div className="mb-2">
            <div className="rounded-lg overflow-hidden">
              <img src={fileData.url} alt={fileData.name || "Image"} className="max-w-full" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{fileData.name}</p>
          </div>
        )}
        
        {message.type === "video" && fileData && (
          <div className="mb-2">
            <div className="rounded-lg overflow-hidden">
              <video controls className="max-w-full">
                <source src={fileData.url} type={fileData.type} />
                Your browser does not support video playback.
              </video>
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">{fileData.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(fileData.size)}</p>
            </div>
          </div>
        )}
        
        {message.type === "audio" && fileData && (
          <div className="mb-2">
            <audio controls className="w-full max-w-[250px]">
              <source src={fileData.url} type={fileData.type} />
              Your browser does not support audio playback.
            </audio>
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">{fileData.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(fileData.size)}</p>
            </div>
          </div>
        )}
        
        {message.type === "document" && fileData && (
          <div className="flex items-start mb-2">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-md p-2 mr-2 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div className="flex-1 overflow-hidden">
              <a 
                href={fileData.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm font-medium text-primary hover:underline block truncate"
              >
                {fileData.name}
              </a>
              <p className="text-xs text-muted-foreground">{formatFileSize(fileData.size)}</p>
            </div>
          </div>
        )}
        
        {/* Message metadata */}
        {isSent ? (
          <div className="flex justify-end items-center mt-1 space-x-1">
            <span className="text-xs text-gray-500 dark:text-gray-300">
              {message.createdAt ? formatTime(message.createdAt) : ""}
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
            {message.createdAt ? formatTime(message.createdAt) : ""}
          </span>
        )}
      </div>
    </div>
  );
}
