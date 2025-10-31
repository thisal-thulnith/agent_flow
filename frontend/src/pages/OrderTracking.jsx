import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../config/axios';
import GlassHeader from '../components/GlassHeader';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const OrderTracking = () => {
  const { orderNumber: urlOrderNumber } = useParams();
  const [orderNumber, setOrderNumber] = useState(urlOrderNumber || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Automatically search if order number is in URL
  useEffect(() => {
    if (urlOrderNumber) {
      searchOrder(urlOrderNumber);
    }
  }, [urlOrderNumber]);

  const searchOrder = async (searchOrderNumber) => {
    if (!searchOrderNumber || !searchOrderNumber.trim()) {
      setError('Please enter an order number');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      // Public endpoint - no authentication required
      const response = await axios.get(`${API_URL}/api/orders/track/${searchOrderNumber.trim()}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      setError(error.response?.data?.detail || 'Order not found. Please check your order number and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    searchOrder(orderNumber);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-500';
      case 'shipped':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-yellow-500';
      case 'confirmed':
        return 'bg-purple-500';
      case 'pending':
        return 'bg-slate-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'shipped':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <GlassHeader showAuthButtons={false} />

      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Track Your Order</h1>
            <p className="text-slate-400 text-lg">Enter your order number to check the status</p>
          </div>

          {/* Search Form */}
          <div className="card-premium p-8 mb-8">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Order Number
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="ORD-2025-123456"
                  className="input-field w-full px-4 py-3 text-lg"
                  disabled={loading}
                />
                <p className="text-slate-500 text-sm mt-2">
                  You can find your order number in the confirmation email
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !orderNumber.trim()}
                className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Searching...
                  </span>
                ) : (
                  'Track Order'
                )}
              </button>
            </form>
          </div>

          {/* Order Details */}
          {order && (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="card-premium p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{order.order_number}</h2>
                    <p className="text-slate-400">
                      Placed on {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-white font-semibold ${getStatusColor(order.status)}`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>

                {/* Order Progress */}
                <div className="mt-8">
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-700">
                      <div
                        className={`h-full ${getStatusColor(order.status)} transition-all duration-500`}
                        style={{
                          width: order.status === 'delivered' ? '100%' :
                                 order.status === 'shipped' ? '75%' :
                                 order.status === 'processing' ? '50%' :
                                 order.status === 'confirmed' ? '25%' : '0%'
                        }}
                      ></div>
                    </div>

                    {/* Status Steps */}
                    <div className="relative flex justify-between">
                      {['pending', 'confirmed', 'processing', 'shipped', 'delivered'].map((status, idx) => {
                        const isActive = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'].indexOf(order.status) >= idx;
                        const isCurrent = order.status === status;

                        return (
                          <div key={status} className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isActive ? getStatusColor(status) : 'bg-slate-700'
                            } ${isCurrent ? 'ring-4 ring-white/20' : ''} transition-all duration-300`}>
                              {getStatusIcon(status)}
                            </div>
                            <p className={`mt-2 text-sm font-medium ${
                              isActive ? 'text-white' : 'text-slate-500'
                            }`}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Info */}
              {order.estimated_delivery && (
                <div className="card-premium p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Estimated Delivery</h3>
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-white text-lg">{new Date(order.estimated_delivery).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
              )}

              {/* Tracking Info */}
              {order.tracking_number && (
                <div className="card-premium p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Tracking Information</h3>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400">Tracking Number</span>
                      <span className="text-white font-mono">{order.tracking_number}</span>
                    </div>
                    {order.carrier && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Carrier</span>
                        <span className="text-white">{order.carrier}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="card-premium p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Order Items</h3>
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-4">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.name}</p>
                        <p className="text-slate-400 text-sm">Quantity: {item.quantity}</p>
                      </div>
                      <p className="text-white font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                  <div className="border-t border-slate-700 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-white">Total</span>
                      <span className="text-2xl font-bold text-green-400">${parseFloat(order.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {order.shipping_address && (
                <div className="card-premium p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Shipping Address</h3>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-white">{order.customer_name}</p>
                    <p className="text-slate-400">{order.shipping_address.street}</p>
                    <p className="text-slate-400">
                      {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}
                    </p>
                    <p className="text-slate-400">{order.shipping_address.country}</p>
                  </div>
                </div>
              )}

              {/* Status History */}
              {order.status_history && order.status_history.length > 0 && (
                <div className="card-premium p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Order Timeline</h3>
                  <div className="space-y-4">
                    {order.status_history.map((history, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(history.status)}`}></div>
                          {idx < order.status_history.length - 1 && (
                            <div className="w-0.5 h-full bg-slate-700 mt-1"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-white font-medium">{history.status.toUpperCase()}</p>
                          <p className="text-slate-400 text-sm">{new Date(history.timestamp).toLocaleString()}</p>
                          {history.note && <p className="text-slate-300 text-sm mt-1">{history.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Notes */}
              {order.customer_notes && (
                <div className="card-premium p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Your Notes</h3>
                  <p className="text-slate-300">{order.customer_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
