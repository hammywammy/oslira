// ==========================================
// UI HELPERS - Enterprise UI Utility Functions
// Comprehensive UI utilities for analytics dashboard
// ==========================================

/**
 * Enterprise-grade UI utility functions for the Oslira Analytics Dashboard
 * Provides consistent icons, tooltips, formatting, and UI interactions
 * Version 2.0.0 - Fixed memory leaks and added missing functions
 */

// Icon library with SVG definitions (expanded and organized)
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
    'settings': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    'more-horizontal': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>',
    'more-vertical': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>',
    
    // Navigation
    'chevron-left': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"></polyline></svg>',
    'chevron-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"></polyline></svg>',
    'chevron-up': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18,15 12,9 6,15"></polyline></svg>',
    'chevron-down': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 12,15 18,9"></polyline></svg>',
    'arrow-left': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12,19 5,12 12,5"></polyline></svg>',
    'arrow-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12,5 19,12 12,19"></polyline></svg>',
    'external-link': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15,3 21,3 21,9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>',
    
    // Status & Feedback
    'check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"></polyline></svg>',
    'check-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline></svg>',
    'x': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    'x-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    'alert-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    'alert-triangle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    'info': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    'help-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    
    // Content & Media
    'image': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21,15 16,10 5,21"></polyline></svg>',
    'file': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"></path><polyline points="14,2 14,8 20,8"></polyline></svg>',
    'file-text': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>',
    'copy': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    'link': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
    
    // Business & Finance
    'dollar-sign': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
    'credit-card': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>',
    'briefcase': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
    
    // Communication
    'mail': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
    'message-square': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    'phone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
    'send': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22,2 15,22 11,13 2,9 22,2"></polygon></svg>',
    
    // Technology
    'cpu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>',
    'database': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>',
    'server': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="4" rx="1" ry="1"></rect><rect x="2" y="9" width="20" height="4" rx="1" ry="1"></rect><rect x="2" y="15" width="20" height="4" rx="1" ry="1"></rect><line x1="6" y1="5" x2="6.01" y2="5"></line><line x1="6" y1="11" x2="6.01" y2="11"></line><line x1="6" y1="17" x2="6.01" y2="17"></line></svg>',
    'wifi': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
    'wifi-off': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
    
    // Layout & UI
    'grid': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
    'layout': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>',
    'sidebar': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>',
    'maximize': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>',
    'minimize': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>',
    'expand': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,3 21,3 21,9"></polyline><polyline points="9,21 3,21 3,15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
    // Layout & UI (continued)
    'compress': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="10,3 4,3 4,9"></polyline><polyline points="14,21 20,21 20,15"></polyline><line x1="4" y1="3" x2="10" y2="9"></line><line x1="20" y1="21" x2="14" y2="15"></line></svg>',
    
    // Tools & Objects
    'tool': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>',
    'wrench': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>',
    'cog': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    
    // Security & Protection
    'shield': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    'shield-alert': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    'shield-check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9,12 10.5,13.5 15,9"></polyline></svg>',
    'lock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><circle cx="12" cy="16" r="1"></circle><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    'unlock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><circle cx="12" cy="16" r="1"></circle><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>',
    'key': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>',
    
    // Visibility
    'eye': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    'eye-off': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',
    
    // Time & Calendar
    'clock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12,6 12,12 16,14"></polyline></svg>',
    'calendar': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    'watch': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"></circle><polyline points="12,9 12,12 13.5,13.5"></polyline><path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83"></path></svg>',
    
    // People & Users
    'user': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    'users': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    'user-plus': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>',
    'user-minus': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="23" y1="11" x2="17" y2="11"></line></svg>',
    
    // Miscellaneous
    'star': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"></polygon></svg>',
    'heart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
    'thumbs-up': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>',
    'thumbs-down': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>',
    'flag': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>',
    'bookmark': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>',
    'tag': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
    'hash': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>',
    'at-sign': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path></svg>',
    
    // Business specific
    'target': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
    'zap': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"></polygon></svg>',
    'award': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88"></polyline></svg>',
    'gift': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,12 20,22 4,22 4,12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>',
    'map': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>',
    'compass': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88 16.24,7.76"></polygon></svg>',
    'globe': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
    
    // Brain and AI
    'brain': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"></path><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"></path><path d="M3.477 10.896a4 4 0 0 1 .585-.396"></path><path d="M19.938 10.5a4 4 0 0 1 .585.396"></path><path d="M6 18a4 4 0 0 1-3-2"></path><path d="M18 18a4 4 0 0 0 3-2"></path></svg>',
    'lightbulb': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21h6"></path><path d="M12 17h0"></path><path d="M12 3a6 6 0 0 1 6 6c0 1.7-.7 3.2-1.8 4.3-.3.3-.7.7-.7 1.7h-7c0-1-.4-1.4-.7-1.7C6.7 12.2 6 10.7 6 9a6 6 0 0 1 6-6z"></path></svg>',
    
    // Math and calculations
    'plus': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    'minus': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    'divide': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="6" r="2"></circle><line x1="5" y1="12" x2="19" y2="12"></line><circle cx="12" cy="18" r="2"></circle></svg>',
    'percent': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>',
    
    // Storage and containers
    'box': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    'package': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    'folder': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
    'folder-open': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 14l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
    
    // Device and platform
    'smartphone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
    'tablet': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2" ry="2"></rect><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    'monitor': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
    'tv': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17,2 12,7 7,2"></polyline></svg>'
};

// Enhanced Tooltip manager class with memory leak fixes
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
            theme: 'default',
            trigger: 'hover', // 'hover', 'click', 'focus'
            boundary: 'viewport'
        };
        
        this.boundGlobalHandlers = {
            documentClick: this.handleDocumentClick.bind(this),
            windowResize: this.handleWindowResize.bind(this),
            keyDown: this.handleKeyDown.bind(this)
        };
        
        this.setupStyles();
        this.bindGlobalEvents();
        
        // Track instances for cleanup
        this.isDestroyed = false;
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
                white-space: normal;
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
                z-index: -1;
            }
            
            .ui-tooltip.placement-top {
                transform-origin: bottom center;
            }
            
            .ui-tooltip.placement-top .ui-tooltip-arrow {
                bottom: -4px;
                left: 50%;
                margin-left: -4px;
            }
            
            .ui-tooltip.placement-bottom {
                transform-origin: top center;
            }
            
            .ui-tooltip.placement-bottom .ui-tooltip-arrow {
                top: -4px;
                left: 50%;
                margin-left: -4px;
            }
            
            .ui-tooltip.placement-left {
                transform-origin: center right;
            }
            
            .ui-tooltip.placement-left .ui-tooltip-arrow {
                right: -4px;
                top: 50%;
                margin-top: -4px;
            }
            
            .ui-tooltip.placement-right {
                transform-origin: center left;
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
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
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
            
            .ui-tooltip.theme-info {
                background: #2563eb;
                color: #ffffff;
            }
            
            .ui-tooltip.theme-info .ui-tooltip-arrow {
                background: #2563eb;
            }
            
            /* Responsive adjustments */
            @media (max-width: 640px) {
                .ui-tooltip {
                    max-width: 250px;
                    font-size: 0.8rem;
                    padding: 6px 10px;
                }
            }
            
            /* Accessibility */
            @media (prefers-reduced-motion: reduce) {
                .ui-tooltip {
                    transition: none;
                }
            }
            
            /* High contrast mode */
            @media (prefers-contrast: high) {
                .ui-tooltip {
                    border: 2px solid currentColor;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    bindGlobalEvents() {
        document.addEventListener('click', this.boundGlobalHandlers.documentClick, true);
        window.addEventListener('resize', this.boundGlobalHandlers.windowResize);
        document.addEventListener('keydown', this.boundGlobalHandlers.keyDown);
    }
    
    unbindGlobalEvents() {
        document.removeEventListener('click', this.boundGlobalHandlers.documentClick, true);
        window.removeEventListener('resize', this.boundGlobalHandlers.windowResize);
        document.removeEventListener('keydown', this.boundGlobalHandlers.keyDown);
    }
    
    handleDocumentClick(event) {
        // Hide tooltip when clicking outside
        if (this.activeTooltip && this.activeTooltip.tooltipElement) {
            const tooltip = this.activeTooltip;
            if (!tooltip.element.contains(event.target) && 
                !tooltip.tooltipElement.contains(event.target)) {
                this.hideTooltipElement(tooltip);
            }
        }
    }
    
    handleWindowResize() {
        // Update all visible tooltip positions
        this.tooltips.forEach(tooltip => {
            if (tooltip.isVisible) {
                this.updateTooltipPosition(tooltip);
            }
        });
    }
    
    handleKeyDown(event) {
        // Hide tooltip on Escape key
        if (event.key === 'Escape' && this.activeTooltip) {
            this.hideTooltipElement(this.activeTooltip);
        }
    }
    
    add(element, content, options = {}) {
        if (!element || !content) {
            console.warn('UIHelpers: addTooltip requires element and content');
            return null;
        }
        
        if (this.isDestroyed) {
            console.warn('UIHelpers: TooltipManager has been destroyed');
            return null;
        }
        
        // Remove existing tooltip
        this.remove(element);
        
        const config = { ...this.defaultOptions, ...options };
        const tooltipId = this.generateId();
        
        const tooltip = {
            id: tooltipId,
            element: element,
            content: content,
            config: config,
            tooltipElement: null,
            isVisible: false,
            showTimer: null,
            hideTimer: null,
            handlers: {}
        };
        
        // Setup event handlers based on trigger
        this.setupTooltipHandlers(tooltip);
        
        // Store tooltip
        this.tooltips.set(element, tooltip);
        
        return tooltipId;
    }
    
    setupTooltipHandlers(tooltip) {
        const { element, config } = tooltip;
        
        if (config.trigger === 'hover') {
            tooltip.handlers.showHandler = (event) => {
                this.clearTimers(tooltip);
                tooltip.showTimer = setTimeout(() => {
                    this.showTooltipElement(tooltip, event);
                }, config.delay);
            };
            
            tooltip.handlers.hideHandler = () => {
                this.clearTimers(tooltip);
                tooltip.hideTimer = setTimeout(() => {
                    this.hideTooltipElement(tooltip);
                }, config.hideDelay);
            };
            
            element.addEventListener('mouseenter', tooltip.handlers.showHandler);
            element.addEventListener('mouseleave', tooltip.handlers.hideHandler);
            element.addEventListener('focus', tooltip.handlers.showHandler);
            element.addEventListener('blur', tooltip.handlers.hideHandler);
            
        } else if (config.trigger === 'click') {
            tooltip.handlers.clickHandler = (event) => {
                event.preventDefault();
                if (tooltip.isVisible) {
                    this.hideTooltipElement(tooltip);
                } else {
                    this.showTooltipElement(tooltip, event);
                }
            };
            
            element.addEventListener('click', tooltip.handlers.clickHandler);
            
        } else if (config.trigger === 'focus') {
            tooltip.handlers.focusHandler = (event) => {
                this.showTooltipElement(tooltip, event);
            };
            
            tooltip.handlers.blurHandler = () => {
                this.hideTooltipElement(tooltip);
            };
            
            element.addEventListener('focus', tooltip.handlers.focusHandler);
            element.addEventListener('blur', tooltip.handlers.blurHandler);
        }
    }
    
    showTooltipElement(tooltip, event = null) {
        if (this.isDestroyed || !tooltip) return;
        
        // Hide any active tooltip
        if (this.activeTooltip && this.activeTooltip !== tooltip) {
            this.hideTooltipElement(this.activeTooltip);
        }
        
        // Create tooltip element if it doesn't exist
        if (!tooltip.tooltipElement) {
            this.createTooltipElement(tooltip);
        }
        
        // Update content
        this.updateTooltipContent(tooltip);
        
        // Position tooltip
        this.updateTooltipPosition(tooltip, event);
        
        // Show tooltip
        requestAnimationFrame(() => {
            if (tooltip.tooltipElement) {
                tooltip.tooltipElement.classList.add('show');
                tooltip.isVisible = true;
                this.activeTooltip = tooltip;
            }
        });
    }
    
    hideTooltipElement(tooltip) {
        if (!tooltip || !tooltip.tooltipElement) return;
        
        tooltip.tooltipElement.classList.remove('show');
        tooltip.isVisible = false;
        
        if (this.activeTooltip === tooltip) {
            this.activeTooltip = null;
        }
        
        // Remove element after animation
        setTimeout(() => {
            if (tooltip.tooltipElement && !tooltip.isVisible) {
                tooltip.tooltipElement.remove();
                tooltip.tooltipElement = null;
            }
        }, 200);
    }
    
    createTooltipElement(tooltip) {
        const { config } = tooltip;
        
        const tooltipEl = document.createElement('div');
        tooltipEl.className = `ui-tooltip placement-${config.placement} theme-${config.theme}`;
        tooltipEl.id = tooltip.id;
        
        if (config.className) {
            tooltipEl.classList.add(config.className);
        }
        
        if (config.interactive) {
            tooltipEl.classList.add('interactive');
        }
        
        if (config.maxWidth) {
            tooltipEl.style.maxWidth = typeof config.maxWidth === 'number' ? 
                `${config.maxWidth}px` : config.maxWidth;
        }
        
        // Add arrow if enabled
        if (config.arrow) {
            const arrow = document.createElement('div');
            arrow.className = 'ui-tooltip-arrow';
            tooltipEl.appendChild(arrow);
        }
        
        // Content container
        const content = document.createElement('div');
        content.className = 'ui-tooltip-content';
        tooltipEl.appendChild(content);
        
        tooltip.tooltipElement = tooltipEl;
        document.body.appendChild(tooltipEl);
    }
    
    updateTooltipContent(tooltip) {
        if (!tooltip.tooltipElement) return;
        
        const contentEl = tooltip.tooltipElement.querySelector('.ui-tooltip-content');
        if (!contentEl) return;
        
        if (typeof tooltip.content === 'string') {
            contentEl.innerHTML = this.sanitizeHTML(tooltip.content);
        } else if (tooltip.content instanceof HTMLElement) {
            contentEl.appendChild(tooltip.content.cloneNode(true));
        }
    }
    
    updateTooltipPosition(tooltip, event = null) {
        if (!tooltip.tooltipElement || !tooltip.element) return;
        
        const { config } = tooltip;
        const tooltipEl = tooltip.tooltipElement;
        const targetEl = tooltip.element;
        
        // Get element position
        const targetRect = targetEl.getBoundingClientRect();
        const tooltipRect = tooltipEl.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let top, left;
        let placement = config.placement;
        
        // Auto-adjust placement if tooltip would be clipped
        if (config.boundary === 'viewport') {
            placement = this.getOptimalPlacement(targetRect, tooltipRect, config.placement);
            tooltipEl.className = tooltipEl.className.replace(/placement-\w+/, `placement-${placement}`);
        }
        
        // Calculate position based on placement
        switch (placement) {
            case 'top':
                top = targetRect.top - tooltipRect.height - config.offset;
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = targetRect.bottom + config.offset;
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                left = targetRect.left - tooltipRect.width - config.offset;
                break;
            case 'right':
                top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                left = targetRect.right + config.offset;
                break;
            default:
                top = targetRect.top - tooltipRect.height - config.offset;
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        }
        
        // Ensure tooltip stays within viewport
        left = Math.max(8, Math.min(left, viewportWidth - tooltipRect.width - 8));
        top = Math.max(8, Math.min(top, viewportHeight - tooltipRect.height - 8));
        
        // Apply position
        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
    }
    
    getOptimalPlacement(targetRect, tooltipRect, preferredPlacement) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const offset = 8;
        
        const placements = {
            top: targetRect.top >= tooltipRect.height + offset,
            bottom: targetRect.bottom + tooltipRect.height + offset <= viewportHeight,
            left: targetRect.left >= tooltipRect.width + offset,
            right: targetRect.right + tooltipRect.width + offset <= viewportWidth
        };
        
        // If preferred placement fits, use it
        if (placements[preferredPlacement]) {
            return preferredPlacement;
        }
        
        // Otherwise, find the first placement that fits
        for (const [placement, fits] of Object.entries(placements)) {
            if (fits) return placement;
        }
        
        // If none fit perfectly, use the preferred placement anyway
        return preferredPlacement;
    }
    
    sanitizeHTML(html) {
        // Basic HTML sanitization - remove script tags and dangerous attributes
        const div = document.createElement('div');
        div.innerHTML = html;
        
        // Remove script tags
        const scripts = div.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        
        // Remove dangerous attributes
        const allElements = div.querySelectorAll('*');
        allElements.forEach(el => {
            const dangerousAttrs = ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur'];
            dangerousAttrs.forEach(attr => {
                if (el.hasAttribute(attr)) {
                    el.removeAttribute(attr);
                }
            });
        });
        
        return div.innerHTML;
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
        Object.values(tooltip.handlers).forEach(handler => {
            element.removeEventListener('mouseenter', handler);
            element.removeEventListener('mouseleave', handler);
            element.removeEventListener('focus', handler);
            element.removeEventListener('blur', handler);
            element.removeEventListener('click', handler);
        });
        
        this.tooltips.delete(element);
        
        if (this.activeTooltip === tooltip) {
            this.activeTooltip = null;
        }
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
    
    destroy() {
        this.hideAll();
        this.tooltips.clear();
        this.unbindGlobalEvents();
        this.isDestroyed = true;
        
        // Remove styles
        const styleEl = document.getElementById('ui-helpers-tooltip-styles');
        if (styleEl) {
            styleEl.remove();
        }
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
            decimals: unitIndex === 0 ? 0 : (decimals === 'auto' ? 1 : decimals)
        });
        
        return `${formatted} ${units[unitIndex]}`;
    }
    
    // Handle compact notation
    if (compact) {
        return new Intl.NumberFormat(locale, {
            notation: 'compact',
            maximumFractionDigits: decimals === 'auto' ? 1 : decimals
        }).format(num);
    }
    
    // Standard formatting
    const formatOptions = {
        minimumFractionDigits: decimals === 'auto' ? 0 : decimals,
        maximumFractionDigits: decimals === 'auto' ? 2 : decimals
    };
    
    const formatted = new Intl.NumberFormat(locale, formatOptions).format(num);
    
    return `${prefix}${formatted}${unit}${suffix}`;
}

/**
 * Format dates in a human-readable way
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export function formatDate(date, options = {}) {
    const {
        format = 'short',
        locale = 'en-US',
        relative = false,
        includeTime = false
    } = options;
    
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        return 'Invalid Date';
    }
    
    if (relative) {
        return formatRelativeTime(d);
    }
    
    const formatOptions = {
        short: { dateStyle: 'short' },
        medium: { dateStyle: 'medium' },
        long: { dateStyle: 'long' },
        full: { dateStyle: 'full' }
    };
    
    const opts = formatOptions[format] || formatOptions.short;
    
    if (includeTime) {
        opts.timeStyle = 'short';
    }
    
    return new Intl.DateTimeFormat(locale, opts).format(d);
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date} date - Date to format
 * @returns {string} - Relative time string
 */
export function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    }
    if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months !== 1 ? 's' : ''} ago`;
    }
    
    const years = Math.floor(diffDays / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Format duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted duration
 */
export function formatDuration(ms, options = {}) {
    const { format = 'auto', precision = 2 } = options;
    
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    
    const seconds = ms / 1000;
    if (seconds < 60) {
        return `${seconds.toFixed(precision)}s`;
    }
    
    const minutes = seconds / 60;
    if (minutes < 60) {
        const mins = Math.floor(minutes);
        const secs = Math.round((minutes - mins) * 60);
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    
    const hours = minutes / 60;
    if (hours < 24) {
        const hrs = Math.floor(hours);
        const mins = Math.round((hours - hrs) * 60);
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    
    const days = hours / 24;
    const d = Math.floor(days);
    const h = Math.round((days - d) * 24);
    return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

/**
 * Sanitize HTML content to prevent XSS
 * @param {string} html - HTML string to sanitize
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHTML(html) {
    if (typeof html !== 'string') return '';
    
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Remove script tags
    const scripts = div.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // Remove dangerous attributes
    const allElements = div.querySelectorAll('*');
    const dangerousAttrs = [
        'onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur',
        'onchange', 'onsubmit', 'onreset', 'onselect', 'onkeydown', 'onkeyup',
        'onkeypress', 'onmousedown', 'onmouseup', 'onmousemove', 'onmouseout',
        'javascript:'
    ];
    
    allElements.forEach(el => {
        dangerousAttrs.forEach(attr => {
            if (el.hasAttribute(attr)) {
                el.removeAttribute(attr);
            }
        });
        
        // Remove href with javascript:
        if (el.hasAttribute('href') && el.getAttribute('href').includes('javascript:')) {
            el.removeAttribute('href');
        }
    });
    
    return div.innerHTML;
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func.apply(this, args);
    };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Create a loading spinner element
 * @param {Object} options - Spinner options
 * @returns {HTMLElement} - Spinner element
 */
export function createSpinner(options = {}) {
    const {
        size = '24px',
        color = 'currentColor',
        className = ''
    } = options;
    
    const spinner = document.createElement('div');
    spinner.className = `ui-spinner ${className}`;
    spinner.innerHTML = `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="color: ${color}">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" 
                    stroke-linecap="round" stroke-dasharray="32" stroke-dashoffset="32">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-16;-32;-32" repeatCount="indefinite"/>
            </circle>
        </svg>
    `;
    
    return spinner;
}

/**
 * Show a notification message
 * @param {string} message - Notification message
 * @param {Object} options - Notification options
 * @returns {string} - Notification ID
 */
export function showNotification(message, options = {}) {
    const {
        type = 'info',
        duration = 5000,
        position = 'top-right',
        persistent = false,
        actions = []
    } = options;
    
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `ui-notification ui-notification-${type} ui-notification-${position}`;
    
    const icon = getNotificationIcon(type);
    
    notification.innerHTML = `
        <div class="ui-notification-content">
            <div class="ui-notification-icon">${icon}</div>
            <div class="ui-notification-message">${sanitizeHTML(message)}</div>
            ${!persistent ? '<button class="ui-notification-close" aria-label="Close">&times;</button>' : ''}
        </div>
        ${actions.length > 0 ? `
            <div class="ui-notification-actions">
                ${actions.map(action => `
                    <button class="ui-notification-action" data-action="${action.id}">
                        ${sanitizeHTML(action.label)}
                    </button>
                `).join('')}
            </div>
        ` : ''}
    `;
    
    // Ensure notification container exists
    let container = document.getElementById('ui-notifications');
    if (!container) {
        container = document.createElement('div');
        container.id = 'ui-notifications';
        container.className = 'ui-notifications-container';
        document.body.appendChild(container);
        
        // Add styles for notifications
        injectNotificationStyles();
    }
    
    container.appendChild(notification);
    
    // Handle close button
    const closeBtn = notification.querySelector('.ui-notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => removeNotification(id));
    }
    
    // Handle action buttons
    const actionBtns = notification.querySelectorAll('.ui-notification-action');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const actionId = e.target.dataset.action;
            const action = actions.find(a => a.id === actionId);
            if (action && action.handler) {
                action.handler();
            }
            if (action && action.dismissOnClick !== false) {
                removeNotification(id);
            }
        });
    });
    
    // Auto-remove after duration
    if (!persistent && duration > 0) {
        setTimeout(() => removeNotification(id), duration);
    }
    
    // Animate in
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    return id;
}

/**
 * Remove a notification
 * @param {string} id - Notification ID
 */
export function removeNotification(id) {
    const notification = document.getElementById(id);
    if (!notification) return;
    
    notification.classList.add('removing');
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

function getNotificationIcon(type) {
    const icons = {
        success: createIcon('check-circle'),
        error: createIcon('x-circle'),
        warning: createIcon('alert-triangle'),
        info: createIcon('info')
    };
    
    return icons[type] || icons.info;
}

function injectNotificationStyles() {
    const styleId = 'ui-helpers-notification-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .ui-notifications-container {
            position: fixed;
            z-index: 10001;
            pointer-events: none;
        }
        
        .ui-notification {
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            border-left: 4px solid #3b82f6;
            margin-bottom: 12px;
            max-width: 400px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            pointer-events: auto;
            overflow: hidden;
        }
        
        .ui-notification.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .ui-notification.removing {
            opacity: 0;
            transform: translateX(100%);
        }
        
        .ui-notification-top-right {
            position: fixed;
            top: 20px;
            right: 20px;
        }
        
        .ui-notification-top-left {
            position: fixed;
            top: 20px;
            left: 20px;
        }
        
        .ui-notification-bottom-right {
            position: fixed;
            bottom: 20px;
            right: 20px;
        }
        
        .ui-notification-bottom-left {
            position: fixed;
            bottom: 20px;
            left: 20px;
        }
        
        .ui-notification-content {
            display: flex;
            align-items: flex-start;
            padding: 16px;
            gap: 12px;
        }
        
        .ui-notification-icon {
            flex-shrink: 0;
            margin-top: 2px;
        }
        
        .ui-notification-message {
            flex: 1;
            font-size: 14px;
            line-height: 1.5;
            color: #374151;
        }
        
        .ui-notification-close {
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #9ca3af;
            padding: 0;
            margin-left: 8px;
            flex-shrink: 0;
        }
        
        .ui-notification-close:hover {
            color: #6b7280;
        }
        
        .ui-notification-actions {
            padding: 0 16px 16px;
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }
        
        .ui-notification-action {
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .ui-notification-action:hover {
            background: #e5e7eb;
        }
        
        .ui-notification-success {
            border-left-color: #10b981;
        }
        
        .ui-notification-success .ui-notification-icon {
            color: #10b981;
        }
        
        .ui-notification-error {
            border-left-color: #dc2626;
        }
        
        .ui-notification-error .ui-notification-icon {
            color: #dc2626;
        }
        
        .ui-notification-warning {
            border-left-color: #f59e0b;
        }
        
        .ui-notification-warning .ui-notification-icon {
            color: #f59e0b;
        }
        
        .ui-notification-info {
            border-left-color: #3b82f6;
        }
        
        .ui-notification-info .ui-notification-icon {
            color: #3b82f6;
        }
    `;
    
    document.head.appendChild(style);
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
        animated = false,
        color = '#3b82f6',
        height = '8px',
        className = ''
    } = options;
    
    const container = document.createElement('div');
    container.className = `ui-progress-bar ${className}`;
    
    const progressValue = Math.min(Math.max(value, 0), max);
    const percentage = (progressValue / max) * 100;
    
    container.innerHTML = `
        <div class="ui-progress-track" style="height: ${height}; background: #e5e7eb; border-radius: ${parseInt(height) / 2}px; overflow: hidden;">
            <div class="ui-progress-fill ${animated ? 'animated' : ''}" 
                 style="width: ${percentage}%; height: 100%; background: ${color}; border-radius: ${parseInt(height) / 2}px; transition: width 0.3s ease;">
            </div>
        </div>
        ${showLabel ? `<div class="ui-progress-label" style="font-size: 12px; color: #6b7280; margin-top: 4px;">${progressValue}/${max}</div>` : ''}
    `;
    
    // Add animated styles if needed
    if (animated) {
        const animatedStyles = `
            .ui-progress-fill.animated {
                background-image: linear-gradient(45deg, transparent 35%, rgba(255,255,255,0.2) 35%, rgba(255,255,255,0.2) 50%, transparent 50%, transparent 85%, rgba(255,255,255,0.2) 85%);
                background-size: 20px 20px;
                animation: progress-bar-stripes 1s linear infinite;
            }
            
            @keyframes progress-bar-stripes {
                0% { background-position: 0 0; }
                100% { background-position: 20px 0; }
            }
        `;
        
        if (!document.getElementById('progress-bar-animated-styles')) {
            const style = document.createElement('style');
            style.id = 'progress-bar-animated-styles';
            style.textContent = animatedStyles;
            document.head.appendChild(style);
        }
    }
    
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
 * Generate a unique ID
 * @param {string} prefix - Optional prefix
 * @returns {string} - Unique ID
 */
export function generateId(prefix = '') {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 * @param {number} threshold - Intersection threshold (0-1)
 * @returns {boolean} - Whether element is in viewport
 */
export function isInViewport(element, threshold = 0) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    
    const verticalVisible = (rect.top + rect.height * threshold) < viewportHeight && 
                           (rect.bottom - rect.height * threshold) > 0;
    
    const horizontalVisible = (rect.left + rect.width * threshold) < viewportWidth && 
                             (rect.right - rect.width * threshold) > 0;
    
    return verticalVisible && horizontalVisible;
}

/**
 * Smooth scroll to element or position
 * @param {HTMLElement|number} target - Element or Y position
 * @param {Object} options - Scroll options
 */
export function scrollTo(target, options = {}) {
    const {
        behavior = 'smooth',
        block = 'start',
        inline = 'nearest',
        offset = 0
    } = options;
    
    if (typeof target === 'number') {
        window.scrollTo({
            top: target + offset,
            behavior: behavior
        });
    } else if (target instanceof HTMLElement) {
        const rect = target.getBoundingClientRect();
        const top = window.pageYOffset + rect.top + offset;
        
        window.scrollTo({
            top: top,
            behavior: behavior
        });
    }
}

/**
 * Create a modal dialog
 * @param {Object} options - Modal options
 * @returns {Object} - Modal instance with methods
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
    
    const modalId = generateId('modal_');
    
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = `ui-modal ${className}`;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    
    if (title) {
        modal.setAttribute('aria-labelledby', `${modalId}_title`);
    }
    
    modal.innerHTML = `
        <div class="ui-modal-backdrop"></div>
        <div class="ui-modal-dialog ui-modal-${size}">
            <div class="ui-modal-content">
                ${title ? `
                    <div class="ui-modal-header">
                        <h3 id="${modalId}_title" class="ui-modal-title">${sanitizeHTML(title)}</h3>
                        ${closable ? '<button class="ui-modal-close" aria-label="Close">&times;</button>' : ''}
                    </div>
                ` : ''}
                <div class="ui-modal-body">
                    ${typeof content === 'string' ? sanitizeHTML(content) : ''}
                </div>
            </div>
        </div>
    `;
    
    // Add modal styles
    injectModalStyles();
    
    document.body.appendChild(modal);
    
    // Event handlers
    const closeModal = () => {
        modal.classList.add('hiding');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    };
    
    if (closable) {
        const closeBtn = modal.querySelector('.ui-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
    }
    
    if (backdrop) {
        const backdropEl = modal.querySelector('.ui-modal-backdrop');
        if (backdropEl) {
            backdropEl.addEventListener('click', closeModal);
        }
    }
    
    if (keyboard) {
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', keyHandler);
            }
        };
        document.addEventListener('keydown', keyHandler);
    }
    
    // Show modal
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
    
    return {
        element: modal,
        close: closeModal,
        setContent: (newContent) => {
            const body = modal.querySelector('.ui-modal-body');
            if (body) {
                body.innerHTML = typeof newContent === 'string' ? sanitizeHTML(newContent) : '';
                if (newContent instanceof HTMLElement) {
                    body.appendChild(newContent);
                }
            }
        }
    };
}

function injectModalStyles() {
    const styleId = 'ui-helpers-modal-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
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
        
        .ui-modal.hiding {
            opacity: 0;
            visibility: hidden;
        }
        
        .ui-modal-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
        }
        
        .ui-modal-dialog {
            position: relative;
            margin: 20px;
            transform: scale(0.9);
            transition: transform 0.3s ease;
        }
        
        .ui-modal.show .ui-modal-dialog {
            transform: scale(1);
        }
        
        .ui-modal-small { max-width: 400px; }
        .ui-modal-medium { max-width: 600px; }
        .ui-modal-large { max-width: 800px; }
        .ui-modal-xl { max-width: 1200px; }
        
        .ui-modal-content {
            background: white;
            border-radius: 8px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            overflow: hidden;
        }
        
        .ui-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .ui-modal-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
        }
        
        .ui-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #9ca3af;
            padding: 0;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        
        .ui-modal-close:hover {
            background: #f3f4f6;
            color: #6b7280;
        }
        
        .ui-modal-body {
            padding: 20px;
        }
    `;
    
    document.head.appendChild(style);
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
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted file size
 */
export function formatFileSize(bytes, options = {}) {
    return formatNumber(bytes, { ...options, bytes: true });
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} - Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    
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
 * Deep equality check
 * @param {*} a - First value
 * @param {*} b - Second value
 * @returns {boolean} - Whether values are deeply equal
 */
export function deepEqual(a, b) {
    if (a === b) return true;
    
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        
        if (keysA.length !== keysB.length) return false;
        
        for (const key of keysA) {
            if (!keysB.includes(key)) return false;
            if (!deepEqual(a[key], b[key])) return false;
        }
        
        return true;
    }
    
    return false;
}

/**
 * Escape HTML entities
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
        // Core functions
        createIcon,
        addTooltip,
        removeTooltip,
        formatNumber,
        formatDate,
        formatRelativeTime,
        formatDuration,
        formatFileSize,
        
        // HTML and safety
        sanitizeHTML,
        escapeHTML,
        
        // Utilities
        debounce,
        throttle,
        deepClone,
        deepEqual,
        generateId,
        
        // UI components
        createSpinner,
        createProgressBar,
        createModal,
        
        // Notifications
        showNotification,
        removeNotification,
        
        // Clipboard and interactions
        copyToClipboard,
        isInViewport,
        scrollTo,
        
        // Icons
        getAvailableIcons,
        hasIcon,
        
        // Classes
        tooltipManager,
        TooltipManager,
        ICON_LIBRARY
    };
    
    // Cleanup function for page unload
    window.addEventListener('beforeunload', () => {
        if (tooltipManager && typeof tooltipManager.destroy === 'function') {
            tooltipManager.destroy();
        }
    });
}

console.log('🎨 UIHelpers module loaded successfully with memory leak fixes and complete functionality');
