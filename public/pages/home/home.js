// =============================================================================
// HOME.JS - CONVERSION OPTIMIZED SYSTEM
// =============================================================================

// Initialize Sentry if available
if (typeof Sentry !== "undefined") {
  Sentry.init({
    environment: "production",
    beforeSend(event) {
      if (event.exception?.values?.[0]?.value?.includes("NetworkError")) {
        return null;
      }
      return event;
    },
  });
}

// Global state - single declaration
let isInitialized = false;
let footerInitialized = false;
let conversionTrackingEnabled = true;

// Conversion tracking state
const conversionState = {
  demoUsed: false,
  ctaClicked: false,
  socialProofShown: false,
  timeOnPage: 0,
  scrollDepth: 0
};

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Oslira conversion-optimized landing page loaded");
  
  // Prevent auto-redirect by blocking simple-app initialization
  window.preventSimpleAppInit = true;
  
  await initializeApp();
  setupEventListeners();
  setupAnimations();
  initializeConversionOptimizations();
  
  // Force footer initialization after scripts load
  setTimeout(async () => {
    if (window.FooterManager && !document.querySelector('.footer-main')) {
      console.log('🦶 [Home] Force-initializing footer from DOMContentLoaded...');
      const footerManager = new window.FooterManager();
      footerManager.render('footer-container');
    }
  }, 3000);
});

// Listen for scripts loaded event to initialize footer - ONCE ONLY
window.addEventListener('oslira:scripts:loaded', async () => {
  if (footerInitialized) {
    console.log('🔄 [Home] Footer already initialized, skipping...');
    return;
  }
  
  console.log('🚀 [Home] Scripts loaded event received, initializing footer...');
  try {
    footerInitialized = true;
    await initializeFooter();
  } catch (error) {
    console.error('❌ [Home] Footer initialization failed:', error);
    footerInitialized = false; // Reset on error
  }
});

// =============================================================================
// CONVERSION OPTIMIZATION FEATURES
// =============================================================================

function initializeConversionOptimizations() {
  console.log('🎯 [Home] Initializing conversion optimizations...');
  
  // Initialize demo functionality
  setupInstagramDemo();
  
  // Setup CTA tracking and optimization
  setupCTAOptimizations();
  
  // Initialize social proof popups
  setupSocialProofNotifications();
  
  // Setup scroll tracking for conversion analytics
  setupScrollTracking();
  
  // Initialize urgency elements
  setupUrgencyElements();
  
  // Setup sticky mobile CTA
  setupMobileStickyCA();
  
  // Initialize time-based triggers
  setupTimeTriggers();
  
  console.log('✅ [Home] Conversion optimizations ready');
}

// =============================================================================
// INSTAGRAM DEMO FUNCTIONALITY - DOPAMINE TRIGGER
// =============================================================================

function setupInstagramDemo() {
  const demoInput = document.getElementById('demo-handle-input');
  const demoBtn = document.getElementById('demo-analyze-btn');
  const demoResults = document.getElementById('demo-results');
  
  if (!demoInput || !demoBtn || !demoResults) {
    console.warn('⚠️ [Home] Demo elements not found');
    return;
  }
  
  console.log('🎮 [Home] Setting up Instagram demo...');
  
// Demo button click handler  
demoBtn.addEventListener('click', async () => {
  console.log('🔥 [Home] Quick Analysis button clicked!');
  
  const handle = demoInput.value.trim();
  console.log('🔍 [Home] Handle entered:', handle);
  
  if (!handle) {
    console.log('⚠️ [Home] No handle entered, focusing input');
    demoInput.focus();
    demoInput.classList.add('animate-wiggle');
    setTimeout(() => demoInput.classList.remove('animate-wiggle'), 500);
    return;
  }
  
  console.log('🚀 [Home] Starting analysis for:', handle);
  
  // Ensure function exists before calling
  if (typeof runInstagramDemo === 'function') {
    console.log('✅ [Home] runInstagramDemo function found, calling...');
    await runInstagramDemo(handle);
  } else {
    console.error('❌ [Home] runInstagramDemo function not available, using fallback');
    // Fallback to demo mode
    const demoData = generateDemoResults(handle);
    displayDemoResults(demoData);
    const demoResults = document.getElementById('demo-results');
    demoResults.classList.remove('hidden');
  }
});
  
  // Enter key support
  demoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      demoBtn.click();
    }
  });
  
  // Auto-clean input
  demoInput.addEventListener('input', (e) => {
    let value = e.target.value;
    if (value.length > 0 && !value.startsWith('@')) {
      value = '@' + value.replace('@', '');
    }
    e.target.value = value;
  });
}

async function runInstagramDemo(handle) {
  const demoBtn = document.getElementById('demo-analyze-btn');
  const demoResults = document.getElementById('demo-results');
  const btnText = demoBtn.querySelector('.demo-btn-text');
  const btnLoading = demoBtn.querySelector('.demo-btn-loading');
  
  console.log('🔍 [Home] Running anonymous analysis for:', handle);
  
  // Track demo usage
  conversionState.demoUsed = true;
  trackConversionEvent('demo_started', { handle });
  
  try {
    // Check if user is logged in - if so, redirect to dashboard
    const isLoggedIn = localStorage.getItem('oslira_token');
    if (isLoggedIn) {
      window.location.href = '/dashboard';
      return;
    }
    
    // Show loading state
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    demoBtn.disabled = true;
    
// Get worker URL from environment manager
const workerUrl = window.OsliraEnv?.WORKER_URL || 'https://api-staging.oslira.com';
console.log('🔧 [Home] Using worker URL:', workerUrl);

// Call anonymous analysis endpoint
const response = await fetch(`${workerUrl}/v1/analyze-anonymous`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: handle.replace('@', '')
  })
});

console.log('📡 [Home] API response status:', response.status);
    
    const result = await response.json();
    
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limit hit - show login modal
        showRateLimitModal(result.metadata?.remaining || 0, result.metadata?.resetIn || 24);
        return;
      }
      throw new Error(result.error || 'Analysis failed');
    }
    
    // Show real analysis results in modal
    showAnonymousResultsModal(result.data, handle);
    
    // Track successful analysis
    trackConversionEvent('anonymous_analysis_completed', { 
      handle, 
      score: result.data.insights.overall_score,
      remaining: result.metadata?.remaining || 0
    });
    
} catch (error) {
  console.error('❌ [Home] Anonymous analysis error:', error);
  console.error('❌ [Home] Error details:', {
    message: error.message,
    stack: error.stack,
    handle: handle,
    workerUrl: workerUrl
  });
  
  trackConversionEvent('anonymous_analysis_error', { handle, error: error.message });
  
  // Show error and fallback to demo
  console.log('🔄 [Home] Falling back to demo mode...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  const demoData = generateDemoResults(handle);
  displayDemoResults(demoData);
  
  // Show results with animation
  demoResults.classList.remove('hidden');
  demoResults.classList.add('animate-slide-in-up');
  
  // Show upgrade modal after delay
  setTimeout(() => {
    showDemoUpgradeModal();
  }, 3000);
  
} finally {
    btnText.classList.remove('hidden');
    btnLoading.classList.add('hidden');
    demoBtn.disabled = false;
  }
}

function generateDemoResults(handle) {
  // Generate realistic demo data
  const cleanHandle = handle.replace('@', '');
  const names = ['Sarah', 'Mike', 'Alex', 'Jordan', 'Taylor', 'Casey'];
  const industries = [
    { name: 'Health & Wellness', tags: ['Needs copy help', 'High engagement', 'Business owner'] },
    { name: 'Tech Startup', tags: ['Growing fast', 'Content creator', 'B2B focus'] },
    { name: 'E-commerce', tags: ['Product launches', 'Email marketing', 'Conversion focused'] },
    { name: 'Coaching', tags: ['Personal brand', 'Course creator', 'Audience building'] }
  ];
  
  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomIndustry = industries[Math.floor(Math.random() * industries.length)];
  const followers = (Math.random() * 50 + 5).toFixed(1) + 'K';
  const matchScore = (Math.random() * 25 + 75).toFixed(0);
  
return {
    handle: `@${cleanHandle}`,
    name: randomName,
    industry: randomIndustry.name,
    followers: followers,
    matchScore: matchScore + '%',
    tags: randomIndustry.tags,
    outreachPreview: `Hi ${randomName}! I noticed your ${randomIndustry.name.toLowerCase()} content and think you'd be perfect for...`
  };
}

function displayDemoResults(demoData) {
  const demoResults = document.getElementById('demo-results');
  
  demoResults.innerHTML = `
    <div class="demo-result-card">
      <div class="demo-profile-info">
        <div class="demo-avatar">${demoData.name.charAt(0)}</div>
        <div>
          <h4 class="demo-name">${demoData.handle}</h4>
          <p class="demo-analysis">Perfect fit • ${demoData.industry} • ${demoData.followers} followers</p>
        </div>
        <span class="demo-match-score">${demoData.matchScore} match</span>
      </div>
      <div class="demo-insights">
        ${demoData.tags.map(tag => `<span class="demo-tag">${tag}</span>`).join('')}
      </div>
      <div class="demo-outreach-preview">
        <p class="demo-message">${demoData.outreachPreview}</p>
      </div>
      <p class="demo-upgrade-hint">
        ↑ See 24 more leads like this with your free trial
      </p>
    </div>
  `;
}

function showDemoUpgradeModal() {
  const modal = document.getElementById('demo-modal');
  if (modal) {
    modal.classList.remove('hidden');
    trackConversionEvent('demo_modal_shown');
    
    // Close modal handlers
    const closeBtn = modal.querySelector('.demo-modal-close');
    const overlay = modal.querySelector('.demo-modal-overlay');
    const upgradeBtn = modal.querySelector('.btn-primary-modal');
    
    const closeModal = () => {
      modal.classList.add('hidden');
      trackConversionEvent('demo_modal_closed');
    };
    
    closeBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', closeModal);
    
    upgradeBtn?.addEventListener('click', () => {
      trackConversionEvent('demo_modal_cta_clicked');
      window.location.href = '/auth';
    });
  }
}

// =============================================================================
// CTA OPTIMIZATION & TRACKING
// =============================================================================

function setupCTAOptimizations() {
  console.log('🎯 [Home] Setting up CTA optimizations...');
  
  // Track all CTA clicks
  const ctaButtons = document.querySelectorAll('[class*="btn-primary"], [class*="cta"]');
  
  ctaButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const ctaType = identifyCTAType(button);
      conversionState.ctaClicked = true;
      
      trackConversionEvent('cta_clicked', {
        type: ctaType,
        text: button.textContent.trim(),
        position: getCTAPosition(button)
      });
      
      // Add conversion animation
      button.classList.add('animate-pulse');
      setTimeout(() => button.classList.remove('animate-pulse'), 600);
      
      // If it's a main CTA, redirect to auth
      if (ctaType.includes('main') || ctaType.includes('primary')) {
        e.preventDefault();
        setTimeout(() => {
          window.location.href = '/auth';
        }, 300);
      }
    });
  });
  
  // Setup hover effects for additional dopamine
  ctaButtons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      trackConversionEvent('cta_hover', { 
        type: identifyCTAType(button) 
      });
    });
  });
}

function identifyCTAType(button) {
  const classList = button.className;
  if (classList.includes('primary-cta-main')) return 'hero_main';
  if (classList.includes('final-cta-main')) return 'final_main';
  if (classList.includes('mobile-cta-btn')) return 'mobile_sticky';
  if (classList.includes('sticky-cta')) return 'nav_sticky';
  if (classList.includes('btn-primary-modal')) return 'demo_modal';
  return 'secondary';
}

function getCTAPosition(button) {
  const rect = button.getBoundingClientRect();
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    visible: rect.top >= 0 && rect.top <= window.innerHeight
  };
}

// =============================================================================
// SOCIAL PROOF NOTIFICATIONS
// =============================================================================

function setupSocialProofNotifications() {
  console.log('📢 [Home] Setting up social proof notifications...');
  
  const notifications = [
    { avatar: 'SC', text: 'Sarah C. just got 5 new leads using Oslira!' },
    { avatar: 'MR', text: '1,247 copywriters accelerating their outreach' },
    { avatar: 'AJ', text: 'Alex J. booked 3 clients this week' },
    { avatar: 'TK', text: 'Someone just improved their response rate by 31%' },
    { avatar: 'JD', text: 'Jordan D. saved 6 hours of prospecting yesterday' }
  ];
  
  let notificationIndex = 0;
  let notificationTimer;
  
  function showSocialProofNotification() {
    if (conversionState.socialProofShown) return;
    
    const container = document.getElementById('social-proof-notifications');
    if (!container) return;
    
    const notification = notifications[notificationIndex];
    const notificationEl = createNotificationElement(notification);
    
    container.appendChild(notificationEl);
    
    // Animate in
    setTimeout(() => {
      notificationEl.classList.add('show');
    }, 100);
    
    // Auto dismiss after 4 seconds
    setTimeout(() => {
      notificationEl.classList.remove('show');
      setTimeout(() => {
        if (notificationEl.parentNode) {
          notificationEl.parentNode.removeChild(notificationEl);
        }
      }, 300);
    }, 4000);
    
    trackConversionEvent('social_proof_shown', { 
      notification: notification.text,
      index: notificationIndex 
    });
    
    notificationIndex = (notificationIndex + 1) % notifications.length;
  }
  
  function createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = 'notification-popup';
    div.innerHTML = `
      <div class="notification-content">
        <div class="notification-avatar">${notification.avatar}</div>
        <div class="notification-text">${notification.text}</div>
      </div>
    `;
    
    // Click to dismiss
    div.addEventListener('click', () => {
      div.classList.remove('show');
      trackConversionEvent('social_proof_clicked');
    });
    
    return div;
  }
  
  // Start showing notifications after user has been on page for 10 seconds
  setTimeout(() => {
    if (!conversionState.ctaClicked) {
      showSocialProofNotification();
      conversionState.socialProofShown = true;
      
      // Show more notifications every 15 seconds
      notificationTimer = setInterval(() => {
        if (!conversionState.ctaClicked && Math.random() > 0.5) {
          showSocialProofNotification();
        }
      }, 15000);
    }
  }, 10000);
}

// =============================================================================
// SCROLL TRACKING & ANALYTICS
// =============================================================================

function setupScrollTracking() {
  let maxScrollDepth = 0;
  let scrollMilestones = [25, 50, 75, 90, 100];
  let milestonesHit = new Set();
  
  function trackScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);
    
    if (scrollPercent > maxScrollDepth) {
      maxScrollDepth = scrollPercent;
      conversionState.scrollDepth = scrollPercent;
    }
    
    // Track milestone achievements
    scrollMilestones.forEach(milestone => {
      if (scrollPercent >= milestone && !milestonesHit.has(milestone)) {
        milestonesHit.add(milestone);
        trackConversionEvent('scroll_milestone', { 
          milestone: milestone,
          timeOnPage: conversionState.timeOnPage 
        });
      }
    });
  }
  
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(trackScroll, 100);
  });
}

// =============================================================================
// URGENCY ELEMENTS
// =============================================================================

function setupUrgencyElements() {
  console.log('⏰ [Home] Setting up urgency elements...');
  
  // Urgency banner close functionality
  const urgencyClose = document.querySelector('.urgency-close');
  if (urgencyClose) {
    urgencyClose.addEventListener('click', () => {
      const banner = urgencyClose.closest('.urgency-banner');
      if (banner) {
        banner.style.display = 'none';
        trackConversionEvent('urgency_banner_closed');
      }
    });
  }
  
  // Update countdown numbers dynamically
  updateUrgencyCounters();
  
  // Update counters every hour
  setInterval(updateUrgencyCounters, 3600000);
}

function updateUrgencyCounters() {
  // Simulate decreasing availability
  const spots = Math.floor(Math.random() * 50) + 25;
  
  const urgencyElements = document.querySelectorAll('.urgency-text');
  urgencyElements.forEach(el => {
    const text = el.textContent;
    if (text.includes('spots left')) {
      el.innerHTML = text.replace(/\d+ free trials? left/, `${spots} free trials left`);
    }
  });
}

// =============================================================================
// MOBILE STICKY CTA
// =============================================================================

function setupMobileStickyCA() {
  const stickyCA = document.querySelector('.mobile-sticky-cta');
  if (!stickyCA) return;
  
  console.log('📱 [Home] Setting up mobile sticky CTA...');
  
  let isVisible = false;
  
  function toggleStickyCA() {
    const scrolled = window.pageYOffset > 500;
    
    if (scrolled && !isVisible) {
      stickyCA.style.transform = 'translateY(0)';
      isVisible = true;
      trackConversionEvent('mobile_cta_shown');
    } else if (!scrolled && isVisible) {
      stickyCA.style.transform = 'translateY(100%)';
      isVisible = false;
    }
  }
  
  // Initial hide
  stickyCA.style.transform = 'translateY(100%)';
  stickyCA.style.transition = 'transform 0.3s ease-in-out';
  
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(toggleStickyCA, 50);
  });
  
  // Track clicks
  const mobileBtn = stickyCA.querySelector('.mobile-cta-btn');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      trackConversionEvent('mobile_cta_clicked');
      window.location.href = '/auth';
    });
  }
}

// =============================================================================
// TIME-BASED TRIGGERS
// =============================================================================

function setupTimeTriggers() {
  console.log('⏲️ [Home] Setting up time-based triggers...');
  
  // Track time on page
  setInterval(() => {
    conversionState.timeOnPage += 1;
  }, 1000);
  
  // Exit intent detection (desktop only)
  if (!window.matchMedia('(max-width: 768px)').matches) {
    document.addEventListener('mouseleave', (e) => {
      if (e.clientY <= 0 && !conversionState.ctaClicked) {
        trackConversionEvent('exit_intent', {
          timeOnPage: conversionState.timeOnPage,
          scrollDepth: conversionState.scrollDepth
        });
        
        // Could trigger exit intent modal here
        showExitIntentCTA();
      }
    });
  }
  
  // Idle detection
  let idleTimer;
  const idleTime = 30; // seconds
  
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!conversionState.ctaClicked) {
        trackConversionEvent('user_idle', {
          timeOnPage: conversionState.timeOnPage,
          scrollDepth: conversionState.scrollDepth
        });
      }
    }, idleTime * 1000);
  }
  
  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetIdleTimer, true);
  });
  
  resetIdleTimer();
}

function showExitIntentCTA() {
  // Simple exit intent - could enhance with modal
  const hero = document.querySelector('.hero-section');
  if (hero) {
    hero.style.borderTop = '5px solid #ff4444';
    setTimeout(() => {
      hero.style.borderTop = 'none';
    }, 3000);
  }
}

// =============================================================================
// CONVERSION TRACKING & ANALYTICS
// =============================================================================

function trackConversionEvent(eventName, data = {}) {
  if (!conversionTrackingEnabled) return;
  
  const eventData = {
    event: eventName,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    screen: {
      width: window.screen.width,
      height: window.screen.height
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    state: conversionState,
    ...data
  };
  
  console.log('📊 [Conversion]', eventName, eventData);
  
  // Send to analytics service (if available)
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, {
      event_category: 'conversion',
      event_label: JSON.stringify(data),
      value: 1
    });
  }
  
  // Could also send to custom analytics endpoint
  // fetch('/api/analytics', { method: 'POST', body: JSON.stringify(eventData) });
}

// =============================================================================
// STANDARD FUNCTIONALITY (from original)
// =============================================================================

async function initializeApp() {
  try {
    console.log("🚀 Initializing app...");

    // Initialize Supabase using the modern pattern
    await initializeSupabase();
    isInitialized = true;
    console.log("✅ Landing page initialized");
  } catch (error) {
    console.error("❌ Landing page initialization failed:", error);
    if (window.Alert) {
      Alert.error("Page failed to load properly", {
        actions: [{ label: "Refresh Page", action: "reload" }],
      });
    }
    setupDemoMode();
  }
}

async function initializeFooter() {
  try {
    // Prevent duplicate initialization
    if (document.querySelector('.footer-main')) {
      console.log('🔄 [Home] Footer already exists, skipping initialization...');
      return;
    }
    
    console.log('🦶 [Home] Starting footer initialization...');
    
    // Check if container exists, create if missing
    let container = document.getElementById('footer-container');
    if (!container) {
      console.log('🔧 [Home] Creating footer-container element');
      container = document.createElement('div');
      container.id = 'footer-container';
      document.body.appendChild(container);
    }
    console.log('✅ [Home] Footer container found');
    
    // Wait for FooterManager to be available
    console.log('🔍 [Home] Waiting for FooterManager...');
    for (let i = 0; i < 50; i++) {
      if (window.FooterManager) {
        console.log('✅ [Home] FooterManager found');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!window.FooterManager) {
      throw new Error('FooterManager not available after waiting');
    }
    
    // Initialize footer
    console.log('🦶 [Home] Creating FooterManager instance...');
    const footerManager = new window.FooterManager();
    
    console.log('🦶 [Home] Rendering footer...');
    footerManager.render('footer-container', {
      showSocialLinks: true,
      showNewsletter: true
    });
    
    console.log('✅ [Home] Footer initialization complete');
  } catch (error) {
    console.error('❌ [Home] Footer initialization failed:', error);
  }
}

async function initializeSupabase() {
  try {
    // Wait for SimpleAuth to be initialized by script-loader
    console.log("🔄 Waiting for SimpleAuth initialization...");
    
    let attempts = 0;
    while (attempts < 50) {
      if (window.SimpleAuth?.supabase?.from) {
        console.log("✅ SimpleAuth Supabase client available");
        return; // Use existing SimpleAuth client
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    console.warn("⚠️ SimpleAuth not available. Demo mode only.");
  } catch (error) {
    console.error("❌ SimpleAuth initialization failed:", error);
    setupDemoMode();
  }
}

function setupDemoMode() {
  console.log("🎭 Setting up demo mode");
  // Demo mode functionality if needed
}

function setupEventListeners() {
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // Track internal navigation
        trackConversionEvent('internal_navigation', {
          target: this.getAttribute('href')
        });
      }
    });
  });

  // Mobile menu functionality
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
      trackConversionEvent('mobile_menu_toggled');
    });
  }

  // Close mobile menu when clicking outside
  document.addEventListener('click', (event) => {
    if (mobileMenu && mobileMenuButton && 
        !mobileMenu.contains(event.target) && 
        !mobileMenuButton.contains(event.target)) {
      mobileMenu.classList.add('hidden');
    }
  });
}

function setupAnimations() {
  // Show content once CSS is loaded
  setTimeout(() => {
    document.body.classList.add('show-content');
    trackConversionEvent('page_content_shown');
  }, 50);

  // Intersection Observer for scroll animations
  if ('IntersectionObserver' in window) {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-slide-in-up');
          
          // Track section views
          const sectionId = entry.target.id || entry.target.className;
          trackConversionEvent('section_viewed', { section: sectionId });
        }
      });
    }, observerOptions);

    // Observe main sections
    document.querySelectorAll('.benefits-section, .how-it-works-section, .social-proof-section, .final-cta-section').forEach(section => {
      observer.observe(section);
    });
  }
}

// ===============================================================================
// ANONYMOUS RESULTS MODAL - REAL ANALYSIS WITH CONVERSION GATE
// ===============================================================================

function showAnonymousResultsModal(analysisData, handle) {
  // Remove existing modal if any
  const existingModal = document.getElementById('anonymous-results-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const { profile, insights } = analysisData;
  const score = insights.overall_score;
  const summary = insights.account_summary;
  const engagementInsights = insights.engagement_insights || [];
  
  // Create modal HTML
  const modalHTML = `
    <div id="anonymous-results-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                ${handle.charAt(1).toUpperCase()}
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900">${handle}</h2>
                <p class="text-sm text-gray-600">${profile.followersCount?.toLocaleString() || 'N/A'} followers</p>
              </div>
            </div>
            <button onclick="closeAnonymousResultsModal()" class="p-2 hover:bg-gray-100 rounded-full">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="p-6 space-y-6">
          <!-- Score -->
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full text-white font-bold text-2xl">
              ${score}
            </div>
            <p class="mt-2 text-lg font-semibold text-gray-900">Overall Score</p>
            <p class="text-sm text-gray-600">Partnership Potential</p>
          </div>
          
          <!-- Summary -->
          <div class="bg-gray-50 rounded-xl p-4">
            <h3 class="font-semibold text-gray-900 mb-2">Account Summary</h3>
            <p class="text-gray-700">${summary}</p>
          </div>
          
          <!-- Insights Section -->
          <div>
            <h3 class="font-semibold text-gray-900 mb-4">Engagement Insights</h3>
            <div class="space-y-3">
              <!-- Show first 2 insights -->
              ${engagementInsights.slice(0, 2).map((insight, index) => `
                <div class="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    ${index + 1}
                  </div>
                  <p class="text-gray-700 text-sm">${insight}</p>
                </div>
              `).join('')}
              
              <!-- Blurred insights 3-5 -->
              <div class="relative">
                <div class="space-y-3 filter blur-sm">
                  ${engagementInsights.slice(2).map((insight, index) => `
                    <div class="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <div class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        ${index + 3}
                      </div>
                      <p class="text-gray-700 text-sm">${insight}</p>
                    </div>
                  `).join('')}
                </div>
                
                <!-- Overlay -->
                <div class="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent flex items-center justify-center">
                  <div class="text-center p-4">
                    <div class="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                      <span>3 More Insights</span>
                    </div>
                    <p class="text-sm text-gray-600 mt-2">Login to see full analysis + outreach strategies</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- CTA Section -->
          <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white text-center">
            <h3 class="font-bold text-lg mb-2">Get Complete Analysis</h3>
            <p class="text-blue-100 mb-4">See all insights + personalized outreach strategies for your business</p>
            <button onclick="redirectToAuth()" class="bg-white text-blue-600 font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors">
              Start Free Trial
            </button>
            <p class="text-xs text-blue-200 mt-2">25 complete analyses included</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add to DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Track modal shown
  trackConversionEvent('anonymous_results_modal_shown', { handle, score });
}

function showRateLimitModal(remaining, resetIn) {
  const modalHTML = `
    <div id="rate-limit-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Daily Limit Reached</h3>
        <p class="text-gray-600 mb-6">You've used your 3 free analyses today. Reset in ${resetIn} hours.</p>
        <button onclick="redirectToAuth()" class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Login for Unlimited Analysis
        </button>
        <button onclick="closeRateLimitModal()" class="w-full mt-3 text-gray-500 hover:text-gray-700">
          Close
        </button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  trackConversionEvent('rate_limit_modal_shown', { remaining, resetIn });
}

function closeAnonymousResultsModal() {
  const modal = document.getElementById('anonymous-results-modal');
  if (modal) {
    modal.remove();
    trackConversionEvent('anonymous_results_modal_closed');
  }
}

function closeRateLimitModal() {
  const modal = document.getElementById('rate-limit-modal');
  if (modal) {
    modal.remove();
    trackConversionEvent('rate_limit_modal_closed');
  }
}

function redirectToAuth() {
  trackConversionEvent('anonymous_conversion_attempt');
  window.location.href = '/auth';
}

// Add global functions
window.closeAnonymousResultsModal = closeAnonymousResultsModal;
window.closeRateLimitModal = closeRateLimitModal;
window.redirectToAuth = redirectToAuth;

// =============================================================================
// PAGE VISIBILITY & ENGAGEMENT TRACKING
// =============================================================================

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    trackConversionEvent('page_hidden', {
      timeOnPage: conversionState.timeOnPage,
      scrollDepth: conversionState.scrollDepth
    });
  } else {
    trackConversionEvent('page_visible');
  }
});

// Track page unload
window.addEventListener('beforeunload', () => {
  trackConversionEvent('page_unload', {
    timeOnPage: conversionState.timeOnPage,
    scrollDepth: conversionState.scrollDepth,
    demoUsed: conversionState.demoUsed,
    ctaClicked: conversionState.ctaClicked
  });
});

// =============================================================================
// INITIALIZATION
// =============================================================================

console.log('✅ [Home] Conversion-optimized homepage script loaded');
