import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import GlassHeader from '../components/GlassHeader';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AgentDetail = () => {
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [expandedConv, setExpandedConv] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [copiedButton, setCopiedButton] = useState(null);
  const [widgetView, setWidgetView] = useState('bubble'); // 'bubble', 'inline', or 'iframe'

  // Training state
  const [trainingData, setTrainingData] = useState([]);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [urlSubmitting, setUrlSubmitting] = useState(false);
  const [faqSubmitting, setFaqSubmitting] = useState(false);

  const { user} = useAuth();
  const navigate = useNavigate();

  // Helper function to copy to clipboard with feedback
  const copyToClipboard = (text, buttonId) => {
    console.log('Copy button clicked:', buttonId);
    navigator.clipboard.writeText(text).then(() => {
      console.log('Successfully copied to clipboard');
      setCopiedButton(buttonId);
      setTimeout(() => setCopiedButton(null), 2000);
    }).catch((err) => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    });
  };

  // Fetch agent data only once when component mounts
  useEffect(() => {
    fetchAgent();
  }, [agentId]);

  // Fetch products only when products tab becomes active
  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    }
  }, [activeTab]);

  // Fetch training data only when training tab becomes active
  useEffect(() => {
    if (activeTab === 'training') {
      fetchTrainingData();
    }
  }, [activeTab]);

  // Fetch conversations only when conversations tab becomes active
  useEffect(() => {
    if (activeTab === 'conversations') {
      fetchConversations();
    }
  }, [activeTab]);

  // Fetch orders only when orders tab becomes active
  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const fetchAgent = async () => {
    try {
      const token = await user.getIdToken();
      const response = await axios.get(`${API_URL}/api/agents/${agentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgent(response.data);
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
      const token = await user.getIdToken();
      const response = await axios.post(
        `${API_URL}/api/chat/${agentId}/message`,
        { message: inputMessage },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

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

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);

    setUploadLoading(true);
    setUploadSuccess('');

    try {
      const token = await user.getIdToken();
      await axios.post(
        `${API_URL}/api/training/upload/${agentId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setUploadSuccess('Document uploaded successfully!');
      setUploadFile(null);
      setTimeout(() => setUploadSuccess(''), 3000);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload document: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploadLoading(false);
    }
  };

  // Training handlers
  const fetchTrainingData = async () => {
    setTrainingLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await axios.get(`${API_URL}/api/training/${agentId}/data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrainingData(response.data);
    } catch (error) {
      console.error('Error fetching training data:', error);
    } finally {
      setTrainingLoading(false);
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setUrlSubmitting(true);
    setUploadSuccess('');

    try {
      const token = await user.getIdToken();
      await axios.post(
        `${API_URL}/api/training/url`,
        { agent_id: agentId, url: urlInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUploadSuccess(`URL "${urlInput}" processed successfully!`);
      setUrlInput('');
      await fetchTrainingData();
      setTimeout(() => setUploadSuccess(''), 3000);
    } catch (error) {
      console.error('Error adding URL:', error);
      alert('Failed to process URL: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUrlSubmitting(false);
    }
  };

  const handleFaqSubmit = async (e) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      alert('Please fill in both question and answer');
      return;
    }

    setFaqSubmitting(true);
    setUploadSuccess('');

    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('agent_id', agentId);
      formData.append('faq_json', JSON.stringify([{ question: faqQuestion, answer: faqAnswer }]));

      await axios.post(`${API_URL}/api/training/faq`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUploadSuccess('FAQ added successfully!');
      setFaqQuestion('');
      setFaqAnswer('');
      await fetchTrainingData();
      setTimeout(() => setUploadSuccess(''), 3000);
    } catch (error) {
      console.error('Error adding FAQ:', error);
      alert('Failed to add FAQ: ' + (error.response?.data?.detail || error.message));
    } finally {
      setFaqSubmitting(false);
    }
  };

  const deleteTrainingItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this training data?')) return;

    try {
      const token = await user.getIdToken();
      await axios.delete(`${API_URL}/api/training/${agentId}/data?training_data_id=${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUploadSuccess('Training data deleted successfully!');
      await fetchTrainingData();
      setTimeout(() => setUploadSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting training data:', error);
      alert('Failed to delete training data: ' + (error.response?.data?.detail || error.message));
    }
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await axios.get(`${API_URL}/api/products/agent/${agentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const deleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const token = await user.getIdToken();
      await axios.delete(`${API_URL}/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProducts(); // Refresh list
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product: ' + (error.response?.data?.detail || error.message));
    }
  };

  const fetchConversations = async () => {
    setConversationsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await axios.get(`${API_URL}/api/analytics/${agentId}/conversations?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setConversationsLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await axios.get(`${API_URL}/api/orders?agent_id=${agentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus, notes = '') => {
    try {
      const token = await user.getIdToken();
      await axios.patch(
        `${API_URL}/api/orders/${orderId}/status`,
        { status: newStatus, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh orders after update
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Agent Not Found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary px-4 py-2 rounded-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <GlassHeader title={`${agent.name} - ${agent.company_name}`} />
      
      {/* Tabs */}
      <div className="header bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-4 sm:gap-6 lg:gap-8 overflow-x-auto hide-scrollbar">
            {['overview', 'products', 'training', 'test-chat', 'conversations', 'orders', 'integrations', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 sm:py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-300 ${
                  activeTab === tab
                    ? 'tab-active'
                    : 'tab-inactive'
                }`}
              >
                {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="card p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-white mb-6">Agent Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
                <p className="text-white">{agent.company_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Language</label>
                <p className="text-white">{agent.language || 'English'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tone</label>
                <p className="text-white">{agent.tone || 'Friendly'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Products</label>
                <p className="text-white">{agent.products?.join(', ') || 'None'}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <p className="text-white">{agent.company_description || 'No description'}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Greeting Message</label>
                <p className="text-white">{agent.greeting_message || 'Default greeting'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="card p-6 rounded-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Product Management</h2>
                <button
                  onClick={() => {
                    const modal = document.getElementById('addProductModal');
                    document.getElementById('modalTitle').textContent = 'Add New Product';
                    document.getElementById('productForm').reset();
                    setProductImageFile(null);
                    setProductImagePreview(null);
                    modal.classList.remove('hidden');
                  }}
                  className="btn-primary px-4 py-2 rounded-lg hover:bg-blue-600 transition-all duration-300"
                >
                  + Add Product
                </button>
              </div>

              {productsLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <svg className="mx-auto h-12 w-12 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-lg mb-2">No products yet</p>
                  <p className="text-sm">Add your first product to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="card border border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition-all duration-300">
                      {product.image_url && (
                        <img
                          src={product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`}
                          alt={product.name}
                          className="w-full h-48 object-cover rounded-lg mb-3"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <h3 className="text-lg font-semibold text-white mb-2">{product.name}</h3>
                      {product.price && (
                        <p className="text-blue-400 font-bold mb-2">
                          {product.currency || 'USD'} {product.price.toFixed(2)}
                        </p>
                      )}
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">{product.description}</p>
                      {product.category && (
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 mb-3">
                          {product.category}
                        </span>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            // Set product for editing
                            const modal = document.getElementById('addProductModal');
                            const form = document.getElementById('productForm');

                            // Populate form with product data
                            form.elements['productId'].value = product.id;
                            form.elements['name'].value = product.name;
                            form.elements['description'].value = product.description || '';
                            form.elements['detailed_description'].value = product.detailed_description || '';
                            form.elements['price'].value = product.price || '';
                            form.elements['currency'].value = product.currency || 'USD';
                            form.elements['category'].value = product.category || '';
                            form.elements['sku'].value = product.sku || '';
                            form.elements['stock_status'].value = product.stock_status || 'in_stock';
                            form.elements['features'].value = product.features?.join('\n') || '';
                            form.elements['image_url'].value = product.image_url || '';

                            // Show existing image
                            if (product.image_url) {
                              setProductImagePreview(product.image_url);
                            }

                            document.getElementById('modalTitle').textContent = 'Edit Product';
                            modal.classList.remove('hidden');
                          }}
                          className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-300 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="flex-1 px-3 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all duration-300 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add/Edit Product Modal */}
            <div id="addProductModal" className="hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="card max-w-2xl w-full my-8 rounded-xl">
                <div className="sticky top-0 z-10 bg-slate-800/90 backdrop-blur-sm p-6 border-b border-slate-700 rounded-t-xl">
                  <div className="flex justify-between items-center">
                    <h3 id="modalTitle" className="text-xl font-semibold text-white">Add New Product</h3>
                    <button
                      onClick={() => {
                        const modal = document.getElementById('addProductModal');
                        modal.classList.add('hidden');
                        document.getElementById('productForm').reset();
                        setProductImageFile(null);
                        setProductImagePreview(null);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-6">
                  <form id="productForm" onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const productId = formData.get('productId');

                    try {
                      const token = await user.getIdToken();
                      let imageUrl = formData.get('image_url');

                    // If user uploaded a file, upload it first
                    if (productImageFile) {
                      const imageFormData = new FormData();
                      imageFormData.append('file', productImageFile);

                      const uploadResponse = await axios.post(
                        `${API_URL}/api/products/upload-image`,
                        imageFormData,
                        {
                          headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'multipart/form-data'
                          }
                        }
                      );
                      imageUrl = uploadResponse.data.image_url;
                    }

                    const productData = {
                      agent_id: agentId,
                      name: formData.get('name'),
                      description: formData.get('description'),
                      detailed_description: formData.get('detailed_description'),
                      price: formData.get('price') ? parseFloat(formData.get('price')) : null,
                      currency: formData.get('currency'),
                      category: formData.get('category'),
                      sku: formData.get('sku'),
                      stock_status: formData.get('stock_status'),
                      features: formData.get('features')?.split('\n').filter(f => f.trim()) || [],
                      image_url: imageUrl
                    };

                    if (productId) {
                      // Update existing product
                      await axios.put(`${API_URL}/api/products/${productId}`, productData, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                    } else {
                      // Create new product
                      await axios.post(`${API_URL}/api/products`, productData, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                    }

                    // Close modal and refresh
                    document.getElementById('addProductModal').classList.add('hidden');
                    e.target.reset();
                    setProductImageFile(null);
                    setProductImagePreview(null);
                    fetchProducts();
                  } catch (error) {
                    console.error('Error saving product:', error);
                    alert('Failed to save product: ' + (error.response?.data?.detail || error.message));
                  }
                }}>
                  <input type="hidden" name="productId" />

                  <div className="space-y-6">
                    {/* Section 1: Essential Information */}
                    <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                      <h4 className="text-md font-semibold text-blue-400 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Essential Information
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Product Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            required
                            className="input-field w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                            placeholder="Enter product name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Short Description</label>
                          <textarea
                            name="description"
                            rows={2}
                            className="input-field w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                            placeholder="A brief tagline or summary (1-2 sentences)"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Price</label>
                            <input
                              type="number"
                              name="price"
                              step="0.01"
                              min="0"
                              className="input-field w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
                            <select
                              name="currency"
                              defaultValue="USD"
                              className="input-field w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                            >
                              <option value="USD">USD ($)</option>
                              <option value="EUR">EUR (€)</option>
                              <option value="GBP">GBP (£)</option>
                              <option value="JPY">JPY (¥)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Product Image */}
                    <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                      <h4 className="text-md font-semibold text-blue-400 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Product Photo
                      </h4>

                      {/* Image Preview */}
                      {productImagePreview && (
                        <div className="mb-3 relative">
                          <img
                            src={productImagePreview.startsWith('http') || productImagePreview.startsWith('data:') ? productImagePreview : `${API_URL}${productImagePreview}`}
                            alt="Preview"
                            className="w-full h-56 object-cover rounded-lg border-2 border-blue-500/30"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setProductImageFile(null);
                              setProductImagePreview(null);
                            }}
                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white px-3 py-1 rounded-lg text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      {!productImagePreview && (
                        <>
                          {/* File Upload */}
                          <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-blue-500/50 transition-colors">
                            <svg className="mx-auto h-12 w-12 text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <label className="cursor-pointer">
                              <span className="text-blue-400 hover:text-blue-300 font-medium">Upload a file</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    setProductImageFile(file);
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setProductImagePreview(reader.result);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                            <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                          </div>

                          {/* OR divider */}
                          <div className="flex items-center my-4">
                            <div className="flex-1 border-t border-slate-700"></div>
                            <span className="px-3 text-sm text-slate-500 font-medium">OR</span>
                            <div className="flex-1 border-t border-slate-700"></div>
                          </div>

                          {/* Image URL */}
                          <div>
                            <input
                              type="url"
                              name="image_url"
                              onChange={(e) => {
                                if (e.target.value && e.target.value.startsWith('http')) {
                                  setProductImagePreview(e.target.value);
                                }
                              }}
                              className="input-field w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                              placeholder="Paste image URL (https://...)"
                            />
                            <p className="text-xs text-slate-500 mt-1">Enter a direct link to an image</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Section 3: Details */}
                    <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                      <h4 className="text-md font-semibold text-blue-400 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Product Details
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Detailed Description</label>
                          <textarea
                            name="detailed_description"
                            rows={4}
                            className="input-field w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                            placeholder="Detailed product information, specifications, benefits..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Key Features (one per line)
                          </label>
                          <textarea
                            name="features"
                            rows={4}
                            className="input-field w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                            placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                          />
                          <p className="text-xs text-slate-500 mt-1">List main features, benefits, or highlights</p>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Advanced Options */}
                    <details className="bg-slate-800/30 rounded-lg border border-slate-700">
                      <summary className="cursor-pointer p-4 font-medium text-slate-300 hover:text-white flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        Advanced Options (Optional)
                      </summary>

                      <div className="p-4 pt-0 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                            <input
                              type="text"
                              name="category"
                              className="input-field w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                              placeholder="e.g., Electronics"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">SKU</label>
                            <input
                              type="text"
                              name="sku"
                              className="input-field w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                              placeholder="Product SKU"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Stock Status</label>
                          <select
                            name="stock_status"
                            defaultValue="in_stock"
                            className="input-field w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                          >
                            <option value="in_stock">In Stock</option>
                            <option value="out_of_stock">Out of Stock</option>
                            <option value="pre_order">Pre-order</option>
                            <option value="discontinued">Discontinued</option>
                          </select>
                        </div>
                      </div>
                    </details>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById('addProductModal').classList.add('hidden');
                        document.getElementById('productForm').reset();
                        setProductImageFile(null);
                        setProductImagePreview(null);
                      }}
                      className="flex-1 px-4 py-2 btn-secondary rounded-lg hover:bg-slate-600 transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 btn-primary rounded-lg hover:bg-blue-600 transition-all duration-300"
                    >
                      Save Product
                    </button>
                  </div>
                </form>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Training Tab */}
        {activeTab === 'training' && (
          <div className="space-y-6">
            {uploadSuccess && (
              <div className="bg-green-500/20 border border-green-500/30 text-green-200 px-4 py-3 rounded-lg">
                {uploadSuccess}
              </div>
            )}

            {/* Training Methods Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload PDF */}
              <div className="card p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Upload Document</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4">Upload PDF or TXT files to train your agent</p>
                <form onSubmit={handleFileUpload}>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-500/20 file:text-primary-300 hover:file:bg-primary-500/30 cursor-pointer"
                  />
                  {uploadFile && (
                    <button
                      type="submit"
                      disabled={uploadLoading}
                      className="mt-4 w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-50 transition-colors font-medium"
                    >
                      {uploadLoading ? 'Uploading...' : 'Upload File'}
                    </button>
                  )}
                </form>
              </div>

              {/* Add URL */}
              <div className="card p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Add Website URL</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4">Train from website content</p>
                <form onSubmit={handleUrlSubmit}>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com"
                    className="input-field w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-slate-500 text-white mb-3"
                    disabled={urlSubmitting}
                  />
                  <button
                    type="submit"
                    disabled={urlSubmitting || !urlInput.trim()}
                    className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors font-medium"
                  >
                    {urlSubmitting ? 'Processing...' : 'Add URL'}
                  </button>
                </form>
              </div>

              {/* Add FAQ */}
              <div className="card p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Add FAQ</h3>
                </div>
                <p className="text-sm text-slate-400 mb-4">Add frequently asked questions</p>
                <form onSubmit={handleFaqSubmit}>
                  <input
                    type="text"
                    value={faqQuestion}
                    onChange={(e) => setFaqQuestion(e.target.value)}
                    placeholder="Question"
                    className="input-field w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 placeholder:text-slate-500 text-white mb-2"
                    disabled={faqSubmitting}
                  />
                  <textarea
                    value={faqAnswer}
                    onChange={(e) => setFaqAnswer(e.target.value)}
                    rows={2}
                    placeholder="Answer"
                    className="input-field w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 placeholder:text-slate-500 text-white mb-3"
                    disabled={faqSubmitting}
                  />
                  <button
                    type="submit"
                    disabled={faqSubmitting || !faqQuestion.trim() || !faqAnswer.trim()}
                    className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 transition-colors font-medium"
                  >
                    {faqSubmitting ? 'Adding...' : 'Add FAQ'}
                  </button>
                </form>
              </div>
            </div>

            {/* Training Data List */}
            <div className="card p-6 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Training Data</h3>
                <span className="text-sm text-slate-400">
                  {trainingData.length} item{trainingData.length !== 1 ? 's' : ''}
                </span>
              </div>

              {trainingLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  <p className="text-slate-400 mt-2">Loading training data...</p>
                </div>
              ) : trainingData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-slate-400 mb-2">No training data yet</p>
                  <p className="text-sm text-slate-500">Upload documents, add URLs, or create FAQs to train your agent</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trainingData.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-800/40 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors">
                      {/* Icon based on type */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        item.type === 'pdf' ? 'bg-red-500/20' :
                        item.type === 'url' ? 'bg-blue-500/20' :
                        'bg-green-500/20'
                      }`}>
                        {item.type === 'pdf' ? (
                          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                        ) : item.type === 'url' ? (
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            item.type === 'pdf' ? 'bg-red-500/20 text-red-300' :
                            item.type === 'url' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-green-500/20 text-green-300'
                          }`}>
                            {item.type.toUpperCase()}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            item.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                            item.status === 'processing' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-sm text-white truncate">
                          {item.metadata?.filename || item.metadata?.url || 'FAQ Item'}
                        </p>
                        {item.metadata?.chunks_created && (
                          <p className="text-xs text-slate-500 mt-1">
                            {item.metadata.chunks_created} chunks created
                          </p>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => deleteTrainingItem(item.id)}
                        className="flex-shrink-0 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Test Chat Tab */}
        {activeTab === 'test-chat' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Chat Section */}
            <div className="flex-1 chat-container h-[600px] flex flex-col">
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Test Chat</h2>
                  <p className="text-sm text-slate-400">Test your agent's responses</p>
                </div>
                <button
                  onClick={() => setActiveTab('products')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Manage Products
                </button>
              </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-slate-400 mt-8">
                  <p>Start a conversation to test your agent</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'chat-message-user'
                          : 'chat-message-assistant'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="chat-message-assistant">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="input-field flex-1 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-slate-500 text-white"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !inputMessage.trim()}
                  className="btn-primary px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
            </div>

            {/* Products Sidebar */}
            <div className="lg:w-80 space-y-4">
              <div className="card-premium p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Available Products
                </h3>

                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
                  {products.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-sm">No products yet</p>
                      <button
                        onClick={() => setActiveTab('products')}
                        className="mt-3 text-xs text-blue-400 hover:text-blue-300"
                      >
                        Add your first product
                      </button>
                    </div>
                  ) : (
                    products.map((product) => (
                      <a
                        key={product.id}
                        href={product.image_url || '#'}
                        target={product.image_url ? '_blank' : '_self'}
                        rel="noopener noreferrer"
                        className="block bg-slate-800/50 rounded-lg p-3 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all duration-300 group cursor-pointer"
                      >
                        {/* Product Image */}
                        {product.image_url && (
                          <div className="w-full h-32 mb-3 rounded-md overflow-hidden bg-slate-700/50">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {/* Product Info */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-white text-sm group-hover:text-blue-400 transition-colors line-clamp-2">
                              {product.name}
                            </h4>
                            {product.price && (
                              <span className="text-blue-400 font-bold text-sm whitespace-nowrap">
                                ${product.price}
                              </span>
                            )}
                          </div>

                          {product.description && (
                            <p className="text-xs text-slate-400 line-clamp-2">
                              {product.description}
                            </p>
                          )}

                          {/* Link indicator */}
                          <div className="flex items-center gap-1 text-xs text-blue-400/70 group-hover:text-blue-400">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span>Click to view</span>
                          </div>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card-premium p-4">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('products')}
                    className="w-full text-left px-3 py-2 text-sm bg-slate-800/50 rounded-lg hover:bg-blue-500/20 text-slate-300 hover:text-blue-300 transition-all duration-300 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Product
                  </button>
                  <button
                    onClick={() => {
                      setMessages([]);
                      setInputMessage('');
                    }}
                    className="w-full text-left px-3 py-2 text-sm bg-slate-800/50 rounded-lg hover:bg-red-500/20 text-slate-300 hover:text-red-300 transition-all duration-300 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <div className="space-y-6">
            {/* Header with Stats */}
            <div className="card-premium p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Conversation History</h2>
                  <p className="text-slate-400">View all chats and leads captured by this agent</p>
                </div>
                <button
                  onClick={fetchConversations}
                  className="btn-secondary px-4 py-2 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Total Conversations</p>
                  <p className="text-2xl font-bold text-white">{conversations.length}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Leads Captured</p>
                  <p className="text-2xl font-bold text-green-400">
                    {conversations.filter(c => c.lead_info).length}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Conversion Rate</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {conversations.length > 0
                      ? Math.round((conversations.filter(c => c.lead_info).length / conversations.length) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Avg Messages</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {conversations.length > 0
                      ? Math.round(conversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0) / conversations.length)
                      : 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Conversations List */}
            <div className="card-premium p-6">
              <h3 className="text-xl font-bold text-white mb-4">Recent Conversations</h3>

              {conversationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 text-lg mb-2">No conversations yet</p>
                  <p className="text-slate-500 text-sm">Share your agent link to start receiving conversations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="bg-slate-800/50 rounded-lg p-5 hover:bg-slate-800/70 transition-all duration-300 border border-slate-700/50 hover:border-purple-500/50"
                    >
                      {/* Conversation Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-slate-400">
                              Session: {conv.session_id?.slice(0, 8)}...
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              conv.lead_info
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-slate-700 text-slate-400'
                            }`}>
                              {conv.lead_info ? '✓ Lead Captured' : 'Visitor'}
                            </span>
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold border border-blue-500/30">
                              {conv.channel || 'web'}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm">
                            {new Date(conv.created_at).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => setExpandedConv(expandedConv === conv.id ? null : conv.id)}
                          className="btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:scale-105 transition-transform"
                        >
                          {expandedConv === conv.id ? 'Hide Details' : 'View Details'}
                          <svg
                            className={`w-4 h-4 transition-transform ${expandedConv === conv.id ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* Conversation Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-slate-500 text-xs mb-1">Messages</p>
                          <p className="text-white font-semibold">{conv.messages?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs mb-1">Duration</p>
                          <p className="text-white font-semibold">
                            {conv.updated_at && conv.created_at
                              ? `${Math.round((new Date(conv.updated_at) - new Date(conv.created_at)) / 60000)}m`
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs mb-1">Status</p>
                          <p className={`font-semibold ${conv.lead_info ? 'text-green-400' : 'text-slate-400'}`}>
                            {conv.lead_info?.interest_level || 'Browsing'}
                          </p>
                        </div>
                      </div>

                      {/* Lead Info */}
                      {conv.lead_info && (
                        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                          <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Lead Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {conv.lead_info.name && (
                              <div>
                                <p className="text-slate-400 text-xs mb-1">Name</p>
                                <p className="text-white font-medium">{conv.lead_info.name}</p>
                              </div>
                            )}
                            {conv.lead_info.email && (
                              <div>
                                <p className="text-slate-400 text-xs mb-1">Email</p>
                                <a href={`mailto:${conv.lead_info.email}`} className="text-blue-400 hover:text-blue-300 font-medium">
                                  {conv.lead_info.email}
                                </a>
                              </div>
                            )}
                            {conv.lead_info.phone && (
                              <div>
                                <p className="text-slate-400 text-xs mb-1">Phone</p>
                                <a href={`tel:${conv.lead_info.phone}`} className="text-blue-400 hover:text-blue-300 font-medium">
                                  {conv.lead_info.phone}
                                </a>
                              </div>
                            )}
                            {conv.lead_info.company && (
                              <div>
                                <p className="text-slate-400 text-xs mb-1">Company</p>
                                <p className="text-white font-medium">{conv.lead_info.company}</p>
                              </div>
                            )}
                            {conv.lead_info.budget && (
                              <div>
                                <p className="text-slate-400 text-xs mb-1">Budget</p>
                                <p className="text-white font-medium">{conv.lead_info.budget}</p>
                              </div>
                            )}
                            {conv.lead_info.timeline && (
                              <div>
                                <p className="text-slate-400 text-xs mb-1">Timeline</p>
                                <p className="text-white font-medium">{conv.lead_info.timeline}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expanded Conversation Details */}
                      {expandedConv === conv.id && (
                        <div className="border-t border-slate-700 pt-4 mt-4">
                          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Full Conversation
                          </h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {conv.messages && conv.messages.length > 0 ? (
                              conv.messages.map((msg, idx) => (
                                <div
                                  key={idx}
                                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`max-w-[70%] rounded-lg p-3 ${
                                      msg.role === 'user'
                                        ? 'bg-purple-500/20 border border-purple-500/30'
                                        : 'bg-slate-700/50 border border-slate-600'
                                    }`}
                                  >
                                    <p className="text-xs text-slate-400 mb-1 font-semibold">
                                      {msg.role === 'user' ? 'Visitor' : 'AI Agent'}
                                    </p>
                                    <p className="text-white text-sm whitespace-pre-wrap">{msg.content}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-400 text-sm text-center py-4">No messages recorded</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Header with Stats */}
            <div className="card-premium p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Order Management</h2>
                  <p className="text-slate-400">Track and manage all orders placed through this agent</p>
                </div>
                <button
                  onClick={fetchOrders}
                  className="btn-secondary px-4 py-2 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-white">{orders.length}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Pending</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {orders.filter(o => o.status === 'pending' || o.status === 'processing').length}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Delivered</p>
                  <p className="text-2xl font-bold text-green-400">
                    {orders.filter(o => o.status === 'delivered').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="card-premium p-6">
              {ordersLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <p className="mt-4 text-slate-400">No orders yet</p>
                  <p className="text-slate-500 text-sm">Orders will appear here when customers complete purchases</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800/70 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{order.order_number}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                              order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                              order.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                              order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {order.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <p className="text-slate-500 text-sm">Customer</p>
                              <p className="text-white">{order.customer_name}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-sm">Email</p>
                              <p className="text-white text-sm">{order.customer_email}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-sm">Total</p>
                              <p className="text-white font-semibold">${parseFloat(order.total_amount).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-sm">Date</p>
                              <p className="text-white text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>

                          {/* Order Items */}
                          <div className="bg-slate-900/50 rounded p-3 mb-3">
                            <p className="text-slate-400 text-sm mb-2">Items:</p>
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm mb-1">
                                <span className="text-white">{item.name} x {item.quantity}</span>
                                <span className="text-slate-400">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 flex-wrap">
                            {order.status === 'pending' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'processing', 'Order confirmed and processing started')}
                                className="btn-secondary px-3 py-1 text-sm rounded"
                              >
                                Mark as Processing
                              </button>
                            )}
                            {order.status === 'processing' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'shipped', 'Order has been shipped')}
                                className="btn-secondary px-3 py-1 text-sm rounded"
                              >
                                Mark as Shipped
                              </button>
                            )}
                            {order.status === 'shipped' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'delivered', 'Order delivered successfully')}
                                className="btn-primary px-3 py-1 text-sm rounded"
                              >
                                Mark as Delivered
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="btn-secondary px-3 py-1 text-sm rounded"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedOrder(null)}>
                <div className="card-premium max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">{selectedOrder.order_number}</h3>
                        <p className="text-slate-400">Order Details</p>
                      </div>
                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-white mb-3">Customer Information</h4>
                      <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                        <p className="text-white"><span className="text-slate-400">Name:</span> {selectedOrder.customer_name}</p>
                        <p className="text-white"><span className="text-slate-400">Email:</span> {selectedOrder.customer_email}</p>
                        <p className="text-white"><span className="text-slate-400">Phone:</span> {selectedOrder.customer_phone}</p>
                        {selectedOrder.shipping_address && (
                          <div>
                            <p className="text-slate-400 mb-1">Shipping Address:</p>
                            <p className="text-white">
                              {selectedOrder.shipping_address.street}, {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.zip}, {selectedOrder.shipping_address.country}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-white mb-3">Order Items</h4>
                      <div className="bg-slate-800/50 rounded-lg p-4">
                        {selectedOrder.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                            <div>
                              <p className="text-white font-medium">{item.name}</p>
                              <p className="text-slate-400 text-sm">Quantity: {item.quantity}</p>
                            </div>
                            <p className="text-white font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        ))}
                        <div className="mt-4 pt-4 border-t border-slate-700">
                          <div className="flex justify-between items-center">
                            <p className="text-lg font-bold text-white">Total</p>
                            <p className="text-2xl font-bold text-green-400">${parseFloat(selectedOrder.total_amount).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status History */}
                    {selectedOrder.status_history && selectedOrder.status_history.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-white mb-3">Status History</h4>
                        <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                          {selectedOrder.status_history.map((history, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                              <div className="flex-1">
                                <p className="text-white font-medium">{history.status.toUpperCase()}</p>
                                <p className="text-slate-400 text-sm">{new Date(history.timestamp).toLocaleString()}</p>
                                {history.note && <p className="text-slate-300 text-sm mt-1">{history.note}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tracking Info */}
                    {selectedOrder.tracking_number && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-blue-400 font-semibold mb-2">Tracking Information</p>
                        <p className="text-white"><span className="text-slate-400">Tracking Number:</span> {selectedOrder.tracking_number}</p>
                        {selectedOrder.carrier && (
                          <p className="text-white"><span className="text-slate-400">Carrier:</span> {selectedOrder.carrier}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="card-premium p-6">
              <h2 className="text-2xl font-bold text-white mb-2">Integrations & Sharing</h2>
              <p className="text-slate-400">Connect your AI agent to popular platforms and share it anywhere</p>
            </div>

            {/* Available Integrations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Direct Link Card */}
              <div className="card-premium p-6 border-2 border-blue-500/30 hover:border-blue-500/50 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Direct Link</h3>
                      <span className="inline-block px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">Active</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mb-4">Share this link with anyone to chat with your AI agent</p>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/chat/${agentId}`}
                      className="flex-1 px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-300 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/chat/${agentId}`, 'direct-link')}
                      className="px-4 py-2.5 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-300 cursor-pointer"
                      style={{ cursor: 'pointer' }}
                    >
                      {copiedButton === 'direct-link' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <a
                    href={`/chat/${agentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Open in new tab
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Website Embed Card - IMPROVED WITH MULTIPLE OPTIONS */}
              <div className="col-span-full card-premium p-8 border-2 border-purple-500/30 hover:border-purple-500/50 transition-all duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/20">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">Website Embed Widget</h3>
                      <p className="text-slate-400">Choose your preferred embed style and customize the appearance</p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 bg-green-500/20 text-green-400 text-sm font-semibold rounded-full border border-green-500/30">Ready to Use</span>
                </div>

                {/* Widget Style Selector */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Floating Bubble */}
                  <button
                    onClick={() => setWidgetView('bubble')}
                    className={`p-6 bg-slate-800/50 hover:bg-slate-800 border-2 rounded-xl transition-all duration-300 text-left group ${widgetView === 'bubble' ? 'border-purple-500 bg-slate-800' : 'border-purple-500/30'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">Floating Bubble</h4>
                        <p className="text-xs text-slate-400">Bottom-right corner</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400">Modern chat bubble that stays fixed on screen</p>
                  </button>

                  {/* Inline Widget */}
                  <button
                    onClick={() => setWidgetView('inline')}
                    className={`p-6 bg-slate-800/50 hover:bg-slate-800 border-2 rounded-xl transition-all duration-300 text-left group ${widgetView === 'inline' ? 'border-purple-500 bg-slate-800' : 'border-purple-500/30'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">Inline Widget</h4>
                        <p className="text-xs text-slate-400">Embed in page</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400">Integrates directly into your page content</p>
                  </button>

                  {/* Full Page iFrame */}
                  <button
                    onClick={() => setWidgetView('iframe')}
                    className={`p-6 bg-slate-800/50 hover:bg-slate-800 border-2 rounded-xl transition-all duration-300 text-left group ${widgetView === 'iframe' ? 'border-purple-500 bg-slate-800' : 'border-purple-500/30'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">Full Page</h4>
                        <p className="text-xs text-slate-400">Dedicated chat page</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400">Full-screen chat experience via iframe</p>
                  </button>
                </div>

                {/* Code Preview - Floating Bubble (Default) */}
                {widgetView === 'bubble' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">Floating Chat Bubble Code</h4>
                    <span className="text-xs text-purple-400">Recommended ⭐</span>
                  </div>
                  <pre className="bg-slate-900/80 border border-purple-500/30 rounded-xl p-5 text-xs text-slate-300 overflow-x-auto shadow-inner">
{`<script>
  (function() {
    var bubble = document.createElement('div');
    bubble.id = 'ai-chat-bubble';
    bubble.innerHTML = '<iframe src="${window.location.origin}/chat/${agentId}" style="position:fixed;bottom:20px;right:20px;width:400px;height:600px;border:none;border-radius:16px;box-shadow:0 10px 40px rgba(139,92,246,0.3);z-index:9999;"></iframe>';
    document.body.appendChild(bubble);
  })();
</script>`}
                  </pre>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const code = `<script>(function(){var bubble=document.createElement('div');bubble.id='ai-chat-bubble';bubble.innerHTML='<iframe src="${window.location.origin}/chat/${agentId}" style="position:fixed;bottom:20px;right:20px;width:400px;height:600px;border:none;border-radius:16px;box-shadow:0 10px 40px rgba(139,92,246,0.3);z-index:9999;"></iframe>';document.body.appendChild(bubble);})();</script>`;
                        copyToClipboard(code, 'bubble-code');
                      }}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-lg shadow-purple-500/30"
                    >
                      {copiedButton === 'bubble-code' ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                    <a
                      href={`${window.location.origin}/chat/${agentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all duration-300 flex items-center gap-2 font-semibold"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Preview
                    </a>
                  </div>
                </div>
                )}

                {/* Code Preview - Inline Widget */}
                {widgetView === 'inline' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-white mb-2">Inline Widget Code</h4>
                  <pre className="bg-slate-900/80 border border-purple-500/30 rounded-xl p-5 text-xs text-slate-300 overflow-x-auto shadow-inner">
{`<div id="ai-chat-widget" style="width:100%;max-width:600px;margin:0 auto;">
  <iframe
    src="${window.location.origin}/chat/${agentId}"
    style="width:100%;height:700px;border:none;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.2);">
  </iframe>
</div>`}
                  </pre>
                  <button
                    onClick={() => {
                      const code = `<div id="ai-chat-widget" style="width:100%;max-width:600px;margin:0 auto;"><iframe src="${window.location.origin}/chat/${agentId}" style="width:100%;height:700px;border:none;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.2);"></iframe></div>`;
                      copyToClipboard(code, 'inline-code');
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-lg shadow-purple-500/30"
                  >
                    {copiedButton === 'inline-code' ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                )}

                {/* Code Preview - Full Page iFrame */}
                {widgetView === 'iframe' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-white mb-2">Full Page iFrame Code</h4>
                  <pre className="bg-slate-900/80 border border-purple-500/30 rounded-xl p-5 text-xs text-slate-300 overflow-x-auto shadow-inner">
{`<iframe
  src="${window.location.origin}/chat/${agentId}"
  width="100%"
  height="100%"
  style="border:none;min-height:600px;">
</iframe>`}
                  </pre>
                  <button
                    onClick={() => {
                      const code = `<iframe src="${window.location.origin}/chat/${agentId}" width="100%" height="100%" style="border:none;min-height:600px;"></iframe>`;
                      copyToClipboard(code, 'iframe-code');
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-lg shadow-purple-500/30"
                  >
                    {copiedButton === 'iframe-code' ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                )}

                {/* Quick Tips */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-300">
                      <p className="font-semibold mb-1">Pro Tips:</p>
                      <ul className="space-y-1 text-blue-200/80 text-xs">
                        <li>• Paste the code right before your closing &lt;/body&gt; tag</li>
                        <li>• Bubble widget works best for global site presence</li>
                        <li>• Inline widget perfect for dedicated support pages</li>
                        <li>• Test on mobile devices for responsive behavior</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Telegram Card */}
              <div className="card-premium p-6 border-2 border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Telegram Bot</h3>
                      <span className="inline-block px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">Free</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mb-4">Connect your agent to Telegram using BotFather API</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Paste your bot token here..."
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-300 placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-500/50 text-sm"
                  />
                  <button className="w-full px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-all duration-300 text-sm font-medium">
                    Connect Telegram Bot
                  </button>
                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer text-cyan-400 hover:text-cyan-300">How to get bot token?</summary>
                    <ol className="mt-2 space-y-1 list-decimal list-inside text-slate-400 pl-2">
                      <li>Open Telegram and search for <code className="px-1.5 py-0.5 bg-slate-800 rounded">@BotFather</code></li>
                      <li>Send <code className="px-1.5 py-0.5 bg-slate-800 rounded">/newbot</code> command</li>
                      <li>Follow instructions and copy your token</li>
                    </ol>
                  </details>
                </div>
              </div>

              {/* WhatsApp Card - Coming Soon */}
              <div className="card-premium p-6 border-2 border-slate-600/30 hover:border-green-500/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-500/30">Coming Soon</span>
                </div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl opacity-60">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">WhatsApp Business</h3>
                    <p className="text-sm text-slate-400 mt-1">Connect your agent to WhatsApp Business API</p>
                  </div>
                </div>
                <div className="space-y-3 opacity-60">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    2-way messaging with customers
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Rich media support (images, files)
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Business profile verification
                  </div>
                </div>
                <button disabled className="w-full mt-4 px-4 py-2 bg-slate-700/50 text-slate-500 rounded-lg cursor-not-allowed text-sm font-medium">
                  Available Soon
                </button>
              </div>

              {/* Slack Card - Coming Soon */}
              <div className="card-premium p-6 border-2 border-slate-600/30 hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-500/30">Coming Soon</span>
                </div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl opacity-60">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Slack</h3>
                    <p className="text-sm text-slate-400 mt-1">Add your agent as a Slack bot to your workspace</p>
                  </div>
                </div>
                <div className="space-y-3 opacity-60">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Answer questions in channels
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Direct message support
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Custom slash commands
                  </div>
                </div>
                <button disabled className="w-full mt-4 px-4 py-2 bg-slate-700/50 text-slate-500 rounded-lg cursor-not-allowed text-sm font-medium">
                  Available Soon
                </button>
              </div>

              {/* Discord Card - Coming Soon */}
              <div className="card-premium p-6 border-2 border-slate-600/30 hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-500/30">Coming Soon</span>
                </div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl opacity-60">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Discord</h3>
                    <p className="text-sm text-slate-400 mt-1">Deploy your agent as a Discord bot</p>
                  </div>
                </div>
                <div className="space-y-3 opacity-60">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Server and DM support
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Rich embeds and reactions
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Role-based permissions
                  </div>
                </div>
                <button disabled className="w-full mt-4 px-4 py-2 bg-slate-700/50 text-slate-500 rounded-lg cursor-not-allowed text-sm font-medium">
                  Available Soon
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="stats-card">
                <div className="text-sm font-medium text-slate-400">Total Conversations</div>
                <div className="mt-2 text-3xl font-bold text-white">0</div>
              </div>
              <div className="stats-card">
                <div className="text-sm font-medium text-slate-400">Leads Captured</div>
                <div className="mt-2 text-3xl font-bold text-white">0</div>
              </div>
              <div className="stats-card">
                <div className="text-sm font-medium text-slate-400">Avg. Response Time</div>
                <div className="mt-2 text-3xl font-bold text-white">2.3s</div>
              </div>
            </div>

            <div className="card p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Conversations</h3>
              <div className="text-center py-8 text-slate-400">
                No conversations yet
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AgentDetail;
