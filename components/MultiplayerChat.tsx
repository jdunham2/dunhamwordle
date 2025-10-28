import React, { useState, useRef, useEffect } from 'react';

export interface ChatMessage {
  from: string;
  message: string;
  timestamp: number;
  isOwn: boolean;
}

interface MultiplayerChatProps {
  messages: ChatMessage[];
  playerName: string;
  onSendMessage: (message: string) => void;
  isConnected: boolean;
}

export const MultiplayerChat: React.FC<MultiplayerChatProps> = ({
  messages,
  playerName,
  onSendMessage,
  isConnected
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputMessage.trim() && isConnected) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`fixed bottom-4 right-4 bg-gray-800 rounded-lg shadow-2xl transition-all duration-300 ${isExpanded ? 'w-80 h-96' : 'w-80 h-14'} z-40`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-750"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-100 font-semibold text-sm">Chat</span>
          {messages.length > 0 && !isExpanded && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {messages.filter(m => !m.isOwn).length}
            </span>
          )}
        </div>
        <button className="text-gray-400 hover:text-gray-200">
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {/* Chat Content */}
      {isExpanded && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 h-64">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm mt-8">
                No messages yet. Say hi! 👋
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 ${msg.isOwn ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'}`}>
                    {!msg.isOwn && (
                      <div className="text-xs font-semibold mb-1 opacity-75">
                        {msg.from}
                      </div>
                    )}
                    <div className="text-sm break-words">{msg.message}</div>
                    <div className={`text-xs mt-1 ${msg.isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isConnected ? "Type a message..." : "Connecting..."}
                disabled={!isConnected}
                className="flex-1 bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                maxLength={200}
              />
              <button
                onClick={handleSend}
                disabled={!inputMessage.trim() || !isConnected}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};


