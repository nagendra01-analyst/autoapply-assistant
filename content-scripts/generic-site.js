// content-scripts/generic-site.js
// Fallback adapter for any career portal that isn't LinkedIn/Indeed/Greenhouse/Lever/Workday.
// Pure heuristics only: no site-specific selectors, just common patterns (headings,
// class/id name hints, the largest text block, and any <form> with several inputs).
(function () {
    function guessJobDescription() {
          const candidates = Array.from(
                  document.querySelectorAll('[class*="description" i], [id*="description" i], [class*="job-detail" i], article, main')
                );
          let best = '';
          for (const el of candidates) {
                  const text = el.innerText ? el.innerText.trim() : '';
                  if (text.length > best.length) best = text;
          }
          if (!best) {
                  // Last resort: the largest text block on the page.
            const blocks = Array.from(document.querySelectorAll('div, section'));
                  for (const el of blocks) {
                            const text = el.innerText ? el.innerText.trim() : '';
                            if (text.length > best.length && text.length < 20000) best = text;
                  }
          }
          return best.slice(0, 8000);
    }

   function getJobTitle() {
         const el = document.querySelector('h1');
         return el ? el.textContent.trim() : document.title.trim();
   }

   function getCompany() {
         const meta = document.querySelector('meta[property="og:site_name"]');
         if (meta) return meta.getAttribute('content') || '';
         return location.hostname.replace(/^www\./, '').split('.')[0];
   }

   function findBestForm() {
         const forms = Array.from(document.querySelectorAll('form'));
         let best = null;
         let bestCount = 0;
         for (const form of forms) {
                 const count = form.querySelectorAll('input, textarea, select').length;
                 if (count > bestCount) {
                           best = form;
                           bestCount = count;
                 }
         }
         return best;
   }

   function getFormRoot() {
         return findBestForm() || document;
   }

   function isApplicationFormOpen() {
         const form = findBestForm();
         return !!form && form.querySelectorAll('input, textarea, select').length >= 3;
   }

   function findSubmitButton() {
         const root = getFormRoot();
         return (
                 root.querySelector('button[type="submit"], input[type="submit"]') ||
                 Array.from(root.querySelectorAll('button, a[role="button"]')).find((b) =>
                           /submit|apply now|send application/i.test(b.textContent)
                                                                                          )
               );
   }

   function detectJobPosting() {
         const description = guessJobDescription();
         if (!description || description.length < 200) return null;
         return { title: getJobTitle(), company: getCompany(), description };
   }

   window.AutoApplyEngine.init({
         siteName: 'generic',
         getJobDescription: guessJobDescription,
         getJobTitle,
         getCompany,
         getFormRoot,
         isApplicationFormOpen,
         findSubmitButton,
         detectJobPosting,
   });
})();
