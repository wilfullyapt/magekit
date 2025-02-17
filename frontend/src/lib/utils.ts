// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names and resolves Tailwind CSS conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PasswordStrengthResult {
  score: number;
  feedback: string;
}

/**
 * Calculates password strength and provides feedback
 * Returns a score (0-100) and feedback message
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      feedback: 'Please enter a password',
    };
  }

  let score = 0;
  let feedback = '';

  // Length check
  if (password.length >= 12) {
    score += 25;
  } else if (password.length >= 8) {
    score += 15;
  } else {
    feedback = 'Password should be at least 8 characters long';
    return { score, feedback };
  }

  // Character variety checks
  if (/[A-Z]/.test(password)) score += 20; // Uppercase
  if (/[a-z]/.test(password)) score += 20; // Lowercase
  if (/[0-9]/.test(password)) score += 20; // Numbers
  if (/[^A-Za-z0-9]/.test(password)) score += 15; // Special characters

  // Provide feedback based on score
  if (score < 50) {
    feedback = 'Try adding numbers, symbols, and mixed case letters';
  } else if (score < 75) {
    feedback = 'Pretty good, but you can make it stronger';
  } else {
    feedback = 'Strong password!';
  }

  return {
    score: Math.min(100, score),
    feedback,
  };
}

/**
 * Formats a date string into a localized format
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Truncates a string to a specified length and adds ellipsis
 */
export function truncateString(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Formats a number as currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Validates an email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
