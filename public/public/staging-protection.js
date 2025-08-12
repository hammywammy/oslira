(function() {
    // Only run on staging sites
    if (window.location.hostname.includes('prototype') || 
        window.location.hostname.includes('staging') ||
        window.location.hostname.includes('netlify.app')) {
        
        const accessKey = sessionStorage.getItem('oslira_staging_access');
        
        if (!accessKey || accessKey !== 'oslira2025') {
            const userKey = prompt('🔒 Oslira Staging Environment\nEnter access key:');
            
            if (userKey === 'oslira2025') {
                sessionStorage.setItem('oslira_staging_access', 'oslira2025');
            } else {
                document.body.innerHTML = `
                    <div style="text-align: center; margin-top: 100px; font-family: Arial; color: #666;">
                        <h1>🔒 Access Denied</h1>
                        <p>Invalid access key for staging environment.</p>
                        <button onclick="location.reload()">Try Again</button>
                    </div>
                `;
                throw new Error('Access denied');
            }
        }
    }
})();
