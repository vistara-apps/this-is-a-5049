import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Bell, Settings, Menu, Zap } from 'lucide-react';

const Header = ({ user, onMenuClick, onDeployClick }) => {
  return (
    <header className="bg-surface shadow-card border-b border-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <motion.button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-textSecondary hover:text-textPrimary hover:bg-gray-100"
              whileTap={{ scale: 0.95 }}
            >
              <Menu size={20} />
            </motion.button>
            
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-textPrimary">DeployWise</h1>
                <p className="text-xs text-textSecondary">Effortless Deployment</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <motion.button
              onClick={onDeployClick}
              className="bg-primary text-white px-3 sm:px-4 py-2 rounded-lg font-medium flex items-center space-x-2 text-sm sm:text-base hover:bg-blue-600 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Deploy App</span>
              <span className="sm:hidden">Deploy</span>
            </motion.button>

            <motion.button
              className="p-2 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-gray-100 relative"
              whileTap={{ scale: 0.95 }}
            >
              <Bell size={20} />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            </motion.button>

            <motion.button
              className="p-2 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-gray-100"
              whileTap={{ scale: 0.95 }}
            >
              <Settings size={20} />
            </motion.button>

            {/* User Avatar */}
            <div className="hidden sm:flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-textPrimary">{user.email}</p>
                <p className="text-xs text-textSecondary capitalize">{user.subscriptionTier} Plan</p>
              </div>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;