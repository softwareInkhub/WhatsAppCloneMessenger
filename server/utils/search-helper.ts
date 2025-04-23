/**
 * Utility functions for advanced message search functionality
 */

import { Message } from '@shared/schema';

interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  includeMetadata?: boolean;
  dateRange?: {
    start?: Date | string;
    end?: Date | string;
  };
  limit?: number;
}

/**
 * Filter messages based on search criteria with advanced options
 * @param messages Messages to search through
 * @param query Search query
 * @param options Search options
 * @returns Filtered messages
 */
export function filterMessages(
  messages: Message[],
  query: string,
  options: SearchOptions = {},
): Message[] {
  if (!query || query.trim().length < 2) {
    return [];
  }

  // Default options
  const {
    caseSensitive = false,
    wholeWord = false,
    includeMetadata = false,
    dateRange,
    limit = 100,
  } = options;

  // Normalize query based on case sensitivity setting
  const normalizedQuery = caseSensitive ? query : query.toLowerCase();

  // Prepare regex for whole word search if needed
  const searchRegex = wholeWord
    ? new RegExp(`\\b${escapeRegExp(normalizedQuery)}\\b`, caseSensitive ? '' : 'i')
    : null;

  return messages
    .filter(message => {
      // Date range filtering
      if (dateRange) {
        // Ensure we have a valid date
        if (message.createdAt) {
          const messageDate = new Date(message.createdAt);
          
          if (dateRange.start) {
            const startDate = dateRange.start instanceof Date ? 
              dateRange.start : new Date(dateRange.start);
            if (messageDate < startDate) {
              return false;
            }
          }
          
          if (dateRange.end) {
            const endDate = dateRange.end instanceof Date ? 
              dateRange.end : new Date(dateRange.end);
            if (messageDate > endDate) {
              return false;
            }
          }
        }
      }

      // Content filtering
      const content = caseSensitive ? message.content : message.content.toLowerCase();
      
      // Whole word match using regex
      if (wholeWord && searchRegex) {
        return searchRegex.test(message.content);
      }
      
      // Simple substring match
      if (content.includes(normalizedQuery)) {
        return true;
      }
      
      // Check metadata fields if requested
      if (includeMetadata) {
        // Check message type if it exists
        if (message.type) {
          const type = caseSensitive ? message.type : message.type.toLowerCase();
          if (type.includes(normalizedQuery)) {
            return true;
          }
        }
        
        // Check message ID (could be useful for debug/admin purposes)
        const id = caseSensitive ? message.id : message.id.toLowerCase();
        if (id.includes(normalizedQuery)) {
          return true;
        }
      }
      
      return false;
    })
    .slice(0, limit);
}

/**
 * Highlight matched text in a message
 * @param text Original text
 * @param query Search query
 * @param caseSensitive Whether search is case sensitive
 * @returns Object with highlighted parts
 */
export function highlightMatches(
  text: string,
  query: string,
  caseSensitive = false,
): { parts: Array<{ text: string; highlight: boolean }> } {
  if (!query || !text) {
    return { parts: [{ text, highlight: false }] };
  }

  try {
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(escapeRegExp(query), flags);
    const parts: Array<{ text: string; highlight: boolean }> = [];
    
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    
    // Use exec in a loop instead of matchAll for better compatibility
    while ((match = regex.exec(text)) !== null) {
      // match.index is always defined in RegExpExecArray
      
      // Add non-matching text before this match
      if (match.index > lastIndex) {
        parts.push({
          text: text.substring(lastIndex, match.index),
          highlight: false,
        });
      }
      
      // Add the matching text
      parts.push({
        text: match[0],
        highlight: true,
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text after the last match
    if (lastIndex < text.length) {
      parts.push({
        text: text.substring(lastIndex),
        highlight: false,
      });
    }
    
    return { parts };
  } catch (error) {
    console.error('Error highlighting matches:', error);
    return { parts: [{ text, highlight: false }] };
  }
}

/**
 * Escape special characters in string for use in a RegExp
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}