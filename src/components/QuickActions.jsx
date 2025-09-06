import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Monitor, Zap, BookOpen } from 'lucide-react';

const QuickActions = ({ onDeployClick }) => {
  const actions = [
    {
      title: 'Deploy New App',
      description: 'Deploy from your low-code platform',
      icon: Plus,
      color: 'bg-primary',
      onClick: onDeployClick
    },
    {
      title: 'Setup Monitoring',
      description: 'Configure health checks & alerts',
      icon: Monitor,
      color: 'bg-green-500',
      onClick: () => {}
    },
    {
      title: 'Create Function',
      description: 'Add serverless backend logic',
      icon: Zap,
      color: 'bg-purple-500',
      onClick: () => {}
    },
    {
      title: 'View Docs',
      description: 'Learn about best practices',
      icon: BookOpen,
      color: 'bg-orange-500',
      onClick: () => {}
    }
  ];

  return (
    <div className="bg-surface rounded-lg shadow-card border border-gray-100 p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-textPrimary mb-4">Quick Actions</h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {actions.map((action, index) => (
          <motion.button
            key={action.title}
            onClick={action.onClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all text-left group"
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${action.color} flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform`}>
              <action.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h4 className="font-medium text-textPrimary text-sm sm:text-base mb-1">{action.title}</h4>
            <p className="text-xs sm:text-sm text-textSecondary leading-tight">{action.description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;