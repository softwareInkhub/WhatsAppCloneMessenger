import { useState, useEffect } from 'react';

/**
 * Custom hook that detects whether a media query matches
 * 
 * @param query The media query to check, e.g. "(max-width: 640px)"
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Safe default (avoid hydration mismatch)
  const getMatches = (): boolean => {
    // Check if window is defined (for SSR)
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches());

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Update the state initially and whenever the media query changes
    const updateMatches = (): void => {
      setMatches(mediaQuery.matches);
    };
    
    // Set up the listener immediately
    updateMatches();
    
    // Set up event listener
    mediaQuery.addEventListener('change', updateMatches);
    
    // Clean up
    return () => {
      mediaQuery.removeEventListener('change', updateMatches);
    };
  }, [query]);

  return matches;
}