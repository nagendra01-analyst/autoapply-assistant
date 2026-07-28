// lib/risky-fields.js
// Detects fields the extension must never guess on (salary, EEO, legal/work-authorization,
// open-ended essays, or anything it can't confidently classify) and highlights them for a human.
(function () {
    const CATEGORY_RULES = [
      { category: 'salary', re: /salary|compensation|pay\s*range|desired\s*pay|expected\s*pay|\bwage\b|rate\s*expectation/i },
      { category: 'eeo', re: /veteran|disability|race\b|ethnicit|gender\b|sexual\s*orientation|\beeo\b|equal\s*employment|transgender|pronoun/i },
      { category: 'legal', re: /work\s*authoriz|visa|sponsor(ship)?|background\s*check|felony|convicted|criminal\s*record|legally\s*(authorized|eligible)|security\s*clearance|export\s*control/i },
        ];

   const ESSAY_HINT = /why (do|are|would)|tell us|describe a time|what (makes|interests)|in your own words|additional information|anything else|explain/i;

   function classify(el, labelText) {
         const text = (labelText || '').toLowerCase();
         for (const rule of CATEGORY_RULES) {
                 if (rule.re.test(text)) return rule.category;
         }
         const tag = el.tagName.toLowerCase();
         if (tag === 'textarea' && ESSAY_HINT.test(text)) return 'essay';
         if (tag === 'textarea' && !text) return 'essay';
         return null;
   }

   function highlight(el, color, title) {
         el.style.outline = `3px solid ${color}`;
         el.style.outlineOffset = '2px';
         if (title) el.setAttribute('data-autoapply-flag', title);
         el.setAttribute('data-autoapply-highlighted', 'true');
   }

   function clearHighlight(el) {
         el.style.outline = '';
         el.style.outlineOffset = '';
         el.removeAttribute('data-autoapply-flag');
         el.removeAttribute('data-autoapply-highlighted');
   }

   window.AutoApplyRiskyFields = {
         classify,
         highlight,
         clearHighlight,
         AMBER: '#f5a623',
         GREEN: '#2ecc71',
   };
})();
