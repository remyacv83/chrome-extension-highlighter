// Background script for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
    // Create context menu for definitions
    chrome.contextMenus.create({
        id: "getDefinition",
        title: "Get AI definition",
        contexts: ["selection"]
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "getDefinition" && info.selectionText) {
        // Send message to content script to show definition
        chrome.tabs.sendMessage(tab.id, {
            action: "getDefinition",
            text: info.selectionText
        });
    }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchDefinition") {
        fetchDefinition(request.text)
            .then(definition => {
                sendResponse({ success: true, definition: definition });
            })
            .catch(error => {
                console.error('Error fetching definition:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Will respond asynchronously
    }
});

// Fetch definition from OpenAI API
async function fetchDefinition(text) {
    // Get API key from Chrome storage
    const result = await chrome.storage.local.get(['openai_api_key']);
    const API_KEY = result.openai_api_key;
    
    if (!API_KEY) {
        throw new Error('OpenAI API key not configured. Please set it in the extension popup.');
    }
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that provides clear, concise definitions. Respond with just the definition in 1-2 sentences, no extra formatting."
                    },
                    {
                        role: "user",
                        content: `Define "${text}" in simple terms.`
                    }
                ],
                max_tokens: 100,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        throw new Error(`Failed to get definition: ${error.message}`);
    }
}