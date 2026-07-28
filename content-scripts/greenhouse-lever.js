// content-scripts/greenhouse-lever.js
// Greenhouse and Lever share broadly similar HTML structures, so one adapter covers both.
(function () {
    const isLever = /lever\.co$/.test(location.hostname);

   function getJobDescription() {
         const el = document.querySelector('#content, .posting, [data-qa="job-description"], .app-body, .job-post');
         return el ? el.innerText.trim().slice(0, 8000) : '';
   }

   function getJobTitle() {
         const el = document.querySelector('h1, .posting-headline h2, .app-title');
         return el ? el.textContent.trim() : '';
   }

   function getCompany() {
         const el = document.querySelector('.company-name, [data-qa="posting-company"]');
         if (el) return el.textContent.trim();
         return document.title.split(/[-|]/).pop().trim();
   }

   function getFormRoot() {
         return document.querySelector('#application_form, form#application-form, .application-form, form') || document;
   }

   function isApplicationFormOpen() {
         return !!getFormRoot().querySelector('input, textarea');
   }

   function findSubmitButton() {
         const root = getFormRoot();
         return (
                 root.querySelector('#submit_app, button[type="submit"], input[type="submit"]') ||
                 Array.from(root.querySelectorAll('button')).find((b) => /submit application|submit/i.test(b.textContent))
               );
   }

   function detectJobPosting() {
         const description = getJobDescription();
         if (!description) return null;
         return { title: getJobTitle(), company: getCompany(), description };
   }

   window.AutoApplyEngine.init({
         siteName: isLever ? 'lever' : 'greenhouse',
         getJobDescription,
         getJobTitle,
         getCompany,
         getFormRoot,
         isApplicationFormOpen,
         findSubmitButton,
         detectJobPosting,
   });
})();
