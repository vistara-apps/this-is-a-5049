# DeployWise

**Effortless Deployment & Uptime for Your Low-Code Apps**

DeployWise is a comprehensive service that provides one-click deployment and real-time monitoring for low-code applications, simplifying the deployment and operational management process for builders.

## 🚀 Features

### Core Features
- **One-Click Low-Code Deployment**: Integrates with popular low-code platforms to enable instant deployment of applications to a managed cloud environment
- **Real-time Uptime Monitoring**: Continuously checks the health and availability of deployed applications with immediate alerts
- **Automated Serverless Functions**: Deploy serverless functions triggered by various events without managing server infrastructure
- **Automated Health Checks & Restarts**: Self-healing capabilities for common application failures

### Additional Features
- **Multi-platform Support**: Works with various low-code platforms (Bubble, Webflow, Retool, etc.)
- **Custom Domain Management**: Support for custom domains and SSL certificates
- **Environment Variables**: Secure management of application configuration
- **Real-time Dashboard**: Live monitoring dashboard with Socket.IO integration
- **Alert System**: Email, SMS, and Slack notifications for incidents
- **Usage Analytics**: Detailed statistics and performance metrics
- **Team Collaboration**: Multi-user support with role-based access

## 🏗️ Architecture

### Backend Stack
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time updates
- **JWT** for authentication
- **Winston** for logging
- **Rate Limiting** with rate-limiter-flexible
- **Email** with Nodemailer
- **Cron Jobs** for scheduled monitoring

### Frontend Stack
- **React 18** with modern hooks
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Lucide React** for icons
- **Socket.IO Client** for real-time updates

### Cloud Integrations
- **Vercel** - Static site deployment
- **Netlify** - JAMstack deployment
- **AWS Lambda** - Serverless functions
- **Heroku** - Container deployment
- **DigitalOcean** - VPS deployment

### Monitoring Services
- **UptimeRobot** - External monitoring
- **Healthchecks.io** - Health check pings
- **Custom monitoring** - Internal health checks

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm 8+
- MongoDB 5.0+
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/vistara-apps/this-is-a-5049.git
   cd this-is-a-5049
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:5.0
   
   # Or start your local MongoDB service
   sudo systemctl start mongod
   ```

5. **Run the application**
   ```bash
   # Development mode (both client and server)
   npm run dev
   
   # Production mode
   npm run build
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api/docs

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/deploywise

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Cloud Providers
VERCEL_TOKEN=your-vercel-token
NETLIFY_TOKEN=your-netlify-token
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Monitoring Services
UPTIMEROBOT_API_KEY=your-uptimerobot-api-key
HEALTHCHECKS_API_KEY=your-healthchecks-api-key

# Notifications
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# Payments (Optional)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/forgot-password` - Request password reset
- `PUT /api/auth/reset-password/:token` - Reset password

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/usage` - Get usage statistics
- `DELETE /api/users/account` - Delete user account

### App Deployment
- `GET /api/apps` - List deployed apps
- `POST /api/apps` - Deploy new app
- `GET /api/apps/:appId` - Get app details
- `PUT /api/apps/:appId` - Update app configuration
- `DELETE /api/apps/:appId` - Delete app
- `POST /api/apps/:appId/restart` - Restart app

### Serverless Functions
- `GET /api/functions` - List functions
- `POST /api/functions` - Create function
- `GET /api/functions/:functionId` - Get function details
- `PUT /api/functions/:functionId` - Update function
- `DELETE /api/functions/:functionId` - Delete function
- `POST /api/functions/:functionId/execute` - Execute function

### Monitoring
- `GET /api/monitoring/dashboard` - Get monitoring dashboard
- `GET /api/monitoring/apps/:appId` - Get app monitoring details
- `POST /api/monitoring/apps/:appId/check` - Manual health check
- `PUT /api/monitoring/apps/:appId/config` - Update monitoring config
- `GET /api/monitoring/stats` - Get monitoring statistics
- `GET /api/monitoring/incidents` - Get incident history

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.test.js
```

## 🚀 Deployment

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set production environment variables**
   ```bash
   export NODE_ENV=production
   export MONGODB_URI=your-production-mongodb-uri
   # ... other production variables
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

### Docker Deployment

```bash
# Build Docker image
docker build -t deploywise .

# Run container
docker run -d -p 3001:3001 --env-file .env deploywise
```

### Cloud Deployment

The application is ready to deploy on:
- **Heroku**: Use the included `Procfile`
- **Vercel**: Configure build settings for Node.js
- **DigitalOcean App Platform**: Use the included spec file
- **AWS**: Deploy using Elastic Beanstalk or ECS

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **Rate Limiting** on all endpoints
- **Password Hashing** with bcrypt
- **Input Validation** with Joi
- **CORS Protection** configured
- **Helmet.js** for security headers
- **Account Lockout** after failed login attempts
- **Secure Password Reset** with time-limited tokens

## 📊 Monitoring & Logging

- **Winston Logger** with multiple transports
- **Request Logging** with Morgan
- **Performance Monitoring** built-in
- **Error Tracking** with stack traces
- **Business Logic Logging** for audit trails
- **Security Event Logging** for suspicious activities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.deploywise.com](https://docs.deploywise.com)
- **Issues**: [GitHub Issues](https://github.com/vistara-apps/this-is-a-5049/issues)
- **Email**: support@deploywise.com
- **Discord**: [Join our community](https://discord.gg/deploywise)

## 🗺️ Roadmap

- [ ] **Q1 2024**: Advanced analytics dashboard
- [ ] **Q2 2024**: Multi-region deployments
- [ ] **Q3 2024**: CI/CD pipeline integration
- [ ] **Q4 2024**: Enterprise features and SSO

---

**Built with ❤️ by the DeployWise Team**
