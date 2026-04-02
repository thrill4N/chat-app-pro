// creating a typing status indicator
// Typing indicator component
import React from 'react';

/**
 * Typing Indicator Component
 * @param {Object} props - Component props
 * @param {string} props.userName - Name of the user who is typing
 * @param {boolean} props.isTyping - Whether someone is typing
 */
const TypingIndicator = ({ userName, isTyping }) => {
  if (!isTyping) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg w-fit mb-2 animate-slide-in">
      <div className="flex gap-1">
        <div className="typing-dot w-2 h-2 bg-gray-500 rounded-full"></div>
        <div className="typing-dot w-2 h-2 bg-gray-500 rounded-full"></div>
        <div className="typing-dot w-2 h-2 bg-gray-500 rounded-full"></div>
      </div>
      <span className="text-sm text-gray-600">
        {userName} is typing...
      </span>
    </div>
  );
};

export default TypingIndicator;