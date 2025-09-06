import React from 'react';
import { motion } from 'framer-motion';
import { Crown, X } from 'lucide-react';

const SubscriptionBanner = ({ user }) => {
  if (user.subscriptionTier !== 'free') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Crown className="w-5 h-5" />
            <div>
              <p className="font-medium text-sm sm:text-base">
                You're on the Free plan • 1 app limit
              </p>
              <p className="text-xs sm:text-sm opacity-90">
                Upgrade to Pro for unlimited apps and advanced monitoring
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <motion.button
              className="bg-white text-purple-600 px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-100 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              Upgrade Now
            </motion.button>
            <motion.button
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
              whileTap={{ scale: 0.95 }}
            >
              <X size={16} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SubscriptionBanner;