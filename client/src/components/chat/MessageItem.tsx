import React from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Message } from "@shared/schema";
import { formatMessageTime, safeDate } from "@/lib/utils";

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const { currentUser } = useAuth();
  const isSent = message.senderId === currentUser?.id;
  
  // Format time for display using our utility function
  const formatTime = (date: Date | string | null | undefined) => {
    return format(safeDate(date), "h:mm a");
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
        
        {message.type === "image" && (
          <div className="mb-2">
            <div className="rounded-lg overflow-hidden">
              <img src={message.content} alt="Image message" className="max-w-full" />
            </div>
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
