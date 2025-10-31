import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import GlassHeader from '../components/GlassHeader';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CreateAgent = () => {
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    company_description: '',
    tone: 'friendly',
    language: 'en',
    greeting_message: '',
    sales_strategy: 'Product Sales',
    target_audience: '',
    unique_selling_points: '',
    industry: ''
  });

  // Products state
  const [products, setProducts] = useState([
    { name: '', description: '', price: '', features: [''] }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.company_name) {
      setError('Please fill in Agent Name and Company Name');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const token = await user.getIdToken();

      // Create agent first
      const agentData = {
        ...formData,
        user_id: user.uid
      };

      const agentResponse = await axios.post(`${API_URL}/api/agents`, agentData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const agentId = agentResponse.data.id;

      // Create products if any are filled
      const validProducts = products.filter(p => p.name.trim() && p.price);

      if (validProducts.length > 0) {
        for (const product of validProducts) {
          await axios.post(
            `${API_URL}/api/products`,
            {
              agent_id: agentId,
              name: product.name,
              description: product.description,
              price: parseFloat(product.price) || 0,
              features: product.features.filter(f => f.trim()),  // Send as array, not JSON string
              currency: 'USD',
              stock_status: 'in_stock'
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
        }
      }

      navigate(`/agents/${agentId}`);
    } catch (err) {
      setError('Failed to create agent: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Product handlers
  const handleProductChange = (index, field, value) => {
    const newProducts = [...products];
    newProducts[index][field] = value;
    setProducts(newProducts);
  };

  const handleFeatureChange = (productIndex, featureIndex, value) => {
    const newProducts = [...products];
    newProducts[productIndex].features[featureIndex] = value;
    setProducts(newProducts);
  };

  const addFeature = (productIndex) => {
    const newProducts = [...products];
    newProducts[productIndex].features.push('');
    setProducts(newProducts);
  };

  const removeFeature = (productIndex, featureIndex) => {
    const newProducts = [...products];
    newProducts[productIndex].features.splice(featureIndex, 1);
    setProducts(newProducts);
  };

  const addProduct = () => {
    setProducts([...products, { name: '', description: '', price: '', features: [''] }]);
  };

  const removeProduct = (index) => {
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <GlassHeader title="Create New AI Agent" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-6 sm:p-8 rounded-xl">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400 text-sm font-bold">1</span>
                Basic Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Agent Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input-field w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 placeholder:text-slate-500 text-white"
                    placeholder="My Sales Agent"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className="input-field w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 placeholder:text-slate-500 text-white"
                    placeholder="Acme Inc."
                    disabled={loading}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company Description
                  </label>
                  <textarea
                    name="company_description"
                    value={formData.company_description}
                    onChange={handleChange}
                    rows={3}
                    className="input-field w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 placeholder:text-slate-500 text-white"
                    placeholder="Describe your company and what you do..."
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Industry</label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="input-field w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 placeholder:text-slate-500 text-white"
                    placeholder="E-commerce, Healthcare, Finance..."
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Target Audience</label>
                  <input
                    type="text"
                    name="target_audience"
                    value={formData.target_audience}
                    onChange={handleChange}
                    className="input-field w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 placeholder:text-slate-500 text-white"
                    placeholder="Young professionals, Business owners..."
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400 text-sm font-bold">2</span>
                  Products/Services
                </h2>
                <button
                  type="button"
                  onClick={addProduct}
                  className="px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 text-primary-300 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                  disabled={loading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Product
                </button>
              </div>

              <div className="space-y-4">
                {products.map((product, productIndex) => (
                  <div key={productIndex} className="p-4 sm:p-6 bg-slate-800/40 border border-slate-700 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Product {productIndex + 1}</h3>
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProduct(productIndex)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          disabled={loading}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Product Name</label>
                        <input
                          type="text"
                          value={product.name}
                          onChange={(e) => handleProductChange(productIndex, 'name', e.target.value)}
                          className="input-field w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 placeholder:text-slate-500 text-white text-sm"
                          placeholder="Premium Coffee"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Price (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={product.price}
                          onChange={(e) => handleProductChange(productIndex, 'price', e.target.value)}
                          className="input-field w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 placeholder:text-slate-500 text-white text-sm"
                          placeholder="9.99"
                          disabled={loading}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                        <textarea
                          value={product.description}
                          onChange={(e) => handleProductChange(productIndex, 'description', e.target.value)}
                          rows={2}
                          className="input-field w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 placeholder:text-slate-500 text-white text-sm"
                          placeholder="Describe this product..."
                          disabled={loading}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Features</label>
                        <div className="space-y-2">
                          {product.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex gap-2">
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => handleFeatureChange(productIndex, featureIndex, e.target.value)}
                                className="input-field flex-1 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 placeholder:text-slate-500 text-white text-sm"
                                placeholder="Feature description..."
                                disabled={loading}
                              />
                              {product.features.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeFeature(productIndex, featureIndex)}
                                  className="px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 rounded-lg transition-colors"
                                  disabled={loading}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addFeature(productIndex)}
                            className="text-sm text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
                            disabled={loading}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Feature
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configuration */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-primary-400 text-sm font-bold">3</span>
                Agent Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tone</label>
                  <select
                    name="tone"
                    value={formData.tone}
                    onChange={handleChange}
                    className="input-field w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-white"
                    disabled={loading}
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="casual">Casual</option>
                    <option value="enthusiastic">Enthusiastic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="input-field w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-white"
                    disabled={loading}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Sales Strategy</label>
                  <select
                    name="sales_strategy"
                    value={formData.sales_strategy}
                    onChange={handleChange}
                    className="input-field w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-white"
                    disabled={loading}
                  >
                    <option value="Lead Generation">Lead Generation</option>
                    <option value="Product Sales">Product Sales</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Appointment Booking">Appointment Booking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Unique Selling Points</label>
                  <input
                    type="text"
                    name="unique_selling_points"
                    value={formData.unique_selling_points}
                    onChange={handleChange}
                    className="input-field w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 placeholder:text-slate-500 text-white"
                    placeholder="What makes you different?"
                    disabled={loading}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Greeting Message</label>
                  <textarea
                    name="greeting_message"
                    value={formData.greeting_message}
                    onChange={handleChange}
                    rows={2}
                    className="input-field w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 placeholder:text-slate-500 text-white"
                    placeholder="Hi! Welcome to our store. How can I help you today?"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-lg shadow-primary-500/30"
              >
                {loading ? 'Creating...' : 'Create Agent'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateAgent;
