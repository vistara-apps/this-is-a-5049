import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Activity, Server, Clock } from 'lucide-react';

import AppCard from './AppCard';
import MetricsCard from './MetricsCard';
import QuickActions from './QuickActions';

const Dashboard = ({ apps, onAppAction, onAppSelect, onDeployClick }) => {
  const activeApps = apps.filter(app => app.deploymentStatus === 'deployed');
  const upApps = apps.filter(app => app.healthStatus === 'up');
  const totalChecks = apps.reduce((sum, app) => sum + (app.monitoringEnabled ? 1 : 0), 0);

  const metrics = [
    {
      title: 'Active Apps',
      value: activeApps.length,
      icon: Server,
      color: 'bg-blue-500',
      change: '+2 this week'
    },
    {
      title: 'Uptime Rate',
      value: `${Math.round((upApps.length / Math.max(activeApps.length, 1)) * 100)}%`,
      icon: Activity,
      color: 'bg-green-500',
      change: '99.9% avg'
    },
    {
      title: 'Monitoring Checks',
      value: totalChecks,
      icon: BarChart3,
      color: 'bg-purple-500',
      change: 'Every 30s'
    },
    {
      title: 'Response Time',
      value: '245ms',
      icon: Clock,
      color: 'bg-orange-500',
      change: '-12ms today'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center lg:text-left"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-textPrimary mb-2">
          Welcome to your deployment dashboard
        </h2>
        <p className="text-textSecondary text-base sm:text-lg">
          Monitor and manage your low-code applications with ease
        </p>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {metrics.map((metric, index) => (
          <MetricsCard key={metric.title} {...metric} index={index} />
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <QuickActions onDeployClick={onDeployClick} />
      </motion.div>

      {/* Apps Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-textPrimary">
            Your Applications ({apps.length})
          </h3>
        </div>

        {apps.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-lg border-2 border-dashed border-gray-300">
            <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-textPrimary mb-2">No apps deployed yet</h3>
            <p className="text-textSecondary mb-4">Deploy your first low-code application to get started</p>
            <motion.button
              onClick={onDeployClick}
              className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              Deploy Your First App
            </motion.button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {apps.map((app, index) => (
              <AppCard
                key={app.appId}
                app={app}
                onAction={onAppAction}
                onSelect={onAppSelect}
                index={index}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;