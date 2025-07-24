// Service Worker for Manifest V3
// This file combines the functionality from common_lib.js, context_menu_lib.js, and background.js

// Import scripts functionality (equivalent to the old background.scripts)
try {
    importScripts('common_lib.js', 'context_menu_lib.js', 'background.js');
} catch (error) {
    console.error('Error importing scripts:', error);
}

// Service workers are event-driven, so we need to ensure proper initialization
chrome.runtime.onStartup.addListener(() => {
    console.log('Word Discoverer service worker started');
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log('Word Discoverer extension installed/updated');
    
    // Initialize extension on install/update
    if (details.reason === 'install' || details.reason === 'update') {
        // Load dictionaries and initialize extension
        if (typeof load_eng_dictionary === 'function') {
            load_eng_dictionary();
        }
        if (typeof load_idioms === 'function') {
            load_idioms();
        }
    }
});
