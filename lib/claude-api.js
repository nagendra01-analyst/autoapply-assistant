// lib/claude-api.js
// Calls the Anthropic Messages API directly from the browser using the user's own API key,
// which is stored only in chrome.storage.local. Nothing is sent to any third-party backend.
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5-20250929';

function buildPrompt({ masterResume, jobDescription, jobTitle, company }) {
    return `You are helping a job applicant tailor application materials. You MUST only use facts, employers, titles, dates, and skills that already appear in the MASTER RESUME below. Never invent or embellish anything not present there. If the master resume lacks information needed to address something in the job description, simply omit it rather than making it up.

    MASTER RESUME:
    """
    ${masterResume}
    """

    JOB TITLE: ${jobTitle || '(not provided)'}
    COMPANY: ${company || '(not provided)'}
    JOB DESCRIPTION:
    """
    ${jobDescription || '(not provided)'}
    """

    Return ONLY valid JSON with this exact shape, no markdown fences, no commentary:
    {
      "summary": "3-4 sentence professional summary tailored to this job, using only facts from the master resume",
        "bullets": ["4-6 short bullet points highlighting the most relevant experience from the master resume for this job"],
          "coverLetter": "A specific, concrete cover letter of 250-350 words referencing actual requirements from the job description and grounded only in the master resume. No generic filler."
          }`;
}

export async function generateTailoredContent({ apiKey, masterResume, jobDescription, jobTitle, company }) {
    const res = await fetch(ANTHROPIC_URL, {
          method: 'POST',
          headers: {
                  'content-type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                  'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
                  model: MODEL,
                  max_tokens: 1500,
                  messages: [{ role: 'user', content: buildPrompt({ masterResume, jobDescription, jobTitle, company }) }],
          }),
    });

  if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
    const text = (data.content || []).map((b) => b.text || '').join('\n').trim();

  try {
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        return {
                summary: parsed.summary || '',
                bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
                coverLetter: parsed.coverLetter || '',
        };
  } catch (err) {
        // Model didn't return clean JSON - surface the raw text so the user still sees
      // something useful instead of failing silently.
      return { summary: text.slice(0, 800), bullets: [], coverLetter: '' };
  }
}
