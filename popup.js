// popup.js
// Loads/saves the profile and master resume, triggers a fill on the active tab, and renders
// the plain application log (title, company, status, timestamp). No fake progress, no
// guaranteed-success claims.

const PROFILE_FIELDS = [
    'firstName', 'lastName', 'email', 'phone', 'city', 'state',
    'linkedinUrl', 'portfolioUrl', 'currentTitle', 'currentCompany',
  ];

function byId(id) {
    return document.getElementById(id);
}

async function loadProfile() {
    const { profile } = await chrome.storage.local.get('profile');
    if (!profile) return;
    const form = byId('profileForm');
    for (const field of PROFILE_FIELDS) {
          if (form.elements[field] && profile[field]) form.elements[field].value = profile[field];
    }
}

async function loadResume() {
    const { masterResume } = await chrome.storage.local.get('masterResume');
    if (masterResume) byId('masterResume').value = masterResume;
}

function statusBadge(status) {
    const cls = status === 'ready to submit' ? 'ready' : 'review';
    return `<span class="status-badge ${cls}">${status}</span>`;
}

function formatTimestamp(ts) {
    try {
          return new Date(ts).toLocaleString();
    } catch (err) {
          return '';
    }
}

async function loadLog() {
    const { applicationLog = [] } = await chrome.storage.local.get('applicationLog');
    const container = byId('appLog');
    container.innerHTML = '';
    if (!applicationLog.length) {
          const empty = document.createElement('div');
          empty.className = 'log-empty';
          empty.textContent = 'No applications filled yet.';
          container.appendChild(empty);
          return;
    }
    for (const entry of applicationLog.slice(0, 20)) {
          const row = document.createElement('div');
          row.className = 'log-entry';
          const title = document.createElement('div');
          title.className = 'title';
          title.textContent = entry.title || '(untitled)';
          const meta = document.createElement('div');
          meta.className = 'meta';
          meta.innerHTML = `${entry.company || ''} \u00b7 ${formatTimestamp(entry.timestamp)} \u00b7 ${statusBadge(entry.status)}`;
          row.appendChild(title);
          row.appendChild(meta);
          container.appendChild(row);
    }
}

async function init() {
    await loadProfile();
    await loadResume();
    await loadLog();
}

byId('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const profile = {};
    for (const field of PROFILE_FIELDS) {
          profile[field] = (form.elements[field] && form.elements[field].value.trim()) || '';
    }
    await chrome.storage.local.set({ profile });
    const msg = byId('profileSaved');
    msg.textContent = 'Saved';
    setTimeout(() => { msg.textContent = ''; }, 2000);
});

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
    });
}

byId('saveResumeBtn').addEventListener('click', async () => {
    const masterResume = byId('masterResume').value.trim();
    const fileInput = byId('resumeFile');
    const updates = { masterResume };

                                         if (fileInput.files && fileInput.files[0]) {
                                               const file = fileInput.files[0];
                                               const dataUrl = await readFileAsDataUrl(file);
                                               updates.resumeFile = { name: file.name, type: file.type, dataUrl };
                                         }

                                         await chrome.storage.local.set(updates);
    const msg = byId('resumeSaved');
    msg.textContent = 'Saved';
    setTimeout(() => { msg.textContent = ''; }, 2000);
});

byId('fillBtn').addEventListener('click', async () => {
    const status = byId('fillStatus');
    status.textContent = 'Filling\u2026';
    try {
          const resp = await chrome.runtime.sendMessage({ type: 'FILL_ACTIVE_TAB' });
          if (resp && resp.ok) {
                  const r = resp.response || {};
                  status.textContent = `Filled ${r.filledCount || 0} field(s). ${r.riskyCount || 0} flagged for your review.`;
          } else {
                  status.textContent = 'Could not fill this page (no supported form detected, or the page needs a refresh).';
          }
    } catch (err) {
          status.textContent = 'Error: ' + String((err && err.message) || err);
    }
    await loadLog();
});

init();
