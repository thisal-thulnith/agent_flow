import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Rich chat message component that renders different UI types
 * Fully mobile responsive
 */
const ChatMessage = ({ message, onAction }) => {
  const navigate = useNavigate();
  const { role, content, ui_components } = message;

  // Render different UI component types
  const renderUIComponent = (component, index) => {
    switch (component.type) {
      case 'success_card':
        return (
          <div key={index} className="my-4 p-4 sm:p-6 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white mb-1">{component.title}</h3>
                <p className="text-sm text-slate-300">{component.message}</p>
              </div>
            </div>
            {component.actions && component.actions.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                {component.actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => onAction && onAction(action)}
                    className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'product_card':
        return (
          <div key={index} className="my-4 p-4 bg-slate-800/80 border border-slate-700 rounded-xl">
            <div className="flex flex-col sm:flex-row gap-4">
              {component.data.image_url && (
                <img
                  src={component.data.image_url}
                  alt={component.data.name}
                  className="w-full sm:w-24 h-48 sm:h-24 object-cover rounded-lg"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-white mb-1">{component.data.name}</h4>
                <p className="text-sm text-slate-400 mb-2 line-clamp-2">{component.data.description}</p>
                <p className="text-lg font-bold text-primary-400">${component.data.price}</p>
              </div>
            </div>
            {component.status === 'created' && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <span className="text-xs text-green-400 font-medium">✓ Successfully created</span>
              </div>
            )}
          </div>
        );

      case 'product_list':
        return (
          <div key={index} className="my-4 space-y-3">
            <div className="text-sm text-slate-400 mb-3">
              {component.count} product{component.count !== 1 ? 's' : ''} found
            </div>
            {component.products.map((product, i) => (
              <div key={i} className="p-3 sm:p-4 bg-slate-800/60 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white mb-1">{product.name}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1">{product.description}</p>
                  </div>
                  <div className="text-base font-bold text-primary-400 flex-shrink-0">${product.price}</div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'agent_message':
        return (
          <div key={index} className="my-4 p-4 bg-gradient-to-br from-primary-500/10 to-primary-600/10 border border-primary-500/30 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-primary-400">{component.agent_name || 'Agent'}</span>
            </div>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{component.content}</p>
          </div>
        );

      case 'info_card':
        return (
          <div key={index} className="my-4 p-3 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-blue-200 flex-1">{component.message}</p>
            </div>
          </div>
        );

      case 'stats_grid':
        return (
          <div key={index} className="my-4 grid grid-cols-2 gap-3 sm:gap-4">
            {component.stats.map((stat, i) => (
              <div key={i} className="p-3 sm:p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
                <div className="text-xs sm:text-sm text-slate-400 mb-1">{stat.label}</div>
                <div className="text-xl sm:text-2xl font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        );

      case 'recent_conversations':
        return (
          <div key={index} className="my-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-3">Recent Conversations</h4>
            <div className="space-y-2">
              {component.conversations.slice(0, 3).map((conv, i) => (
                <div key={i} className="p-3 bg-slate-800/40 border border-slate-700 rounded-lg text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="text-slate-300 font-medium">Session {conv.session_id.slice(0, 8)}...</span>
                    <span className="text-slate-500 text-xs">{new Date(conv.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-slate-400">
                    {conv.messages.length} message{conv.messages.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'training_list':
        return (
          <div key={index} className="my-4 space-y-2">
            <div className="text-sm text-slate-400 mb-3">
              {component.count} training item{component.count !== 1 ? 's' : ''}
            </div>
            {component.items.map((item, i) => (
              <div key={i} className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                    {item.type === 'pdf' ? (
                      <svg className="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.content || item.url || 'Training data'}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'file_upload_card':
        return (
          <div key={index} className="my-4 p-4 bg-slate-800/60 border-2 border-dashed border-slate-600 rounded-xl hover:border-primary-500 transition-colors cursor-pointer">
            <label className="flex flex-col items-center gap-3 cursor-pointer">
              <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm text-white font-medium">{component.label || 'Upload File'}</p>
                <p className="text-xs text-slate-400 mt-1">Click to browse</p>
              </div>
              <input
                type="file"
                accept={component.accept}
                onChange={(e) => onAction && onAction({ type: 'file_upload', file: e.target.files[0] })}
                className="hidden"
              />
            </label>
          </div>
        );

      case 'success_message':
        return (
          <div key={index} className="my-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-200">{component.message}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-full sm:max-w-[85%] lg:max-w-[75%] ${role === 'user' ? 'ml-4 sm:ml-8' : 'mr-4 sm:mr-8'}`}>
        {/* Text message */}
        <div
          className={`px-4 sm:px-6 py-3 sm:py-4 rounded-2xl ${
            role === 'user'
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20'
              : 'bg-slate-800/80 text-slate-100 border border-slate-700 shadow-lg'
          }`}
        >
          <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">{content}</div>
        </div>

        {/* Rich UI components */}
        {ui_components && ui_components.length > 0 && (
          <div className="mt-2">
            {ui_components.map((component, index) => renderUIComponent(component, index))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
