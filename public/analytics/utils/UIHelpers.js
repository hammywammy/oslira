// ==========================================
// UI HELPERS - Enterprise UI Utility Functions
// Comprehensive UI utilities for analytics dashboard
// ==========================================

/**
 * Enterprise-grade UI utility functions for the Oslira Analytics Dashboard
 * Provides consistent icons, tooltips, formatting, and UI interactions
 */

// Icon library with SVG definitions
const ICON_LIBRARY = {
    // Analytics & Charts
    'activity': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"></polyline></svg>',
    'bar-chart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>',
    'trending-up': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"></polyline><polyline points="17,6 23,6 23,12"></polyline></svg>',
    'trending-down': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,18 13.5,8.5 8.5,13.5 1,6"></polyline><polyline points="17,18 23,18 23,12"></polyline></svg>',
    'pie-chart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>',
    
    // Actions & Controls
    'refresh': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"></polyline><polyline points="1,20 1,14 7,14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>',
    'download': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7,10 12,15 17,10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    'upload': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17,8 12,3 7,8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>',
    'search': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>',
    'filter': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3"></polygon></svg>',
    'settings': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m17.928-4.072l-4.242 4.242M9.172 14.828L4.93 19.07M19.07 4.93l-4.242 4.242M9.172 9.172L4.93 4.93"></path></svg>',
    'more-horizontal': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>',
    'expand': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,3 21,3 21,9"></polyline><polyline points="9,21 3,21 3,15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
    'minimize': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4,14 10,14 10,20"></polyline><polyline points="20,10 14,10 14,4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
    'maximize': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,3 21,3 21,9"></polyline><polyline points="9,21 3,21 3,15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
    'minimize-2': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4,14 10,14 10,20"></polyline><polyline points="20,10 14,10 14,4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
    'maximize-2': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,3 21,3 21,9"></polyline><polyline points="9,21 3,21 3,15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
    
    // Navigation
    'chevron-up': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18,15 12,9 6,15"></polyline></svg>',
    'chevron-down': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 12,15 18,9"></polyline></svg>',
    'chevron-left': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"></polyline></svg>',
    'chevron-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"></polyline></svg>',
    'arrow-up': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5,12 12,5 19,12"></polyline></svg>',
    'arrow-down': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="5,12 12,19 19,12"></polyline></svg>',
    'arrow-left': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12,19 5,12 12,5"></polyline></svg>',
    'arrow-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12,5 19,12 12,19"></polyline></svg>',
    
    // Status & Alerts
    'check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"></polyline></svg>',
    'check-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline></svg>',
    'x': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    'x-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    'alert-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    'alert-triangle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    'info': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    'help-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    'warning': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    
    // Business & Analytics Specific
    'users': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    'users-2': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 19a6 6 0 0 0-12 0"></path><circle cx="8" cy="9" r="4"></circle><path d="M22 19a6 6 0 0 0-6-6 4 4 0 1 0 0-8"></path></svg>',
    'user': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    'target': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
    'dollar-sign': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
    'briefcase': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
    'mail': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
    'phone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
    'link': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
    
    // Technology & AI
    'brain': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"></path><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"></path><path d="M3.477 10.896a4 4 0 0 1 .585-.396"></path><path d="M19.938 10.5a4 4 0 0 1 .585.396"></path><path d="M6 18a4 4 0 0 1-1.967-.516"></path><path d="M19.967 17.484A4 4 0 0 1 18 18"></path></svg>',
    'cpu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>',
    'zap': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"></polygon></svg>',
    'bot': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>',
    
    // UI Elements
    'grid': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
    'list': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
    'table': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path></svg>',
    'calendar': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    'clock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12,6 12,12 16,14"></polyline></svg>',
    'map': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>',
    'layers': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 2,7 12,12 22,7 12,2"></polygon><polyline points="2,17 12,22 22,17"></polyline><polyline points="2,12 12,17 22,12"></polyline></svg>',
    
    // Communication
    'message-square': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    'message-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>',
    'send': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22,2 15,22 11,13 2,9 22,2"></polygon></svg>',
    
    // Misc
    'star': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"></polygon></svg>',
    'heart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    'bookmark': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',
    'tag': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
    'folder': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
    'file': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"></path></svg>',
    'box': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    'lightbulb': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21h6"></path><path d="M12 17v4"></path><path d="M12 3a6 6 0 0 1 6 6c0 2-1.5 3-1.5 5h-9c0-2-1.5-3-1.5-5a6 6 0 0 1 6-6z"></path></svg>',
    'shield': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    'shield-alert': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>',
    'eye': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    'eye-off': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
    'lock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><circle cx="12" cy="16" r="1"></circle><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    'unlock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><circle cx="12" cy="16" r="1"></circle><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>',
    'key': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>',
    'globe': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
    'home': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9,22 9,12 15,12 15,22"></polyline></svg>',
    'external-link': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15,3 21,3 21,9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>',
    'copy': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    'edit': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    'trash': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
    'plus': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    'minus': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    'play': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21 5,3"></polygon></svg>',
    'pause': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
    'stop': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"></rect></svg>',
    'loader': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>',
    'wifi': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
    'wifi-off': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
    'funnel': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"></path></svg>'
};

// Tooltip manager
class TooltipManager {
    constructor() {
        this.tooltips = new Map();
        this.activeTooltip = null;
        this.defaultOptions = {
            placement: 'top',
            delay: 500,
            hideDelay: 100,
            offset: 8,
            arrow: true,
            animation: true,
            maxWidth: 300,
            className: '',
            interactive: false,
            theme: 'default'
        };
        
        this.setupStyles();
        this.bindGlobalEvents();
    }
    
    setupStyles() {
        const styleId = 'ui-helpers-tooltip-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .ui-tooltip {
                position: absolute;
                z-index: 10000;
                background: #1e293b;
                color: #ffffff;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.875rem;
                font-weight: 500;
                line-height: 1.4;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                pointer-events: none;
                opacity: 0;
                transform: scale(0.95);
                transition: opacity 0.2s ease, transform 0.2s ease;
                max-width: 300px;
                word-wrap: break-word;
            }
            
            .ui-tooltip.show {
                opacity: 1;
                transform: scale(1);
            }
            
            .ui-tooltip.interactive {
                pointer-events: auto;
            }
            
            .ui-tooltip-arrow {
                position: absolute;
                width: 8px;
                height: 8px;
                background: #1e293b;
                transform: rotate(45deg);
            }
            
            .ui-tooltip.placement-top {
                margin-bottom: 8px;
            }
            
            .ui-tooltip.placement-top .ui-tooltip-arrow {
                bottom: -4px;
                left: 50%;
                margin-left: -4px;
            }
            
            .ui-tooltip.placement-bottom {
                margin-top: 8px;
            }
            
            .ui-tooltip.placement-bottom .ui-tooltip-arrow {
                top: -4px;
                left: 50%;
                margin-left: -4px;
            }
            
            .ui-tooltip.placement-left {
                margin-right: 8px;
            }
            
            .ui-tooltip.placement-left .ui-tooltip-arrow {
                right: -4px;
                top: 50%;
                margin-top: -4px;
            }
            
            .ui-tooltip.placement-right {
                margin-left: 8px;
            }
            
            .ui-tooltip.placement-right .ui-tooltip-arrow {
                left: -4px;
                top: 50%;
                margin-top: -4px;
            }
            
            /* Theme variants */
            .ui-tooltip.theme-light {
                background: #ffffff;
                color: #1e293b;
                border: 1px solid #e2e8f0;
            }
            
            .ui-tooltip.theme-light .ui-tooltip-arrow {
                background: #ffffff;
                border: 1px solid #e2e8f0;
            }
            
            .ui-tooltip.theme-error {
                background: #dc2626;
                color: #ffffff;
            }
            
            .ui-tooltip.theme-error .ui-tooltip-arrow {
                background: #dc2626;
            }
            
            .ui-tooltip.theme-success {
                background: #16a34a;
                color: #ffffff;
            }
            
            .ui-tooltip.theme-success .ui-tooltip-arrow {
                background: #16a34a;
            }
            
            .ui-tooltip.theme-warning {
                background: #d97706;
                color: #ffffff;
            }
            
            .ui-tooltip.theme-warning .ui-tooltip-arrow {
                background: #d97706;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    bindGlobalEvents() {
        // Global cleanup on scroll or resize
        window.addEventListener('scroll', () => this.hideAll(), { passive: true });
        window.addEventListener('resize', () => this.hideAll(), { passive: true });
        
        // Clean up on page navigation
        window.addEventListener('beforeunload', () => this.cleanup());
    }
    
    add(element, content, options = {}) {
        if (!element || !content) return;
        
        const config = { ...this.defaultOptions, ...options };
        const tooltipId = this.generateId();
        
        const tooltip = {
            id: tooltipId,
            element,
            content,
            config,
            tooltipElement: null,
            showTimer: null,
            hideTimer: null,
            isVisible: false
        };
        
        this.tooltips.set(element, tooltip);
        this.bindElementEvents(element, tooltip);
        
        return tooltipId;
    }
    
    bindElementEvents(element, tooltip) {
        const showHandler = (e) => this.show(tooltip, e);
        const hideHandler = () => this.hide(tooltip);
        
        element.addEventListener('mouseenter', showHandler);
        element.addEventListener('mouseleave', hideHandler);
        element.addEventListener('focus', showHandler);
        element.addEventListener('blur', hideHandler);
        
        // Store handlers for cleanup
        tooltip.handlers = { showHandler, hideHandler };
    }
    
    show(tooltip, event) {
        if (tooltip.isVisible) return;
        
        // Clear any existing timers
        this.clearTimers(tooltip);
        
        // Hide other tooltips
        this.hideAll();
        
        tooltip.showTimer = setTimeout(() => {
            this.createTooltipElement(tooltip);
            this.positionTooltip(tooltip, event);
            this.showTooltipElement(tooltip);
            this.activeTooltip = tooltip;
        }, tooltip.config.delay);
    }
    
    hide(tooltip) {
        if (!tooltip.isVisible) return;
        
        this.clearTimers(tooltip);
        
        tooltip.hideTimer = setTimeout(() => {
            this.hideTooltipElement(tooltip);
            if (this.activeTooltip === tooltip) {
                this.activeTooltip = null;
            }
        }, tooltip.config.hideDelay);
    }
    
    createTooltipElement(tooltip) {
        if (tooltip.tooltipElement) return;
        
        const el = document.createElement('div');
        el.className = `ui-tooltip placement-${tooltip.config.placement} theme-${tooltip.config.theme}`;
        if (tooltip.config.className) {
            el.className += ` ${tooltip.config.className}`;
        }
        
        el.style.maxWidth = `${tooltip.config.maxWidth}px`;
        el.innerHTML = tooltip.content;
        
        if (tooltip.config.arrow) {
            const arrow = document.createElement('div');
            arrow.className = 'ui-tooltip-arrow';
            el.appendChild(arrow);
        }
        
        if (tooltip.config.interactive) {
            el.classList.add('interactive');
        }
        
        document.body.appendChild(el);
        tooltip.tooltipElement = el;
    }
    
    positionTooltip(tooltip, event) {
        if (!tooltip.tooltipElement) return;
        
        const element = tooltip.element;
        const tooltipEl = tooltip.tooltipElement;
        const placement = tooltip.config.placement;
        const offset = tooltip.config.offset;
        
        const elementRect = element.getBoundingClientRect();
        const tooltipRect = tooltipEl.getBoundingClientRect();
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        let top, left;
        
        switch (placement) {
            case 'top':
                top = elementRect.top - tooltipRect.height - offset;
                left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = elementRect.bottom + offset;
                left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
                left = elementRect.left - tooltipRect.width - offset;
                break;
            case 'right':
                top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
                left = elementRect.right + offset;
                break;
        }
        
        // Viewport boundary adjustments
        if (left < 0) left = 8;
        if (left + tooltipRect.width > viewport.width) left = viewport.width - tooltipRect.width - 8;
        if (top < 0) top = 8;
        if (top + tooltipRect.height > viewport.height) top = viewport.height - tooltipRect.height - 8;
        
        tooltipEl.style.top = `${top + window.pageYOffset}px`;
        tooltipEl.style.left = `${left + window.pageXOffset}px`;
    }
    
    showTooltipElement(tooltip) {
        if (!tooltip.tooltipElement) return;
        
        tooltip.tooltipElement.classList.add('show');
        tooltip.isVisible = true;
    }
    
    hideTooltipElement(tooltip) {
        if (!tooltip.tooltipElement) return;
        
        tooltip.tooltipElement.classList.remove('show');
        tooltip.isVisible = false;
        
        // Remove element after animation
        setTimeout(() => {
            if (tooltip.tooltipElement && !tooltip.isVisible) {
                tooltip.tooltipElement.remove();
                tooltip.tooltipElement = null;
            }
        }, 200);
    }
    
    hideAll() {
        this.tooltips.forEach(tooltip => {
            if (tooltip.isVisible) {
                this.hideTooltipElement(tooltip);
            }
            this.clearTimers(tooltip);
        });
        this.activeTooltip = null;
    }
    
    remove(element) {
        const tooltip = this.tooltips.get(element);
        if (!tooltip) return;
        
        this.clearTimers(tooltip);
        
        if (tooltip.tooltipElement) {
            tooltip.tooltipElement.remove();
        }
        
        // Remove event listeners
        if (tooltip.handlers) {
            element.removeEventListener('mouseenter', tooltip.handlers.showHandler);
            element.removeEventListener('mouseleave', tooltip.handlers.hideHandler);
            element.removeEventListener('focus', tooltip.handlers.showHandler);
            element.removeEventListener('blur', tooltip.handlers.hideHandler);
        }
        
        this.tooltips.delete(element);
    }
    
    clearTimers(tooltip) {
        if (tooltip.showTimer) {
            clearTimeout(tooltip.showTimer);
            tooltip.showTimer = null;
        }
        if (tooltip.hideTimer) {
            clearTimeout(tooltip.hideTimer);
            tooltip.hideTimer = null;
        }
    }
    
    generateId() {
        return `tooltip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    cleanup() {
        this.hideAll();
        this.tooltips.clear();
    }
}

// Global tooltip manager instance
const tooltipManager = new TooltipManager();

/**
 * Create an SVG icon element
 * @param {string} iconName - Name of the icon from ICON_LIBRARY
 * @param {Object} options - Additional options for the icon
 * @returns {string} - SVG icon HTML string
 */
export function createIcon(iconName, options = {}) {
    const icon = ICON_LIBRARY[iconName];
    if (!icon) {
        console.warn(`UIHelpers: Icon "${iconName}" not found. Available icons:`, Object.keys(ICON_LIBRARY));
        return ICON_LIBRARY['help-circle']; // Fallback icon
    }
    
    // Apply options to the SVG
    let svg = icon;
    
    if (options.size) {
        svg = svg.replace('viewBox="0 0 24 24"', `viewBox="0 0 24 24" width="${options.size}" height="${options.size}"`);
    }
    
    if (options.className) {
        svg = svg.replace('<svg', `<svg class="${options.className}"`);
    }
    
    if (options.style) {
        const styleStr = Object.entries(options.style)
            .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
            .join('; ');
        svg = svg.replace('<svg', `<svg style="${styleStr}"`);
    }
    
    return svg;
}

/**
 * Add a tooltip to an element
 * @param {HTMLElement} element - Target element
 * @param {string} content - Tooltip content (HTML supported)
 * @param {Object} options - Tooltip options
 * @returns {string} - Tooltip ID for reference
 */
export function addTooltip(element, content, options = {}) {
    if (!element) {
        console.warn('UIHelpers: addTooltip requires a valid element');
        return null;
    }
    
    return tooltipManager.add(element, content, options);
}

/**
 * Remove tooltip from an element
 * @param {HTMLElement} element - Target element
 */
export function removeTooltip(element) {
    tooltipManager.remove(element);
}

/**
 * Format numbers with proper separators and units
 * @param {number} value - Number to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted number string
 */
export function formatNumber(value, options = {}) {
    if (value === null || value === undefined || isNaN(value)) {
        return options.fallback || '—';
    }
    
    const {
        decimals = 'auto',
        unit = '',
        prefix = '',
        suffix = '',
        compact = false,
        currency = false,
        percentage = false,
        bytes = false,
        locale = 'en-US'
    } = options;
    
    let num = Number(value);
    
    // Handle percentage
    if (percentage) {
        num = num * 100;
        return `${formatNumber(num, { ...options, percentage: false })}%`;
    }
    
    // Handle currency
    if (currency) {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: typeof currency === 'string' ? currency : 'USD',
            minimumFractionDigits: decimals === 'auto' ? 2 : decimals,
            maximumFractionDigits: decimals === 'auto' ? 2 : decimals
        }).format(num);
    }
    
    // Handle bytes
    if (bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        let unitIndex = 0;
        
        while (num >= 1024 && unitIndex < units.length - 1) {
            num /= 1024;
            unitIndex++;
        }
        
        const formatted = formatNumber(num, { 
            ...options, 
            bytes: false, 
            decimals: unitIndex === 0 ? 0 : 2 
        });
        return `${formatted} ${units[unitIndex]}`;
    }
    
    // Handle compact notation
    if (compact) {
        return new Intl.NumberFormat(locale, {
            notation: 'compact',
            compactDisplay: 'short'
        }).format(num);
    }
    
    // Determine decimal places
    let decimalPlaces;
    if (decimals === 'auto') {
        decimalPlaces = num % 1 === 0 ? 0 : Math.min(2, (num.toString().split('.')[1] || '').length);
    } else {
        decimalPlaces = decimals;
    }
    
    // Format the number
    const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
    }).format(num);
    
    return `${prefix}${formatted}${unit}${suffix}`;
}

/**
 * Format dates in a user-friendly way
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export function formatDate(date, options = {}) {
    if (!date) return options.fallback || '—';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
        return options.fallback || 'Invalid Date';
    }
    
    const {
        format = 'short',
        relative = false,
        includeTime = false,
        timezone = undefined,
        locale = 'en-US'
    } = options;
    
    // Relative formatting
    if (relative) {
        const now = new Date();
        const diffMs = now - dateObj;
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
        return `${Math.floor(diffDays / 365)}y ago`;
    }
    
    // Standard formatting
    const formatOptions = { timeZone: timezone };
    
    switch (format) {
        case 'short':
            formatOptions.year = 'numeric';
            formatOptions.month = 'short';
            formatOptions.day = 'numeric';
            break;
        case 'long':
            formatOptions.year = 'numeric';
            formatOptions.month = 'long';
            formatOptions.day = 'numeric';
            formatOptions.weekday = 'long';
            break;
        case 'compact':
            formatOptions.year = '2-digit';
            formatOptions.month = '2-digit';
            formatOptions.day = '2-digit';
            break;
        case 'iso':
            return dateObj.toISOString().split('T')[0];
        default:
            if (typeof format === 'object') {
                Object.assign(formatOptions, format);
            }
    }
    
    if (includeTime) {
        formatOptions.hour = '2-digit';
        formatOptions.minute = '2-digit';
    }
    
    return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
}

/**
 * Format time duration in a human-readable way
 * @param {number} seconds - Duration in seconds
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted duration string
 */
export function formatDuration(seconds, options = {}) {
    if (seconds === null || seconds === undefined || isNaN(seconds)) {
        return options.fallback || '—';
    }
    
    const {
        format = 'auto',
        showSeconds = true,
        compact = false,
        precision = 2
    } = options;
    
    const duration = Math.abs(seconds);
    const units = [
        { name: 'year', short: 'y', seconds: 31536000 },
        { name: 'month', short: 'mo', seconds: 2592000 },
        { name: 'week', short: 'w', seconds: 604800 },
        { name: 'day', short: 'd', seconds: 86400 },
        { name: 'hour', short: 'h', seconds: 3600 },
        { name: 'minute', short: 'm', seconds: 60 },
        { name: 'second', short: 's', seconds: 1 }
    ];
    
    if (format === 'clock' && duration < 86400) {
        // Format as HH:MM:SS or MM:SS
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const secs = Math.floor(duration % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    const parts = [];
    let remaining = duration;
    
    for (let i = 0; i < units.length && parts.length < precision; i++) {
        const unit = units[i];
        if (!showSeconds && unit.name === 'second' && parts.length > 0) break;
        
        const value = Math.floor(remaining / unit.seconds);
        if (value > 0) {
            const unitName = compact ? unit.short : (value === 1 ? unit.name : unit.name + 's');
            parts.push(`${value}${compact ? '' : ' '}${unitName}`);
            remaining -= value * unit.seconds;
        }
    }
    
    if (parts.length === 0) {
        return showSeconds ? (compact ? '0s' : '0 seconds') : (compact ? '0m' : '0 minutes');
    }
    
    return parts.join(compact ? ' ' : ', ');
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} html - HTML content to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized HTML string
 */
export function sanitizeHTML(html, options = {}) {
    if (!html || typeof html !== 'string') return '';
    
    const {
        allowedTags = ['b', 'i', 'em', 'strong', 'span', 'br'],
        allowedAttributes = [],
        stripTags = false
    } = options;
    
    if (stripTags) {
        return html.replace(/<[^>]*>/g, '');
    }
    
    // Basic HTML entity encoding
    let sanitized = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    
    // Allow specific tags
    allowedTags.forEach(tag => {
        const regex = new RegExp(`&lt;\\/?${tag}(?:\\s[^&]*)?&gt;`, 'gi');
        sanitized = sanitized.replace(regex, (match) => {
            return match.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        });
    });
    
    return sanitized;
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {Object} options - Debounce options
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait, options = {}) {
    let timeout;
    let lastArgs;
    let lastThis;
    let result;
    let lastCallTime;
    let lastInvokeTime = 0;
    
    const { leading = false, trailing = true, maxWait } = options;
    
    function invokeFunc(time) {
        const args = lastArgs;
        const thisArg = lastThis;
        
        lastArgs = lastThis = undefined;
        lastInvokeTime = time;
        result = func.apply(thisArg, args);
        return result;
    }
    
    function leadingEdge(time) {
        lastInvokeTime = time;
        timeout = setTimeout(timerExpired, wait);
        return leading ? invokeFunc(time) : result;
    }
    
    function remainingWait(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        const timeWaiting = wait - timeSinceLastCall;
        
        return maxWait !== undefined
            ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
            : timeWaiting;
    }
    
    function shouldInvoke(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        
        return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
                (timeSinceLastCall < 0) || (maxWait !== undefined && timeSinceLastInvoke >= maxWait));
    }
    
    function timerExpired() {
        const time = Date.now();
        if (shouldInvoke(time)) {
            return trailingEdge(time);
        }
        timeout = setTimeout(timerExpired, remainingWait(time));
    }
    
    function trailingEdge(time) {
        timeout = undefined;
        
        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        lastArgs = lastThis = undefined;
        return result;
    }
    
    function cancel() {
        if (timeout !== undefined) {
            clearTimeout(timeout);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timeout = undefined;
    }
    
    function flush() {
        return timeout === undefined ? result : trailingEdge(Date.now());
    }
    
    function debounced(...args) {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);
        
        lastArgs = args;
        lastThis = this;
        lastCallTime = time;
        
        if (isInvoking) {
            if (timeout === undefined) {
                return leadingEdge(lastCallTime);
            }
            if (maxWait !== undefined) {
                timeout = setTimeout(timerExpired, wait);
                return invokeFunc(lastCallTime);
            }
        }
        if (timeout === undefined) {
            timeout = setTimeout(timerExpired, wait);
        }
        return result;
    }
    
    debounced.cancel = cancel;
    debounced.flush = flush;
    
    return debounced;
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in milliseconds
 * @param {Object} options - Throttle options
 * @returns {Function} - Throttled function
 */
export function throttle(func, wait, options = {}) {
    let timeout;
    let previous = 0;
    
    const { leading = true, trailing = true } = options;
    
    const throttled = function(...args) {
        const now = Date.now();
        
        if (!previous && !leading) {
            previous = now;
        }
        
        const remaining = wait - (now - previous);
        
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            func.apply(this, args);
        } else if (!timeout && trailing) {
            timeout = setTimeout(() => {
                previous = leading ? Date.now() : 0;
                timeout = null;
                func.apply(this, args);
            }, remaining);
        }
    };
    
    throttled.cancel = function() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        previous = 0;
    };
    
    return throttled;
}

/**
 * Create a loading spinner element
 * @param {Object} options - Spinner options
 * @returns {HTMLElement} - Spinner element
 */
export function createSpinner(options = {}) {
    const {
        size = 24,
        color = 'currentColor',
        strokeWidth = 2,
        className = ''
    } = options;
    
    const spinner = document.createElement('div');
    spinner.className = `ui-spinner ${className}`;
    
    spinner.innerHTML = `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
    `;
    
    // Add CSS if not already present
    if (!document.getElementById('ui-spinner-styles')) {
        const style = document.createElement('style');
        style.id = 'ui-spinner-styles';
        style.textContent = `
            .ui-spinner {
                display: inline-block;
                animation: ui-spin 1s linear infinite;
            }
            
            @keyframes ui-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    return spinner;
}

/**
 * Show a notification/toast message
 * @param {string} message - Message content
 * @param {Object} options - Notification options
 * @returns {HTMLElement} - Notification element
 */
export function showNotification(message, options = {}) {
    const {
        type = 'info',
        duration = 5000,
        position = 'top-right',
        dismissible = true,
        actions = []
    } = options;
    
    // Create notification container if it doesn't exist
    let container = document.querySelector('.ui-notifications');
    if (!container) {
        container = document.createElement('div');
        container.className = `ui-notifications position-${position}`;
        document.body.appendChild(container);
        
        // Add styles
        if (!document.getElementById('ui-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'ui-notification-styles';
            style.textContent = `
                .ui-notifications {
                    position: fixed;
                    z-index: 10001;
                    pointer-events: none;
                }
                
                .ui-notifications.position-top-right {
                    top: 20px;
                    right: 20px;
                }
                
                .ui-notifications.position-top-left {
                    top: 20px;
                    left: 20px;
                }
                
                .ui-notifications.position-bottom-right {
                    bottom: 20px;
                    right: 20px;
                }
                
                .ui-notifications.position-bottom-left {
                    bottom: 20px;
                    left: 20px;
                }
                
                .ui-notification {
                    pointer-events: auto;
                    margin-bottom: 12px;
                    padding: 16px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    max-width: 400px;
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.3s ease;
                    font-size: 0.875rem;
                    line-height: 1.5;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                }
                
                .ui-notification.show {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                .ui-notification.type-info {
                    background: #eff6ff;
                    border-left: 4px solid #3b82f6;
                    color: #1e40af;
                }
                
                .ui-notification.type-success {
                    background: #f0fdf4;
                    border-left: 4px solid #22c55e;
                    color: #15803d;
                }
                
                .ui-notification.type-warning {
                    background: #fffbeb;
                    border-left: 4px solid #f59e0b;
                    color: #d97706;
                }
                
                .ui-notification.type-error {
                    background: #fef2f2;
                    border-left: 4px solid #ef4444;
                    color: #dc2626;
                }
                
                .ui-notification-icon {
                    flex-shrink: 0;
                    margin-top: 2px;
                }
                
                .ui-notification-content {
                    flex: 1;
                }
                
                .ui-notification-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                }
                
                .ui-notification-action {
                    padding: 4px 8px;
                    border: 1px solid currentColor;
                    border-radius: 4px;
                    background: transparent;
                    color: currentColor;
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                }
                
                .ui-notification-action:hover {
                    background: currentColor;
                    color: white;
                }
                
                .ui-notification-dismiss {
                    flex-shrink: 0;
                    background: none;
                    border: none;
                    color: currentColor;
                    cursor: pointer;
                    padding: 0;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                }
                
                .ui-notification-dismiss:hover {
                    opacity: 1;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `ui-notification type-${type}`;
    
    const iconMap = {
        info: 'info',
        success: 'check-circle',
        warning: 'alert-triangle',
        error: 'x-circle'
    };
    
    const actionsHTML = actions.length > 0 ? `
        <div class="ui-notification-actions">
            ${actions.map((action, index) => 
                `<button class="ui-notification-action" data-action-index="${index}">${action.label}</button>`
            ).join('')}
        </div>
    ` : '';
    
    notification.innerHTML = `
        <div class="ui-notification-icon">
            ${createIcon(iconMap[type])}
        </div>
        <div class="ui-notification-content">
            ${message}
            ${actionsHTML}
        </div>
        ${dismissible ? `
            <button class="ui-notification-dismiss">
                ${createIcon('x')}
            </button>
        ` : ''}
    `;
    
    // Add event listeners
    if (dismissible) {
        const dismissBtn = notification.querySelector('.ui-notification-dismiss');
        dismissBtn.addEventListener('click', () => removeNotification(notification));
    }
    
    // Add action event listeners
    actions.forEach((action, index) => {
        const actionBtn = notification.querySelector(`[data-action-index="${index}"]`);
        if (actionBtn) {
            actionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (action.handler) {
                    action.handler();
                }
                if (action.dismiss !== false) {
                    removeNotification(notification);
                }
            });
        }
    });
    
    // Add to container
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => removeNotification(notification), duration);
    }
    
    return notification;
}

/**
 * Remove a notification element
 * @param {HTMLElement} notification - Notification element to remove
 */
export function removeNotification(notification) {
    if (!notification || !notification.parentNode) return;
    
    notification.classList.remove('show');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

/**
 * Create a progress bar element
 * @param {Object} options - Progress bar options
 * @returns {HTMLElement} - Progress bar element
 */
export function createProgressBar(options = {}) {
    const {
        value = 0,
        max = 100,
        showLabel = true,
        showPercentage = true,
        size = 'medium',
        color = 'blue',
        striped = false,
        animated = false,
        className = ''
    } = options;
    
    const container = document.createElement('div');
    container.className = `ui-progress-bar size-${size} color-${color} ${className}`;
    
    if (striped) container.classList.add('striped');
    if (animated) container.classList.add('animated');
    
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    container.innerHTML = `
        ${showLabel ? `<div class="progress-label">
            <span class="progress-text">Progress</span>
            ${showPercentage ? `<span class="progress-percentage">${Math.round(percentage)}%</span>` : ''}
        </div>` : ''}
        <div class="progress-track">
            <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
    `;
    
    // Add styles if not already present
    if (!document.getElementById('ui-progress-styles')) {
        const style = document.createElement('style');
        style.id = 'ui-progress-styles';
        style.textContent = `
            .ui-progress-bar {
                width: 100%;
            }
            
            .progress-label {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
                font-size: 0.875rem;
                font-weight: 500;
                color: #374151;
            }
            
            .progress-track {
                width: 100%;
                background: #f3f4f6;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: #3b82f6;
                transition: width 0.3s ease;
                border-radius: 4px;
            }
            
            .ui-progress-bar.size-small .progress-track {
                height: 4px;
            }
            
            .ui-progress-bar.size-medium .progress-track {
                height: 8px;
            }
            
            .ui-progress-bar.size-large .progress-track {
                height: 12px;
            }
            
            .ui-progress-bar.color-green .progress-fill {
                background: #10b981;
            }
            
            .ui-progress-bar.color-red .progress-fill {
                background: #ef4444;
            }
            
            .ui-progress-bar.color-yellow .progress-fill {
                background: #f59e0b;
            }
            
            .ui-progress-bar.striped .progress-fill {
                background-image: linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent);
                background-size: 16px 16px;
            }
            
            .ui-progress-bar.animated .progress-fill {
                animation: progress-stripes 1s linear infinite;
            }
            
            @keyframes progress-stripes {
                0% { background-position: 0 0; }
                100% { background-position: 16px 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add update method
    container.updateProgress = function(newValue) {
        const newPercentage = Math.min(Math.max((newValue / max) * 100, 0), 100);
        const fill = this.querySelector('.progress-fill');
        const percentageEl = this.querySelector('.progress-percentage');
        
        if (fill) fill.style.width = `${newPercentage}%`;
        if (percentageEl) percentageEl.textContent = `${Math.round(newPercentage)}%`;
    };
    
    return container;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}

/**
 * Generate a random ID
 * @param {string} prefix - ID prefix
 * @returns {string} - Generated ID
 */
export function generateId(prefix = 'ui') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 * @param {Object} options - Check options
 * @returns {boolean} - Is in viewport
 */
export function isInViewport(element, options = {}) {
    if (!element) return false;
    
    const { threshold = 0, rootMargin = '0px' } = options;
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    const thresholdHeight = windowHeight * threshold;
    const thresholdWidth = windowWidth * threshold;
    
    return (
        rect.top >= -thresholdHeight &&
        rect.left >= -thresholdWidth &&
        rect.bottom <= windowHeight + thresholdHeight &&
        rect.right <= windowWidth + thresholdWidth
    );
}

/**
 * Smoothly scroll to an element
 * @param {HTMLElement|string} target - Target element or selector
 * @param {Object} options - Scroll options
 */
export function scrollTo(target, options = {}) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) return;
    
    const {
        behavior = 'smooth',
        block = 'start',
        inline = 'nearest',
        offset = 0
    } = options;
    
    if (offset === 0) {
        element.scrollIntoView({ behavior, block, inline });
    } else {
        const elementTop = element.offsetTop;
        const targetTop = elementTop - offset;
        
        window.scrollTo({
            top: targetTop,
            behavior
        });
    }
}

/**
 * Create a modal dialog
 * @param {Object} options - Modal options
 * @returns {Object} - Modal controller object
 */
export function createModal(options = {}) {
    const {
        title = '',
        content = '',
        size = 'medium',
        closable = true,
        backdrop = true,
        keyboard = true,
        className = ''
    } = options;
    
    const modalId = generateId('modal');
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = `ui-modal ${className}`;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', `${modalId}-title`);
    modal.setAttribute('aria-modal', 'true');
    
    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-container size-${size}">
            <div class="modal-content">
                ${title ? `
                    <div class="modal-header">
                        <h3 class="modal-title" id="${modalId}-title">${title}</h3>
                        ${closable ? `<button class="modal-close" aria-label="Close">${createIcon('x')}</button>` : ''}
                    </div>
                ` : ''}
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        </div>
    `;
    
    // Add styles if not present
    if (!document.getElementById('ui-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'ui-modal-styles';
        style.textContent = `
            .ui-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10002;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            
            .ui-modal.show {
                opacity: 1;
                visibility: visible;
            }
            
            .modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
            }
            
            .modal-container {
                position: relative;
                background: white;
                border-radius: 8px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                max-height: 90vh;
                overflow-y: auto;
                transform: scale(0.95);
                transition: transform 0.3s ease;
            }
            
            .ui-modal.show .modal-container {
                transform: scale(1);
            }
            
            .modal-container.size-small { width: 400px; max-width: 90vw; }
            .modal-container.size-medium { width: 600px; max-width: 90vw; }
            .modal-container.size-large { width: 800px; max-width: 90vw; }
            .modal-container.size-full { width: 95vw; height: 95vh; }
            
            .modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 24px;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .modal-title {
                margin: 0;
                font-size: 1.125rem;
                font-weight: 600;
                color: #111827;
            }
            
            .modal-close {
                background: none;
                border: none;
                color: #6b7280;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            
            .modal-close:hover {
                background: #f3f4f6;
                color: #374151;
            }
            
            .modal-body {
                padding: 24px;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Event handlers
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    };
    
    // Backdrop click
    if (backdrop) {
        modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    }
    
    // Close button
    if (closable) {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
    }
    
    // Keyboard events
    if (keyboard) {
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        document.addEventListener('keydown', handleKeydown);
        modal._keydownHandler = handleKeydown;
    }
    
    // Add to DOM
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Return controller
    return {
        element: modal,
        close: closeModal,
        setTitle: (newTitle) => {
            const titleEl = modal.querySelector('.modal-title');
            if (titleEl) titleEl.textContent = newTitle;
        },
        setContent: (newContent) => {
            const bodyEl = modal.querySelector('.modal-body');
            if (bodyEl) bodyEl.innerHTML = newContent;
        }
    };
}

/**
 * Validate form fields with common validation rules
 * @param {Object} data - Form data to validate
 * @param {Object} rules - Validation rules
 * @returns {Object} - Validation result
 */
export function validateForm(data, rules) {
    const errors = {};
    const warnings = {};
    
    for (const [field, fieldRules] of Object.entries(rules)) {
        const value = data[field];
        const fieldErrors = [];
        const fieldWarnings = [];
        
        // Required validation
        if (fieldRules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
            fieldErrors.push(`${field} is required`);
            continue; // Skip other validations if required field is empty
        }
        
        // Skip other validations if field is empty and not required
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            continue;
        }
        
        // Type validation
        if (fieldRules.type) {
            switch (fieldRules.type) {
                case 'email':
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        fieldErrors.push(`${field} must be a valid email address`);
                    }
                    break;
                case 'url':
                    try {
                        new URL(value);
                    } catch {
                        fieldErrors.push(`${field} must be a valid URL`);
                    }
                    break;
                case 'number':
                    if (isNaN(Number(value))) {
                        fieldErrors.push(`${field} must be a number`);
                    }
                    break;
                case 'integer':
                    if (!Number.isInteger(Number(value))) {
                        fieldErrors.push(`${field} must be an integer`);
                    }
                    break;
            }
        }
        
        // Length validation
        if (fieldRules.minLength && value.length < fieldRules.minLength) {
            fieldErrors.push(`${field} must be at least ${fieldRules.minLength} characters`);
        }
        
        if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
            fieldErrors.push(`${field} must be no more than ${fieldRules.maxLength} characters`);
        }
        
        // Value range validation
        if (fieldRules.min !== undefined && Number(value) < fieldRules.min) {
            fieldErrors.push(`${field} must be at least ${fieldRules.min}`);
        }
        
        if (fieldRules.max !== undefined && Number(value) > fieldRules.max) {
            fieldErrors.push(`${field} must be no more than ${fieldRules.max}`);
        }
        
        // Pattern validation
        if (fieldRules.pattern) {
            const regex = new RegExp(fieldRules.pattern);
            if (!regex.test(value)) {
                fieldErrors.push(fieldRules.patternMessage || `${field} format is invalid`);
            }
        }
        
        // Custom validation
        if (fieldRules.custom && typeof fieldRules.custom === 'function') {
            const customResult = fieldRules.custom(value, data);
            if (customResult !== true) {
                fieldErrors.push(customResult || `${field} is invalid`);
            }
        }
        
        // Warning validations
        if (fieldRules.warnings) {
            for (const warning of fieldRules.warnings) {
                if (warning.condition && warning.condition(value, data)) {
                    fieldWarnings.push(warning.message);
                }
            }
        }
        
        if (fieldErrors.length > 0) {
            errors[field] = fieldErrors;
        }
        
        if (fieldWarnings.length > 0) {
            warnings[field] = fieldWarnings;
        }
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        warnings,
        hasWarnings: Object.keys(warnings).length > 0
    };
}

/**
 * Create a color palette generator
 * @param {string} baseColor - Base color in hex format
 * @param {Object} options - Generation options
 * @returns {Object} - Color palette
 */
export function generateColorPalette(baseColor, options = {}) {
    const {
        steps = 9,
        lightness = [95, 85, 75, 65, 50, 40, 30, 20, 10],
        saturation = null
    } = options;
    
    // Convert hex to HSL
    function hexToHsl(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    }
    
    // Convert HSL to hex
    function hslToHex(h, s, l) {
        h = h / 360;
        s = s / 100;
        l = l / 100;
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        const toHex = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    
    const [baseH, baseS, baseL] = hexToHsl(baseColor);
    const palette = {};
    
    for (let i = 0; i < steps; i++) {
        const step = (i + 1) * 100;
        const l = lightness[i] || (100 - (i * 10));
        const s = saturation || baseS;
        
        palette[step] = hslToHex(baseH, s, l);
    }
    
    return palette;
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} unsafe - Unsafe HTML string
 * @returns {string} - Escaped HTML string
 */
export function escapeHTML(unsafe) {
    if (typeof unsafe !== 'string') return String(unsafe);
    
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} - Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof RegExp) return new RegExp(obj);
    
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    
    return obj;
}

/**
 * Check if two objects are deeply equal
 * @param {*} a - First object
 * @param {*} b - Second object
 * @returns {boolean} - Are objects equal
 */
export function deepEqual(a, b) {
    if (a === b) return true;
    
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }
    
    if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
        return a === b;
    }
    
    if (a === null || a === undefined || b === null || b === undefined) {
        return false;
    }
    
    if (a.prototype !== b.prototype) return false;
    
    let keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    
    return keys.every(k => deepEqual(a[k], b[k]));
}

/**
 * Convert CSS value to pixels
 * @param {string} value - CSS value (e.g., '1rem', '16px', '1em')
 * @param {HTMLElement} element - Reference element for relative units
 * @returns {number} - Value in pixels
 */
export function toPixels(value, element = document.documentElement) {
    if (typeof value === 'number') return value;
    if (!value || typeof value !== 'string') return 0;
    
    const match = value.match(/^(-?\d*\.?\d+)([a-z%]*)$/);
    if (!match) return 0;
    
    const num = parseFloat(match[1]);
    const unit = match[2];
    
    switch (unit) {
        case 'px':
        case '':
            return num;
        case 'rem':
            return num * parseFloat(getComputedStyle(document.documentElement).fontSize);
        case 'em':
            return num * parseFloat(getComputedStyle(element).fontSize);
        case 'vh':
            return num * window.innerHeight / 100;
        case 'vw':
            return num * window.innerWidth / 100;
        case '%':
            return num * element.clientWidth / 100;
        default:
            return 0;
    }
}

/**
 * Get element's computed style property
 * @param {HTMLElement} element - Target element
 * @param {string} property - CSS property name
 * @returns {string} - Computed style value
 */
export function getStyleProperty(element, property) {
    if (!element) return '';
    
    return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Create a keyboard shortcut handler
 * @param {Object} shortcuts - Shortcut configuration
 * @returns {Function} - Cleanup function
 */
export function createKeyboardShortcuts(shortcuts) {
    const handleKeydown = (event) => {
        const key = event.key.toLowerCase();
        const modifiers = {
            ctrl: event.ctrlKey,
            meta: event.metaKey,
            alt: event.altKey,
            shift: event.shiftKey
        };
        
        for (const [shortcut, handler] of Object.entries(shortcuts)) {
            const parts = shortcut.toLowerCase().split('+');
            const shortcutKey = parts.pop();
            const shortcutModifiers = {
                ctrl: parts.includes('ctrl'),
                meta: parts.includes('meta') || parts.includes('cmd'),
                alt: parts.includes('alt'),
                shift: parts.includes('shift')
            };
            
            if (key === shortcutKey &&
                modifiers.ctrl === shortcutModifiers.ctrl &&
                modifiers.meta === shortcutModifiers.meta &&
                modifiers.alt === shortcutModifiers.alt &&
                modifiers.shift === shortcutModifiers.shift) {
                
                event.preventDefault();
                handler(event);
                break;
            }
        }
    };
    
    document.addEventListener('keydown', handleKeydown);
    
    // Return cleanup function
    return () => {
        document.removeEventListener('keydown', handleKeydown);
    };
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted file size
 */
export function formatFileSize(bytes, options = {}) {
    return formatNumber(bytes, { ...options, bytes: true });
}

/**
 * Get user's preferred color scheme
 * @returns {string} - 'light' or 'dark'
 */
export function getColorScheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

/**
 * Watch for color scheme changes
 * @param {Function} callback - Callback function
 * @returns {Function} - Cleanup function
 */
export function watchColorScheme(callback) {
    if (!window.matchMedia) return () => {};
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handler = (e) => {
        callback(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handler);
    
    // Initial call
    callback(mediaQuery.matches ? 'dark' : 'light');
    
    // Return cleanup function
    return () => {
        mediaQuery.removeEventListener('change', handler);
    };
}

/**
 * Get available icons list
 * @returns {Array} - Array of available icon names
 */
export function getAvailableIcons() {
    return Object.keys(ICON_LIBRARY);
}

/**
 * Check if an icon exists
 * @param {string} iconName - Icon name to check
 * @returns {boolean} - Whether icon exists
 */
export function hasIcon(iconName) {
    return iconName in ICON_LIBRARY;
}

/**
 * Export all utility functions and classes
 */
export {
    tooltipManager,
    TooltipManager,
    ICON_LIBRARY
};

// Make functions available globally for non-module usage
if (typeof window !== 'undefined') {
    window.UIHelpers = {
        createIcon,
        addTooltip,
        removeTooltip,
        formatNumber,
        formatDate,
        formatDuration,
        formatFileSize,
        sanitizeHTML,
        debounce,
        throttle,
        createSpinner,
        showNotification,
        removeNotification,
        createProgressBar,
        copyToClipboard,
        generateId,
        isInViewport,
        scrollTo,
        createModal,
        validateForm,
        generateColorPalette,
        escapeHTML,
        deepClone,
        deepEqual,
        toPixels,
        getStyleProperty,
        createKeyboardShortcuts,
        getColorScheme,
        watchColorScheme,
        getAvailableIcons,
        hasIcon,
        tooltipManager
    };
}

console.log('🎨 UIHelpers module loaded successfully');
