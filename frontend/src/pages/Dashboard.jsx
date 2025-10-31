import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import GlassHeader from '../components/GlassHeader';

const API_URL = import.meta.env.VITE_API_URL ;

const Dashboard = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const token = await user.getIdToken();
      const response = await axios.get(`${API_URL}/api/agents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgents(response.data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Optimized with useCallback to prevent function recreation
  const toggleAgentStatus = useCallback(async (agentId, currentStatus) => {
    setActionLoading(agentId);
    try {
      const token = await user.getIdToken();
      await axios.put(
        `${API_URL}/api/agents/${agentId}`,
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Optimistic update: update local state immediately
      setAgents(prev => prev.map(a =>
        a.id === agentId ? { ...a, is_active: !currentStatus } : a
      ));
    } catch (error) {
      console.error('Error toggling agent status:', error);
      alert('Failed to update agent status');
      // Revert on error
      await fetchAgents();
    } finally {
      setActionLoading(null);
    }
  }, [user]);

  const deleteAgent = useCallback(async (agentId) => {
    setActionLoading(agentId);
    try {
      const token = await user.getIdToken();
      await axios.delete(`${API_URL}/api/agents/${agentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowDeleteModal(null);
      // Optimistic update: remove from local state immediately
      setAgents(prev => prev.filter(a => a.id !== agentId));
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert('Failed to delete agent');
      // Revert on error
      await fetchAgents();
    } finally {
      setActionLoading(null);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-900">
      <GlassHeader title="Dashboard" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {loading ? (
            // Skeleton loader for stats
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="stats-card animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-slate-700/50 rounded w-24 mb-3"></div>
                      <div className="h-8 bg-slate-700/50 rounded w-16"></div>
                    </div>
                    <div className="w-14 h-14 bg-slate-700/50 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="stats-card group hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-400">Total Agents</div>
                    <div className="mt-2 text-3xl font-bold text-white">{agents.length}</div>
                  </div>
                  <div className="p-3 bg-primary-500/10 rounded-lg group-hover:bg-primary-500/20 transition-colors">
                    <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="stats-card group hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-400">Active Agents</div>
                    <div className="mt-2 text-3xl font-bold text-primary-400">
                      {agents.filter(a => a.is_active).length}
                    </div>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="stats-card group hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-400">Inactive Agents</div>
                    <div className="mt-2 text-3xl font-bold text-slate-400">
                      {agents.filter(a => !a.is_active).length}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-500/10 rounded-lg group-hover:bg-slate-500/20 transition-colors">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="stats-card group hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-400">Total Conversations</div>
                    <div className="mt-2 text-3xl font-bold text-white">0</div>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Agents List */}
        <div className="card">
          <div className="p-6 border-b border-slate-700">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-white">Your AI Agents</h2>
                <p className="text-sm text-slate-400 mt-1">Use our AI to create and manage your sales agents</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/agents/create-chat')}
                  className="btn-gradient px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary-500/30"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Use Our AI</span>
                </button>
                <button
                  onClick={() => navigate('/agents/create')}
                  className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-2 hover:scale-105 transition-all duration-300 border border-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Manual Form</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              // Skeleton Loader - Much faster perceived loading
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 animate-pulse">
                    <div className="flex justify-between mb-4">
                      <div className="w-12 h-12 bg-slate-700/50 rounded-lg"></div>
                      <div className="w-16 h-6 bg-slate-700/50 rounded-full"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-5 bg-slate-700/50 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-700/50 rounded w-full"></div>
                      <div className="h-4 bg-slate-700/50 rounded w-5/6"></div>
                      <div className="flex gap-2 pt-2">
                        <div className="h-6 bg-slate-700/50 rounded w-16"></div>
                        <div className="h-6 bg-slate-700/50 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No agents yet</h3>
                <p className="text-sm text-slate-400 mb-6">Get started by creating your first AI sales agent</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => navigate('/agents/create-chat')}
                    className="btn-gradient px-8 py-3.5 rounded-lg font-semibold flex items-center gap-3 hover:scale-105 transition-transform shadow-xl shadow-primary-500/40"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Use Our AI</span>
                  </button>
                  <button
                    onClick={() => navigate('/agents/create')}
                    className="px-8 py-3.5 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg font-semibold flex items-center gap-3 hover:scale-105 transition-all duration-300 border border-slate-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Manual Form</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="group relative bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 hover:border-primary-500/50 hover:bg-slate-800/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/10"
                  >
                    {/* Status Indicator */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        agent.is_active
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : 'bg-slate-600/10 text-slate-400 border border-slate-600/30'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${agent.is_active ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`}></div>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>

                    {/* Agent Icon */}
                    <div className="mb-4 pt-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>

                    {/* Agent Info */}
                    <div className="mb-4" onClick={() => navigate(`/agents/${agent.id}`)} style={{ cursor: 'pointer' }}>
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">
                        {agent.name}
                      </h3>
                      <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                        {agent.company_description || 'No description'}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-md">
                          {agent.industry || 'General'}
                        </span>
                        <span className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-md">
                          {agent.language || 'English'}
                        </span>
                        <span className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-md">
                          {agent.tone || 'Friendly'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t border-slate-700/50">
                      <button
                        onClick={() => navigate(`/agents/${agent.id}`)}
                        className="flex-1 px-3 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAgentStatus(agent.id, agent.is_active);
                        }}
                        disabled={actionLoading === agent.id}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1 ${
                          agent.is_active
                            ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'
                        } disabled:opacity-50`}
                      >
                        {actionLoading === agent.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={agent.is_active ? "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
                            </svg>
                            {agent.is_active ? 'Pause' : 'Activate'}
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteModal(agent.id);
                        }}
                        className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Agent</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-6">
              Are you sure you want to delete this agent? All associated data including conversations and analytics will be permanently removed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={actionLoading === showDeleteModal}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAgent(showDeleteModal)}
                disabled={actionLoading === showDeleteModal}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === showDeleteModal ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Agent'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
