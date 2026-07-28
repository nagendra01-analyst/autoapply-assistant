// options.js
// Stores the Anthropic API key only in chrome.storage.local. Never transmitted anywhere
// except directly to api.anthropic.com when generating tailored content.

const input = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const savedMsg = document.getElementById('savedMsg');

async function load() {
    const { apiKey } = await chrome.storage.local.get('apiKey');
    if (apiKey) input.value = apiKey;
}

saveBtn.addEventListener('click', async () => {
    const apiKey = input.value.trim();
    await chrome.storage.local.set({ apiKey });
    savedMsg.textContent = 'Saved';
    setTimeout(() => { savedMsg.textContent = ''; }, 2000);
});

load();
