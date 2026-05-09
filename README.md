# Brave Search Quick AI Answers (Raycast Extension)

Brave Search Quick AI Answers is a Raycast extension that lets you ask Brave Search AI for fast, privacy-focused answers backed by real-time web results.

If you are looking for a Raycast AI replacement, this extension is a practical alternative powered by your own Brave Search API key.

## Why this extension exists

Raycast AI does not currently support Brave's AI Answers API directly because the APIs are not compatible.
This extension bridges that gap by bringing Brave AI Answers into Raycast through a dedicated command.

## Features

- Ask Brave AI directly from Raycast
- Get privacy-respecting AI answers grounded in live web search
- Use your own Brave Search API key
- Copy answers instantly with a keyboard shortcut
- **Optional Autosuggest**: Get search suggestions as you type using Brave's Autosuggest API (requires separate API key)

## Setup

1. Create a Brave Search API key at [api-dashboard.search.brave.com/app/keys](https://api-dashboard.search.brave.com/app/keys). (An active Brave Search API plan for Brave Answers is needed, the free tier includes 5$/month credit.)
2. **Optional**: Create a Brave Autosuggest API key at the same location if you want search suggestions as you type.
3. Open Raycast, search for **Ask Brave**, and open the command preferences.
4. Paste your Brave Answers API key into the **Brave API Key** field.
5. **Optional**: Paste your Brave Autosuggest API key into the **Brave Autosuggest API Key (Optional)** field to enable search suggestions.

## How to use

1. Open Raycast and run **Ask Brave**.
2. Enter your question in the search bar.
   - If you've configured the Autosuggest API key, you'll see suggestions appear as you type. Click on a suggestion to use it.
3. Press **Enter** to send the request to Brave AI Answers.
4. Read the result in the Detail view.
5. Press **⌘C** to copy the full answer.

## Roadmap

- [x] Search autocomplete: integrated the Brave Autosuggest API for search recommendations while typing
- [ ] Design improvements: try to replicate the Raycast AI UI better in the limits of markdown
- [ ] Better citations UI: improve how sources are displayed so references are easier to scan, verify, and open without breaking reading flow.
- [ ] Follow-up questions: support conversational continuation so users can ask clarifying questions based on the previous answer without starting from scratch.
