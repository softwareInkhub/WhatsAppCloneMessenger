import React, { useRef, useState, useEffect } from 'react';
import { Search, X, MessageSquare, ArrowDown, ArrowUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMessageSearch } from '@/hooks/useMessageSearch';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { safeDate } from '@/lib/utils';

export function SearchBar() {
  const { currentUser } = useAuth();
  const { setActiveContact, highlightMessage } = useChat();
  const { search, clearSearch, results, isLoading, totalResults, query } = useMessageSearch();
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Focus the input when opening the search
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Clear search and close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node) && 
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        clearSearch();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [clearSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      clearSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < (results?.length || 0) - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter' && results && selectedIndex >= 0 && selectedIndex < results.length) {
      handleResultClick(results[selectedIndex]);
    }
  };

  // Handle result click to navigate to the conversation
  const handleResultClick = (result: any) => {
    setActiveContact(result.contact);
    setIsOpen(false);
    clearSearch();
  };

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = safeDate(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Highlight matching text in the message
  const highlightMatches = (text: string, query: string) => {
    if (!query || !text) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <span key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</span> : part
    );
  };

  return (
    <div className="relative w-full" onKeyDown={handleKeyDown}>
      <div className="flex items-center w-full border rounded-md focus-within:ring-1 focus-within:ring-primary">
        <div className="flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search messages..."
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            if (value) {
              setIsOpen(true);
              search(value);
            } else {
              clearSearch();
            }
          }}
          onFocus={() => {
            if (query) setIsOpen(true);
          }}
        />
        {query && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 mr-1"
            onClick={() => {
              clearSearch();
              setIsOpen(false);
              if (inputRef.current) inputRef.current.focus();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search results dropdown */}
      {isOpen && (query || isLoading) && (
        <div 
          ref={resultsRef}
          className="absolute z-50 w-full bg-background rounded-md border shadow-lg mt-1 overflow-hidden max-h-[70vh] overflow-y-auto"
        >
          <div className="p-2 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">
                Search Results
              </h3>
              {isLoading ? (
                <Badge variant="outline" className="bg-muted">
                  Searching...
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted">
                  {totalResults} {totalResults === 1 ? 'result' : 'results'}
                </Badge>
              )}
            </div>
          </div>

          {isLoading && (!results || results.length === 0) && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && (!results || results.length === 0) && query && (
            <div className="p-8 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No messages found</p>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="divide-y">
              {results.map((result, index) => (
                <div 
                  key={result.message.id} 
                  className={`p-3 cursor-pointer hover:bg-muted/50 ${selectedIndex === index ? 'bg-muted' : ''}`}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={result.contact.profilePicture || ''} />
                        <AvatarFallback>{result.contact.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{result.contact.username}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(result.message.createdAt)}
                    </span>
                  </div>
                  
                  <div className="text-sm ml-8 text-muted-foreground line-clamp-2">
                    {highlightMatches(result.message.content, query)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Keyboard navigation hint */}
          {results && results.length > 0 && (
            <div className="p-2 border-t text-xs text-muted-foreground flex justify-center items-center gap-3">
              <div className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                to navigate
              </div>
              <div>Enter to select</div>
              <div>Esc to close</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}