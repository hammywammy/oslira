const EXPORT_CONFIG = {
    formats: {
        pdf: {
            name: 'PDF Report',
            mimeType: 'application/pdf',
            extension: '.pdf',
            features: ['charts', 'tables', 'insights', 'branding']
        },
        csv: {
            name: 'CSV Data',
            mimeType: 'text/csv',
            extension: '.csv',
            features: ['raw_data', 'processed_data']
        },
        json: {
            name: 'JSON Data',
            mimeType: 'application/json',
            extension: '.json',
            features: ['raw_data', 'metadata', 'structure']
        },
        xlsx: {
            name: 'Excel Workbook',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            extension: '.xlsx',
            features: ['multiple_sheets', 'charts', 'formatting', 'formulas']
        }
    },
    
    defaults: {
        format: 'pdf',
        includeCharts: true,
        includeTables: true,
        includeInsights: true,
        dateRange: '30d',
        compression: true
    }
};
