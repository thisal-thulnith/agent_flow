import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../config/axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PublicChat = () => {
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchAgent();
  }, [agentId]);

  const fetchAgent = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/agents/${agentId}`);
      setAgent(response.data);

      // Add greeting message
      if (response.data.greeting_message) {
        setMessages([{
          role: 'assistant',
          content: response.data.greeting_message
        }]);
      }
    } catch (error) {
      console.error('Error fetching agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading) return;

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setChatLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/chat/${agentId}/message`, {
        message: inputMessage
      });

      const aiMessage = { role: 'assistant', content: response.data.response };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error response:', error.response);
      
      // Provide more detailed error information
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      if (error.response) {
        // Server responded with error status
        if (error.response.data && error.response.data.detail) {
          errorMessage = `Error: ${error.response.data.detail}`;
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please check if your agent is properly configured with products.';
        } else if (error.response.status === 404) {
          errorMessage = 'Agent not found. Please make sure the agent exists.';
        } else if (error.response.status === 400) {
          errorMessage = `Invalid request: ${error.response.data.detail || 'Bad request'}`;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Network error. Please check your connection.';
      } else {
        // Something else happened
        errorMessage = `Unexpected error: ${error.message || 'Unknown error'}`;
      }

      const errorMessageObj = {
        role: 'assistant',
        content: errorMessage
      };
      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Agent Not Found</h2>
          <p className="text-slate-400">This chat agent is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-500 to-purple-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{agent.name}</h1>
            <p className="text-sm text-slate-400">{agent.company_name}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
                    : 'bg-slate-800/80 text-slate-100 border border-slate-700'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/80 text-slate-100 border border-slate-700 px-4 py-3 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-full focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-slate-500 text-white"
              disabled={chatLoading}
            />
            <button
              type="submit"
              disabled={chatLoading || !inputMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Powered by footer */}
      <div className="text-center py-3 border-t border-slate-800">
        <div className="text-xs text-slate-500">
          Powered by <span className="text-blue-400 font-semibold">Rise AI</span>
        </div>
        <div className="text-xs text-slate-600 mt-0.5">
          Next-Generation Conversational Intelligence
        </div>
      </div>
    </div>
  );
};

export default PublicChat;
