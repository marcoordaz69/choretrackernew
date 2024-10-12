"use client"
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "./UI/card";
import { Input } from "./UI/input";
import { Button } from "./UI/button";
import { SendIcon } from "lucide-react";

const ChatbotComponent = ({ theme, messages, handleSendMessage }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const onSendMessage = (e) => {
    e.preventDefault(); // Prevent form submission
    if (inputMessage.trim() !== '') {
      handleSendMessage(inputMessage);
      setInputMessage('');
      if (!hasInteracted) {
        setHasInteracted(true);
      }
    }
  };

  return (
    <Card className={`w-full h-full ${theme.secondary} flex flex-col`}>
      <CardContent className="flex-grow overflow-y-auto p-2 space-y-2">
        {hasInteracted && messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded-lg ${
              msg.isAi ? `${theme.tertiary} text-left` : `${theme.userMessage} text-right`
            }`}
          >
            <p className={`text-xs ${theme.text}`}>{msg.text}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      <form onSubmit={onSendMessage} className={`p-2 border-t ${theme.border}`}>
        <div className="flex items-center">
          <Input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={hasInteracted ? "Type your message..." : "Type anything to start chatting..."}
            className={`flex-grow text-xs rounded-l-full border-none focus:ring-0 focus:outline-none `}
            style={{
              backgroundColor: 'white',
              color: 'black',
            }}
            ref={inputRef}
          />
          <Button
            type="submit"
            className={`${theme.button} rounded-r-full p-1`}
          >
            <SendIcon size={12} />
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ChatbotComponent;