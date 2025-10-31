import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import GlassHeader from '../components/GlassHeader';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ConversationalAgentBuilder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [extractedData, setExtractedData] = useState({
    agent: {},
    products: [],
    training: { urls: [], faqs: [] }
  });
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentPhase, setCurrentPhase] = useState('agent_info');
  const [isComplete, setIsComplete] = useState(false);
  const [agentId, setAgentId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);  // Start closed, show when needed
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeConversation();
  }, []);

  // Auto-open sidebar when data starts being extracted
  useEffect(() => {
    const hasAgentData = extractedData.agent && Object.keys(extractedData.agent).length > 0;
    const hasProducts = extractedData.products && extractedData.products.length > 0;
    const hasTraining = extractedData.training &&
      ((extractedData.training.urls && extractedData.training.urls.length > 0) ||
       (extractedData.training.faqs && extractedData.training.faqs.length > 0));

    // Auto-open sidebar when data is being collected
    if ((hasAgentData || hasProducts || hasTraining) && !sidebarOpen) {
      setSidebarOpen(true);
    }
  }, [extractedData]);

  const initializeConversation = async () => {
    try {
      const token = await user.getIdToken();
      const response = await axios.post(
        `${API_URL}/api/conversational-builder/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiMessage = {
        role: 'assistant',
        content: response.data.response,
        ui_components: response.data.ui_components
      };

      setMessages([aiMessage]);
      setConversationHistory([aiMessage]);
      setCurrentPhase(response.data.current_phase || 'agent_info');
      setExtractedData(response.data.extracted_data);
    } catch (error) {
      console.error('Error starting conversation:', error);
      const fallbackMessage = {
        role: 'assistant',
        content: `Hi! 👋 I'm your AI assistant, and I'll help you create and fully set up a perfect sales agent for your business.\n\nLet's start with something simple: **What's your company name?**`
      };
      setMessages([fallbackMessage]);
      setConversationHistory([fallbackMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploadingFile(true);
    setSelectedFile(file);

    // Add user message showing file upload
    const uploadMessage = {
      role: 'user',
      content: `📎 Uploading document: ${file.name}`
    };
    setMessages(prev => [...prev, uploadMessage]);

    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', file);

      // Include agent_id if we have one
      if (agentId) {
        formData.append('agent_id', agentId);
      }

      const response = await axios.post(
        `${API_URL}/api/conversational-builder/upload-document`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Add success message
      const successMessage = {
        role: 'assistant',
        content: response.data.message || `✅ Document '${file.name}' uploaded successfully! I'll use this for training your agent.`
      };
      setMessages(prev => [...prev, successMessage]);
      setConversationHistory(prev => [...prev, uploadMessage, successMessage]);

      // If we got training data, update extracted data
      if (response.data.agent_id && !agentId) {
        setAgentId(response.data.agent_id);
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage = {
        role: 'assistant',
        content: `❌ Sorry, I couldn't upload that file. ${error.response?.data?.detail || 'Please try again with a PDF, TXT, DOC, or DOCX file.'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setUploadingFile(false);
      setSelectedFile(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading) return;

    const userInput = inputMessage;
    const userMessage = { role: 'user', content: userInput };

    setInputMessage('');
    setChatLoading(true);

    setMessages(prev => [...prev, userMessage]);
    setConversationHistory(prev => [...prev, userMessage]);

    try {
      const token = await user.getIdToken();

      const response = await axios.post(
        `${API_URL}/api/conversational-builder/converse`,
        {
          message: userInput,
          conversation_history: [...conversationHistory, userMessage],
          extracted_data: extractedData,
          current_phase: currentPhase
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const aiMessage = {
        role: 'assistant',
        content: response.data.response,
        ui_components: response.data.ui_components
      };

      setMessages(prev => [...prev, aiMessage]);
      setConversationHistory(prev => [...prev, aiMessage]);
      setExtractedData(response.data.extracted_data);
      setCurrentPhase(response.data.current_phase);
      setIsComplete(response.data.is_complete);

      if (response.data.agent_id) {
        setAgentId(response.data.agent_id);
      }

    } catch (error) {
      console.error('Error in conversation:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Could you please repeat that?'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const getPhaseInfo = (phase) => {
    const phases = {
      agent_info: { label: 'Agent Info', icon: '🤖', step: 1, total: 3 },
      products: { label: 'Products', icon: '📦', step: 2, total: 3 },
      training: { label: 'Training', icon: '📚', step: 3, total: 3 },
      complete: { label: 'Complete', icon: '✅', step: 3, total: 3 }
    };
    return phases[phase] || phases.agent_info;
  };

  const phaseInfo = getPhaseInfo(currentPhase);

  const renderUIComponent = (component, index) => {
    if (!component) return null;

    switch (component.type) {
      case 'success_card':
        return (
          <div key={index} className="my-4 p-6 bg-gradient-to-br from-green-500/20 to-green-600/20 border-2 border-green-500/30 rounded-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-white mb-2">{component.title}</h3>
                <p className="text-green-200">{component.message}</p>
              </div>
            </div>
            {component.actions && component.actions.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                {component.actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(action.url)}
                    className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-semibold text-center"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'agents_list':
        return (
          <div key={index} className="my-4">
            <div className="text-sm text-slate-400 mb-3">
              {component.count} agent{component.count !== 1 ? 's' : ''} found
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {component.agents.map((agent) => (
                <div
                  key={agent.id}
                  className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl hover:border-primary-500/50 transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/agents/${agent.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-white mb-1 truncate">{agent.name}</h4>
                      <p className="text-sm text-slate-400">{agent.company_name}</p>
                    </div>
                    <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                      agent.is_active
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'bg-slate-600/20 text-slate-400 border border-slate-600/30'
                    }`}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {agent.industry || 'General'}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{agent.tone || 'friendly'}</span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/agents/${agent.id}?tab=test-chat`);
                      }}
                      className="flex-1 px-3 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded-lg text-xs font-medium transition-colors"
                    >
                      Test Agent
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/agents/${agent.id}`);
                      }}
                      className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-xs font-medium transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'navigation_button':
        return (
          <div key={index} className="my-3">
            <button
              onClick={() => navigate(component.url)}
              className="w-full px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
            >
              {component.label}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        );

      default:
        return null;
    }
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
      {/* Compact Header with Phase Progress */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white truncate">Use Our AI</h1>
              <p className="text-xs text-slate-400 hidden sm:block">Build using AI - Simple & Powerful</p>
            </div>
          </div>

          {/* Phase indicator and Stop button - Only show when building */}
          {(extractedData.agent && Object.keys(extractedData.agent).length > 0) && !isComplete && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/30 rounded-full">
                <span className="text-lg">{phaseInfo.icon}</span>
                <span className="text-xs sm:text-sm font-medium text-primary-300 hidden sm:inline">
                  {phaseInfo.label}
                </span>
                <span className="text-xs text-slate-400">
                  {phaseInfo.step}/{phaseInfo.total}
                </span>
              </div>

              {/* Stop/Reset Button */}
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset the conversation? All progress will be lost.')) {
                    window.location.reload();
                  }
                }}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-full text-xs font-medium transition-colors flex items-center gap-1"
                title="Reset conversation"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          )}
        </div>

        {/* Progress bar - Only show when building */}
        {(extractedData.agent && Object.keys(extractedData.agent).length > 0) && !isComplete && (
          <div className="h-1 bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
              style={{ width: `${(phaseInfo.step / phaseInfo.total) * 100}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Main Content: Chat + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-full sm:max-w-[85%] ${msg.role === 'user' ? 'ml-4 sm:ml-8' : 'mr-4 sm:mr-8'}`}>
                    <div
                      className={`px-4 sm:px-6 py-3 sm:py-4 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20'
                          : 'bg-slate-800/80 text-slate-100 border border-slate-700 shadow-lg'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                        {msg.content}
                      </div>
                    </div>

                    {/* UI Components */}
                    {msg.ui_components && msg.ui_components.length > 0 && (
                      <div className="mt-2">
                        {msg.ui_components.map((component, index) => renderUIComponent(component, index))}
                      </div>
                    )}
                  </div>
                </div>
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

          {/* Input Area */}
          <div className="border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
                <div className="flex gap-2 sm:gap-3 items-end">
                  {/* Sidebar Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="hidden xl:flex px-3 py-2.5 sm:py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-2xl transition-colors flex-shrink-0 items-center gap-2"
                    title={sidebarOpen ? "Hide data panel" : "Show data panel"}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {sidebarOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      )}
                    </svg>
                  </button>

                  {/* File Upload Button */}
                  <div className="relative flex-shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="hidden"
                      disabled={uploadingFile || chatLoading}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile || chatLoading}
                      className="px-3 py-2.5 sm:py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      title="Upload document for training"
                    >
                      {uploadingFile ? (
                        <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Type your message or upload a document..."
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900/50 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 placeholder:text-slate-500 text-white text-sm resize-none"
                    disabled={chatLoading || uploadingFile}
                    rows="1"
                    style={{ maxHeight: '120px', minHeight: '44px' }}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !inputMessage.trim() || uploadingFile}
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

        {/* Data Preview Sidebar - Desktop Only, Collapsible */}
        {!isComplete && sidebarOpen && (
          <div className="hidden xl:flex flex-col w-80 border-l border-slate-700/50 bg-slate-800/30 backdrop-blur-sm overflow-hidden animate-slide-in-right">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Extracted Data
              </h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white transition-colors"
                title="Close panel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Agent Info Section */}
              {extractedData.agent && Object.keys(extractedData.agent).length > 0 ? (
                <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-primary-500/20 rounded flex items-center justify-center">
                      <span className="text-lg">🤖</span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">Agent Info</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    {Object.entries(extractedData.agent).map(([key, value]) => (
                      value && (
                        <div key={key} className="flex flex-col gap-1">
                          <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="text-white font-medium break-words">{String(value)}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-700/20 border border-slate-600/50 rounded-lg p-3 text-center">
                  <span className="text-2xl mb-2 block">🤖</span>
                  <p className="text-xs text-slate-400">No agent info yet</p>
                </div>
              )}

              {/* Products Section */}
              {extractedData.products && extractedData.products.length > 0 ? (
                <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded flex items-center justify-center">
                      <span className="text-lg">📦</span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">Products</h4>
                  </div>
                  <div className="space-y-3">
                    {extractedData.products.map((product, idx) => (
                      <div key={idx} className="bg-slate-800/50 rounded p-2 text-xs">
                        <div className="font-medium text-white mb-1">{product.name}</div>
                        {product.description && (
                          <div className="text-slate-400 mb-1">{product.description}</div>
                        )}
                        {product.price && (
                          <div className="text-green-400 font-semibold">${product.price}</div>
                        )}
                        {product.features && product.features.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {product.features.map((feature, fIdx) => (
                              <div key={fIdx} className="text-slate-300 flex items-start gap-1">
                                <span className="text-primary-400">•</span>
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-700/20 border border-slate-600/50 rounded-lg p-3 text-center">
                  <span className="text-2xl mb-2 block">📦</span>
                  <p className="text-xs text-slate-400">No products yet</p>
                </div>
              )}

              {/* Training Section */}
              {extractedData.training && (extractedData.training.urls?.length > 0 || extractedData.training.faqs?.length > 0) ? (
                <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
                      <span className="text-lg">📚</span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">Training</h4>
                  </div>
                  <div className="space-y-3 text-xs">
                    {extractedData.training.urls && extractedData.training.urls.length > 0 && (
                      <div>
                        <div className="text-slate-400 mb-2">URLs ({extractedData.training.urls.length})</div>
                        <div className="space-y-1">
                          {extractedData.training.urls.map((url, idx) => (
                            <div key={idx} className="text-blue-300 truncate bg-slate-800/50 rounded px-2 py-1">
                              {url}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {extractedData.training.faqs && extractedData.training.faqs.length > 0 && (
                      <div>
                        <div className="text-slate-400 mb-2">FAQs ({extractedData.training.faqs.length})</div>
                        <div className="space-y-2">
                          {extractedData.training.faqs.map((faq, idx) => (
                            <div key={idx} className="bg-slate-800/50 rounded p-2">
                              <div className="text-white font-medium mb-1">{faq.question}</div>
                              <div className="text-slate-300">{faq.answer}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-700/20 border border-slate-600/50 rounded-lg p-3 text-center">
                  <span className="text-2xl mb-2 block">📚</span>
                  <p className="text-xs text-slate-400">No training data yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationalAgentBuilder;
