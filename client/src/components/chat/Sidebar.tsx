import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { acceptContactRequest, rejectContactRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import ContactItem from "./ContactItem";
import { SearchBar } from "./SearchBar";
import { format } from "date-fns";
import { User } from "@shared/schema";

interface SidebarProps {
  onAddContact: () => void;
  onOpenSettings: () => void;
  onSelectContact: (contact: User) => void;
  isMobile: boolean;
}

export default function Sidebar({
  onAddContact,
  onOpenSettings,
  onSelectContact,
  isMobile,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { currentUser } = useAuth();
  const { contacts, pendingRequests, loading, refreshContacts, refreshPendingRequests, setContacts } = useChat();
  const { toast } = useToast();
  
  // Filter contacts based on search query
  const filteredContacts = contacts.filter(contact => 
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Accept contact request mutation
  const acceptMutation = useMutation({
    mutationFn: ({ requestId, userId }: { requestId: string; userId: string }) => 
      acceptContactRequest(requestId, userId),
    onSuccess: (data) => {
      // Update our contacts list directly with the new contact
      const newContact = data.contact;
      
      // Add the new contact to our contacts list
      setContacts((prev: User[]) => {
        // Check if contact already exists
        if (prev.some((c: User) => c.id === newContact.id)) {
          return prev;
        }
        return [...prev, newContact];
      });
      
      // Refresh pending requests to remove the accepted one
      refreshPendingRequests();
      
      toast({
        title: "Contact Request Accepted",
        description: `You are now connected with ${newContact.username}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept contact request",
        variant: "destructive",
      });
    },
  });
  
  // Reject contact request mutation
  const rejectMutation = useMutation({
    mutationFn: ({ requestId, userId }: { requestId: string; userId: string }) => 
      rejectContactRequest(requestId, userId),
    onSuccess: () => {
      refreshPendingRequests();
      toast({
        title: "Contact Request Rejected",
        description: "The contact request has been rejected",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject contact request",
        variant: "destructive",
      });
    },
  });
  
  // Handle accept contact request
  const handleAcceptRequest = (requestId: string) => {
    if (!currentUser) return;
    acceptMutation.mutate({ requestId, userId: currentUser.id });
  };
  
  // Handle reject contact request
  const handleRejectRequest = (requestId: string) => {
    if (!currentUser) return;
    rejectMutation.mutate({ requestId, userId: currentUser.id });
  };
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const lastSeen = currentUser?.lastSeen ? format(new Date(currentUser.lastSeen), 'MMM d, h:mm a') : 'Unknown';
  
  return (
    <aside className="w-full md:w-96 md:flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
      {/* Header with user info and actions */}
      <header className="bg-white dark:bg-dark-surface p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <Avatar className="h-10 w-10">
            <AvatarImage src={currentUser?.profilePicture || ""} alt={currentUser?.username || ""} />
            <AvatarFallback>{currentUser?.username ? getInitials(currentUser.username) : "UN"}</AvatarFallback>
          </Avatar>
          <span className="ml-3 font-medium">{currentUser?.username || "User"}</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onAddContact}
            title="Add new contact"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <line x1="9" y1="10" x2="15" y2="10"></line>
              <line x1="12" y1="7" x2="12" y2="13"></line>
            </svg>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onOpenSettings}
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </Button>
        </div>
      </header>
      
      {/* Search Box */}
      <div className="p-2 bg-white dark:bg-dark-surface">
        <SearchBar />
      </div>
      
      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide bg-white dark:bg-dark-surface">
        {/* Loading state */}
        {loading.contacts && (
          <div className="flex justify-center items-center h-16 text-gray-500">
            Loading contacts...
          </div>
        )}
        
        {/* Empty state */}
        {!loading.contacts && contacts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <p>No contacts yet</p>
            <Button 
              variant="link" 
              onClick={onAddContact}
              className="mt-2"
            >
              Add your first contact
            </Button>
          </div>
        )}
        
        {/* Mobile welcome message (only show if there are contacts but nothing is displayed in main area) */}
        {isMobile && contacts.length > 0 && (
          <div className="mt-8 mx-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
            <h3 className="font-medium mb-2">Select a contact to start chatting</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tap on any contact to open your conversation
            </p>
          </div>
        )}
        
        {/* Pending contact requests */}
        {pendingRequests.filter(req => req.receiverId === currentUser?.id).map((request) => (
          <div key={request.id} className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center bg-gray-50 dark:bg-gray-800">
            <Avatar className="h-12 w-12">
              <AvatarImage src={request.sender?.profilePicture || ""} alt={request.sender?.username || ""} />
              <AvatarFallback>{request.sender?.username ? getInitials(request.sender.username) : "UN"}</AvatarFallback>
            </Avatar>
            
            <div className="ml-3 flex-1 flex flex-col min-w-0">
              <div className="flex justify-between items-baseline">
                <span className="font-medium truncate">{request.sender?.username || "Unknown"}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'Recently'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">Contact request</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="default"
                size="icon"
                className="h-9 w-9 rounded-full bg-primary hover:bg-primary-dark"
                onClick={() => handleAcceptRequest(request.id)}
                disabled={acceptMutation.isPending || rejectMutation.isPending}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </Button>
              <Button 
                variant="secondary"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => handleRejectRequest(request.id)}
                disabled={acceptMutation.isPending || rejectMutation.isPending}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
            </div>
          </div>
        ))}
        
        {/* Contacts list */}
        {filteredContacts.map((contact) => (
          <ContactItem 
            key={contact.id}
            contact={contact}
            onClick={() => onSelectContact(contact)}
          />
        ))}
      </div>
      
      {/* Bottom navigation (mobile only) */}
      {isMobile && (
        <nav className="md:hidden flex justify-around py-3 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-gray-800">
          <Button variant="ghost" className="p-2 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </Button>
          <Button variant="ghost" className="p-2 text-gray-500 dark:text-gray-400" onClick={onAddContact}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
          </Button>
          <Button variant="ghost" className="p-2 text-gray-500 dark:text-gray-400" onClick={onOpenSettings}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </Button>
        </nav>
      )}
    </aside>
  );
}
