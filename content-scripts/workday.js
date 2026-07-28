// content-scripts/workday.js
// Workday (myworkdayjobs.com / *.workday.com) is heavily customized per company - each
// tenant can theme labels, layouts, and even some element structure differently. This is a
// best-effort adapter built on Workday's data-automation-id conventions, which stay fairly
// consistent across tenants. NOTE: some companies' Workday instances may need selector
// tweaks in this file (e.g. a custom step name or a renamed field) - treat this as a
// starting point, not a guarantee.
(function () {
    function getJobDescription() {
          const el = document.querySelector('[data-automation-id="jobPostingDescription"]');
          return el ? el.innerText.trim().slice(0, 8000) : '';
    }

   function getJobTitle() {
         const el = document.querySelector('[data-automation-id="jobPostingHeader"]');
         return el ? el.textContent.trim() : '';
   }

   function getCompany() {
         // Workday rarely exposes the company name in a consistent element; fall back to the
      // subdomain (e.g. "acme" from acme.wd1.myworkdayjobs.com).
      const sub = location.hostname.split('.')[0];
         return sub || '';
   }

   function getFormRoot() {
         return document.querySelector('[data-automation-id="applyFlowPage"], [data-automation-id="page"]') || document;
   }

   function isApplicationFormOpen() {
         return !!document.querySelector('[data-automation-id="applyFlowPage"] input, [data-automation-id="applyFlowPage"] textarea');
   }

   function findSubmitButton() {
         const root = getFormRoot();
         return (
                 root.querySelector('[data-automation-id="bottom-navigation-next-button"]') ||
                 root.querySelector('[data-automation-id="submitButton"]') ||
                 Array.from(root.querySelectorAll('button')).find((b) => /submit|review and submit|next/i.test(b.textContent))
               );
   }

   function detectJobPosting() {
         const description = getJobDescription();
         if (!description) return null;
         return { title: getJobTitle(), company: getCompany(), description };
   }

   window.AutoApplyEngine.init({
         siteName: 'workday',
         getJobDescription,
         getJobTitle,
         getCompany,
         getFormRoot,
         isApplicationFormOpen,
         findSubmitButton,
         detectJobPosting,
   });
})();
