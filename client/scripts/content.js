// Content script: extracts page text when requested by the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractText") {
    try {
      let pageText = "";
      let source = "none";

      // Try to find ToS-specific content by looking for common containers
      const selectors = [
        'article',
        '[role="main"]',
        'main',
        '.terms-of-service',
        '.tos-content',
        '#tos',
        '#terms',
        '.legal-content',
        '.policy-content'
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText.trim().length > 500) {
          pageText = el.innerText;
          source = selector;
          break;
        }
      }

      // Fallback to full body text if no specific container found
      if (!pageText) {
        pageText = document.body.innerText;
        source = "document.body";
      }

      // Clean up whitespace
      pageText = pageText.replace(/\s+/g, ' ').trim();

      console.log(`[ToS Content Script] Source: ${source}`);
      console.log(`[ToS Content Script] Raw text length: ${pageText.length} chars`);
      console.log(`[ToS Content Script] First 500 chars:`, pageText.substring(0, 500));
      console.log(`[ToS Content Script] Last 500 chars:`, pageText.substring(pageText.length - 500));

      // Truncate to avoid massive payloads
      const truncated = pageText.substring(0, 20000);
      console.log(`[ToS Content Script] Sending ${truncated.length} chars to popup (truncated from ${pageText.length})`);

      sendResponse({ text: truncated });
    } catch (err) {
      console.error(`[ToS Content Script] Error:`, err);
      sendResponse({ text: null, error: err.message });
    }
  }
  return true;
});