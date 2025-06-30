# Replit Highlighter Chrome Extension

## Overview

This is a Chrome browser extension that allows users to highlight text on web pages and save those highlights locally. The extension provides a popup interface for managing highlights, including search, export, and deletion functionality. It uses Chrome's storage API for data persistence and content scripts for text highlighting functionality.

## System Architecture

The extension follows Chrome's Manifest V3 architecture with the following components:

### Frontend Architecture
- **Content Script**: Injected into web pages to handle text selection and highlighting
- **Popup Interface**: HTML/CSS/JavaScript-based popup for highlight management
- **Styling**: CSS-based design with modern UI components and responsive layout

### Extension Structure
- **Manifest V3**: Modern Chrome extension configuration
- **Content Script Injection**: Runs on all URLs (`<all_urls>`)
- **Popup Action**: Triggered from browser toolbar
- **Local Storage**: Chrome's storage API for data persistence

## Key Components

### 1. Content Script (`content.js`)
- **Text Selection Handler**: Captures user text selections with mouseup events
- **Highlight Rendering**: Wraps selected text in styled span elements
- **Keyboard Shortcuts**: Handles keydown events for highlight operations
- **Dynamic Styling**: Injects CSS for highlight appearance
- **Tooltip System**: Shows interactive tooltips on hover

### 2. Popup Interface (`popup.html`, `popup.js`, `styles.css`)
- **Highlight Management**: Lists all saved highlights with metadata
- **Search Functionality**: Real-time filtering of highlights
- **Export Feature**: Allows users to export highlights data
- **Clear Operations**: Bulk deletion of highlights
- **Statistics Display**: Shows highlight count and usage stats

### 3. Extension Configuration (`manifest.json`)
- **Permissions**: Storage, activeTab, and scripting permissions
- **Host Permissions**: Access to all URLs for content script injection
- **Content Script Registration**: Automatic injection on page load

## Data Flow

1. **Text Selection**: User selects text on any webpage
2. **Content Script Processing**: Captures selection and creates highlight object
3. **Storage**: Saves highlight data to Chrome's local storage
4. **Visual Rendering**: Applies highlight styling to selected text
5. **Popup Sync**: Updates popup interface with new highlight data
6. **Search & Filter**: Processes user queries to filter highlights
7. **Export**: Generates downloadable highlight data files

## External Dependencies

### Chrome APIs
- **chrome.storage.local**: Persistent local data storage
- **chrome.runtime**: Extension runtime management
- **chrome.scripting**: Content script injection (implied by permissions)
- **chrome.activeTab**: Current tab access

### Web Standards
- **DOM Manipulation**: Native JavaScript for text highlighting
- **CSS Styling**: Modern CSS with flexbox and grid layouts
- **Event Handling**: Standard DOM event listeners

## Deployment Strategy

### Development
- Standard Chrome extension development workflow
- Load unpacked extension for testing
- Chrome Developer Tools for debugging

### Distribution
- Chrome Web Store publication (standard extension distribution)
- Manual installation via developer mode
- Enterprise deployment through Chrome policy management

### Storage Strategy
- Local storage only (no cloud sync)
- JSON-based data structure for highlights
- Page URL-based organization of highlights

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- June 30, 2025. Initial setup