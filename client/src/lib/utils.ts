import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely create a Date object from various possible date inputs
 * This prevents errors when working with potentially null or undefined dates
 */
export function safeDate(date: string | Date | null | undefined): Date {
  if (!date) return new Date(0);
  
  try {
    return new Date(date);
  } catch (error) {
    console.error("Failed to create date from", date, error);
    return new Date(0);
  }
}
