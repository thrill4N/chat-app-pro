// main chat interface with chatbot intergration
import React, { useState, useEffect, useRef } from 'react';
import { Send, User, LogOut, Search, Bot, MessageCircle } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ChatbotBubble from './ChatbotBubble';
import TypingIndicator from './TypingIndicator';
import { useMessages } from '../../hooks/useMessages';
import { useTyping } from '../../hooks/useTyping';
import { useChatbot } from '../../hooks/useChatbot';
import { isValidMessage, truncateText } from '../../utils/helpers';
import { CHATBOT, isChatbotConversation } from '../../utils/constants';
import toast from 'react-hot-toast';

/**
 * Main Chat Interface Component with Chatbot
 */
const ChatInterface = ({ currentUser, users, onLogout }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Chatbot hook
  const { isThinking, sendToChatbot } = useChatbot(currentUser?.uid);
  
  // Get all users including chatbot
  const allUsers = [CHATBOT, ...users.filter(user => user.uid !== currentUser?.uid)];
  
  // Filter users by search term
  const filteredUsers = allUsers.filter(user =>
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Generate conversation ID
  const conversationId = selectedUser
    ? [currentUser?.uid, selectedUser.uid].sort().join('_')
    : '';
  
  // Message hook (only for human-to-human chats)
  const { 
    messages: humanMessages, 
    loading: humanLoading, 
    sending: humanSending, 
    sendMessage: sendHumanMessage 
  } = useMessages(
    currentUser?.uid,
    selectedUser?.uid && !isChatbotConversation(selectedUser?.uid) ? selectedUser?.uid : null
  );
  
  // Message state for chatbot
  const [chatbotMessages, setChatbotMessages] = useState([]);
  const [chatbotLoading, setChatbotLoading] = useState(false);
  
  // Use appropriate messages based on selected user
  const messages = isChatbotConversation(selectedUser?.uid) ? chatbotMessages : humanMessages;
  const loading = isChatbotConversation(selectedUser?.uid) ? chatbotLoading : humanLoading;
  
  // Typing hook (only for human-to-human)
  const { isTyping } = useTyping(
    conversationId,
    currentUser?.uid,
    selectedUser?.uid
  );
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse, isStreaming]);
  
  // Focus input when user is selected
  useEffect(() => {
    if (selectedUser) {
      inputRef.current?.focus();
      // Load chatbot history if needed
      if (isChatbotConversation(selectedUser?.uid)) {
        loadChatbotHistory();
      }
    }
  }, [selectedUser]);
  
  /**
   * Load chatbot conversation history
   */
  const loadChatbotHistory = async () => {
    // This would fetch from Firestore
    setChatbotMessages([]);
  };
  
  /**
   * Handle sending a message
   */
  const handleSendMessage = async () => {
    if (!selectedUser) {
      toast.error('Please select a user to chat with');
      return;
    }
    
    if (!isValidMessage(messageInput)) {
      toast.error('Message cannot be empty');
      return;
    }
    
    const messageContent = messageInput.trim();
    setMessageInput('');
    
    if (isChatbotConversation(selectedUser?.uid)) {
      // Handle chatbot conversation
      setChatbotLoading(true);
      
      // Add user message to UI immediately
      const userMessage = {
        id: 'temp_' + Date.now(),
        senderId: currentUser.uid,
        receiverId: CHATBOT.ID,
        content: messageContent,
        type: 'text',
        timestamp: new Date(),
        isTemp: true
      };
      
      setChatbotMessages(prev => [...prev, userMessage]);
      
      // Show typing indicator
      setIsStreaming(true);
      setStreamingResponse('');
      
      try {
        // Get AI response
        const aiResponse = await sendToChatbot(messageContent);
        
        if (aiResponse) {
          // Add AI response to messages
          setChatbotMessages(prev => 
            prev.filter(msg => !msg.isTemp).concat([aiResponse])
          );
        }
      } catch (error) {
        toast.error('Failed to get AI response');
        // Remove temporary user message on error
        setChatbotMessages(prev => prev.filter(msg => !msg.isTemp));
      } finally {
        setChatbotLoading(false);
        setIsStreaming(false);
        setStreamingResponse('');
      }
    } else {
      // Handle human-to-human message
      await sendHumanMessage(messageContent);
    }
  };
  
  /**
   * Handle input change
   */
  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
  };
  
  /**
   * Handle key press (Enter to send)
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  /**
   * Render message based on type
   */
  const renderMessage = (message, index) => {
    const isOwn = message.senderId === currentUser?.uid;
    const isAI = message.senderId === CHATBOT.ID || message.type === 'ai_response';
    
    if (isAI) {
      return (
        <ChatbotBubble
          key={message.id || index}
          message={message}
          isStreaming={false}
        />
      );
    }
    
    const user = isOwn ? currentUser : selectedUser;
    
    return (
      <MessageBubble
        key={message.id || index}
        message={message}
        isOwn={isOwn}
        userName={user?.displayName}
        userAvatar={user?.photoURL}
      />
    );
  };
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Users List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* User Profile Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="w-10 h-10 rounded-full border-2 border-white"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">{truncateText(currentUser?.displayName, 20)}</h3>
                <p className="text-xs text-purple-200">Online</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Search Users */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users or AI assistant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>
        
        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No users found
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.uid}
                onClick={() => setSelectedUser(user)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                  selectedUser?.uid === user.uid ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                }`}
              >
                {user.isBot ? (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                ) : user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                    {user.displayName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-800">{user.displayName}</h4>
                    {user.isBot && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">AI</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {user.isBot ? CHATBOT.DESCRIPTION : user.email}
                  </p>
                </div>
                {!user.isBot && (
                  <div className="w-2 h-2 bg-green-500 rounded-full status-online"></div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedUser ? (
          // No user selected
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Welcome to ChatApp</h2>
              <p className="text-gray-500">Select a user or AI assistant to start chatting</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center gap-3">
                {selectedUser.isBot ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                ) : selectedUser.photoURL ? (
                  <img
                    src={selectedUser.photoURL}
                    alt={selectedUser.displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                    {selectedUser.displayName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-800">{selectedUser.displayName}</h3>
                  <p className="text-sm text-green-500">
                    {selectedUser.isBot ? 'AI Assistant • Always here to help' : 'Online'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading && messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">Loading messages...</div>
              ) : messages.length === 0 && !isStreaming ? (
                <div className="text-center text-gray-500 mt-8">
                  {selectedUser.isBot ? (
                    <div>
                      <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">Chat with AI Assistant</p>
                      <p className="text-sm">{CHATBOT.WELCOME_MESSAGE}</p>
                    </div>
                  ) : (
                    'No messages yet. Send a message to start the conversation!'
                  )}
                </div>
              ) : (
                <>
                  {messages.map((message, index) => renderMessage(message, index))}
                  
                  {/* Streaming AI Response */}
                  {isStreaming && (
                    <ChatbotBubble
                      message={null}
                      isStreaming={true}
                      streamingContent={streamingResponse}
                    />
                  )}
                  
                  {/* Thinking Indicator */}
                  {isThinking && !isStreaming && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
                        <Bot className="w-4 h-4 text-blue-500 animate-pulse" />
                        <span className="text-sm text-gray-500">AI is thinking...</span>
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
            
            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    selectedUser.isBot 
                      ? "Ask me anything... I'm here to help!" 
                      : `Message ${selectedUser.displayName}...`
                  }
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-2 resize-none focus:outline-none focus:border-purple-400"
                  rows="2"
                  disabled={isThinking || chatbotLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={
                    (isThinking || chatbotLoading || humanSending) || 
                    !messageInput.trim()
                  }
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {selectedUser.isBot && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Powered by ChatGPT • AI responses are generated and may not always be accurate
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;