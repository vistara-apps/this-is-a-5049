import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Link, Code, Globe } from 'lucide-react';

const DeploymentModal = ({ onClose, onDeploy }) => {
  const [deploymentMethod, setDeploymentMethod] = useState('platform');
  const [formData, setFormData] = useState({
    appName: '',
    lowCodePlatform: 'bubble',
    projectUrl: '',
    monitoringEnabled: true,
    healthCheckUrl: '',
    customDomain: ''
  });

  const platforms = [
    { id: 'bubble', name: 'Bubble', icon: '🫧' },
    { id: 'webflow', name: 'Webflow', icon: '🌊' },
    { id: 'retool', name: 'Retool', icon: '🔧' },
    { id: 'airtable', name: 'Airtable', icon: '📊' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onDeploy(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-surface rounded-lg shadow-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-textPrimary">Deploy New Application</h2>
          <motion.button
            onClick={onClose}
            className="p-2 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-gray-100"
            whileTap={{ scale: 0.95 }}
          >
            <X size={20} />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Deployment Method */}
          <div>
            <label className="block text-sm font-medium text-textPrimary mb-3">
              Deployment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'platform', title: 'Platform Import', icon: Link, desc: 'Import from low-code platform' },
                { id: 'upload', title: 'File Upload', icon: Upload, desc: 'Upload your project files' },
                { id: 'git', title: 'Git Repository', icon: Code, desc: 'Deploy from Git repo' }
              ].map((method) => (
                <motion.button
                  key={method.id}
                  type="button"
                  onClick={() => setDeploymentMethod(method.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    deploymentMethod === method.id
                      ? 'border-primary bg-blue-50 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <method.icon className="w-6 h-6 mb-2" />
                  <h3 className="font-medium text-sm">{method.title}</h3>
                  <p className="text-xs text-textSecondary">{method.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* App Name */}
          <div>
            <label className="block text-sm font-medium text-textPrimary mb-2">
              Application Name
            </label>
            <input
              type="text"
              value={formData.appName}
              onChange={(e) => handleInputChange('appName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="My Awesome App"
              required
            />
          </div>

          {/* Platform Selection */}
          {deploymentMethod === 'platform' && (
            <>
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-3">
                  Low-Code Platform
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {platforms.map((platform) => (
                    <motion.button
                      key={platform.id}
                      type="button"
                      onClick={() => handleInputChange('lowCodePlatform', platform.id)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        formData.lowCodePlatform === platform.id
                          ? 'border-primary bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="text-2xl mb-1">{platform.icon}</div>
                      <div className="text-xs font-medium">{platform.name}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-textPrimary mb-2">
                  Project URL
                </label>
                <input
                  type="url"
                  value={formData.projectUrl}
                  onChange={(e) => handleInputChange('projectUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="https://your-app.bubble.io"
                  required
                />
              </div>
            </>
          )}

          {/* File Upload */}
          {deploymentMethod === 'upload' && (
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">
                Project Files
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-textSecondary mb-2">Drop your files here or click to browse</p>
                <input type="file" multiple className="hidden" />
                <button type="button" className="text-primary text-sm font-medium">Choose Files</button>
              </div>
            </div>
          )}

          {/* Git Repository */}
          {deploymentMethod === 'git' && (
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">
                Repository URL
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://github.com/username/repo.git"
              />
            </div>
          )}

          {/* Monitoring Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-textPrimary">Monitoring Settings</h3>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="monitoring"
                checked={formData.monitoringEnabled}
                onChange={(e) => handleInputChange('monitoringEnabled', e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="monitoring" className="text-sm text-textPrimary">
                Enable real-time uptime monitoring
              </label>
            </div>

            {formData.monitoringEnabled && (
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-2">
                  Health Check URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.healthCheckUrl}
                  onChange={(e) => handleInputChange('healthCheckUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="/health or /api/status"
                />
              </div>
            )}
          </div>

          {/* Custom Domain */}
          <div>
            <label className="block text-sm font-medium text-textPrimary mb-2">
              Custom Domain (optional)
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-textSecondary text-sm">
                <Globe size={16} />
              </span>
              <input
                type="text"
                value={formData.customDomain}
                onChange={(e) => handleInputChange('customDomain', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="myapp.com"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200">
            <motion.button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-textPrimary rounded-lg font-medium hover:bg-gray-50 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              Deploy Application
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default DeploymentModal;