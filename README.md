# Replit Highlighter Chrome Extension

## Quick Start

1. **Download all files** from this Replit to your local computer
2. **Create a folder** on your computer (e.g., "replit-highlighter")
3. **Copy these files** into that folder:
   - manifest.json
   - content.js
   - popup.html
   - popup.js
   - styles.css
   - icon.svg

## Install Extension in Chrome

1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Turn on **"Developer mode"** (toggle in top right corner)
4. Click **"Load unpacked"**
5. Select your extension folder (the one with manifest.json)
6. The extension icon should appear in your Chrome toolbar

## Test the Extension

1. Visit any webpage (like Google, Wikipedia, etc.)
2. Select any text on the page
3. The text should automatically highlight in yellow
4. Click the extension icon in your toolbar to see saved highlights
5. Use the popup to search, export, or delete highlights

## Features

- **Auto-highlight**: Select text to automatically save and highlight it
- **Local storage**: All highlights saved in your browser
- **Search**: Find highlights by text content
- **Export**: Download highlights as JSON file
- **Clean interface**: Modern popup design

## Troubleshooting

- Make sure all 6 files are in the same folder
- Refresh web pages after installing the extension
- Check Chrome console (F12) for any errors
- Verify extension is enabled in chrome://extensions/

## Files Included

- `manifest.json` - Extension configuration
- `content.js` - Text highlighting functionality
- `popup.html` - User interface
- `popup.js` - Popup functionality
- `styles.css` - Styling
- `icon.svg` - Extension icon