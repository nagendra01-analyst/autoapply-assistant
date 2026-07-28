# AutoApply Assistant

A Manifest V3 Chrome extension that autofills job applications from a saved profile and
resume, and drafts a tailored resume summary and cover letter for each job using the
Anthropic Claude API. It never auto-submits, never fabricates resume content, and never
guesses on salary, EEO, or legal/work-authorization questions - those are always flagged
in amber for you to fill in yourself.

## What it supports

- LinkedIn: Easy Apply (in-page modal) and Regular Apply (redirect to a company site or an
  ATS like Workday/Greenhouse/Lever), in both new-tab and same-tab redirect cases.
- Indeed's built-in apply flow.
- Greenhouse and Lever (shared adapter).
- Workday, via a best-effort `data-automation-id` based adapter. Workday is heavily themed
  per company, so some tenants may need selector tweaks in `content-scripts/workday.js`.
- Any other career portal, via a generic heuristic fallback adapter (label text, name/id,
  placeholder, autocomplete).
- Forms embedded in iframes (`all_frames: true` on every content script).

## What it will never do

- Click Submit/Apply for you. It only highlights the button in green once filling is done;
  final submission is always a manual, human action.
- Guess on salary/compensation, EEO (veteran/disability/race/gender), legal/work-authorization
  (visa, sponsorship, background check), or open-ended essay questions. Those fields are
  highlighted in amber and left for you.
- Invent resume content. Tailored summaries and cover letters are generated only from facts
  already present in your pasted master resume.
- Send your resume, job descriptions, or API key anywhere except directly from your browser
  to `api.anthropic.com`. There is no third-party backend.

## Setup

1. Clone or download this repository.
2. Go to `chrome://extensions`, enable Developer mode, and click "Load unpacked".
3. Select this folder.
4. Click the extension icon and fill in your profile and master resume (plain text) in the
   popup, and optionally upload your resume file for auto-upload.
5. Open the extension's Options page and enter your own Anthropic API key. It is stored only
   in `chrome.storage.local` on your machine.
6. Open a job posting on a supported site, click Apply, and use the "Fill this application"
   button in the popup (or let it auto-continue across tabs/redirects).

## File layout

- `manifest.json` - MV3 config: permissions, host permissions, content scripts per site plus
  a generic fallback, all with `all_frames: true`.
- `background.js` - service worker: tab/hostname tracking across the apply flow, Claude API
  orchestration, message routing, application log.
- `popup.html` / `popup.js` / `popup.css` - profile + resume setup, trigger fill, application log.
- `options.html` / `options.js` - Anthropic API key entry.
- `lib/field-mapper.js` - label/name/id/placeholder/autocomplete -> profile-field heuristics.
- `lib/risky-fields.js` - detects salary/EEO/legal/essay/unclassified fields and highlights them.
- `lib/claude-api.js` - calls the Anthropic Messages API for tailored content.
- `content-scripts/generic-autofill.js` - shared engine used by every adapter.
- `content-scripts/linkedin.js`, `indeed.js`, `greenhouse-lever.js`, `workday.js`,
  `generic-site.js` - per-site adapters.

## Honest limitations

This is a best-effort tool, not a guarantee. Selectors on any given site can change, Workday
tenants vary widely, and the generic fallback is pure heuristics. Always review a filled form
before submitting it.
