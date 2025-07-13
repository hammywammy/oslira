# Oslira - AI-Powered Lead Generation Platform

[![Deploy Status](https://api.netlify.com/api/v1/badges/your-site-id/deploy-status)](https://app.netlify.com/sites/oslira/deploys)
[![Security](https://img.shields.io/badge/security-enterprise-green.svg)](https://oslira.com/security)
[![License](https://img.shields.io/badge/license-proprietary-red.svg)](LICENSE)

> Enterprise-grade AI platform for lead research, analysis, and personalized outreach generation.

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- npm or yarn package manager
- Supabase account with database setup
- Stripe account for payment processing

### Installation
```bash
# Clone the repository
git clone https://github.com/your-org/oslira-frontend.git
cd oslira-frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables (see Configuration section)
# Edit .env with your actual values

# Run development server
npm run dev
```

Visit `http://localhost:3000` to access the development environment.

## 📋 Configuration

### Environment Variables
Create a `.env` file with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret

# Cloudflare Workers API
VITE_API_ENDPOINT=https://ai-outreach-api.your-domain.workers.dev

# Analytics (Optional)
VITE_GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID

# Development
NODE_ENV=development
VITE_APP_ENV=development
```

### Database Setup
Ensure your Supabase database has the required tables:

```sql
-- Run the complete schema from /sql/complete-schema.sql
-- This includes: users, business_profiles, leads, credit_transactions, etc.
```

## 🏗️ Architecture

### Frontend Stack
- **Framework**: Vanilla HTML/CSS/JavaScript (Enterprise Static)
- **Styling**: Custom CSS with modern design system
- **Authentication**: Supabase Auth with magic links
- **State Management**: Native JavaScript with Supabase real-time
- **Payment Processing**: Stripe Elements integration

### Backend Infrastructure
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **API**: Cloudflare Workers (Edge computing)
- **Authentication**: Supabase JWT tokens
- **File Storage**: Supabase Storage for assets
- **Analytics**: Custom analytics + Google Analytics

### Deployment Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Netlify CDN   │───▶│  Supabase DB     │───▶│ Cloudflare      │
│   Static Files  │    │  Auth & Storage  │    │ Workers API     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         ▼                        ▼                       ▼
   User Requests              Real-time Updates      AI Processing
```

## 📁 Project Structure

```
oslira-frontend/
├── 📁 public/                    # Static assets
│   ├── assets/                   # Images, icons, logos
│   ├── favicon.ico              # Site favicon
│   └── manifest.json            # PWA manifest
├── 📁 src/                      # Source files (if using build process)
│   ├── components/              # Reusable components
│   ├── pages/                   # Page-specific files
│   └── utils/                   # Utility functions
├── 📁 netlify/                  # Netlify configuration
│   ├── edge-functions/          # Netlify Edge Functions
│   ├── functions/               # Netlify Functions
│   └── netlify.toml            # Netlify config
├── 📁 cloudflare-workers/       # API backend
│   ├── src/                     # Worker source code
│   ├── wrangler.toml           # Cloudflare config
│   └── package.json            # Worker dependencies
├── 📁 sql/                      # Database schemas
│   ├── complete-schema.sql      # Full database setup
│   └── migrations/              # Schema migrations
├── 📁 .github/                  # GitHub workflows
│   └── workflows/
│       ├── ci.yml              # Continuous Integration
│       └── deploy.yml          # Deployment pipeline
├── 📁 docs/                     # Documentation
│   ├── API.md                  # API documentation
│   ├── DEPLOYMENT.md           # Deployment guide
│   └── SECURITY.md             # Security protocols
├── .env.example                # Environment template
├── package.json                # Project dependencies
├── README.md                   # This file
└── LICENSE                     # License information
```

## 🚀 Deployment

### Production Deployment

#### Netlify (Frontend)
```bash
# Build for production
npm run build

# Deploy to Netlify (automated via GitHub)
# Or manual deploy:
netlify deploy --prod --dir=dist
```

#### Cloudflare Workers (API)
```bash
# Navigate to workers directory
cd cloudflare-workers

# Deploy to Cloudflare
npx wrangler deploy
```

### Environment-Specific Deployments
- **Development**: `npm run dev` (localhost:3000)
- **Staging**: Automated deployment on push to `develop` branch
- **Production**: Automated deployment on push to `main` branch

### CI/CD Pipeline
Our GitHub Actions workflow automatically:
1. Runs tests and security scans
2. Builds optimized production assets
3. Deploys to Netlify and Cloudflare Workers
4. Sends deployment notifications

## 🔧 Development

### Available Scripts
```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npm run type-check      # TypeScript type checking

# Testing
npm run test            # Run unit tests
npm run test:e2e        # Run end-to-end tests
npm run test:coverage   # Generate coverage report

# Deployment
npm run deploy:staging  # Deploy to staging
npm run deploy:prod     # Deploy to production
```

### Development Workflow
1. Create feature branch from `develop`
2. Make changes and test locally
3. Commit with conventional commit messages
4. Push and create pull request
5. Automated tests and reviews
6. Merge to `develop` for staging deployment
7. Merge to `main` for production deployment

## 🛡️ Security

### Security Features
- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Row Level Security (RLS) in database
- **Data Encryption**: TLS 1.3 for all communications
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: API rate limiting via Cloudflare
- **CSRF Protection**: Token-based CSRF protection
- **XSS Prevention**: Content Security Policy headers

### Security Best Practices
- All sensitive data encrypted at rest and in transit
- Regular security audits and dependency updates
- SOC 2 compliant infrastructure
- GDPR and CCPA compliance implementations
- Regular penetration testing

## 📊 Features

### Core Platform Features
- ✅ **AI Lead Analysis**: Advanced profile scoring and insights
- ✅ **Personalized Outreach**: AI-generated messaging
- ✅ **Subscription Management**: Flexible credit-based billing
- ✅ **Enterprise Security**: SOC 2 compliant infrastructure
- ✅ **Real-time Analytics**: Performance tracking and insights
- ✅ **Team Collaboration**: Multi-user business profiles
- ✅ **API Access**: RESTful API for integrations
- ✅ **Export Capabilities**: CSV export for all data

### Business Intelligence
- Lead scoring algorithms (0-100 scale)
- Industry-specific analysis
- Engagement rate predictions
- Optimal outreach timing
- A/B testing for message effectiveness

### Integration Capabilities
- Stripe payment processing
- Supabase real-time database
- Cloudflare edge computing
- Google Analytics tracking
- Webhook support for external systems

## 🔄 API Documentation

### Authentication
```javascript
// All API requests require authentication header
headers: {
  'Authorization': `Bearer ${supabaseToken}`,
  'Content-Type': 'application/json'
}
```

### Core Endpoints
```
POST   /api/analyze          # Analyze lead profile
GET    /api/leads             # Get user's leads
DELETE /api/leads/:id         # Delete specific lead
POST   /api/credits/purchase  # Purchase additional credits
GET    /api/analytics         # Get usage analytics
```

## 📈 Monitoring & Analytics

### Performance Monitoring
- **Uptime**: 99.9% SLA with status page
- **Response Times**: < 200ms average API response
- **Error Tracking**: Comprehensive error logging
- **User Analytics**: Privacy-compliant usage tracking

### Business Metrics
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn rate and retention metrics
- Feature adoption rates

## 🤝 Contributing

### Development Guidelines
1. Follow conventional commit message format
2. Maintain 80%+ test coverage
3. Update documentation for new features
4. Follow existing code style and conventions
5. Test across multiple browsers and devices

### Pull Request Process
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Create Pull Request with detailed description

## 📞 Support

### Getting Help
- **Documentation**: [docs.oslira.com](https://docs.oslira.com)
- **Support Email**: [support@oslira.com](mailto:support@oslira.com)
- **Security Issues**: [security@oslira.com](mailto:security@oslira.com)
- **Business Inquiries**: [hello@oslira.com](mailto:hello@oslira.com)

### Enterprise Support
Enterprise customers receive:
- 24/7 phone and chat support
- Dedicated account manager
- Custom integration assistance
- Priority feature requests
- SLA guarantees

## 📄 License

This project is proprietary software owned by Oslira Inc. All rights reserved.

See [LICENSE](LICENSE) file for details.

---

## 🎯 Roadmap

### Q1 2025
- [ ] Advanced analytics dashboard
- [ ] Bulk lead analysis (CSV upload)
- [ ] Email integration (Gmail, Outlook)
- [ ] Mobile app development
- [ ] Advanced AI model improvements

### Q2 2025
- [ ] CRM integrations (Salesforce, HubSpot)
- [ ] Multi-language support
- [ ] Advanced team collaboration features
- [ ] White-label options for enterprise
- [ ] Advanced reporting and exports

### Q3 2025
- [ ] LinkedIn integration
- [ ] Advanced automation workflows
- [ ] Custom AI model training
- [ ] Enterprise SSO integration
- [ ] Advanced compliance features

---

**Built with ❤️ by the Oslira Team**

*Empowering businesses with AI-driven lead generation and personalized outreach.*
