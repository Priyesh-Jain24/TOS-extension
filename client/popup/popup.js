document.getElementById('scan-btn').addEventListener('click', async () => {
  const btn = document.getElementById('scan-btn');
  const loading = document.getElementById('loading');
  const summaryContainer = document.getElementById('summary-container');
  const errorContainer = document.getElementById('error-container');

  // Reset state
  btn.disabled = true;
  loading.classList.add('visible');
  errorContainer.classList.remove('visible');
  errorContainer.textContent = '';
  summaryContainer.innerHTML = '';

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`[ToS Popup] Active tab: ${tab?.url}`);

    if (!tab || !tab.id) {
      throw new Error("Cannot access the current tab.");
    }

    // Attempt to extract text from the page
    const pageText = await extractPageText(tab.id);

    console.log(`[ToS Popup] Received text: ${pageText ? pageText.length : 0} chars`);
    if (pageText) {
      console.log(`[ToS Popup] Text preview (first 300):`, pageText.substring(0, 300));
    }

    if (!pageText) {
      throw new Error("Could not read page text. Make sure you're on a webpage with Terms of Service content.");
    }

    // Send to background script for AI summarization
    console.log(`[ToS Popup] Sending ${pageText.length} chars to background for summarization...`);
    const aiResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "summarize", text: pageText }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    console.log(`[ToS Popup] AI response received:`, aiResponse);

    if (aiResponse.error) {
      throw new Error(aiResponse.error);
    }

    console.log(`[ToS Popup] Summary HTML length: ${aiResponse.summary?.length} chars`);
    console.log(`[ToS Popup] Summary HTML:`, aiResponse.summary);
    summaryContainer.innerHTML = `<ul>${aiResponse.summary}</ul>`;

  } catch (err) {
    console.error(`[ToS Popup] Error:`, err);
    errorContainer.textContent = err.message;
    errorContainer.classList.add('visible');
  } finally {
    loading.classList.remove('visible');
    btn.disabled = false;
  }
});

/**
 * Tries to extract text from the page.
 * First attempts via the content script message.
 * If that fails (content script not loaded), injects it dynamically and retries.
 */
async function extractPageText(tabId) {
  // First try: send message to content script
  console.log(`[ToS Popup] Attempting to extract text via content script...`);
  let text = await sendExtractMessage(tabId);
  if (text) {
    console.log(`[ToS Popup] Content script responded with ${text.length} chars`);
    return text;
  }

  // Fallback: inject the content script programmatically and retry
  console.log(`[ToS Popup] Content script not responding, injecting dynamically...`);
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['scripts/content.js']
    });
    console.log(`[ToS Popup] Script injected, waiting 150ms...`);
    await new Promise(r => setTimeout(r, 150));
    text = await sendExtractMessage(tabId);
    console.log(`[ToS Popup] After injection, got ${text ? text.length : 0} chars`);
  } catch (injectErr) {
    console.error(`[ToS Popup] Injection failed:`, injectErr.message);
  }

  return text;
}

/**
 * Sends the extractText message to the content script and returns the text or null.
 */
function sendExtractMessage(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: "extractText" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.text) {
        console.log(`[ToS Popup] sendExtractMessage: no response`, chrome.runtime.lastError?.message);
        resolve(null);
      } else {
        resolve(response.text);
      }
    });
  });
}