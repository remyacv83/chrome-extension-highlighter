(function() {
    'use strict';
    
    const HIGHLIGHT_CLASS = 'replit-highlighter-highlight';
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        addHighlightStyles();
        setupEventListeners();
        loadPageHighlights();
    }
    
    function addHighlightStyles() {
        // Check if styles already added
        if (document.getElementById('replit-highlighter-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'replit-highlighter-styles';
        style.textContent = `
            .${HIGHLIGHT_CLASS} {
                background-color: yellow !important;
                cursor: pointer !important;
                padding: 1px 2px !important;
                border-radius: 2px !important;
                transition: background-color 0.2s ease !important;
            }
            
            .${HIGHLIGHT_CLASS}:hover {
                background-color: #ffeb3b !important;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    function setupEventListeners() {
        document.addEventListener('mouseup', handleTextSelection);
        document.addEventListener('keydown', handleKeyPress);
        document.addEventListener('click', handleContextMenu);
    }
    
    function handleTextSelection(event) {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText.length > 0 && selectedText.length <= 1000) {
            createHighlight(selection, selectedText);
        }
    }
    
    function handleKeyPress(event) {
        // Delete key to remove highlight
        if (event.key === 'Delete' && event.target.classList.contains(HIGHLIGHT_CLASS)) {
            removeHighlight(event.target);
        }
    }
    
    function createHighlight(selection, text) {
        try {
            const range = selection.getRangeAt(0);
            const highlightId = generateHighlightId();
            
            // Create highlight element
            const highlightSpan = document.createElement('span');
            highlightSpan.className = HIGHLIGHT_CLASS;
            highlightSpan.setAttribute('data-highlight-id', highlightId);
            highlightSpan.title = 'Click to remove highlight';
            
            // Add click handler for removal
            highlightSpan.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                removeHighlight(this);
            });
            
            // Wrap the selected content
            try {
                range.surroundContents(highlightSpan);
                
                // Save highlight to storage
                saveHighlight({
                    id: highlightId,
                    text: text,
                    url: window.location.href,
                    title: document.title,
                    timestamp: Date.now(),
                    xpath: getXPath(highlightSpan)
                });
                
                // Clear selection
                selection.removeAllRanges();
                
            } catch (error) {
                console.log('Could not highlight selection - may span multiple elements');
            }
            
        } catch (error) {
            console.error('Error creating highlight:', error);
        }
    }
    
    function removeHighlight(highlightElement) {
        const highlightId = highlightElement.getAttribute('data-highlight-id');
        
        // Replace highlight with its text content
        const parent = highlightElement.parentNode;
        const textNode = document.createTextNode(highlightElement.textContent);
        parent.replaceChild(textNode, highlightElement);
        
        // Merge adjacent text nodes
        parent.normalize();
        
        // Remove from storage
        deleteHighlight(highlightId);
    }
    
    function generateHighlightId() {
        return 'highlight_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
        return '';
    }
    
    function saveHighlight(highlight) {
        chrome.storage.local.get(['highlights'], function(result) {
            const highlights = result.highlights || {};
            const url = window.location.href;
            
            if (!highlights[url]) {
                highlights[url] = [];
            }
            
            highlights[url].push(highlight);
            
            chrome.storage.local.set({ highlights: highlights }, function() {
                console.log('Highlight saved');
            });
        });
    }
    
    function deleteHighlight(highlightId) {
        chrome.storage.local.get(['highlights'], function(result) {
            const highlights = result.highlights || {};
            const url = window.location.href;
            
            if (highlights[url]) {
                highlights[url] = highlights[url].filter(h => h.id !== highlightId);
                
                if (highlights[url].length === 0) {
                    delete highlights[url];
                }
                
                chrome.storage.local.set({ highlights: highlights }, function() {
                    console.log('Highlight deleted');
                });
            }
        });
    }
    
    function loadPageHighlights() {
        chrome.storage.local.get(['highlights'], function(result) {
            const highlights = result.highlights || {};
            const url = window.location.href;
            
            if (highlights[url]) {
                highlights[url].forEach(highlight => {
                    restoreHighlight(highlight);
                });
            }
        });
    }
    
    function restoreHighlight(highlight) {
        try {
            // Simple text-based restoration
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let node;
            while (node = walker.nextNode()) {
                const text = node.textContent;
                const index = text.indexOf(highlight.text);
                
                if (index !== -1 && !node.parentElement.classList.contains(HIGHLIGHT_CLASS)) {
                    const range = document.createRange();
                    range.setStart(node, index);
                    range.setEnd(node, index + highlight.text.length);
                    
                    const highlightSpan = document.createElement('span');
                    highlightSpan.className = HIGHLIGHT_CLASS;
                    highlightSpan.setAttribute('data-highlight-id', highlight.id);
                    highlightSpan.title = 'Click to remove highlight';
                    
                    highlightSpan.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        removeHighlight(this);
                    });
                    
                    try {
                        range.surroundContents(highlightSpan);
                        break; // Only restore first match
                    } catch (error) {
                        console.log('Could not restore highlight:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Error restoring highlight:', error);
        }
    }
    
    function handleContextMenu(event) {
        // Handle clicks on highlighted text
        if (event.target.classList.contains(HIGHLIGHT_CLASS)) {
            event.preventDefault();
        }
    }
    
})();