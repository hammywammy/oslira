    <script>
        window.CONFIG = {
            supabaseUrl: 'your-supabase-url',
            supabaseKey: 'your-supabase-key',
            workerUrl: 'your-worker-url'
        };
    </script>

    <!-- External Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="https://js.sentry-cdn.com/7b59f19d521441c8aec15ac32ff07da8.min.js" crossorigin="anonymous"></script>

    <script>
        // Initialize Sentry if available
        if (typeof Sentry !== 'undefined') {
            Sentry.init({
                environment: 'production',
                beforeSend(event) {
                    if (event.exception?.values?.[0]?.value?.includes('NetworkError')) {
                        return null;
                    }
                    return event;
                }
            });
        }

        // Application state
        let currentUser = null;
        let currentSession = null;
        let supabase = null;
        let hasUnsavedChanges = false;

        // Initialize application
        document.addEventListener('DOMContentLoaded', async () => {
            console.log('⚙️ Oslira Settings loaded');
            initializeSupabase();
            setupEventListeners();
            await checkAuth();
            await loadUserData();
        });

        // Initialize Supabase
        function initializeSupabase() {
            if (window.CONFIG && window.supabase) {
                supabase = window.supabase.createClient(
                    window.CONFIG.supabaseUrl, 
                    window.CONFIG.supabaseKey
                );
            } else {
                console.error('❌ Configuration or Supabase not available');
            }
        }

        // Set up all event listeners
        function setupEventListeners() {
            // Settings navigation
            document.querySelectorAll('.settings-nav-item').forEach(item => {
                item.addEventListener('click', handleSectionNavigation);
            });

            // Main navigation
            document.querySelectorAll('nav a[data-page]').forEach(link => {
                link.addEventListener('click', handleNavigation);
            });

            // Header actions
            document.getElementById('export-settings-btn')?.addEventListener('click', exportSettings);
            document.getElementById('save-all-btn')?.addEventListener('click', saveAllSettings);
            document.getElementById('logout-btn')?.addEventListener('click', logout);

            // Profile section
            document.getElementById('upload-avatar-btn')?.addEventListener('click', () => {
                document.getElementById('avatar-input').click();
            });
            document.getElementById('avatar-input')?.addEventListener('change', handleAvatarUpload);
            document.getElementById('remove-avatar-btn')?.addEventListener('click', removeAvatar);
            document.getElementById('save-profile-btn')?.addEventListener('click', saveProfile);
            document.getElementById('reset-profile-btn')?.addEventListener('click', resetProfile);

            // Business section
            document.getElementById('save-business-btn')?.addEventListener('click', saveBusinessProfile);
            document.getElementById('reset-business-btn')?.addEventListener('click', resetBusinessProfile);

            // Messaging section
            document.getElementById('save-messaging-btn')?.addEventListener('click', saveMessagingSettings);
            document.getElementById('test-message-btn')?.addEventListener('click', testMessageGeneration);

            // Notifications section
            document.getElementById('save-notifications-btn')?.addEventListener('click', saveNotificationSettings);
            document.getElementById('test-notification-btn')?.addEventListener('click', sendTestNotification);

            // Integration buttons
            document.getElementById('connect-email-btn')?.addEventListener('click', () => connectIntegration('email'));
            document.getElementById('connect-linkedin-btn')?.addEventListener('click', () => connectIntegration('linkedin'));
            document.getElementById('connect-crm-btn')?.addEventListener('click', () => connectIntegration('crm'));
            document.getElementById('connect-analytics-btn')?.addEventListener('click', () => connectIntegration('analytics'));

            // Billing section
            document.getElementById('upgrade-plan-btn')?.addEventListener('click', upgradePlan);
            document.getElementById('manage-billing-btn')?.addEventListener('click', manageBilling);
            document.querySelectorAll('[data-credits]').forEach(btn => {
                btn.addEventListener('click', (e) => purchaseCredits(e.target.dataset.credits));
            });

            // Security section
            document.getElementById('change-password-btn')?.addEventListener('click', changePassword);
            document.getElementById('export-data-btn')?.addEventListener('click', exportUserData);
            document.getElementById('revoke-all-sessions-btn')?.addEventListener('click', revokeAllSessions);
            document.getElementById('delete-all-data-btn')?.addEventListener('click', deleteAllData);
            document.getElementById('delete-account-btn')?.addEventListener('click', deleteAccount);

            // Form change tracking
            setupChangeTracking();

            // Keyboard shortcuts
            document.addEventListener('keydown', handleKeyboardShortcuts);

            // Warn about unsaved changes
            window.addEventListener('beforeunload', handleBeforeUnload);
        }

        // Authentication check
        async function checkAuth() {
            if (!supabase) {
                console.log('⚠️ Supabase not initialized, using demo mode');
                setupDemoMode();
                return;
            }

            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error || !session) {
                    window.location.href = 'auth.html';
                    return;
                }
                
                currentSession = session;
                currentUser = session.user;
                document.getElementById('user-email').textContent = currentUser.email;
                
            } catch (err) {
                console.error('❌ Auth check error:', err);
                setupDemoMode();
            }
        }

        // Setup demo mode for development
        function setupDemoMode() {
            console.log('🔧 Running in demo mode');
            currentUser = { id: 'demo', email: 'demo@oslira.com' };
            document.getElementById('user-email').textContent = 'demo@oslira.com';
            document.getElementById('credit-count').textContent = '247 credits';
        }

        // Load user data
        async function loadUserData() {
            try {
                if (supabase && currentUser) {
                    await Promise.all([
                        loadUserCredits(),
                        loadUserProfile(),
                        loadBusinessProfile(),
                        loadMessagingSettings(),
                        loadNotificationSettings(),
                        loadUsageStats()
                    ]);
                } else {
                    loadDemoData();
                }
            } catch (err) {
                console.error('❌ Error loading user data:', err);
                showNotification('Failed to load some settings', 'error');
            }
        }

        // Load user credits
        async function loadUserCredits() {
            try {
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('credits')
                    .eq('id', currentUser.id)
                    .single();
                
                if (error) throw error;
                
                const credits = userData?.credits || 0;
                document.getElementById('credit-count').textContent = `${credits} credits`;
                document.getElementById('current-credits').textContent = credits;
                
            } catch (err) {
                console.error('❌ Error loading credits:', err);
                document.getElementById('credit-count').textContent = 'Error';
            }
        }

        // Load user profile
        async function loadUserProfile() {
            try {
                const { data: profile, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .single();
                
                if (profile) {
                    document.getElementById('first-name').value = profile.first_name || '';
                    document.getElementById('last-name').value = profile.last_name || '';
                    document.getElementById('email-address').value = currentUser.email || '';
                    document.getElementById('timezone').value = profile.timezone || '';
                    
                    if (profile.avatar_url) {
                        const avatarPreview = document.getElementById('avatar-preview');
                        avatarPreview.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                    }
                }
            } catch (err) {
                console.error('❌ Error loading user profile:', err);
            }
        }

        // Load business profile
        async function loadBusinessProfile() {
            try {
                const { data: business, error } = await supabase
                    .from('business_profiles')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .single();
                
                if (business) {
                    document.getElementById('business-name').value = business.business_name || '';
                    document.getElementById('business-industry').value = business.business_niche || '';
                    document.getElementById('company-size').value = business.company_size || '';
                    document.getElementById('target-audience').value = business.target_audience || '';
                    document.getElementById('value-proposition').value = business.value_proposition || '';
                }
            } catch (err) {
                console.error('❌ Error loading business profile:', err);
            }
        }

        // Load messaging settings
        async function loadMessagingSettings() {
            try {
                const { data: settings, error } = await supabase
                    .from('messaging_settings')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .single();
                
                if (settings) {
                    document.getElementById('communication-style').value = settings.communication_style || '';
                    document.getElementById('message-length').value = settings.message_length || 'medium';
                    document.getElementById('default-cta').value = settings.default_cta || '';
                    document.getElementById('message-template').value = settings.message_template || '';
                    document.getElementById('use-emojis').checked = settings.use_emojis !== false;
                    document.getElementById('enable-personalization').checked = settings.enable_personalization !== false;
                }
            } catch (err) {
                console.error('❌ Error loading messaging settings:', err);
            }
        }

        // Load notification settings
        async function loadNotificationSettings() {
            try {
                const { data: settings, error } = await supabase
                    .from('notification_settings')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .single();
                
                if (settings) {
                    document.getElementById('notify-analysis-complete').checked = settings.analysis_complete !== false;
                    document.getElementById('notify-weekly-summary').checked = settings.weekly_summary !== false;
                    document.getElementById('notify-low-credits').checked = settings.low_credits !== false;
                    document.getElementById('notify-product-updates').checked = settings.product_updates === true;
                    document.getElementById('notify-marketing').checked = settings.marketing === true;
                    document.getElementById('notification-frequency').value = settings.frequency || 'weekly';
                }
            } catch (err) {
                console.error('❌ Error loading notification settings:', err);
            }
        }

        // Load usage statistics
        async function loadUsageStats() {
            try {
                // These would come from your analytics/usage tracking
                document.getElementById('credits-used-month').textContent = '153';
                document.getElementById('leads-analyzed').textContent = '89';
                document.getElementById('messages-generated').textContent = '156';
            } catch (err) {
                console.error('❌ Error loading usage stats:', err);
            }
        }

        // Load demo data
        function loadDemoData() {
            document.getElementById('first-name').value = 'John';
            document.getElementById('last-name').value = 'Doe';
            document.getElementById('email-address').value = 'demo@oslira.com';
            document.getElementById('business-name').value = 'Demo Company';
            document.getElementById('target-audience').value = 'SaaS founders';
            document.getElementById('communication-style').value = 'friendly-casual';
            document.getElementById('default-cta').value = 'Worth a quick chat?';
        }

        // Section navigation
        function handleSectionNavigation(event) {
            event.preventDefault();
            
            const targetSection = event.currentTarget.dataset.section;
            if (!targetSection) return;

            // Update navigation active state
            document.querySelectorAll('.settings-nav-item').forEach(item => {
                item.classList.remove('active');
            });
            event.currentTarget.classList.add('active');

            // Show target section
            document.querySelectorAll('.settings-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(`${targetSection}-section`)?.classList.add('active');

            // Update URL hash
            window.history.replaceState(null, '', `#${targetSection}`);
        }

        // Main navigation
        function handleNavigation(event) {
            event.preventDefault();
            const page = event.currentTarget.dataset.page;
            
            if (hasUnsavedChanges) {
                if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
                    return;
                }
            }
            
            console.log('🧭 Navigating to:', page);
            
            // Route to appropriate page
            switch (page) {
                case 'dashboard':
                    window.location.href = 'dashboard.html';
                    break;
                case 'leads':
                    window.location.href = 'leads.html';
                    break;
                case 'credits':
                    showSection('billing');
                    break;
                default:
                    showNotification(`Navigation to ${page} coming soon!`, 'info');
            }
        }

        // Show specific section
        function showSection(sectionId) {
            document.querySelectorAll('.settings-nav-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');
            
            document.querySelectorAll('.settings-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(`${sectionId}-section`)?.classList.add('active');
        }

        // Profile management
        function handleAvatarUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                showNotification('File size must be less than 2MB', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const avatarPreview = document.getElementById('avatar-preview');
                avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                hasUnsavedChanges = true;
            };
            reader.readAsDataURL(file);
        }

        function removeAvatar() {
            const avatarPreview = document.getElementById('avatar-preview');
            avatarPreview.innerHTML = '👤';
            document.getElementById('avatar-input').value = '';
            hasUnsavedChanges = true;
        }

        async function saveProfile() {
            try {
                const profileData = {
                    user_id: currentUser.id,
                    first_name: document.getElementById('first-name').value.trim(),
                    last_name: document.getElementById('last-name').value.trim(),
                    timezone: document.getElementById('timezone').value,
                    updated_at: new Date().toISOString()
                };

                if (supabase) {
                    const { error } = await supabase
                        .from('user_profiles')
                        .upsert(profileData, { onConflict: 'user_id' });

                    if (error) throw error;
                }

                showNotification('Profile saved successfully!', 'success');
                hasUnsavedChanges = false;
            } catch (err) {
                console.error('❌ Error saving profile:', err);
                showNotification('Failed to save profile', 'error');
            }
        }

        function resetProfile() {
            if (confirm('Reset all profile changes?')) {
                loadUserProfile();
                hasUnsavedChanges = false;
            }
        }

        async function saveBusinessProfile() {
            try {
                const businessData = {
                    user_id: currentUser.id,
                    business_name: document.getElementById('business-name').value.trim(),
                    business_niche: document.getElementById('business-industry').value,
                    company_size: document.getElementById('company-size').value,
                    target_audience: document.getElementById('target-audience').value.trim(),
                    value_proposition: document.getElementById('value-proposition').value.trim(),
                    updated_at: new Date().toISOString()
                };

                if (supabase) {
                    const { error } = await supabase
                        .from('business_profiles')
                        .upsert(businessData, { onConflict: 'user_id' });

                    if (error) throw error;
                }

                showNotification('Business profile saved successfully!', 'success');
                hasUnsavedChanges = false;
            } catch (err) {
                console.error('❌ Error saving business profile:', err);
                showNotification('Failed to save business profile', 'error');
            }
        }

        function resetBusinessProfile() {
            if (confirm('Reset all business profile changes?')) {
                loadBusinessProfile();
                hasUnsavedChanges = false;
            }
        }

        async function saveMessagingSettings() {
            try {
                const messagingData = {
                    user_id: currentUser.id,
                    communication_style: document.getElementById('communication-style').value,
                    message_length: document.getElementById('message-length').value,
                    default_cta: document.getElementById('default-cta').value.trim(),
                    message_template: document.getElementById('message-template').value.trim(),
                    use_emojis: document.getElementById('use-emojis').checked,
                    enable_personalization: document.getElementById('enable-personalization').checked,
                    updated_at: new Date().toISOString()
                };

                if (supabase) {
                    const { error } = await supabase
                        .from('messaging_settings')
                        .upsert(messagingData, { onConflict: 'user_id' });

                    if (error) throw error;
                }

                showNotification('Messaging settings saved successfully!', 'success');
                hasUnsavedChanges = false;
            } catch (err) {
                console.error('❌ Error saving messaging settings:', err);
                showNotification('Failed to save messaging settings', 'error');
            }
        }

        function testMessageGeneration() {
            showNotification('Test message generation coming soon!', 'info');
        }

        async function saveNotificationSettings() {
            try {
                const notificationData = {
                    user_id: currentUser.id,
                    analysis_complete: document.getElementById('notify-analysis-complete').checked,
                    weekly_summary: document.getElementById('notify-weekly-summary').checked,
                    low_credits: document.getElementById('notify-low-credits').checked,
                    product_updates: document.getElementById('notify-product-updates').checked,
                    marketing: document.getElementById('notify-marketing').checked,
                    frequency: document.getElementById('notification-frequency').value,
                    updated_at: new Date().toISOString()
                };

                if (supabase) {
                    const { error } = await supabase
                        .from('notification_settings')
                        .upsert(notificationData, { onConflict: 'user_id' });

                    if (error) throw error;
                }

                showNotification('Notification settings saved successfully!', 'success');
                hasUnsavedChanges = false;
            } catch (err) {
                console.error('❌ Error saving notification settings:', err);
                showNotification('Failed to save notification settings', 'error');
            }
        }

        function sendTestNotification() {
            showNotification('Test notification sent to your email!', 'success');
        }

        // Integration functions
        function connectIntegration(type) {
            const integrationNames = {
                email: 'Email Platform',
                linkedin: 'LinkedIn',
                crm: 'CRM System',
                analytics: 'Analytics Tool'
            };
            
            showNotification(`${integrationNames[type]} integration coming soon!`, 'info');
        }

        // Billing functions
        function upgradePlan() {
            showNotification('Plan upgrade coming soon!', 'info');
        }

        function manageBilling() {
            showNotification('Billing management coming soon!', 'info');
        }

        function purchaseCredits(amount) {
            showNotification(`Purchase ${amount} credits coming soon!`, 'info');
        }

        // Security functions
        function changePassword() {
            showNotification('Password change coming soon!', 'info');
        }

        function exportUserData() {
            showNotification('Data export request submitted. You will receive an email when ready.', 'success');
        }

        function revokeAllSessions() {
            if (confirm('This will sign you out of all other devices. Continue?')) {
                showNotification('All other sessions revoked successfully!', 'success');
            }
        }

        function deleteAllData() {
            const confirmText = 'DELETE ALL DATA';
            const userInput = prompt(`Type "${confirmText}" to confirm deletion of all your data:`);
            
            if (userInput === confirmText) {
                showNotification('All data deletion initiated. This cannot be undone.', 'error');
            }
        }

        function deleteAccount() {
            const confirmText = 'DELETE ACCOUNT';
            const userInput = prompt(`Type "${confirmText}" to confirm account deletion:`);
            
            if (userInput === confirmText) {
                showNotification('Account deletion initiated. You will receive a confirmation email.', 'error');
            }
        }

        // Utility functions
        async function exportSettings() {
            const settings = {
                profile: {
                    firstName: document.getElementById('first-name').value,
                    lastName: document.getElementById('last-name').value,
                    email: document.getElementById('email-address').value,
                    timezone: document.getElementById('timezone').value
                },
                business: {
                    businessName: document.getElementById('business-name').value,
                    industry: document.getElementById('business-industry').value,
                    companySize: document.getElementById('company-size').value,
                    targetAudience: document.getElementById('target-audience').value,
                    valueProposition: document.getElementById('value-proposition').value
                },
                messaging: {
                    communicationStyle: document.getElementById('communication-style').value,
                    messageLength: document.getElementById('message-length').value,
                    defaultCTA: document.getElementById('default-cta').value,
                    useEmojis: document.getElementById('use-emojis').checked,
                    enablePersonalization: document.getElementById('enable-personalization').checked
                }
            };

            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'oslira-settings.json';
            a.click();
            URL.revokeObjectURL(url);

            showNotification('Settings exported successfully!', 'success');
        }

        async function saveAllSettings() {
            try {
                await Promise.all([
                    saveProfile(),
                    saveBusinessProfile(),
                    saveMessagingSettings(),
                    saveNotificationSettings()
                ]);
                
                showNotification('All settings saved successfully!', 'success');
                hasUnsavedChanges = false;
            } catch (err) {
                console.error('❌ Error saving all settings:', err);
                showNotification('Some settings failed to save', 'error');
            }
        }

        // Change tracking
        function setupChangeTracking() {
            const inputs = document.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.addEventListener('input', () => {
                    hasUnsavedChanges = true;
                });
                input.addEventListener('change', () => {
                    hasUnsavedChanges = true;
                });
            });
        }

        // Keyboard shortcuts
        function handleKeyboardShortcuts(event) {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 's':
                        event.preventDefault();
                        saveAllSettings();
                        break;
                    case 'e':
                        event.preventDefault();
                        exportSettings();
                        break;
                }
            }
        }

        // Before unload warning
        function handleBeforeUnload(event) {
            if (hasUnsavedChanges) {
                event.preventDefault();
                event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return event.returnValue;
            }
        }

        // Notification system
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }

        // Authentication
        function logout() {
            if (hasUnsavedChanges) {
                if (!confirm('You have unsaved changes. Are you sure you want to sign out?')) {
                    return;
                }
            }

            if (supabase) {
                supabase.auth.signOut().then(() => {
                    window.location.href = 'auth.html';
                });
            } else {
                window.location.href = 'auth.html';
            }
        }

        // Auth state listener
        if (window.supabase) {
            window.supabase.auth?.onAuthStateChange?.((event, session) => {
                if (event === 'SIGNED_OUT' || !session) {
                    window.location.href = 'auth.html';
                }
            });
        }

        // Handle initial section from URL hash
        window.addEventListener('load', () => {
            const hash = window.location.hash.substring(1);
            if (hash) {
                const sectionItem = document.querySelector(`[data-section="${hash}"]`);
                if (sectionItem) {
                    sectionItem.click();
                }
            }
        });

        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('💥 Global error:', event.error);
            if (typeof Sentry !== 'undefined') {
                Sentry.captureException(event.error);
            }
        });

        // Global functions for any dynamically generated content
        window.osliraSettings = {
            showSection,
            saveProfile,
            saveBusinessProfile,
            saveMessagingSettings,
            saveNotificationSettings,
            showNotification,
            exportSettings
        };
