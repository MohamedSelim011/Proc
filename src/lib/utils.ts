import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Filters out Arabic characters from a string, keeping only English characters, numbers, spaces, and common punctuation
 * @param text - The input text to filter
 * @returns The filtered text with only English characters
 */
export function filterArabicCharacters(text: string): string {
  // Remove Arabic characters and other non-English characters
  // Keep: English letters (a-z, A-Z), numbers (0-9), spaces, and common punctuation
  // Remove: Arabic characters (\u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF, \uFB50-\uFDFF, \uFE70-\uFEFF)
  return text.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '');
}

/**
 * Filters out non-Arabic characters from a string, keeping only Arabic characters, numbers, spaces, and common punctuation
 * @param text - The input text to filter
 * @returns The filtered text with only Arabic characters
 */
export function filterNonArabicCharacters(text: string): string {
  // Remove English letters (a-z, A-Z) and keep only Arabic characters, numbers, spaces, and common punctuation
  // Keep: Arabic characters (\u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF, \uFB50-\uFDFF, \uFE70-\uFEFF), numbers (0-9), spaces, and common punctuation
  // Remove: English letters (a-z, A-Z) and other non-Arabic characters
  // Allow common punctuation: period, comma, parentheses, hyphen, slash, colon, semicolon, question mark, exclamation, quotes, Arabic punctuation
  return text.replace(/[a-zA-Z]/g, '').replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF0-9\s\.\,\-\(\)\/\:\;\?\!\'\"\u060C\u061B\u061F\u0640]/g, '');
}

/**
 * Filters phone number input to only allow digits, plus sign for country code, and spaces for formatting
 * @param text - The input text to filter
 * @returns The filtered text with only digits, +, and spaces
 */
export function filterPhoneNumber(text: string): string {
  // Keep only digits (0-9), plus sign (+), and spaces for formatting
  return text.replace(/[^\d\+\s]/g, '');
}

/**
 * Validates a phone number
 * @param phone - The phone number to validate
 * @returns An error message if invalid, or null if valid
 */
export function validatePhoneNumber(phone: string): string | null {
  if (!phone || !phone.trim()) {
    return 'Phone number is required';
  }
  
  // Remove formatting characters to get only digits
  const digitsOnly = phone.replace(/[\+\s]/g, '');
  
  // Check if it contains only digits
  if (!/^\d+$/.test(digitsOnly)) {
    return 'Phone number must contain only digits';
  }
  
  // Check minimum length (at least 7 digits for a valid phone number)
  if (digitsOnly.length < 7) {
    return 'Phone number must be at least 7 digits';
  }
  
  // Check if it's just a single digit like "0"
  if (digitsOnly.length === 1) {
    return 'Phone number must be at least 7 digits';
  }
  
  // Check maximum length (reasonable limit, e.g., 15 digits including country code)
  if (digitsOnly.length > 15) {
    return 'Phone number is too long (maximum 15 digits)';
  }
  
  return null;
}