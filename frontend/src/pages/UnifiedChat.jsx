import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import ChatMessage from '../components/ChatMessage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const UnifiedChat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { agentId } = useParams();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'create';

  const [mode, setMode] = useState(initialMode);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [context, setContext] = useState({});
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);
  const [availableModes, setAvailableModes] = useState([]);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeChat();
    fetchAvailableModes();
  }, [mode]);

  const fetchAvailableModes = async () => {
    try {
      const token = await user.getIdToken();
      const response = await axios.get(
        `${API_URL}/api/unified-chat/modes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailableModes(response.data.modes);
    } catch (error) {
      console.error('Error fetching modes:', error);
    }
  };

  const initializeChat = async () => {
    setLoading(true);
    try {
      const welcomeMessages = {
        create: "Hi! I'll help you create a new sales agent. What's your company name?",
        products: agentId ? "Let's manage your products! You can add, view, edit, or delete products. What would you like to do?" : "Please select an agent first.",
        test: agentId ? "Test mode activated! Start chatting to test your agent. Type 'exit' when done." : "Please select an agent first.",
        training: agentId ? "Let's train your agent! You can upload PDFs, add website URLs, or FAQs. What would you like to add?" : "Please select an agent first.",
        analytics: agentId ? "Loading your analytics..." : "Please select an agent first.",
        general: "How can I help you today? You can create agents, manage products, test agents, and more!"
      };

      const initialMessage = {
        role: 'assistant',
        content: welcomeMessages[mode] || welcomeMessages.general,
        ui_components: []
      };

      setMessages([initialMessage]);
      setSuggestedPrompts(getModeSuggestions(mode));

      // If analytics mode, fetch analytics immediately
      if (mode === 'analytics' && agentId) {
        await handleSendMessage({ preventDefault: () => {} }, 'Show me analytics');
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const getModeSuggestions = (currentMode) => {
    const suggestions = {
      create: ["Create a new agent", "I run a coffee shop", "Help me set up"],
      products: ["Add a product", "List all products", "Delete a product", "Go back"],
      test: ["Hi, what products do you offer?", "Tell me about pricing", "Exit test"],
      training: ["Upload a document", "Add website URL", "List training data", "Go back"],
      analytics: ["Show leads", "Export data", "Recent conversations", "Go back"],
      general: ["Create new agent", "Manage products", "Test agent", "View analytics"]
    };
    return suggestions[currentMode] || [];
  };

  const handleSendMessage = async (e, overrideMessage = null) => {
    if (e && e.preventDefault) e.preventDefault();

    const messageText = overrideMessage || inputMessage;
    if (!messageText.trim() || chatLoading) return;

    // Check if mode requires agent_id
    if (!agentId && ['products', 'test', 'training', 'analytics'].includes(mode)) {
      alert('Please select an agent first');
      return;
    }

    const userMessage = { role: 'user', content: messageText };

    setInputMessage('');
    setChatLoading(true);
    setMessages(prev => [...prev, userMessage]);

    try {
      const token = await user.getIdToken();

      const response = await axios.post(
        `${API_URL}/api/unified-chat/chat`,
        {
          message: messageText,
          mode: mode,
          agent_id: agentId || null,
          conversation_history: [...messages, userMessage],
          context: context
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiMessage = {
        role: 'assistant',
        content: response.data.response,
        ui_components: response.data.ui_components || []
      };

      setMessages(prev => [...prev, aiMessage]);
      setContext(response.data.context || {});
      setSuggestedPrompts(response.data.suggested_prompts || getModeSuggestions(mode));

      // Handle mode changes
      if (response.data.mode && response.data.mode !== mode) {
        setMode(response.data.mode);
      }

    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.response?.data?.detail || error.message}. Please try again.`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAction = (action) => {
    if (action.mode) {
      setMode(action.mode);
      if (action.agent_id) {
        navigate(`/unified-chat/${action.agent_id}?mode=${action.mode}`);
      }
    }

    if (action.type === 'file_upload' && action.file) {
      // Handle file upload
      uploadFile(action.file);
    }
  };

  const uploadFile = async (file) => {
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('agent_id', agentId);

      setChatLoading(true);

      const response = await axios.post(
        `${API_URL}/api/training/pdf`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const successMessage = {
        role: 'assistant',
        content: `✅ Successfully uploaded "${file.name}"! Processed ${response.data.chunks_created} chunks.`,
        ui_components: [{
          type: 'success_message',
          message: 'Your agent has been trained with this document!'
        }]
      };

      setMessages(prev => [...prev, successMessage]);
      setSuggestedPrompts(['Upload another document', 'Add website URL', 'Go back']);

    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage = {
        role: 'assistant',
        content: `❌ Error uploading file: ${error.response?.data?.detail || error.message}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setMessages([]);
    setContext({});
    setShowModeSelector(false);
  };

  const getModeIcon = (modeId) => {
    const icons = {
      create: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      products: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      test: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      training: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      analytics: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      general: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    };
    return icons[modeId] || icons.general;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Header - Mobile Responsive */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-white truncate">Unified Agent Manager</h1>
            <p className="text-xs text-slate-400 hidden sm:block">Manage everything through chat</p>
          </div>
        </div>

        {/* Mode Selector Button */}
        <div className="relative">
          <button
            onClick={() => setShowModeSelector(!showModeSelector)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full hover:bg-primary-500/20 transition-colors"
          >
            <div className="text-primary-400 flex-shrink-0">{getModeIcon(mode)}</div>
            <span className="text-xs sm:text-sm font-medium text-primary-300 hidden sm:inline">
              {availableModes.find(m => m.id === mode)?.label || mode}
            </span>
            <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Mode Selector Dropdown */}
          {showModeSelector && (
            <div className="absolute right-0 top-full mt-2 w-56 sm:w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
              <div className="p-2">
                {availableModes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleModeChange(m.id)}
                    disabled={m.requires_agent && !agentId}
                    className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg transition-colors mb-1 ${
                      mode === m.id
                        ? 'bg-primary-500/20 border border-primary-500/30'
                        : 'hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 ${mode === m.id ? 'text-primary-400' : 'text-slate-400'}`}>
                      {getModeIcon(m.id)}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className={`text-sm font-medium mb-0.5 ${mode === m.id ? 'text-primary-300' : 'text-white'}`}>
                        {m.label}
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-2">{m.description}</div>
                      {m.requires_agent && !agentId && (
                        <div className="text-xs text-yellow-400 mt-1">Requires agent selection</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Container - Mobile Responsive */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} onAction={handleAction} />
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 text-slate-100 border border-slate-700 px-6 py-4 rounded-2xl shadow-lg">
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

        {/* Suggested Prompts - Mobile Responsive */}
        {suggestedPrompts.length > 0 && !chatLoading && (
          <div className="px-3 sm:px-6 py-2">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage({ preventDefault: () => {} }, prompt)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800/60 hover:bg-slate-700 border border-slate-600 rounded-full text-xs sm:text-sm text-slate-300 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area - Mobile Responsive */}
        <div className="border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex gap-2 sm:gap-3 items-end">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900/50 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 placeholder:text-slate-500 text-white text-sm resize-none"
                disabled={chatLoading}
                rows="1"
                style={{ maxHeight: '120px', minHeight: '44px' }}
              />
              <button
                type="submit"
                disabled={chatLoading || !inputMessage.trim()}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 shadow-lg shadow-primary-500/30 flex-shrink-0"
              >
                <span className="hidden sm:inline">Send</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UnifiedChat;
