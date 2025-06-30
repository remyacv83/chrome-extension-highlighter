// Chrome extension popup script
document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // DOM elements
    const highlightsList = document.getElementById('highlights-list');
    const emptyState = document.getElementById('empty-state');
    const noResults = document.getElementById('no-results');
    const highlightCount = document.getElementById('highlight-count');
    const searchInput = document.getElementById('search-input');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const exportBtn = document.getElementById('export-btn');

    // State
    let allHighlights = [];
    let filteredHighlights = [];

    // Initialize popup
    init();

    function init() {
        loadHighlights();
        setupEventListeners();
    }

    function setupEventListeners() {
        // Search functionality
        searchInput.addEventListener('input', handleSearch);
        
        // Clear all highlights
        clearAllBtn.addEventListener('click', handleClearAll);
        
        // Export highlights
        exportBtn.addEventListener('click', handleExport);
    }

    function loadHighlights() {
        chrome.storage.local.get(['highlights'], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error loading highlights:', chrome.runtime.lastError);
                showError('Failed to load highlights');
                return;
            }

            allHighlights = result.highlights || [];
            filteredHighlights = [...allHighlights];
            
            // Sort by timestamp (newest first)
            filteredHighlights.sort((a, b) => b.timestamp - a.timestamp);
            
            updateUI();
        });
    }

    function updateUI() {
        updateHighlightCount();
        renderHighlights();
        updateEmptyState();
    }

    function updateHighlightCount() {
        const count = filteredHighlights.length;
        highlightCount.textContent = `${count} highlight${count !== 1 ? 's' : ''}`;
    }

    function renderHighlights() {
        highlightsList.innerHTML = '';

        filteredHighlights.forEach(highlight => {
            const highlightElement = createHighlightElement(highlight);
            highlightsList.appendChild(highlightElement);
        });
    }

    function createHighlightElement(highlight) {
        const div = document.createElement('div');
        div.className = 'highlight-item';
        div.setAttribute('data-highlight-id', highlight.id);

        // Format date
        const date = new Date(highlight.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        // Truncate long text
        const displayText = highlight.text.length > 200 ? 
            highlight.text.substring(0, 200) + '...' : 
            highlight.text;

        // Get domain from URL
        const domain = getDomain(highlight.url);

        div.innerHTML = `
            <div class="highlight-content">
                <div class="highlight-text">${escapeHtml(displayText)}</div>
                <div class="highlight-meta">
                    <div class="highlight-source">
                        <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        <span class="source-domain">${escapeHtml(domain)}</span>
                        <span class="source-title">${escapeHtml(highlight.title)}</span>
                    </div>
                    <div class="highlight-date">${formattedDate}</div>
                </div>
            </div>
            <div class="highlight-actions">
                <button class="action-btn visit-btn" title="Visit page" data-url="${escapeHtml(highlight.url)}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15,3 21,3 21,9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </button>
                <button class="action-btn copy-btn" title="Copy text" data-text="${escapeHtml(highlight.text)}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
                <button class="action-btn delete-btn" title="Delete highlight" data-highlight-id="${highlight.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                    </svg>
                </button>
            </div>
        `;

        // Add event listeners
        const visitBtn = div.querySelector('.visit-btn');
        const copyBtn = div.querySelector('.copy-btn');
        const deleteBtn = div.querySelector('.delete-btn');

        visitBtn.addEventListener('click', () => handleVisitPage(highlight.url));
        copyBtn.addEventListener('click', () => handleCopyText(highlight.text));
        deleteBtn.addEventListener('click', () => handleDeleteHighlight(highlight.id));

        return div;
    }

    function updateEmptyState() {
        const hasHighlights = allHighlights.length > 0;
        const hasFilteredResults = filteredHighlights.length > 0;
        const isSearching = searchInput.value.trim().length > 0;

        if (!hasHighlights) {
            // No highlights at all
            emptyState.style.display = 'block';
            noResults.style.display = 'none';
            highlightsList.style.display = 'none';
        } else if (isSearching && !hasFilteredResults) {
            // Has highlights but no search results
            emptyState.style.display = 'none';
            noResults.style.display = 'block';
            highlightsList.style.display = 'none';
        } else {
            // Has highlights and results
            emptyState.style.display = 'none';
            noResults.style.display = 'none';
            highlightsList.style.display = 'block';
        }
    }

    function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();
        
        if (query === '') {
            filteredHighlights = [...allHighlights];
        } else {
            filteredHighlights = allHighlights.filter(highlight => 
                highlight.text.toLowerCase().includes(query) ||
                highlight.title.toLowerCase().includes(query) ||
                highlight.url.toLowerCase().includes(query)
            );
        }

        // Sort filtered results
        filteredHighlights.sort((a, b) => b.timestamp - a.timestamp);
        
        updateUI();
    }

    function handleVisitPage(url) {
        chrome.tabs.create({ url: url });
        window.close();
    }

    function handleCopyText(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Text copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text:', err);
            showToast('Failed to copy text', 'error');
        });
    }

    function handleDeleteHighlight(highlightId) {
        if (!confirm('Are you sure you want to delete this highlight?')) {
            return;
        }

        // Remove from storage
        const updatedHighlights = allHighlights.filter(h => h.id !== highlightId);
        
        chrome.storage.local.set({ highlights: updatedHighlights }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error deleting highlight:', chrome.runtime.lastError);
                showToast('Failed to delete highlight', 'error');
                return;
            }

            // Update local state
            allHighlights = updatedHighlights;
            
            // Reapply search filter
            handleSearch();
            
            showToast('Highlight deleted');

            // Notify content script to remove highlight from page
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'removeHighlight',
                        highlightId: highlightId
                    });
                }
            });
        });
    }

    function handleClearAll() {
        if (!confirm(`Are you sure you want to delete all ${allHighlights.length} highlights? This action cannot be undone.`)) {
            return;
        }

        chrome.storage.local.set({ highlights: [] }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error clearing highlights:', chrome.runtime.lastError);
                showToast('Failed to clear highlights', 'error');
                return;
            }

            allHighlights = [];
            filteredHighlights = [];
            updateUI();
            showToast('All highlights cleared');
        });
    }

    function handleExport() {
        if (allHighlights.length === 0) {
            showToast('No highlights to export', 'warning');
            return;
        }

        const exportData = {
            highlights: allHighlights,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `replit-highlights-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Exported ${allHighlights.length} highlights`);
    }

    function getDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (error) {
            return url;
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(message, type = 'success') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Hide and remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    function showError(message) {
        highlightsList.innerHTML = `
            <div class="error-message">
                <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }
});
