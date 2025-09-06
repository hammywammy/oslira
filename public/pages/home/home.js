// =============================================================================
// INDEX.JS - MODERN SYSTEM (Updated to match dashboard/campaigns pattern)
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

// Application state
let supabase = null;
let isInitialized = false;

// Initialize application when DOM loads
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Oslira landing page loaded");
  await initializeApp();
  setupEventListeners();
  setupAnimations();
});

// =============================================================================
// INITIALIZATION (matches dashboard/campaigns pattern)
// =============================================================================

// In home.js, update the initializeApp function:
async function initializeApp() {
  try {
    console.log("🚀 Initializing app...");

    // Load environment config FIRST
    if (typeof loadEnvConfig !== "undefined") {
      try {
        await loadEnvConfig();
        console.log("🔧 Environment configuration loaded");
      } catch (error) {
        console.warn("⚠️ Environment config failed:", error);
      }
    }

    // Initialize Supabase using the modern pattern
    await initializeSupabase();
    isInitialized = true;
    console.log("✅ Landing page initialized");
  } catch (error) {
    console.error("❌ Landing page initialization failed:", error);
    Alert.error("Page failed to load properly", {
      actions: [{ label: "Refresh Page", action: "reload" }],
    });
    setupDemoMode();
  }
  await this.initializeFooter();
}

async initializeFooter() {
    try {
        console.log('🦶 [Home] Initializing footer...');
        
        // Wait for FooterManager to be available
        for (let i = 0; i < 50; i++) {
            if (window.FooterManager) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!window.FooterManager) {
            throw new Error('FooterManager not available');
        }
        
        // Initialize footer
        const footerManager = new window.FooterManager();
        footerManager.render('footer-container', {
            showSocialLinks: true,
            showNewsletter: true
        });
        
        console.log('✅ [Home] Footer initialized');
    } catch (error) {
        console.warn('⚠️ [Home] Footer initialization failed:', error);
    }
}

function initializeSupabase() {
  try {
    // Check if config is loaded (from env-config.js)
    if (!window.CONFIG) {
      console.warn("⚠️ Configuration not loaded. Demo mode only.");
      return;
    }

    // Validate required config
    const required = ["supabaseUrl", "supabaseAnonKey"];
    const missing = required.filter((key) => !window.CONFIG[key]);

    if (missing.length > 0) {
      console.warn("⚠️ Missing configuration:", missing);
      return;
    }

    // Initialize Supabase client
    supabase = window.supabase.createClient(
      window.CONFIG.supabaseUrl,
      window.CONFIG.supabaseAnonKey
    );

    console.log("✅ Supabase initialized for landing page");
    return supabase;
  } catch (error) {
    console.error("❌ Supabase initialization failed:", error);
    Alert.warning({
      message: "Some features may be limited",
      suggestions: ["Page will work in demo mode", "Refresh to retry full features"],
    });
    throw error;
  }
}

function setupDemoMode() {
  console.log("🎭 Running in demo mode");
  // Landing page functionality that doesn't require backend
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

// =============================================================================
// EVENT LISTENERS (Original functionality)
// =============================================================================

function setupEventListeners() {
  // Demo form submission
  const demoForm = document.querySelector(".demo-form");
  if (demoForm) {
    demoForm.addEventListener("submit", handleDemo);
  }

  // Enhanced demo input with original functionality
  const demoInput = document.getElementById("demo-input");
  if (demoInput) {
    // Remove invalid characters as user types (original feature)
    demoInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^a-zA-Z0-9._@]/g, "");
    });
  }

  // Smooth scrolling for navigation links (original)
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // Navigation scroll effect (original)
  window.addEventListener("scroll", handleNavScroll);

  // CTA button clicks
  document.querySelectorAll('.btn-primary[href="/auth.html"]').forEach((btn) => {
    btn.addEventListener("click", handleCTAClick);
  });

  // Keyboard shortcuts (original accessibility feature)
  document.addEventListener("keydown", function (event) {
    // Alt + D to focus demo input
    if (event.altKey && event.key === "d") {
      event.preventDefault();
      const demoInput = document.getElementById("demo-input");
      if (demoInput) {
        demoInput.focus();
        announceToScreenReader("Demo input focused. Enter an Instagram username to analyze.");
      }
    }
  });

  // Enhanced keyboard navigation (original feature)
  document.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && event.target.classList.contains("cta-button")) {
      event.target.click();
    }
  });
}

// =============================================================================
// DEMO FUNCTIONALITY
// =============================================================================

async function handleDemo(event) {
  event.preventDefault();

  const form = event.target;
  const input = document.getElementById("demo-input");
  const button = form.querySelector(".demo-button");
  const username = input.value.trim().replace("@", "");

  // Validate input
  if (!username) {
    Alert.warning({ message: "Please enter an Instagram username" });
    input.focus();
    return;
  }

  // Validate username format using original validation
  if (!validateUsername(username)) {
    Alert.warning({
      message: "Invalid username format",
      suggestions: [
        "Use only letters, numbers, periods, and underscores",
        "Remove @ symbol if present",
        "Maximum 30 characters",
      ],
    });
    input.focus();
    return;
  }

  // Show loading state - matching original behavior
  form.classList.add("demo-loading");
  const originalText = button.textContent;
  button.textContent = "Analyzing...";
  button.disabled = true;

  try {
    // Simulate analysis delay (matching original)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Store the username for the auth page (original behavior)
    sessionStorage.setItem("demo_username", username);

    // Redirect to signup with demo context (original behavior)
    window.location.href = `/auth.html?demo=${encodeURIComponent(username)}`;
  } catch (error) {
    console.error("Demo error:", error);
    Alert.error("Demo analysis failed", {
      suggestions: ["Try a different username", "Check your internet connection"],
      actions: [{ label: "Try Again", action: "retry" }],
    });
  } finally {
    // Reset form state
    form.classList.remove("demo-loading");
    button.textContent = originalText;
    button.disabled = false;
  }
}

// Original validation function
function validateUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;

  if (!username || username.length === 0) {
    Alert.warning({ message: "Username is required" });
    return false;
  }

  if (username.length > 30) {
    Alert.warning({
      message: "Username too long",
      suggestions: ["Maximum 30 characters allowed"],
    });
    return false;
  }

  if (!usernameRegex.test(username)) {
    Alert.warning({
      message: "Invalid characters in username",
      suggestions: ["Use only letters, numbers, periods, and underscores"],
    });
    return false;
  }

  if (username.includes("..")) {
    Alert.warning({
      message: "Invalid username format",
      suggestions: ["Cannot have consecutive periods"],
    });
    return false;
  }

  if (username.startsWith(".") || username.endsWith(".")) {
    Alert.warning({
      message: "Invalid username format",
      suggestions: ["Cannot start or end with a period"],
    });
    return false;
  }

  return true;
}
async function performRealDemo(username) {
  try {
    // ✅ FIXED: Safe access to config
    const workerUrl =
      window.CONFIG?.workerUrl ||
      window.OsliraApp?.config?.workerUrl ||
      "https://ai-outreach-api.oslira-worker.workers.dev";

    const response = await fetch(`${workerUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile_url: `https://instagram.com/${username}`,
        analysis_type: "light",
        demo: true,
      }),
    });

    if (!response.ok) {
      Alert.warning({
        message: "Live analysis unavailable",
        suggestions: ["Demo data will be used instead"],
      });
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    showDemoResult(result, username);
  } catch (error) {
    console.error("Real demo failed:", error);
    Alert.info({
      message: "Using demo data",
      suggestions: ["Sign up for real-time analysis"],
    });
    await performMockDemo(username);
  }
}

async function performMockDemo(username) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Generate mock result
  const mockResult = {
    profile: {
      username: username,
      followers_count: Math.floor(Math.random() * 50000) + 1000,
      engagement_rate: (Math.random() * 8 + 2).toFixed(1),
    },
    analysis: {
      interests: ["fitness", "technology", "travel"],
      niche_fit: Math.floor(Math.random() * 40) + 60,
      summary: `@${username} shows strong engagement in lifestyle and tech content. High potential for B2B outreach.`,
    },
  };

  showDemoResult(mockResult, username, true);
}

function showDemoResult(result, username, isMock = false) {
  const demoSection = document.querySelector(".hook-demo");

  // Create result display
  const resultHTML = `
        <div class="demo-result">
            <div class="demo-result-header">
                <h4>✨ Analysis Complete for @${username}</h4>
                ${isMock ? '<span class="demo-badge">Demo Mode</span>' : ""}
            </div>
            <div class="demo-insights">
                <div class="insight">
                    <span class="insight-label">Followers:</span>
                    <span class="insight-value">${result.profile.followers_count?.toLocaleString() || "N/A"}</span>
                </div>
                <div class="insight">
                    <span class="insight-label">Engagement:</span>
                    <span class="insight-value">${result.profile.engagement_rate || "N/A"}%</span>
                </div>
                <div class="insight">
                    <span class="insight-label">Lead Score:</span>
                    <span class="insight-value">${result.analysis.niche_fit || "N/A"}/100</span>
                </div>
            </div>
            <div class="demo-summary">
                <p>${result.analysis.summary || "Profile analyzed successfully!"}</p>
            </div>
            <div class="demo-cta">
                <a href="/auth.html" class="btn-primary">Get Full Analysis</a>
                <button class="btn-secondary" onclick="resetDemo()">Try Another</button>
            </div>
        </div>
    `;

  // Replace form with result
  const demoContent = demoSection.querySelector(".demo-form").parentElement;
  demoContent.innerHTML = resultHTML;

  // Show success message
  Alert.success({
    message: isMock ? "Demo analysis complete!" : "Analysis complete!",
    suggestions: isMock
      ? ["Sign up for real-time insights", "Try another username"]
      : ["Create account for full features"],
    timeoutMs: 4000,
  });
}

function resetDemo() {
  location.reload();
}

// =============================================================================
// UI EFFECTS
// =============================================================================

function handleNavScroll() {
  const nav = document.querySelector("nav");
  if (window.scrollY > 100) {
    nav.style.background = "rgba(255, 255, 255, 0.98)";
    nav.style.boxShadow = "0 4px 20px rgba(45, 108, 223, 0.1)";
    nav.style.backdropFilter = "blur(10px)";
  } else {
    nav.style.background = "rgba(255, 255, 255, 0.95)";
    nav.style.boxShadow = "none";
    nav.style.backdropFilter = "none";
  }
}

function setupAnimations() {
  // Intersection Observer for feature animations (original)
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    // Observe elements for animation
    document.querySelectorAll(".step, .feature, .testimonial").forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(30px)";
      el.style.transition = "all 0.6s ease";
      observer.observe(el);
    });
  }

  // Performance optimization - lazy load images (original feature)
  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
            imageObserver.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll("img[data-src]").forEach((img) => {
      imageObserver.observe(img);
    });
  }
}

// =============================================================================
// UTILITY FUNCTIONS (Original functionality)
// =============================================================================

function showMessage(text, type = "info") {
  // Legacy support - redirect to Alert system
  if (type === "error") {
    Alert.error(text);
  } else if (type === "success") {
    Alert.success({ message: text });
  } else {
    Alert.info({ message: text });
  }
}

// Screen reader announcements for dynamic content (original accessibility feature)
function announceToScreenReader(message) {
  const announcement = document.createElement("div");
  announcement.setAttribute("aria-live", "polite");
  announcement.setAttribute("aria-atomic", "true");
  announcement.style.position = "absolute";
  announcement.style.left = "-10000px";
  announcement.style.width = "1px";
  announcement.style.height = "1px";
  announcement.style.overflow = "hidden";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

function handleNavScroll() {
  // Enhanced navigation scroll effect (original)
  const nav = document.querySelector("nav");
  if (window.scrollY > 100) {
    nav.style.background = "rgba(255, 255, 255, 0.98)";
    nav.style.boxShadow = "0 4px 20px rgba(45, 108, 223, 0.1)";
    nav.style.backdropFilter = "blur(10px)";
  } else {
    nav.style.background = "rgba(255, 255, 255, 0.95)";
    nav.style.boxShadow = "none";
    nav.style.backdropFilter = "none";
  }
}

function handleCTAClick(event) {
  // Track CTA clicks for analytics (original feature)
  console.log("🎯 CTA clicked:", event.target.textContent);
}

// =============================================================================
// ERROR HANDLING (Original system)
// =============================================================================

// Error boundary for JavaScript errors (original)
window.addEventListener("error", function (event) {
  console.error("JavaScript error:", event.error);

  // Only show critical errors that affect user experience
  if (
    event.error &&
    event.error.message &&
    (event.error.message.includes("demo") ||
      event.error.message.includes("form") ||
      event.error.message.includes("network"))
  ) {
    Alert.error("Something went wrong", {
      suggestions: ["Refresh the page", "Try again in a moment"],
    });
  }
});

window.addEventListener("unhandledrejection", function (event) {
  console.error("Unhandled promise rejection:", event.reason);

  // Show user-friendly message for critical promise rejections
  if (
    event.reason &&
    event.reason.message &&
    (event.reason.message.includes("fetch") ||
      event.reason.message.includes("network") ||
      event.reason.message.includes("demo"))
  ) {
    Alert.warning({
      message: "Connection issue detected",
      suggestions: ["Check your internet connection", "Try refreshing the page"],
    });
  }

  event.preventDefault();
});

// Prevent form submission if JavaScript fails (original feature)
window.addEventListener("beforeunload", function () {
  try {
    const forms = document.querySelectorAll("form");
    forms.forEach((form) => {
      if (form.classList.contains("demo-loading")) {
        form.classList.remove("demo-loading");
        const button = form.querySelector('button[type="submit"]');
        if (button) {
          button.disabled = false;
          button.textContent = "Analyze Profile";
        }
      }
    });
  } catch (error) {
    console.error("Form cleanup failed:", error);
    // Don't show alert on page unload
  }
});
