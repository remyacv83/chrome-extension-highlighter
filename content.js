// Chrome extension content script for text highlighting
(function() {
    'use strict';

    // Configuration
    const HIGHLIGHT_CLASS = 'replit-highlight';
    const HIGHLIGHT_COLOR = '#ffeb3b';
    const HIGHLIGHT_ID_PREFIX = 'highlight-';
    
    // AI definition cache
    const definitionCache = new Map();

    // Initialize extension
    init();

    function init() {
        // Add CSS for highlights
        addHighlightStyles();
        
        // Load existing highlights for this page
        loadPageHighlights();
        
        // Set up event listeners
        document.addEventListener('mouseup', handleTextSelection);
        document.addEventListener('keydown', handleKeyPress);
        document.addEventListener('contextmenu', handleContextMenu);
        
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener(handleMessage);
    }

    function addHighlightStyles() {
        if (document.getElementById('replit-highlight-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'replit-highlight-styles';
        style.textContent = `
            .${HIGHLIGHT_CLASS} {
                background-color: ${HIGHLIGHT_COLOR} !important;
                border-radius: 2px !important;
                cursor: pointer !important;
                position: relative !important;
            }
            .${HIGHLIGHT_CLASS}:hover {
                background-color: #fdd835 !important;
            }
            .highlight-tooltip {
                position: absolute;
                background: #333;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                top: -30px;
                left: 50%;
                transform: translateX(-50%);
                white-space: nowrap;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.2s;
            }
            .${HIGHLIGHT_CLASS}:hover .highlight-tooltip {
                opacity: 1;
            }
            .definition-popup {
                position: absolute;
                background: #ffffff;
                border: 2px solid #667eea;
                border-radius: 8px;
                padding: 12px;
                max-width: 300px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10001;
                font-size: 14px;
                line-height: 1.4;
                color: #333;
            }
            .definition-header {
                font-weight: bold;
                color: #667eea;
                margin-bottom: 6px;
                font-size: 13px;
            }
            .definition-text {
                margin-bottom: 8px;
            }
            .definition-close {
                position: absolute;
                top: 4px;
                right: 8px;
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                color: #999;
            }
            .definition-loading {
                color: #667eea;
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
    }

    function handleTextSelection(event) {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText.length > 0 && selectedText.length <= 1000) {
            // Create highlight
            createHighlight(selection, selectedText);
        }
    }

    function handleKeyPress(event) {
        // Delete highlight on Delete key when hovering over highlight
        if (event.key === 'Delete' && event.target.classList.contains(HIGHLIGHT_CLASS)) {
            removeHighlight(event.target);
        }
    }

    function createHighlight(selection, text) {
        try {
            const range = selection.getRangeAt(0);
            const highlightId = generateHighlightId();
            
            // Create highlight span
            const highlightSpan = document.createElement('span');
            highlightSpan.className = HIGHLIGHT_CLASS;
            highlightSpan.setAttribute('data-highlight-id', highlightId);
            highlightSpan.title = 'Click to remove highlight';
            
            // Add tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'highlight-tooltip';
            tooltip.textContent = 'Click to remove • Double-click for definition';
            highlightSpan.appendChild(tooltip);
            
            // Add click handlers
            highlightSpan.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                removeHighlight(this);
            });
            
            // Add double-click handler for definition
            highlightSpan.addEventListener('dblclick', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showDefinition(text, e.pageX, e.pageY);
            });
            
            // Safe highlighting approach that preserves text
            if (range.collapsed) {
                return; // No text selected
            }
            
            // Check if we can safely surround the contents
            try {
                // First remove the tooltip since surroundContents doesn't work with it
                highlightSpan.removeChild(tooltip);
                
                // Try to surround the contents
                range.surroundContents(highlightSpan);
                
                // Add tooltip back after surrounding
                highlightSpan.appendChild(tooltip);
                
                selection.removeAllRanges();
                
                // Save highlight to storage
                saveHighlight({
                    id: highlightId,
                    text: text,
                    url: window.location.href,
                    title: document.title,
                    timestamp: Date.now(),
                    xpath: getXPath(highlightSpan)
                });
                
            } catch (error) {
                console.error('Cannot highlight across multiple elements:', error);
                
                // Create a safer fallback that doesn't cut text
                const startContainer = range.startContainer;
                const endContainer = range.endContainer;
                
                // Only highlight if it's within the same text node
                if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
                    const textNode = startContainer;
                    const parent = textNode.parentNode;
                    
                    // Split the text node and wrap the middle part
                    const beforeText = textNode.textContent.substring(0, range.startOffset);
                    const selectedText = textNode.textContent.substring(range.startOffset, range.endOffset);
                    const afterText = textNode.textContent.substring(range.endOffset);
                    
                    // Create new text nodes
                    const beforeNode = document.createTextNode(beforeText);
                    const afterNode = document.createTextNode(afterText);
                    
                    // Set the highlight content
                    highlightSpan.textContent = selectedText;
                    highlightSpan.appendChild(tooltip);
                    
                    // Replace the original text node
                    parent.insertBefore(beforeNode, textNode);
                    parent.insertBefore(highlightSpan, textNode);
                    parent.insertBefore(afterNode, textNode);
                    parent.removeChild(textNode);
                    
                    selection.removeAllRanges();
                    
                    // Save highlight to storage
                    saveHighlight({
                        id: highlightId,
                        text: text,
                        url: window.location.href,
                        title: document.title,
                        timestamp: Date.now(),
                        xpath: getXPath(highlightSpan)
                    });
                } else {
                    console.log('Cannot highlight text that spans multiple elements');
                }
            }
            
        } catch (error) {
            console.error('Error in createHighlight:', error);
        }
    }

    function extractAndHighlight(range, highlightSpan, highlightId, text) {
        try {
            const contents = range.extractContents();
            highlightSpan.appendChild(contents);
            range.insertNode(highlightSpan);
            
            // Save highlight
            saveHighlight({
                id: highlightId,
                text: text,
                url: window.location.href,
                title: document.title,
                timestamp: Date.now(),
                xpath: getXPath(highlightSpan)
            });
        } catch (error) {
            console.error('Fallback highlight creation failed:', error);
        }
    }

    function removeHighlight(highlightElement) {
        const highlightId = highlightElement.getAttribute('data-highlight-id');
        
        // Remove from DOM
        const parent = highlightElement.parentNode;
        while (highlightElement.firstChild) {
            parent.insertBefore(highlightElement.firstChild, highlightElement);
        }
        parent.removeChild(highlightElement);
        
        // Remove from storage
        deleteHighlight(highlightId);
    }

    function generateHighlightId() {
        return HIGHLIGHT_ID_PREFIX + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    function getXPath(element) {
        if (element.id !== '') {
            return 'id("' + element.id + '")';
        }
        if (element === document.body) {
            return element.tagName;
        }

        let ix = 0;
        const siblings = element.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === element) {
                return getXPath(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
            }
        }
    }

    function saveHighlight(highlight) {
        chrome.storage.local.get(['highlights'], function(result) {
            const highlights = result.highlights || [];
            highlights.push(highlight);
            chrome.storage.local.set({ highlights: highlights }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error saving highlight:', chrome.runtime.lastError);
                }
            });
        });
    }

    function deleteHighlight(highlightId) {
        chrome.storage.local.get(['highlights'], function(result) {
            const highlights = result.highlights || [];
            const updatedHighlights = highlights.filter(h => h.id !== highlightId);
            chrome.storage.local.set({ highlights: updatedHighlights }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error deleting highlight:', chrome.runtime.lastError);
                }
            });
        });
    }

    function loadPageHighlights() {
        chrome.storage.local.get(['highlights'], function(result) {
            const highlights = result.highlights || [];
            const pageHighlights = highlights.filter(h => h.url === window.location.href);
            
            // Restore highlights on page
            pageHighlights.forEach(highlight => {
                restoreHighlight(highlight);
            });
        });
    }

    function restoreHighlight(highlight) {
        try {
            // Find text nodes that contain the highlight text
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let node;
            while (node = walker.nextNode()) {
                const nodeText = node.textContent;
                const index = nodeText.indexOf(highlight.text);
                
                if (index !== -1) {
                    // Create range for the found text
                    const range = document.createRange();
                    range.setStart(node, index);
                    range.setEnd(node, index + highlight.text.length);
                    
                    // Create highlight span
                    const highlightSpan = document.createElement('span');
                    highlightSpan.className = HIGHLIGHT_CLASS;
                    highlightSpan.setAttribute('data-highlight-id', highlight.id);
                    highlightSpan.title = 'Click to remove highlight';
                    
                    // Add tooltip
                    const tooltip = document.createElement('div');
                    tooltip.className = 'highlight-tooltip';
                    tooltip.textContent = 'Click to remove';
                    highlightSpan.appendChild(tooltip);
                    
                    // Add click handler
                    highlightSpan.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        removeHighlight(this);
                    });
                    
                    try {
                        range.surroundContents(highlightSpan);
                        break; // Stop after first match
                    } catch (error) {
                        console.error('Error restoring highlight:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Error in restoreHighlight:', error);
        }
    }

    // AI Definition Functions
    function handleContextMenu(event) {
        // Store context menu position for potential definition popup
        window.lastContextMenuX = event.pageX;
        window.lastContextMenuY = event.pageY;
    }

    function handleMessage(request, sender, sendResponse) {
        if (request.action === 'getDefinition') {
            showDefinition(request.text, window.lastContextMenuX || 0, window.lastContextMenuY || 0);
            return true;
        }
    }

    async function showDefinition(text, x, y) {
        // Remove any existing definition popup
        const existingPopup = document.querySelector('.definition-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Create definition popup
        const popup = document.createElement('div');
        popup.className = 'definition-popup';
        popup.style.left = x + 'px';
        popup.style.top = (y - 100) + 'px';

        // Add content
        popup.innerHTML = `
            <button class="definition-close" onclick="this.parentElement.remove()">×</button>
            <div class="definition-header">Definition of "${text}"</div>
            <div class="definition-text definition-loading">Getting definition...</div>
        `;

        document.body.appendChild(popup);

        // Position popup to stay within viewport
        const rect = popup.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            popup.style.left = (x - rect.width) + 'px';
        }
        if (rect.top < 0) {
            popup.style.top = (y + 20) + 'px';
        }

        try {
            const definition = await getDefinition(text);
            const definitionTextElement = popup.querySelector('.definition-text');
            if (definitionTextElement) {
                definitionTextElement.textContent = definition;
                definitionTextElement.classList.remove('definition-loading');
            }
        } catch (error) {
            const definitionTextElement = popup.querySelector('.definition-text');
            if (definitionTextElement) {
                definitionTextElement.textContent = 'Sorry, could not get definition. Please try again.';
                definitionTextElement.classList.remove('definition-loading');
                definitionTextElement.style.color = '#dc2626';
            }
        }

        // Auto-close after 10 seconds
        setTimeout(() => {
            if (popup.parentElement) {
                popup.remove();
            }
        }, 10000);
    }

    async function getDefinition(text) {
        const cacheKey = text.toLowerCase().trim();
        
        // Check cache first
        if (definitionCache.has(cacheKey)) {
            return definitionCache.get(cacheKey);
        }

        // Send message to background script to handle API call
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'fetchDefinition',
                text: text
            }, response => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response.success) {
                    // Cache the result
                    definitionCache.set(cacheKey, response.definition);
                    resolve(response.definition);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

})();
