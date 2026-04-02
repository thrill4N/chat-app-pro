// Custom hook for managing typing indicators
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../utils/firebase';
import { doc, setDoc, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { TYPING_TIMEOUT } from '../utils/constants';

// Simple debounce function
const debounce = (func, wait) => {
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
 * Custom hook for typing indicator
 * @param {string} conversationId - Current conversation ID
 * @param {string} currentUserId - Current user ID
 * @param {string} otherUserId - Other user ID
 * @returns {Object} Typing state and methods
 */
export const useTyping = (conversationId, currentUserId, otherUserId) => {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Typing indicator path in Firestore
  const typingRef = doc(db, 'typing', `${conversationId}_${otherUserId}`);

  /**
   * Start typing indicator
   */
  const startTyping = useCallback(() => {
    if (!currentUserId || !otherUserId || !conversationId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing status in Firestore
    setDoc(typingRef, {
      userId: currentUserId,
      timestamp: serverTimestamp()
    }).catch(console.error);

    // Auto-stop typing after timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, TYPING_TIMEOUT);
  }, [currentUserId, otherUserId, conversationId, typingRef]);

  /**
   * Stop typing indicator
   */
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Remove typing status from Firestore
    deleteDoc(typingRef).catch(console.error);
  }, [typingRef]);

  // Listen for other user's typing status
  useEffect(() => {
    if (!conversationId || !otherUserId || !currentUserId) return;

    const otherTypingRef = doc(db, 'typing', `${conversationId}_${currentUserId}`);
    
    const unsubscribe = onSnapshot(otherTypingRef, (doc) => {
      if (doc.exists() && doc.data().userId === otherUserId) {
        setIsTyping(true);
        
        // Auto-reset typing indicator after timeout
        setTimeout(() => {
          setIsTyping(false);
        }, TYPING_TIMEOUT);
      } else {
        setIsTyping(false);
      }
    }, (error) => {
      console.error('Error listening to typing status:', error);
    });

    return () => unsubscribe();
  }, [conversationId, currentUserId, otherUserId]);

  // Debounced start typing function to prevent excessive writes
  const debouncedStartTyping = useCallback(
    debounce(startTyping, 300),
    [startTyping]
  );

  return {
    isTyping,
    startTyping: debouncedStartTyping,
    stopTyping
  };
};