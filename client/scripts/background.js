// Background service worker: proxies summarization requests to the backend
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarize") {
    console.log(`[ToS Background] Received summarize request, text length: ${request.text?.length} chars`);
    console.log(`[ToS Background] Text preview (first 300):`, request.text?.substring(0, 300));

    summarizeText(request.text)
      .then(summary => {
        console.log(`[ToS Background] Summary received, length: ${summary?.length} chars`);
        console.log(`[ToS Background] Summary content:`, summary);
        sendResponse({ summary });
      })
      .catch(error => {
        console.error(`[ToS Background] Error:`, error.message);
        sendResponse({ error: error.message });
      });

    return true; // Keep the message channel open for async response
  }
});

async function summarizeText(text) {
  if (!text || text.trim().length === 0) {
    throw new Error("No text to summarize.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    console.log(`[ToS Background] Sending to backend: http://localhost:3000/api/summarize`);
    const response = await fetch('http://localhost:3000/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text }),
      signal: controller.signal
    });

    console.log(`[ToS Background] Backend response status: ${response.status}`);
    const data = await response.json();
    console.log(`[ToS Background] Backend response data:`, data);

    if (!response.ok) {
      throw new Error(data.error || `Server error (${response.status})`);
    }

    if (!data.summary) {
      throw new Error("Received empty summary from server.");
    }

    return data.summary;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error("Request timed out. Make sure the backend server is running.");
    }
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error("Cannot connect to backend. Make sure the server is running on localhost:3000.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}