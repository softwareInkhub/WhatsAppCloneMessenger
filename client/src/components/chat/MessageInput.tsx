import React, { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";
import { AttachmentUploader } from "./AttachmentUploader";

interface MessageInputProps {
  contactId: string;
}

export default function MessageInput({ contactId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { currentUser } = useAuth();
  const { addMessage, sendTypingStatus, typingContacts } = useChat();
  const { toast } = useToast();
  
  // Check if the current contact is typing
  const isContactTyping = typingContacts[contactId];
  
  // Text message mutation
  const textMutation = useMutation({
    mutationFn: (content: string) => 
      sendMessage({ 
        receiverId: contactId,
        content,
        type: 'text',
        status: 'sent'
      }, currentUser!.id),
    onSuccess: (data) => {
      addMessage(data);
      setMessage("");
      sendTypingStatus(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    },
  });
  
  // Attachment message mutation
  const attachmentMutation = useMutation({
    mutationFn: (params: { url: string, type: 'image' | 'audio' | 'video' | 'document' }) => 
      sendMessage({ 
        receiverId: contactId,
        content: params.url,
        type: params.type,
        status: 'sent'
      }, currentUser!.id),
    onSuccess: (data) => {
      addMessage(data);
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: (error) => {
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send attachment",
        variant: "destructive",
      });
    },
  });
  
  // Handle file upload
  const handleFileSelect = async (file: File) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to send attachments",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Simulate progress (normally would come from upload progress events)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      // Determine file type
      let fileType: 'image' | 'audio' | 'video' | 'document' = 'document';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('audio/')) fileType = 'audio';
      else if (file.type.startsWith('video/')) fileType = 'video';
      
      // Mock file upload function - in a real app you'd upload to S3/Cloudinary
      // const fileUrl = await uploadFile(file, setUploadProgress);
      
      // For development, we'll create a local object URL
      const fileUrl = URL.createObjectURL(file);
      
      // Clear the fake progress interval
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Send the message with the file URL
      attachmentMutation.mutate({ url: fileUrl, type: fileType });
      
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    }
  };
  
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
    
    textMutation.mutate(message);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    // Focus the input after emoji selection
    inputRef.current?.focus();
  };
  
  // Debounce input changes to send typing status
  useEffect(() => {
    if (message.trim() && contactId) {
      // Send typing status when user starts typing
      sendTypingStatus(true);
    }
  }, [message, contactId, sendTypingStatus]);
  
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
        {/* Emoji Picker */}
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        
        {/* Attachment Uploader */}
        <AttachmentUploader 
          onFileSelect={handleFileSelect}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
        
        <div className="flex-1 mx-2">
          <Input
            ref={inputRef}
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
          disabled={textMutation.isPending || !message.trim()}
        >
          {textMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
