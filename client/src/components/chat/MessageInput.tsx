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
import { formatFileSize } from "@/lib/utils";

interface MessageInputProps {
  contactId: string;
}

export default function MessageInput({ contactId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'video' | 'audio' | 'document' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
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
  
  // Handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size limit (20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size cannot exceed 20MB",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
    setIsUploading(true);
    
    // Determine file type
    let type: 'image' | 'video' | 'audio' | 'document' = 'document';
    if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type.startsWith('video/')) {
      type = 'video';
    } else if (file.type.startsWith('audio/')) {
      type = 'audio';
    }
    setAttachmentType(type);
    
    // Create file preview
    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } else {
      // For other file types, just show the file name
      setFilePreview(null);
      setIsUploading(false);
    }
  };
  
  // Cancel file upload
  const cancelFileUpload = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setAttachmentType(null);
    // Reset file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };
  
  // Send file message
  const sendFileMessage = async () => {
    if (!selectedFile || !attachmentType || !currentUser) return;
    
    // In a real app, we would upload to a server/cloud storage here
    // For now, we'll simulate it by converting to data URL
    
    try {
      setIsUploading(true);
      
      // Create a data URL from the file - normally this would be a URL to the uploaded file
      const reader = new FileReader();
      
      const filePromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
      
      const fileDataUrl = await filePromise;
      
      // Create message content with file data
      const fileContent = JSON.stringify({
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        url: fileDataUrl, // In production, this would be a cloud storage URL
      });
      
      // Create optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        senderId: currentUser.id,
        receiverId: contactId,
        content: fileContent,
        type: attachmentType,
        status: 'sent' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add message to UI immediately
      addMessage(optimisticMessage);
      
      // Send message to server
      const response = await sendMessage({
        receiverId: contactId,
        content: fileContent,
        type: attachmentType,
        status: 'sent'
      }, currentUser.id);
      
      // Update message in state with server response
      setMessages(prev => 
        prev.map(msg => msg.id === tempId ? response : msg)
      );
      
      // Reset file state
      cancelFileUpload();
      setIsUploading(false);
      
    } catch (error) {
      console.error('Error sending file:', error);
      toast({
        title: 'Error',
        description: 'Failed to send file. Please try again.',
        variant: 'destructive',
      });
      setIsUploading(false);
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
      
      {/* File attachment preview */}
      {selectedFile && (
        <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              {/* Preview for image */}
              {attachmentType === 'image' && filePreview && (
                <div className="relative w-16 h-16 mr-3">
                  <img 
                    src={filePreview} 
                    alt="Preview" 
                    className="w-16 h-16 object-cover rounded-md" 
                  />
                </div>
              )}
              
              {/* Icon for other file types */}
              {attachmentType !== 'image' && (
                <div className="w-12 h-12 flex items-center justify-center mr-3 bg-gray-200 dark:bg-gray-700 rounded-md">
                  {attachmentType === 'audio' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18V5l12-2v13"></path>
                      <circle cx="6" cy="18" r="3"></circle>
                      <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                  )}
                  {attachmentType === 'video' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"></polygon>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                  )}
                  {attachmentType === 'document' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  )}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {isUploading ? (
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelFileUpload}
                    className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={sendFileMessage}
                    className="h-8 px-2"
                  >
                    Send
                  </Button>
                </>
              )}
            </div>
          </div>
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
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          />
          <Button 
            variant="ghost" 
            size="icon" 
            title="Attach file" 
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </Button>
        </div>
        
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
