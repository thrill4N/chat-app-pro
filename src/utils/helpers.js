// Helper utilities for date formatting, validation, etc.
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

/**
 * Format timestamp for message display
 * @param {Date|Object} timestamp - Firestore timestamp or Date object
 * @returns {string} Formatted time string
 */
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  
  if (isToday(date)) {
    return format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else if (now.getFullYear() === date.getFullYear()) {
    return format(date, 'MMM d');
  } else {
    return format(date, 'MMM d, yyyy');
  }
};

/**
 * Format timestamp for tooltip
 * @param {Date|Object} timestamp - Firestore timestamp or Date object
 * @returns {string} Full formatted date and time
 */
export const formatFullTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return format(date, 'PPPpp');
};

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {Date|Object} timestamp - Firestore timestamp or Date object
 * @returns {string} Relative time string
 */
export const getRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return formatDistanceToNow(date, { addSuffix: true });
};

/**
 * Validate message content
 * @param {string} message - Message to validate
 * @returns {boolean} True if valid
 */
export const isValidMessage = (message) => {
  return message && message.trim().length > 0 && message.trim().length <= MAX_MESSAGE_LENGTH;
};

/**
 * Sanitize input to prevent XSS
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (!input) return '';
  return input.replace(/[<>]/g, '');
};

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Debounce function for limiting function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
};

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};