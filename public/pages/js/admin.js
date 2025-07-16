        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #1a202c;
        }

        .admin-container {
            display: grid;
            grid-template-columns: 280px 1fr;
            min-height: 100vh;
        }

        .admin-sidebar {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-right: 1px solid rgba(255, 255, 255, 0.2);
            padding: 24px;
            box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
        }

        .admin-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
        }

        .admin-logo h1 {
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .admin-nav {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .nav-section {
            margin-bottom: 24px;
        }

        .nav-section h3 {
            font-size: 12px;
            text-transform: uppercase;
            color: #718096;
            margin-bottom: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #4a5568;
            font-weight: 500;
        }

        .nav-item:hover, .nav-item.active {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            transform: translateX(4px);
        }

        .nav-item .icon {
            font-size: 18px;
            width: 20px;
        }

        .admin-main {
            padding: 24px;
            overflow-y: auto;
        }

        .admin-header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .header-title {
            font-size: 32px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .live-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: #f0fff4;
            border: 2px solid #68d391;
            border-radius: 20px;
            color: #2f855a;
            font-weight: 600;
            font-size: 14px;
        }

        .live-dot {
            width: 8px;
            height: 8px;
            background: #68d391;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }

        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
        }

        .kpi-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: transform 0.3s ease;
        }

        .kpi-card:hover {
            transform: translateY(-4px);
        }

        .kpi-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
        }

        .kpi-title {
            font-size: 14px;
            color: #718096;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .kpi-icon {
            font-size: 24px;
            padding: 8px;
            border-radius: 8px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }

        .kpi-value {
            font-size: 36px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 8px;
        }

        .kpi-change {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 14px;
            font-weight: 500;
        }

        .kpi-change.positive {
            color: #38a169;
        }

        .kpi-change.negative {
            color: #e53e3e;
        }

        .dashboard-content {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 24px;
            margin-bottom: 24px;
        }

        .chart-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .chart-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 20px;
        }

        .chart-title {
            font-size: 20px;
            font-weight: 700;
            color: #2d3748;
        }

        .chart-placeholder {
            height: 300px;
            background: linear-gradient(135deg, #f7fafc, #edf2f7);
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 2px dashed #cbd5e0;
        }

        .activity-feed {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .feed-item {
            display: flex;
            gap: 12px;
            padding: 16px 0;
            border-bottom: 1px solid #e2e8f0;
        }

        .feed-item:last-child {
            border-bottom: none;
        }

        .feed-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: white;
            flex-shrink: 0;
        }

        .feed-icon.user { background: #4299e1; }
        .feed-icon.campaign { background: #38a169; }
        .feed-icon.error { background: #e53e3e; }
        .feed-icon.system { background: #805ad5; }

        .feed-content {
            flex: 1;
        }

        .feed-title {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 4px;
        }

        .feed-description {
            font-size: 14px;
            color: #718096;
            margin-bottom: 4px;
        }

        .feed-time {
            font-size: 12px;
            color: #a0aec0;
        }

        .detailed-tables {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
        }

        .table-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .table-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .table-title {
            font-size: 18px;
            font-weight: 700;
            color: #2d3748;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
        }

        .table th,
        .table td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
        }

        .table th {
            background: #f7fafc;
            font-weight: 600;
            color: #4a5568;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .table td {
            color: #2d3748;
        }

        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-active { background: #c6f6d5; color: #2f855a; }
        .status-inactive { background: #fed7d7; color: #c53030; }
        .status-pending { background: #feebc8; color: #c05621; }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
            background: #edf2f7;
            color: #4a5568;
        }

        .btn-secondary:hover {
            background: #e2e8f0;
        }

        .admin-view {
            display: none;
        }

        .admin-view.active {
            display: block;
        }

        .alert {
            background: #fed7d7;
            border: 1px solid #feb2b2;
            color: #c53030;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .alert-warning {
            background: #feebc8;
            border: 1px solid #f6ad55;
            color: #c05621;
        }

        .alert-success {
            background: #c6f6d5;
            border: 1px solid #9ae6b4;
            color: #2f855a;
        }

        .search-box {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 20px;
        }

        .search-box:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .filter-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
        }

        .filter-tab {
            padding: 8px 16px;
            background: #edf2f7;
            border: none;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .filter-tab.active {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }

        @media (max-width: 1200px) {
            .admin-container {
                grid-template-columns: 1fr;
            }
            
            .admin-sidebar {
                display: none;
            }
            
            .dashboard-content {
                grid-template-columns: 1fr;
            }
            
            .detailed-tables {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 768px) {
            .kpi-grid {
                grid-template-columns: 1fr;
            }
        }
