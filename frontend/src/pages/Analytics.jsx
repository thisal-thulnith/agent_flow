import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import GlassHeader from '../components/GlassHeader';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [advanced, setAdvanced] = useState(null);
  const [timeRange, setTimeRange] = useState(30);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('all'); // 'all' or agent_id

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (agents.length > 0 || selectedAgent === 'all') {
      fetchAnalytics();
    }
  }, [timeRange, selectedAgent, agents]);

  const fetchAgents = async () => {
    try {
      const token = await user.getIdToken();
      const response = await axios.get(`${API_URL}/api/agents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgents(response.data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = await user.getIdToken();

      // Build URL with query parameters
      const agentParam = selectedAgent !== 'all' ? `&agent_id=${selectedAgent}` : '';

      // Fetch both summary and advanced analytics
      const [summaryRes, advancedRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/dashboard/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/analytics/dashboard/advanced?days=${timeRange}${agentParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setSummary(summaryRes.data.summary);
      setAdvanced(advancedRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <GlassHeader title="Analytics Dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Performance Analytics</h2>
              <p className="text-slate-400">Track your agents' performance and optimize conversions</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Agent Selector */}
              <div className="relative">
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="appearance-none bg-slate-800 text-white px-4 py-2 pr-10 rounded-lg text-sm font-medium border border-slate-700 hover:border-purple-500 focus:border-purple-500 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="all">All Agents</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Time Range Selector */}
              <div className="flex gap-2">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setTimeRange(days)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      timeRange === days
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Agent Badge */}
          {selectedAgent !== 'all' && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Viewing analytics for:</span>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full font-medium border border-purple-500/30">
                {agents.find(a => a.id === selectedAgent)?.name || 'Selected Agent'}
              </span>
              <button
                onClick={() => setSelectedAgent('all')}
                className="text-slate-400 hover:text-white transition-colors"
                title="Clear filter"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card-premium p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Agents</p>
                <p className="text-3xl font-bold text-white">{summary?.total_agents || 0}</p>
                <p className="text-xs text-green-400 mt-1">{summary?.active_agents || 0} active</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Conversations</p>
                <p className="text-3xl font-bold text-white">{summary?.total_conversations || 0}</p>
                <p className="text-xs text-blue-400 mt-1">All time</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Leads</p>
                <p className="text-3xl font-bold text-white">{summary?.total_leads || 0}</p>
                <p className="text-xs text-green-400 mt-1">Captured</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-xl">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Conversion Rate</p>
                <p className="text-3xl font-bold text-white">{advanced?.conversion_funnel?.conversion_rate || 0}%</p>
                <p className="text-xs text-orange-400 mt-1">Overall</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="card-premium p-8 mb-8">
          <h3 className="text-xl font-bold text-white mb-6">Conversion Funnel</h3>
          <div className="space-y-4">
            {[
              { label: 'Visitors', value: advanced?.conversion_funnel?.visitors || 0, color: 'blue', rate: 100 },
              { label: 'Engaged (3+ messages)', value: advanced?.conversion_funnel?.engaged || 0, color: 'purple', rate: advanced?.conversion_funnel?.engagement_rate || 0 },
              { label: 'Qualified Leads', value: advanced?.conversion_funnel?.qualified || 0, color: 'green', rate: advanced?.conversion_funnel?.qualification_rate || 0 },
              { label: 'Converted', value: advanced?.conversion_funnel?.converted || 0, color: 'orange', rate: advanced?.conversion_funnel?.conversion_rate || 0 }
            ].map((stage, index) => (
              <div key={index} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{stage.label}</span>
                  <span className="text-sm text-slate-400">{stage.value} ({stage.rate}%)</span>
                </div>
                <div className="h-12 bg-slate-800 rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full bg-gradient-to-r from-${stage.color}-500 to-${stage.color}-600 flex items-center justify-center transition-all duration-1000`}
                    style={{ width: `${stage.rate}%` }}
                  >
                    {stage.rate > 10 && (
                      <span className="text-white font-semibold text-sm">{stage.value}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`grid grid-cols-1 ${selectedAgent === 'all' ? 'lg:grid-cols-2' : ''} gap-8 mb-8`}>
          {/* Peak Hours Chart */}
          <div className="card-premium p-8">
            <h3 className="text-xl font-bold text-white mb-6">Peak Hours Analysis</h3>
            <div className="space-y-3">
              {advanced?.peak_hours?.map((item) => (
                <div key={item.hour} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-16">{item.hour}:00</span>
                  <div className="flex-1 h-8 bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-end pr-2"
                      style={{
                        width: `${(item.conversations / Math.max(...(advanced?.peak_hours?.map(h => h.conversations) || [1]))) * 100}%`
                      }}
                    >
                      {item.conversations > 0 && (
                        <span className="text-white text-xs font-semibold">{item.conversations}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agent Performance - Only show when viewing all agents */}
          {selectedAgent === 'all' && (
            <div className="card-premium p-8">
              <h3 className="text-xl font-bold text-white mb-6">Agent Performance Comparison</h3>
              <div className="space-y-4">
                {advanced?.agent_performance && advanced.agent_performance.length > 0 ? (
                  advanced.agent_performance.map((agent, index) => (
                    <div key={agent.agent_id} className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-colors cursor-pointer"
                      onClick={() => setSelectedAgent(agent.agent_id)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            #{index + 1}
                          </div>
                          <span className="font-semibold text-white">{agent.agent_name}</span>
                        </div>
                        <span className="text-sm text-green-400 font-semibold">{agent.conversion_rate}% CVR</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <p className="text-slate-400">Conversations</p>
                          <p className="text-white font-semibold">{agent.total_conversations}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Leads</p>
                          <p className="text-white font-semibold">{agent.total_leads}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Avg Messages</p>
                          <p className="text-white font-semibold">{agent.avg_messages}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p>No agent data available</p>
                    <p className="text-sm mt-2">Start conversations to see performance metrics</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Daily Trends */}
        <div className="card-premium p-8">
          <h3 className="text-xl font-bold text-white mb-6">Daily Trends ({timeRange} Days)</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {advanced?.daily_trends?.map((day, index) => {
              const maxValue = Math.max(...(advanced?.daily_trends?.map(d => d.conversations) || [1]));
              const height = (day.conversations / maxValue) * 100;

              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center gap-1">
                    <div className="relative w-full group">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg transition-all hover:from-blue-400 hover:to-blue-500"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      ></div>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        {day.conversations} chats<br/>{day.leads} leads
                      </div>
                    </div>
                    {day.leads > 0 && (
                      <div
                        className="w-full bg-gradient-to-t from-green-500 to-green-600 rounded-t-lg"
                        style={{ height: `${(day.leads / day.conversations) * height}%` }}
                      ></div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 rotate-45 origin-top-left mt-6">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded"></div>
              <span className="text-xs text-slate-400">Conversations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-green-600 rounded"></div>
              <span className="text-xs text-slate-400">Leads</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
