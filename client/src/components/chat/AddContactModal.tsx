import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { searchUsers, sendContactRequest } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";

interface AddContactModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddContactModal({ isOpen, onOpenChange }: AddContactModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  // Search users query
  const { data: searchResults, refetch, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users/search', searchQuery],
    enabled: false,
    queryFn: () => currentUser ? searchUsers(searchQuery, currentUser.id) : Promise.resolve([]),
  });
  
  // Send contact request mutation
  const mutation = useMutation({
    mutationFn: (receiverId: string) => 
      sendContactRequest(receiverId, currentUser!.id),
    onSuccess: () => {
      toast({
        title: "Contact Request Sent",
        description: "Your request has been sent successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send contact request",
        variant: "destructive",
      });
    },
  });
  
  // Handle search
  const handleSearch = () => {
    if (searchQuery.length < 3) {
      toast({
        title: "Search error",
        description: "Please enter at least 3 characters to search",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearching(true);
    refetch();
  };
  
  // Handle send contact request
  const handleSendRequest = (receiverId: string) => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to add contacts",
        variant: "destructive",
      });
      return;
    }
    
    mutation.mutate(receiverId);
  };
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[calc(100%-32px)] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-4 pt-5 pb-0">
          <DialogTitle className="text-xl">Add New Contact</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Search for users by username to add them as contacts.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4">
          <div className="mb-4">
            <label htmlFor="search-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search by username
            </label>
            <div className="relative flex items-center">
              <Input
                id="search-username"
                placeholder="Enter username to search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 h-8 w-8"
                onClick={handleSearch}
                disabled={isLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </Button>
            </div>
          </div>
          
          {/* Search Results */}
          <div className="mt-4 max-h-[45vh] overflow-y-auto rounded-md">
            {isLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            )}
            
            {isSearching && searchResults && searchResults.length === 0 && (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                No users found with this username
              </div>
            )}
            
            {searchResults && searchResults.map((user) => (
              <div 
                key={user.id} 
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-md mb-2 flex items-center justify-between bg-white dark:bg-gray-850"
              >
                <div className="flex items-center flex-grow min-w-0">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={user.profilePicture || ""} alt={user.username} />
                    <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-3 truncate">
                    <div className="font-medium truncate">{user.username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username.toLowerCase()}</div>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="ml-2 px-3 bg-primary text-white hover:bg-primary-dark flex-shrink-0"
                  onClick={() => handleSendRequest(user.id)}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && mutation.variables === user.id ? "Sending..." : "Add"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
