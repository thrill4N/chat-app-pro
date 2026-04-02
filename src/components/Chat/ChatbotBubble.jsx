// Special message bubble component for AI responses
import React, { useState } from 'react';
import { Bot, Copy, Check } from 'lucide-react';
import { formatMessageTime, formatFullTime } from '../../utils/helpers';
import { CHATBOT } from '../../utils/constants';

/**
 * Chatbot Message Bubble Component
 * @param {Object} props - Component props
 * @param {Object} props.message - Message object
 * @param {boolean} props.isStreaming - Whether message is streaming
 * @param {string} props.streamingContent - Streaming content
 */
const ChatbotBubble = ({ message, isStreaming, streamingContent = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const displayContent = isStreaming ? streamingContent : message?.content;
  const messageTime = message?.timestamp ? formatMessageTime(message.timestamp) : 'Just now';
  const fullTime = message?.timestamp ? formatFullTime(message.timestamp) : '';
  
  /**
   * Copy message to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };
  
  return (
    <div className="flex justify-start message-enter">
      <div className="flex max-w-[80%] gap-2">
        {/* AI Avatar */}
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
        </div>
        
        {/* Message Bubble */}
        <div
          className="relative group bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* AI Header */}
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
            <Bot className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-blue-600">{CHATBOT.NAME}</span>
            <span className="text-xs text-gray-400">{messageTime}</span>
          </div>
          
          {/* Message Content */}
          <div className="break-words">
            <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
              {displayContent}
              {isStreaming && <span className="animate-pulse">▊</span>}
            </p>
          </div>
          
          {/* Action Buttons - Only show for completed messages */}
          {!isStreaming && message && (
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Copy response"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-400" />
                )}
              </button>
            </div>
          )}
          
          {/* Tooltip with full timestamp */}
          {showTooltip && !isStreaming && message && (
            <div className="absolute bottom-full mb-2 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
              {fullTime}
              <div className="absolute left-2 bottom-0 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatbotBubble;