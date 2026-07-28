// content-scripts/linkedin.js
// LinkedIn adapter: handles both Easy Apply (in-page multi-step modal) and Regular Apply
// (which redirects off LinkedIn - the redirect itself is detected/handled by background.js
// via openerTabId / hostname change, this file just needs to capture the job description
// before the user clicks Apply).
(function () {
    function getJobDescription() {
          const el = document.querySelector('.jobs-description__content, .jobs-box__html-content, #job-details');
          return el ? el.innerText.trim().slice(0, 8000) : '';
    }

   function getJobTitle() {
         const el = document.querySelector('.job-details-jobs-unified-top-card__job-title, h1');
         return el ? el.textContent.trim() : '';
   }

   function getCompany() {
         const el = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name');
         return el ? el.textContent.trim() : '';
   }

   function getFormRoot() {
         // Easy Apply renders its multi-step form inside this modal dialog.
      return document.querySelector('.jobs-easy-apply-modal, [role="dialog"]') || document;
   }

   function isApplicationFormOpen() {
         return !!document.querySelector('.jobs-easy-apply-modal, [role="dialog"] input, [role="dialog"] textarea');
   }

   function findSubmitButton() {
         const root = getFormRoot();
         return (
                 root.querySelector('button[aria-label*="Submit application" i]') ||
                 root.querySelector('button[aria-label*="Review" i]') ||
                 Array.from(root.querySelectorAll('button')).find((b) => /submit application/i.test(b.textContent))
               );
   }

   function detectJobPosting() {
         const description = getJobDescription();
         if (!description) return null;
         return { title: getJobTitle(), company: getCompany(), description };
   }

   window.AutoApplyEngine.init({
         siteName: 'linkedin',
         getJobDescription,
         getJobTitle,
         getCompany,
         getFormRoot,
         isApplicationFormOpen,
         findSubmitButton,
         detectJobPosting,
   });
})();
