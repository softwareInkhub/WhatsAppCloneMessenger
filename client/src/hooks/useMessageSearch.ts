import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as messageCache from '../lib/messageCache';

type SearchResult = {
  message: any;
  contact: any;
};

type SearchState = {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
  totalResults: number;
};

/**
 * Hook for searching messages both in cache and on the server
 * - Provides fast local search results first
 * - Then fetches complete results from server
 * - Merges results for best user experience
 */
export function useMessageSearch() {
  const { currentUser } = useAuth();
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    isLoading: false,
    error: null,
    totalResults: 0,
  });

  const search = useCallback(async (query: string) => {
    if (!currentUser) return;
    
    // Trim the query
    const trimmedQuery = query.trim();
    
    // Reset or update the search query
    setState(prev => ({
      ...prev,
      query: trimmedQuery,
      isLoading: trimmedQuery.length > 0,
      results: trimmedQuery !== prev.query ? [] : prev.results,
    }));

    if (trimmedQuery.length < 2) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        results: [],
        totalResults: 0 
      }));
      return;
    }

    try {
      // First check local cache for immediate results
      const cachedResults = await messageCache.searchCachedMessages(currentUser.id, trimmedQuery);
      
      // Update with cached results right away (if the query is still the same)
      setState(prev => {
        if (prev.query !== trimmedQuery) return prev;
        return {
          ...prev,
          results: cachedResults,
          totalResults: cachedResults.length,
          // Still loading full results
        };
      });
      
      // Then fetch from server for complete results
      const response = await fetch(`/api/messages/search?userId=${currentUser.id}&query=${encodeURIComponent(trimmedQuery)}`);
      
      if (!response.ok) {
        throw new Error(`Server search failed: ${response.statusText}`);
      }
      
      const serverData = await response.json();
            
      // Update with complete results (if the query is still the same)
      setState(prev => {
        if (prev.query !== trimmedQuery) return prev;
        
        // Merge server results with any cached results we might have missed
        // Use a Map to avoid duplicates
        const resultsMap = new Map<string, SearchResult>();
        
        // Add cached results first
        cachedResults.forEach(result => {
          resultsMap.set(result.message.id, result);
        });
        
        // Add/replace with server results
        if (serverData && serverData.results && Array.isArray(serverData.results)) {
          serverData.results.forEach((result: SearchResult) => {
            resultsMap.set(result.message.id, result);
          });
        }
        
        // Convert back to array and sort by date
        const mergedResults = Array.from(resultsMap.values())
          .sort((a, b) => {
            const dateA = new Date(a.message.createdAt).getTime();
            const dateB = new Date(b.message.createdAt).getTime();
            return dateB - dateA;
          });
        
        return {
          ...prev,
          results: mergedResults,
          totalResults: mergedResults.length,
          isLoading: false,
          error: null,
        };
      });
      
      // Cache the server results for future searches
      if (serverData && serverData.results && Array.isArray(serverData.results)) {
        for (const result of serverData.results) {
          if (result && result.message && result.contact) {
            await messageCache.addMessageToCache(currentUser.id, result.message);
            await messageCache.cacheContacts([result.contact]);
          }
        }
      }
    } catch (error) {
      console.error('Message search error:', error);
      
      setState(prev => {
        if (prev.query !== trimmedQuery) return prev;
        return {
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      });
    }
  }, [currentUser]);

  // Clear search results
  const clearSearch = useCallback(() => {
    setState({
      query: '',
      results: [],
      isLoading: false,
      error: null,
      totalResults: 0,
    });
  }, []);

  return {
    ...state,
    search,
    clearSearch,
  };
}