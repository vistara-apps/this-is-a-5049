import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Bell, Settings, Menu, X } from 'lucide-react';

// Components
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DeploymentModal from './components/DeploymentModal';
import SubscriptionBanner from './components/SubscriptionBanner';
import MobileNavigation from './components/MobileNavigation';

// Mock data
import { mockApps, mockUser } from './data/mockData';

function App() {
  const [apps, setApps] = useState(mockApps);
  const [user, setUser] = useState(mockUser);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  // Simulate real-time monitoring updates
  useEffect(() => {
    const interval = setInterval(() => {
      setApps(prevApps => 
        prevApps.map(app => ({
          ...app,
          lastCheck: new Date().toISOString(),
          // Randomly change status occasionally to simulate real monitoring
          healthStatus: Math.random() < 0.95 ? app.healthStatus : 
            (app.healthStatus === 'up' ? 'warning' : 'up')
        }))
      );
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleDeploy = (newApp) => {
    const deployedApp = {
      ...newApp,
      appId: `app_${Date.now()}`,
      deploymentStatus: 'deploying',
      healthStatus: 'unknown',
      monitoringEnabled: true,
      lastCheck: new Date().toISOString(),
    };

    setApps(prev => [...prev, deployedApp]);

    // Simulate deployment process
    setTimeout(() => {
      setApps(prev => 
        prev.map(app => 
          app.appId === deployedApp.appId 
            ? { ...app, deploymentStatus: 'deployed', healthStatus: 'up' }
            : app
        )
      );
    }, 3000);

    setShowDeployModal(false);
  };

  const handleAppAction = (appId, action) => {
    setApps(prev => 
      prev.map(app => {
        if (app.appId === appId) {
          switch (action) {
            case 'restart':
              return { 
                ...app, 
                healthStatus: 'restarting',
                lastCheck: new Date().toISOString()
              };
            case 'stop':
              return { 
                ...app, 
                deploymentStatus: 'stopped',
                healthStatus: 'down'
              };
            case 'toggle-monitoring':
              return { 
                ...app, 
                monitoringEnabled: !app.monitoringEnabled
              };
            default:
              return app;
          }
        }
        return app;
      })
    );

    // Simulate restart completion
    if (action === 'restart') {
      setTimeout(() => {
        setApps(prev => 
          prev.map(app => 
            app.appId === appId 
              ? { ...app, healthStatus: 'up', lastCheck: new Date().toISOString() }
              : app
          )
        );
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <Header 
        user={user}
        onMenuClick={() => setShowMobileNav(true)}
        onDeployClick={() => setShowDeployModal(true)}
      />

      {/* Subscription Banner */}
      <SubscriptionBanner user={user} />

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Dashboard 
          apps={apps}
          onAppAction={handleAppAction}
          onAppSelect={setSelectedApp}
          onDeployClick={() => setShowDeployModal(true)}
        />
      </main>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {showMobileNav && (
          <MobileNavigation 
            user={user}
            onClose={() => setShowMobileNav(false)}
          />
        )}
      </AnimatePresence>

      {/* Deployment Modal */}
      <AnimatePresence>
        {showDeployModal && (
          <DeploymentModal 
            onClose={() => setShowDeployModal(false)}
            onDeploy={handleDeploy}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;