// lib/field-mapper.js
// Classifies form fields into profile keys using label text, name/id, placeholder, and autocomplete.
(function () {
    const RULES = [
      { key: 'firstName', re: /\bfirst[\s_-]?name\b|\bgiven[\s_-]?name\b|\bfname\b/i, autocomplete: ['given-name'] },
      { key: 'lastName', re: /\blast[\s_-]?name\b|\bsurname\b|\bfamily[\s_-]?name\b|\blname\b/i, autocomplete: ['family-name'] },
      { key: 'fullName', re: /^\s*name\s*$|\bfull[\s_-]?name\b|\byour[\s_-]?name\b/i, autocomplete: ['name'] },
      { key: 'email', re: /e-?mail/i, autocomplete: ['email'], inputType: ['email'] },
      { key: 'phone', re: /phone|mobile|cell/i, autocomplete: ['tel'], inputType: ['tel'] },
      { key: 'address', re: /street|address\s*(line)?\s*1?\b/i, autocomplete: ['address-line1'] },
      { key: 'city', re: /\bcity\b|\btown\b/i, autocomplete: ['address-level2'] },
      { key: 'state', re: /\bstate\b|\bprovince\b|\bregion\b/i, autocomplete: ['address-level1'] },
      { key: 'zip', re: /\bzip\b|postal[\s_-]?code/i, autocomplete: ['postal-code'] },
      { key: 'linkedinUrl', re: /linkedin/i },
      { key: 'portfolioUrl', re: /portfolio|personal\s*site|website|github\.com|your\s*site/i },
      { key: 'currentTitle', re: /current\s*title|job\s*title|headline|\bposition\b/i },
      { key: 'currentCompany', re: /current\s*(company|employer)|\bemployer\b/i },
        ];

   function getLabelText(el) {
         const parts = [];
         if (el.labels && el.labels.length) {
                 el.labels.forEach((l) => parts.push(l.textContent || ''));
         }
         const ariaLabel = el.getAttribute('aria-label');
         if (ariaLabel) parts.push(ariaLabel);
         const labelledBy = el.getAttribute('aria-labelledby');
         if (labelledBy) {
                 labelledBy.split(/\s+/).forEach((id) => {
                           const node = document.getElementById(id);
                           if (node) parts.push(node.textContent || '');
                 });
         }
         const labelAncestor = el.closest('label');
         if (labelAncestor) parts.push(labelAncestor.textContent || '');
         const container = el.closest('[class*="field" i], [class*="form-group" i], [class*="question" i]');
         if (container) {
                 const heading = container.querySelector('label, [class*="label" i], legend');
                 if (heading && heading !== el) parts.push(heading.textContent || '');
         }
         parts.push(el.getAttribute('placeholder') || '');
         parts.push(el.getAttribute('name') || '');
         parts.push(el.getAttribute('id') || '');
         parts.push(el.getAttribute('data-automation-id') || '');
         return parts.join(' ').replace(/\s+/g, ' ').trim();
   }

   function classifyField(el) {
         const text = getLabelText(el).toLowerCase();
         const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();
         const inputType = (el.getAttribute('type') || '').toLowerCase();

      for (const rule of RULES) {
              if (rule.autocomplete && rule.autocomplete.includes(autocomplete)) return rule.key;
      }
         for (const rule of RULES) {
                 if (rule.inputType && rule.inputType.includes(inputType) && rule.re.test(text)) return rule.key;
         }
         for (const rule of RULES) {
                 if (rule.re.test(text)) return rule.key;
         }
         return null;
   }

   window.AutoApplyFieldMapper = { classifyField, getLabelText };
})();
