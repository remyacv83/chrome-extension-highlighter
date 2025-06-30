// Chrome extension content script for text highlighting
(function() {
    'use strict';

    // Configuration
    const HIGHLIGHT_CLASS = 'replit-highlight';
    const HIGHLIGHT_COLOR = '#ffeb3b';
    const HIGHLIGHT_ID_PREFIX = 'highlight-';

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
            tooltip.textContent = 'Click to remove';
            highlightSpan.appendChild(tooltip);
            
            // Add click handler for removal
            highlightSpan.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                removeHighlight(this);
            });
            
            // Wrap the selected content
            try {
                range.surroundContents(highlightSpan);
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
                console.error('Error creating highlight:', error);
                // Fallback: try to extract and highlight
                extractAndHighlight(range, highlightSpan, highlightId, text);
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

})();
