import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Activity, 
  Play, 
  Square, 
  RotateCcw, 
  MoreVertical,
  ExternalLink,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';

const AppCard = ({ app, onAction, onSelect, index }) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusIcon = () => {
    switch (app.healthStatus) {
      case 'up':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'down':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'restarting':
        return <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (app.healthStatus) {
      case 'up':
        return 'Healthy';
      case 'down':
        return 'Down';
      case 'warning':
        return 'Warning';
      case 'restarting':
        return 'Restarting...';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (app.healthStatus) {
      case 'up':
        return 'text-green-600 bg-green-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'restarting':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPlatformIcon = () => {
    switch (app.lowCodePlatform) {
      case 'bubble':
        return '🫧';
      case 'webflow':
        return '🌊';
      case 'retool':
        return '🔧';
      case 'airtable':
        return '📊';
      default:
        return '⚡';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-surface rounded-lg shadow-card border border-gray-100 p-4 sm:p-6 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="text-2xl">{getPlatformIcon()}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-textPrimary truncate">
              {app.appName}
            </h3>
            <p className="text-sm text-textSecondary capitalize">
              {app.lowCodePlatform} • {app.deploymentStatus}
            </p>
          </div>
        </div>

        <div className="relative">
          <motion.button
            onClick={() => setShowActions(!showActions)}
            className="p-2 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-gray-100"
            whileTap={{ scale: 0.95 }}
          >
            <MoreVertical size={16} />
          </motion.button>

          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-modal border border-gray-200 z-10"
              >
                <div className="p-1">
                  <button
                    onClick={() => {
                      onAction(app.appId, 'restart');
                      setShowActions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-textPrimary hover:bg-gray-100 rounded-md flex items-center space-x-2"
                  >
                    <RotateCcw size={14} />
                    <span>Restart App</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      onAction(app.appId, 'toggle-monitoring');
                      setShowActions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-textPrimary hover:bg-gray-100 rounded-md flex items-center space-x-2"
                  >
                    <Activity size={14} />
                    <span>{app.monitoringEnabled ? 'Disable' : 'Enable'} Monitoring</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      onAction(app.appId, 'stop');
                      setShowActions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md flex items-center space-x-2"
                  >
                    <Square size={14} />
                    <span>Stop App</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-textSecondary">Status</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1 ${getStatusColor()}`}>
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-textSecondary">Monitoring</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              app.monitoringEnabled ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'
            }`}>
              {app.monitoringEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-textSecondary">Last Check</span>
            <span className="text-xs text-textPrimary">
              {new Date(app.lastCheck).toLocaleTimeString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-textSecondary">Functions</span>
            <span className="text-xs text-textPrimary flex items-center space-x-1">
              <Zap size={12} />
              <span>{app.serverlessFunctions || 0} active</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
        <motion.button
          onClick={() => window.open(`https://${app.appName.toLowerCase().replace(/\s+/g, '-')}.deploywise.app`, '_blank')}
          className="flex-1 bg-gray-100 text-textPrimary px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 hover:bg-gray-200 transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          <Globe size={16} />
          <span>View Live</span>
          <ExternalLink size={12} />
        </motion.button>

        <motion.button
          onClick={() => onSelect(app)}
          className="px-4 py-2 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-gray-100 transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          <Settings size={16} />
        </motion.button>
      </div>

      {/* Click outside to close actions */}
      {showActions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActions(false)}
        />
      )}
    </motion.div>
  );
};

export default AppCard;