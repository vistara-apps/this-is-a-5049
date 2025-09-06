export const mockUser = {
  userId: 'user_123',
  email: 'john@example.com',
  subscriptionTier: 'free', // free, pro, enterprise
  paymentInfo: null
};

export const mockApps = [
  {
    appId: 'app_001',
    appName: 'Customer Portal',
    lowCodePlatform: 'bubble',
    deploymentStatus: 'deployed', // deploying, deployed, stopped, failed
    healthStatus: 'up', // up, down, warning, restarting, unknown
    monitoringEnabled: true,
    lastCheck: new Date(Date.now() - 2000).toISOString(),
    serverlessFunctions: 3,
    customDomain: 'portal.mycompany.com'
  },
  {
    appId: 'app_002',
    appName: 'Marketing Website',
    lowCodePlatform: 'webflow',
    deploymentStatus: 'deployed',
    healthStatus: 'up',
    monitoringEnabled: true,
    lastCheck: new Date(Date.now() - 15000).toISOString(),
    serverlessFunctions: 1,
    customDomain: null
  },
  {
    appId: 'app_003',
    appName: 'Internal Dashboard',
    lowCodePlatform: 'retool',
    deploymentStatus: 'deployed',
    healthStatus: 'warning',
    monitoringEnabled: true,
    lastCheck: new Date(Date.now() - 45000).toISOString(),
    serverlessFunctions: 5,
    customDomain: null
  }
];

export const mockServerlessFunctions = [
  {
    functionId: 'func_001',
    appId: 'app_001',
    functionName: 'sendWelcomeEmail',
    triggerType: 'webhook', // webhook, scheduled, event
    executionStatus: 'active',
    lastExecution: new Date(Date.now() - 3600000).toISOString(),
    executionCount: 145
  },
  {
    functionId: 'func_002',
    appId: 'app_001',
    functionName: 'processPayment',
    triggerType: 'webhook',
    executionStatus: 'active',
    lastExecution: new Date(Date.now() - 1800000).toISOString(),
    executionCount: 67
  },
  {
    functionId: 'func_003',
    appId: 'app_001',
    functionName: 'dailyReport',
    triggerType: 'scheduled',
    executionStatus: 'active',
    lastExecution: new Date(Date.now() - 86400000).toISOString(),
    executionCount: 30
  }
];