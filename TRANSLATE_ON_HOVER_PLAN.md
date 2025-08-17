# Google Translate on Hover Feature - Implementation Plan

## Overview

This document outlines the implementation plan for adding Google Translate functionality to the hover bubble in Word Discoverer extension, replacing the current "Define in Google" tab-opening behavior with inline translation.

## Current State Analysis

### Existing Hover System
- ✅ Hover bubble system (`wdSelectionBubble`) already implemented
- ✅ Shows word information, frequency, and action buttons
- ✅ Positioned dynamically based on highlighted word location
- ✅ Styled with consistent design (`content_script.css`)

### Current Google Translate Integration
- ✅ "Define in Google" button opens new tab with Google search
- ✅ "Translate to [Language] in Google" for non-English UI languages
- ✅ Context menu integration available
- ❌ No inline translation capability

### Available Permissions
- ✅ `https://*/*` host permissions (can make HTTP requests)
- ✅ `storage` permission for caching
- ✅ `tabs` permission for fallback behavior

## Implementation Options

### Option 1: Google Translate API Integration ⭐ **RECOMMENDED**

**Advantages:**
- Instant translation without opening new tabs
- Better user experience with inline results
- Customizable appearance and behavior
- Cacheable for improved performance
- Fallback to current tab behavior if needed

**Implementation Details:**
- Use Google Translate's free web API endpoint
- Add translation caching system
- Handle rate limiting and errors gracefully
- Support multiple target languages

### Option 2: Google Translate Widget Embedding

**Advantages:**
- Uses Google's official widget
- No API key required
- More reliable (official Google solution)

**Disadvantages:**
- Widget might be too large for hover bubble
- Less control over appearance
- May not integrate well with current design

### Option 3: Hybrid Approach

**Features:**
- Quick translation preview on hover (Option 1)
- Enhanced "Full translate" button for detailed translation
- Best of both approaches

## Detailed Technical Implementation Plan

### Phase 1: Core Translation System

#### 1.1 Translation Function
```javascript
/**
 * Translate text using Google Translate API
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (default: auto-detect from UI)
 * @param {string} sourceLang - Source language (default: 'en')
 * @returns {Promise<string|null>} Translated text or null if failed
 */
async function translateText(text, targetLang = 'auto', sourceLang = 'en') {
    const cacheKey = `translate_${sourceLang}_${targetLang}_${text}`;
    
    // Check cache first
    const cached = await getTranslationFromCache(cacheKey);
    if (cached && cached.timestamp > Date.now() - 86400000) { // 24h cache
        return cached.translation;
    }
    
    try {
        const url = `https://translate.googleapis.com/translate_a/single?` +
            `client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const translation = data[0][0][0];
        
        // Cache the result
        await cacheTranslation(cacheKey, translation);
        return translation;
        
    } catch (error) {
        console.log('Translation failed:', error);
        return null;
    }
}
```

#### 1.2 Caching System
```javascript
/**
 * Cache translation result
 */
async function cacheTranslation(key, translation) {
    try {
        const cacheData = {
            translation: translation,
            timestamp: Date.now()
        };
        
        // Get existing cache
        const result = await chrome.storage.local.get(['wd_translation_cache']);
        const cache = result.wd_translation_cache || {};
        
        // Add new translation
        cache[key] = cacheData;
        
        // Limit cache size (keep last 1000 translations)
        const keys = Object.keys(cache);
        if (keys.length > 1000) {
            // Remove oldest entries
            const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
            const toRemove = sorted.slice(0, keys.length - 1000);
            toRemove.forEach(key => delete cache[key]);
        }
        
        await chrome.storage.local.set({'wd_translation_cache': cache});
    } catch (error) {
        console.log('Cache write failed:', error);
    }
}

/**
 * Get translation from cache
 */
async function getTranslationFromCache(key) {
    try {
        const result = await chrome.storage.local.get(['wd_translation_cache']);
        const cache = result.wd_translation_cache || {};
        return cache[key] || null;
    } catch (error) {
        console.log('Cache read failed:', error);
        return null;
    }
}
```

### Phase 2: UI Enhancement

#### 2.1 Bubble Structure Modification
```javascript
function create_bubble() {
    var bubbleDOM = document.createElement('div');
    bubbleDOM.setAttribute('class', 'wdSelectionBubble');
    bubbleDOM.setAttribute("id", "wd_selection_bubble")

    // Word info section (existing)
    var infoSpan = document.createElement('span');
    infoSpan.setAttribute("id", "wd_selection_bubble_text")
    infoSpan.setAttribute('class', 'wdInfoSpan');
    bubbleDOM.appendChild(infoSpan);

    var freqSpan = document.createElement('span');
    freqSpan.setAttribute("id", "wd_selection_bubble_freq")
    freqSpan.setAttribute('class', 'wdFreqSpan');
    freqSpan.textContent = "n/a";
    bubbleDOM.appendChild(freqSpan);

    // NEW: Translation section
    var translationContainer = document.createElement('div');
    translationContainer.setAttribute('id', 'wd_translation_container');
    translationContainer.setAttribute('class', 'wdTranslationContainer');
    translationContainer.style.display = 'none';
    
    var translationLabel = document.createElement('div');
    translationLabel.setAttribute('class', 'wdTranslationLabel');
    translationLabel.textContent = 'Translation:';
    translationContainer.appendChild(translationLabel);
    
    var translationText = document.createElement('div');
    translationText.setAttribute('id', 'wd_translation_text');
    translationText.setAttribute('class', 'wdTranslationText');
    translationContainer.appendChild(translationText);
    
    var translationAttribution = document.createElement('div');
    translationAttribution.setAttribute('class', 'wdTranslationAttribution');
    translationAttribution.textContent = 'Powered by Google Translate';
    translationContainer.appendChild(translationAttribution);
    
    bubbleDOM.appendChild(translationContainer);

    // Existing buttons...
    var addButton = document.createElement('button');
    // ... existing button code ...
}
```

#### 2.2 CSS Styling
```css
/* Add to content_script.css */

.wdTranslationContainer {
    width: 100% !important;
    background-color: #f0f8ff !important;
    border-top: 1px solid #ddd !important;
    padding: 5px !important;
    margin: 2px 0 !important;
    font-family: Arial !important;
    font-size: 11px !important;
}

.wdTranslationLabel {
    color: #666 !important;
    font-weight: bold !important;
    font-size: 10px !important;
    margin-bottom: 2px !important;
    text-transform: uppercase !important;
}

.wdTranslationText {
    color: #000 !important;
    font-size: 12px !important;
    font-weight: normal !important;
    line-height: 1.2 !important;
    margin: 2px 0 !important;
    word-wrap: break-word !important;
}

.wdTranslationAttribution {
    color: #999 !important;
    font-size: 9px !important;
    text-align: right !important;
    margin-top: 2px !important;
    font-style: italic !important;
}

.wdTranslationLoading {
    color: #666 !important;
    font-style: italic !important;
    font-size: 11px !important;
}

.wdTranslationError {
    color: #cc0000 !important;
    font-size: 11px !important;
    font-style: italic !important;
}
```

#### 2.3 Enhanced Render Function
```javascript
async function renderBubble() {
    if (!node_to_render_id) return;
    if (node_to_render_id === rendered_node_id) return;

    node_to_render = document.getElementById(node_to_render_id);
    if (!node_to_render) return;

    // Existing rendering logic...
    classattr = node_to_render.getAttribute('class');
    is_highlighted = (classattr != "wdautohl_none_none");
    param_key = is_highlighted ? "hl_hover" : "ow_hover";
    param_value = wd_hover_settings[param_key];
    if (param_value == "never" || (param_value == "key" && !function_key_is_pressed)) {
        return;
    }

    wdSpanText = node_to_render.textContent;
    bubbleDOM = document.getElementById("wd_selection_bubble");
    bubbleText = document.getElementById("wd_selection_bubble_text");
    bubbleFreq = document.getElementById("wd_selection_bubble_freq");
    
    // Existing bubble content...
    bubbleText.textContent = limit_text_len(wdSpanText);
    prcntFreq = get_word_percentile(wdSpanText.toLowerCase());
    bubbleFreq.textContent = prcntFreq ? prcntFreq + "%" : "n/a";
    bubbleFreq.style.backgroundColor = getHeatColorPoint(prcntFreq);
    
    current_lexeme = wdSpanText;
    
    // Position bubble
    var bcr = node_to_render.getBoundingClientRect();
    bubbleDOM.style.top = bcr.bottom + 'px';
    bubbleDOM.style.left = Math.max(5, Math.floor((bcr.left + bcr.right) / 2) - 100) + 'px';
    bubbleDOM.style.display = 'block';
    rendered_node_id = node_to_render_id;

    // NEW: Handle translation if enabled
    await handleTranslation(wdSpanText);

    if (wd_enable_tts) {
        chrome.runtime.sendMessage({type: "tts_speak", word: wdSpanText});
    }
}

async function handleTranslation(text) {
    const translationContainer = document.getElementById('wd_translation_container');
    const translationTextElement = document.getElementById('wd_translation_text');
    
    if (!wd_translation_settings || !wd_translation_settings.enabled) {
        translationContainer.style.display = 'none';
        return;
    }
    
    // Show loading state
    translationContainer.style.display = 'block';
    translationTextElement.textContent = 'Loading...';
    translationTextElement.className = 'wdTranslationText wdTranslationLoading';
    
    try {
        const targetLang = wd_translation_settings.target_language || 'auto';
        const translation = await translateText(text, targetLang);
        
        if (translation && translation !== text) {
            translationTextElement.textContent = translation;
            translationTextElement.className = 'wdTranslationText';
        } else {
            // Hide if no translation or same as original
            translationContainer.style.display = 'none';
        }
    } catch (error) {
        translationTextElement.textContent = 'Translation unavailable';
        translationTextElement.className = 'wdTranslationText wdTranslationError';
    }
}
```

### Phase 3: Settings Integration

#### 3.1 Settings Storage Structure
```javascript
// Add to default settings in background script
const default_translation_settings = {
    enabled: true,
    target_language: 'auto', // auto-detect from chrome.i18n.getUILanguage()
    trigger_mode: 'hover', // 'hover' or 'click'
    show_attribution: true,
    cache_duration: 86400000, // 24 hours in milliseconds
    max_cache_size: 1000
};
```

#### 3.2 Settings UI (adjust.html)
```html
<!-- Add to adjust.html -->
<fieldset>
    <legend>Translation Settings</legend>
    
    <div class="settingRow">
        <input type="checkbox" id="translation_enabled">
        <label for="translation_enabled">Enable hover translation</label>
    </div>
    
    <div class="settingRow">
        <label for="translation_language">Target language:</label>
        <select id="translation_language">
            <option value="auto">Auto-detect from browser</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
            <!-- Add more languages as needed -->
        </select>
    </div>
    
    <div class="settingRow">
        <input type="radio" name="translation_trigger" id="trigger_hover" value="hover">
        <label for="trigger_hover">Translate on hover</label>
        <input type="radio" name="translation_trigger" id="trigger_click" value="click">
        <label for="trigger_click">Translate on click</label>
    </div>
    
    <div class="settingRow">
        <button id="clear_translation_cache" class="longButton">Clear Translation Cache</button>
        <span id="cache_info" class="infoMsg"></span>
    </div>
</fieldset>
```

#### 3.3 Settings JavaScript (adjust.js)
```javascript
// Add to adjust.js

function loadTranslationSettings() {
    chrome.storage.local.get(['wd_translation_settings'], function(result) {
        const settings = result.wd_translation_settings || default_translation_settings;
        
        document.getElementById('translation_enabled').checked = settings.enabled;
        document.getElementById('translation_language').value = settings.target_language;
        
        if (settings.trigger_mode === 'hover') {
            document.getElementById('trigger_hover').checked = true;
        } else {
            document.getElementById('trigger_click').checked = true;
        }
        
        updateCacheInfo();
    });
}

function saveTranslationSettings() {
    const settings = {
        enabled: document.getElementById('translation_enabled').checked,
        target_language: document.getElementById('translation_language').value,
        trigger_mode: document.querySelector('input[name="translation_trigger"]:checked').value,
        show_attribution: true,
        cache_duration: 86400000,
        max_cache_size: 1000
    };
    
    chrome.storage.local.set({'wd_translation_settings': settings}, function() {
        console.log('Translation settings saved');
    });
}

function clearTranslationCache() {
    chrome.storage.local.remove(['wd_translation_cache'], function() {
        updateCacheInfo();
        alert('Translation cache cleared!');
    });
}

function updateCacheInfo() {
    chrome.storage.local.get(['wd_translation_cache'], function(result) {
        const cache = result.wd_translation_cache || {};
        const count = Object.keys(cache).length;
        document.getElementById('cache_info').textContent = 
            `Cache contains ${count} translations`;
    });
}

// Add event listeners
document.getElementById('translation_enabled').addEventListener('change', saveTranslationSettings);
document.getElementById('translation_language').addEventListener('change', saveTranslationSettings);
document.querySelectorAll('input[name="translation_trigger"]').forEach(el => {
    el.addEventListener('change', saveTranslationSettings);
});
document.getElementById('clear_translation_cache').addEventListener('click', clearTranslationCache);
```

### Phase 4: Performance Optimization

#### 4.1 Request Debouncing
```javascript
let translationTimeout;
const TRANSLATION_DELAY = 500; // 500ms delay

async function handleTranslationDebounced(text) {
    clearTimeout(translationTimeout);
    
    translationTimeout = setTimeout(async () => {
        await handleTranslation(text);
    }, TRANSLATION_DELAY);
}
```

#### 4.2 Smart Caching Strategy
- Cache translations for 24 hours
- Limit cache to 1000 most recent translations
- Prioritize common words for longer cache duration
- Clear expired cache entries periodically

#### 4.3 Error Handling and Fallback
```javascript
async function translateWithFallback(text, targetLang) {
    try {
        // Try primary translation method
        const translation = await translateText(text, targetLang);
        if (translation) return translation;
        
        // Fallback to different API endpoint
        return await translateTextFallback(text, targetLang);
        
    } catch (error) {
        console.log('All translation methods failed:', error);
        
        // Final fallback: show "click to translate" button
        showTranslationFallback(text, targetLang);
        return null;
    }
}

function showTranslationFallback(text, targetLang) {
    const translationContainer = document.getElementById('wd_translation_container');
    const translationTextElement = document.getElementById('wd_translation_text');
    
    translationContainer.style.display = 'block';
    translationTextElement.innerHTML = 
        `<button class="wdAddButton" onclick="openTranslateTab('${text}', '${targetLang}')">
            Click to translate in new tab
        </button>`;
}

function openTranslateTab(text, targetLang) {
    const url = `https://translate.google.com/#en/${targetLang}/${encodeURIComponent(text)}`;
    chrome.runtime.sendMessage({wdm_new_tab_url: url});
}
```

## Implementation Timeline

### Week 1: Core Development
- [ ] Implement translation API functions
- [ ] Create caching system
- [ ] Add basic UI components

### Week 2: Integration
- [ ] Integrate with existing hover system
- [ ] Add CSS styling
- [ ] Implement error handling

### Week 3: Settings & Polish
- [ ] Create settings UI
- [ ] Add language selection
- [ ] Implement debouncing and optimization

### Week 4: Testing & Refinement
- [ ] Test with various languages
- [ ] Performance optimization
- [ ] Bug fixes and polish

## Testing Strategy

### Unit Tests
- Translation function with various inputs
- Cache storage and retrieval
- Error handling scenarios

### Integration Tests
- Hover behavior with translation enabled/disabled
- Settings persistence
- Fallback mechanisms

### User Experience Tests
- Translation speed and accuracy
- UI responsiveness
- Different language combinations

## Risk Mitigation

### API Reliability
- **Risk**: Google Translate API might be unreliable or blocked
- **Mitigation**: Implement fallback to tab-opening behavior

### Performance Impact
- **Risk**: Translation requests might slow down hover interactions
- **Mitigation**: Implement debouncing, caching, and async loading

### Storage Usage
- **Risk**: Translation cache might grow too large
- **Mitigation**: Implement cache size limits and expiration

### Rate Limiting
- **Risk**: Too many translation requests might trigger rate limits
- **Mitigation**: Implement request throttling and smart caching

## Success Metrics

### User Experience
- [ ] Translation appears within 500ms of hover
- [ ] Cache hit rate > 60% for common words
- [ ] Error rate < 5% for translation requests

### Performance
- [ ] No noticeable impact on page load time
- [ ] Memory usage increase < 10MB
- [ ] CPU usage impact < 5%

### Functionality
- [ ] Supports at least 20 target languages
- [ ] 95%+ accuracy for common words
- [ ] Graceful fallback in all error scenarios

## Future Enhancements

### Phase 2 Features
- Pronunciation audio for translations
- Alternative translation suggestions
- Translation history
- Custom translation services

### Advanced Features
- Offline translation support
- Machine learning for better context
- Integration with user vocabulary
- Translation quality indicators

---

## Questions for Final Decision

1. **Language Preference**: Auto-detect from browser UI language or manual selection?

2. **Translation Trigger**: 
   - Instant on hover (with 500ms delay)
   - Click button in hover bubble
   - Both options in settings

3. **UI Layout**: 
   - Show translation below word info
   - Expandable translation section
   - Replace existing buttons to save space

4. **Fallback Strategy**: 
   - Show error message and fallback button
   - Hide translation section on failure
   - Always show "click to translate" option

5. **Caching Approach**:
   - 24-hour cache with 1000 item limit
   - Permanent cache for common words
   - No caching (always fresh)

6. **Language Support Priority**:
   - Focus on top 10 languages initially
   - Support all Google Translate languages
   - Let users request specific languages

Please review this plan and provide feedback on the preferred approaches for the questions above.
