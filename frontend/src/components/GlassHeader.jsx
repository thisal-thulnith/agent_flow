import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const GlassHeader = ({ title, showAuth = true }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!showAuth) {
    return (
      <header className="glass sticky top-0 z-50 border-b border-white/10 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-600 rounded-lg blur-lg opacity-50"></div>
                <div className="relative bg-gradient-to-r from-primary-500 to-purple-600 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="brand-logo text-2xl leading-none">AgentFlow</span>
                <span className="text-[10px] text-slate-500 leading-none mt-0.5">Powered by Rise AI</span>
              </div>
            </div>
            {title && (
              <span className="text-slate-300 font-medium">{title}</span>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/10 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-3 group"
            >
              {/* Logo Icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-600 rounded-lg blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-primary-500 to-purple-600 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
              </div>
              {/* Brand Name */}
              <div className="flex flex-col group-hover:scale-105 transition-transform">
                <span className="brand-logo text-2xl leading-none">AgentFlow</span>
                <span className="text-[10px] text-slate-500 leading-none mt-0.5">Powered by Rise AI</span>
              </div>
            </button>
            {title && (
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-slate-600">/</span>
                <span className="text-slate-300 font-medium">{title}</span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200 flex items-center gap-2 group"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-sm font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200 flex items-center gap-2 group"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium">Analytics</span>
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-slate-300 text-sm font-medium max-w-[150px] truncate">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-secondary px-4 py-2 rounded-lg text-sm hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 transition-all group"
                >
                  <span className="hidden sm:inline">Logout</span>
                  <svg className="w-5 h-5 sm:hidden group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default GlassHeader;
