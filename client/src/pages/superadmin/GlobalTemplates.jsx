import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Navbar from '../../components/common/Navbar';
import RichTextEditor from '../../components/common/RichTextEditor';
import {
  Plus, Search, Edit3, Trash2, Eye, Globe, FileText, Tag,
  Calendar, BarChart3, X, Save, Code, Type, Shield, ArrowLeft
} from 'lucide-react';

const SuperAdminGlobalTemplates = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [formData, setFormData] = useState({
    title: '', category: 'General', htmlContent: '', description: '', tags: [], isDefault: false
  });
  const [formErrors, setFormErrors] = useState({});
  const [inputMode, setInputMode] = useState('text');

  const categoryOptions = [
    'General', 'CT', 'CR', 'CT SCREENING FORMAT', 'ECHO',
    'EEG-TMT-NCS', 'MR', 'MRI SCREENING FORMAT', 'PT', 'US', 'Other'
  ];

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/superadmin/templates', {
        params: {
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchTerm || undefined,
          page: currentPage, limit: 20
        }
      });
      if (response.data.success) {
        setTemplates(response.data.data.templates);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm, currentPage]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { setCurrentPage(1); }, [selectedCategory, searchTerm]);

  const handleCreateTemplate = () => {
    setFormData({ title: '', category: 'General', htmlContent: '', description: '', tags: [], isDefault: false });
    setInputMode('text');
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData({
      title: template.title, category: template.category, htmlContent: template.htmlContent,
      description: template.templateMetadata?.description || '',
      tags: template.templateMetadata?.tags || [],
      isDefault: template.templateMetadata?.isDefault || false
    });
    setInputMode('text');
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.htmlContent.trim()) errors.content = 'Content is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const templateData = {
      title: formData.title.trim(), category: formData.category, htmlContent: formData.htmlContent,
      templateMetadata: { description: formData.description.trim(), tags: formData.tags, isDefault: formData.isDefault }
    };

    try {
      if (showEditModal && selectedTemplate) {
        const res = await api.put(`/superadmin/templates/${selectedTemplate._id}`, templateData);
        if (res.data.success) { toast.success('Template updated'); setShowEditModal(false); fetchTemplates(); }
      } else {
        const res = await api.post('/superadmin/templates', templateData);
        if (res.data.success) { toast.success('Template created'); setShowCreateModal(false); fetchTemplates(); }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (template) => {
    if (!window.confirm(`Delete "${template.title}"?`)) return;
    try {
      const res = await api.delete(`/superadmin/templates/${template._id}`);
      if (res.data.success) { toast.success('Template deleted'); fetchTemplates(); }
    } catch (error) { toast.error('Failed to delete template'); }
  };

  const additionalActions = [
    { label: 'Create Global Template', icon: Plus, onClick: handleCreateTemplate, variant: 'primary', tooltip: 'Create new super global template' },
    { label: 'Back', icon: ArrowLeft, onClick: () => navigate('/superadmin/dashboard'), variant: 'secondary', tooltip: 'Back to dashboard' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="GLOBAL TEMPLATES" subtitle="Super Admin - Cross-Organization Templates" onRefresh={fetchTemplates} additionalActions={additionalActions} />

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-600" /> Global Templates
              </h2>
              <p className="text-sm text-gray-600 mt-1">These templates are available across all organizations</p>
            </div>
            <button onClick={handleCreateTemplate} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <Plus className="w-5 h-5" /> Create Template
            </button>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search templates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
              <option value="all">All Categories</option>
              {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No global templates</h3>
            <p className="text-gray-600 mb-4">Create your first cross-organization template</p>
            <button onClick={handleCreateTemplate} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              <Plus className="w-5 h-5" /> Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{template.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Shield className="w-4 h-4 text-purple-500" />
                      <span>{template.category}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setSelectedTemplate(template); setShowViewModal(true); }}
                      className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEditTemplate(template)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteTemplate(template)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  <p className="line-clamp-3">{template.templateMetadata?.description || 'No description'}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(template.updatedAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{template.templateMetadata?.usageCount || 0} uses</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Previous</button>
            <span className="px-4 py-2 text-gray-700">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Next</button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-purple-700">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">{showEditModal ? 'Edit Global Template' : 'Create Global Template'}</h2>
              </div>
              <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="text-white hover:text-gray-200 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Title *</label>
                    <input type="text" value={formData.title} onChange={(e) => handleFormChange('title', e.target.value)}
                      className={`w-full h-8 px-2.5 text-[12px] border rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none ${formErrors.title ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="e.g., CT Head Standard Report" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category *</label>
                    <select value={formData.category} onChange={(e) => handleFormChange('category', e.target.value)}
                      className={`w-full h-8 px-2 text-[12px] border rounded-lg focus:ring-2 focus:ring-purple-500/20 outline-none ${formErrors.category ? 'border-red-400' : 'border-gray-200'}`}>
                      {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Description</label>
                    <input type="text" value={formData.description} onChange={(e) => handleFormChange('description', e.target.value)}
                      className="w-full h-8 px-2.5 text-[12px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 outline-none" placeholder="Brief description" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tags</label>
                    <input type="text" value={formData.tags.join(', ')} onChange={(e) => handleFormChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                      className="w-full h-8 px-2.5 text-[12px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 outline-none" placeholder="head, CT, routine" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button type="button" onClick={() => setInputMode('text')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${inputMode === 'text' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      <Type className="w-3.5 h-3.5" /> Text
                    </button>
                    <button type="button" onClick={() => setInputMode('html')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${inputMode === 'html' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      <Code className="w-3.5 h-3.5" /> HTML
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Content *</label>
                  {inputMode === 'text' ? (
                    <RichTextEditor value={formData.htmlContent} onChange={(html) => handleFormChange('htmlContent', html)}
                      placeholder="Start typing your template content..." minHeight="260px" />
                  ) : (
                    <textarea value={formData.htmlContent} onChange={(e) => handleFormChange('htmlContent', e.target.value)} rows={10}
                      className={`w-full px-3 py-2 text-[12px] border rounded-lg font-mono resize-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none ${formErrors.content ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="Enter HTML content..." />
                  )}
                  {formErrors.content && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.content}</p>}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                    className="px-3 h-8 text-[12px] font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">Cancel</button>
                  <button type="submit"
                    className="flex items-center gap-1.5 px-4 h-8 text-[12px] font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all">
                    <Save className="w-3.5 h-3.5" /> {showEditModal ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-purple-700">
              <div className="flex items-center gap-3">
                <Eye className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">{selectedTemplate.title}</h2>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-white hover:text-gray-200 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1"><Tag className="w-4 h-4" />{selectedTemplate.category}</span>
                <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-purple-500" />Super Global</span>
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(selectedTemplate.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="border border-gray-300 rounded-lg p-6 bg-white">
                <div dangerouslySetInnerHTML={{ __html: selectedTemplate.htmlContent }} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowViewModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Close</button>
              <button onClick={() => { setShowViewModal(false); handleEditTemplate(selectedTemplate); }}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Edit3 className="w-5 h-5" /> Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminGlobalTemplates;
