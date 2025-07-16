        class AdminDashboard {
            constructor() {
                this.currentView = 'dashboard';
                this.refreshInterval = null;
                this.realTimeData = {};
                this.init();
            }

            init() {
                this.setupNavigation();
                this.startRealTimeUpdates();
                this.loadInitialData();
                this.setupAutoRefresh();
            }

            setupNavigation() {
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        const view = e.currentTarget.dataset.view;
                        if (view) {
                            this.switchView(view);
                        }
                    });
                });
            }

            switchView(viewName) {
                // Update navigation
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

                // Update content
                document.querySelectorAll('.admin-view').forEach(view => {
                    view.classList.remove('active');
                });
                document.getElementById(`${viewName}-view`).classList.add('active');

                this.currentView = viewName;
                this.loadViewData(viewName);
            }

            async loadViewData(viewName) {
                console.log(`Loading data for ${viewName} view`);
                
                switch (viewName) {
                    case 'dashboard':
                        await this.loadDashboardData();
                        break;
                    case 'users':
                        await this.loadUserData();
                        break;
                    case 'performance':
                        await this.loadPerformanceData();
                        break;
                    case 'revenue':
                        await this.loadRevenueData();
                        break;
                    case 'ai-insights':
                        await this.loadAIData();
                        break;
                    default:
                        console.log('View not implemented yet');
                }
            }

            async loadDashboardData() {
                // Simulate API calls to get dashboard data
                const data = await this.fetchDashboardMetrics();
                this.updateDashboardKPIs(data);
            }

            async fetchDashboardMetrics() {
                // Simulate real API call
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({
                            activeUsers: Math.floor(Math.random() * 500) + 2500,
                            activeCampaigns: Math.floor(Math.random() * 200) + 1200,
                            messagesSent: Math.floor(Math.random() * 10000) + 40000,
                            monthlyRevenue: Math.floor(Math.random() * 50) + 100,
                            aiResponseTime: (Math.random() * 0.5 + 1).toFixed(1),
                            systemUptime: (99.95 + Math.random() * 0.04).toFixed(2)
                        });
                    }, 100);
                });
            }

            updateDashboardKPIs(data) {
                document.getElementById('active-users').textContent = data.activeUsers.toLocaleString();
                document.getElementById('active-campaigns').textContent = data.activeCampaigns.toLocaleString();
                document.getElementById('messages-sent').textContent = data.messagesSent.toLocaleString();
                document.getElementById('monthly-revenue').textContent = `${data.monthlyRevenue}k`;
                document.getElementById('ai-response-time').textContent = `${data.aiResponseTime}s`;
                document.getElementById('system-uptime').textContent = `${data.systemUptime}%`;
            }

            async loadUserData() {
                console.log('Loading user management data...');
                // Implementation for user data loading
            }

            async loadPerformanceData() {
                console.log('Loading performance monitoring data...');
                // Implementation for performance data loading
            }

            async loadRevenueData() {
                console.log('Loading revenue analytics data...');
                // Implementation for revenue data loading
            }

            async loadAIData() {
                console.log('Loading AI performance data...');
                // Implementation for AI data loading
            }

            startRealTimeUpdates() {
                // Simulate real-time updates
                this.refreshInterval = setInterval(() => {
                    this.updateRealTimeMetrics();
                }, 30000); // Update every 30 seconds
            }

            updateRealTimeMetrics() {
                if (this.currentView === 'dashboard') {
                    this.loadDashboardData();
                }
                
                // Update live indicators
                this.updateLiveIndicators();
            }

            updateLiveIndicators() {
                // Update timestamp or other live elements
                const indicators = document.querySelectorAll('.live-indicator');
                indicators.forEach(indicator => {
                    // Add subtle animation to show it's live
                    indicator.style.animation = 'none';
                    setTimeout(() => {
                        indicator.style.animation = '';
                    }, 10);
                });
            }

            setupAutoRefresh() {
                // Auto-refresh data every 5 minutes
                setInterval(() => {
                    this.loadViewData(this.currentView);
                }, 300000);
            }

            async loadInitialData() {
                await this.loadDashboardData();
            }

            destroy() {
                if (this.refreshInterval) {
                    clearInterval(this.refreshInterval);
                }
            }
        }

        // Initialize admin dashboard
        document.addEventListener('DOMContentLoaded', () => {
            window.adminDashboard = new AdminDashboard();
        });

        // Handle page visibility for performance
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pause updates when tab is not visible
                if (window.adminDashboard && window.adminDashboard.refreshInterval) {
                    clearInterval(window.adminDashboard.refreshInterval);
                }
            } else {
                // Resume updates when tab becomes visible
                if (window.adminDashboard) {
                    window.adminDashboard.startRealTimeUpdates();
                }
            }
        });
