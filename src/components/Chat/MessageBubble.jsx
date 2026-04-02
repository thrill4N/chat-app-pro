// Individual message bubble component
import React, { useState } from 'react';
import { formatMessageTime, formatFullTime, getInitials } from '../../utils/helpers';
import { Check, CheckCheck, User } from 'lucide-react';

/**
 * Message Bubble Component
 * @param {Object} props - Component props
 * @param {Object} props.message - Message object
 * @param {boolean} props.isOwn - Whether message is from current user
 * @param {string} props.userName - User's display name
 * @param {string} props.userAvatar - User's avatar URL
 */
const MessageBubble = ({ message, isOwn, userName, userAvatar }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const messageTime = formatMessageTime(message.timestamp);
  const fullTime = formatFullTime(message.timestamp);
  
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} message-enter`}>
      <div className={`flex max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
        {/* Avatar - only show for received messages */}
        {!isOwn && (
          <div className="flex-shrink-0 mt-1">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                {getInitials(userName)}
              </div>
            )}
          </div>
        )}
        
        {/* Message Bubble */}
        <div
          className={`relative group ${
            isOwn
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-white text-gray-800 border border-gray-200'
          } rounded-2xl px-4 py-2 shadow-sm hover:shadow-md transition-shadow`}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* Message Content */}
          <div className="break-words">
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
          
          {/* Timestamp and Status */}
          <div className={`flex items-center gap-1 mt-1 text-xs ${
            isOwn ? 'text-purple-200' : 'text-gray-400'
          }`}>
            <span>{messageTime}</span>
            {isOwn && (
              <span>
                {message.read ? (
                  <CheckCheck className="w-3 h-3" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
              </span>
            )}
          </div>
          
          {/* Tooltip with full timestamp */}
          {showTooltip && (
            <div className={`absolute bottom-full mb-2 ${
              isOwn ? 'right-0' : 'left-0'
            } bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none`}>
              {fullTime}
              <div className={`absolute ${
                isOwn ? 'right-2' : 'left-2'
              } bottom-0 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800`}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;