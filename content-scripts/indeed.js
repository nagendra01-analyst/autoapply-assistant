// content-scripts/indeed.js
// Indeed adapter for its built-in apply flow.
(function () {
    function getJobDescription() {
          const el = document.querySelector('#jobDescriptionText, .jobsearch-JobComponent-description');
          return el ? el.innerText.trim().slice(0, 8000) : '';
    }

   function getJobTitle() {
         const el = document.querySelector('h1.jobsearch-JobInfoHeader-title, [data-testid="jobsearch-JobInfoHeader-title"]');
         return el ? el.textContent.trim() : '';
   }

   function getCompany() {
         const el = document.querySelector('[data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating div');
         return el ? el.textContent.trim() : '';
   }

   function getFormRoot() {
         return document.querySelector('#ia-container, form') || document;
   }

   function isApplicationFormOpen() {
         return !!document.querySelector('#ia-container form, .ia-BasePage form');
   }

   function findSubmitButton() {
         const root = getFormRoot();
         return (
                 root.querySelector('button[type="submit"]') ||
                 Array.from(root.querySelectorAll('button')).find((b) => /submit|continue|apply/i.test(b.textContent))
               );
   }

   function detectJobPosting() {
         const description = getJobDescription();
         if (!description) return null;
         return { title: getJobTitle(), company: getCompany(), description };
   }

   window.AutoApplyEngine.init({
         siteName: 'indeed',
         getJobDescription,
         getJobTitle,
         getCompany,
         getFormRoot,
         isApplicationFormOpen,
         findSubmitButton,
         detectJobPosting,
   });
})();
