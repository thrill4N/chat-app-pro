// Custom hook for managing real-time messages
import { useState, useEffect, useCallback } from 'react';
import { db } from '../utils/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ERROR_MESSAGES, MESSAGES_PER_PAGE } from '../utils/constants';
import { isValidMessage } from '../utils/helpers';

/**
 * Custom hook for message management
 * @param {string} currentUserId - Current user ID
 * @param {string} otherUserId - Other user ID for private chat
 * @returns {Object} Messages state and methods
 */
export const useMessages = (currentUserId, otherUserId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  /**
   * Send a new message
   * @param {string} content - Message content
   * @returns {Promise<void>}
   */
  const sendMessage = useCallback(async (content) => {
    if (!currentUserId || !otherUserId) {
      toast.error('Please select a user to chat with');
      return;
    }

    if (!isValidMessage(content)) {
      toast.error(`Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`);
      return;
    }

    setSending(true);

    try {
      // Generate conversation ID (sorted user IDs to ensure consistency)
      const conversationId = [currentUserId, otherUserId].sort().join('_');
      
      const messageData = {
        conversationId,
        senderId: currentUserId,
        receiverId: otherUserId,
        content: content.trim(),
        type: 'text',
        timestamp: serverTimestamp(),
        read: false
      };

      const messagesRef = collection(db, 'messages');
      await addDoc(messagesRef, messageData);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(ERROR_MESSAGES.SEND_MESSAGE_FAILED);
      setError(error);
    } finally {
      setSending(false);
    }
  }, [currentUserId, otherUserId]);

  // Set up real-time message listener
  useEffect(() => {
    if (!currentUserId || !otherUserId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Generate conversation ID
    const conversationId = [currentUserId, otherUserId].sort().join('_');
    
    // Create query for messages in this conversation
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc'),
      limit(MESSAGES_PER_PAGE * 2) // Load more messages initially
    );

    // Real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = [];
      snapshot.forEach((doc) => {
        messagesList.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
        });
      });
      
      setMessages(messagesList);
      setLoading(false);
    }, (error) => {
      console.error('Error loading messages:', error);
      toast.error(ERROR_MESSAGES.LOAD_MESSAGES_FAILED);
      setError(error);
      setLoading(false);
    });

    // Cleanup listener on unmount or when users change
    return () => unsubscribe();
  }, [currentUserId, otherUserId]);

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage
  };
};