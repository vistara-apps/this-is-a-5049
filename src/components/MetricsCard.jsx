import React from 'react';
import { motion } from 'framer-motion';

const MetricsCard = ({ title, value, icon: Icon, color, change, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-surface rounded-lg shadow-card border border-gray-100 p-4 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-xs sm:text-sm font-medium text-textSecondary">{title}</p>
        <p className="text-lg sm:text-2xl font-bold text-textPrimary">{value}</p>
        <p className="text-xs text-textSecondary">{change}</p>
      </div>
    </motion.div>
  );
};

export default MetricsCard;