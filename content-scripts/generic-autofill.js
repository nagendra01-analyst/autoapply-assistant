// content-scripts/generic-autofill.js
// Shared engine used by every site adapter: extracts job description/meta, fills fields,
// attaches the resume file, scans and highlights risky fields, and highlights (never clicks)
// the submit button. Loaded before each adapter in the same isolated JS world for the frame,
// so window.AutoApplyEngine is available to linkedin.js / indeed.js / workday.js / etc.
(function () {
    if (window.__autoApplyEngineLoaded) return;
    window.__autoApplyEngineLoaded = true;

   const FM = window.AutoApplyFieldMapper;
    const RF = window.AutoApplyRiskyFields;

   function sendMessage(msg) {
         return chrome.runtime.sendMessage(msg).catch((err) => ({ error: String(err) }));
   }

   function setNativeValue(el, value) {
         const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
         const desc = Object.getOwnPropertyDescriptor(proto, 'value');
         if (desc && desc.set) desc.set.call(el, value); else el.value = value;
         el.dispatchEvent(new Event('input', { bubbles: true }));
         el.dispatchEvent(new Event('change', { bubbles: true }));
   }

   function setSelectValue(el, value) {
         const target = String(value).toLowerCase();
         for (const opt of el.options) {
                 if (opt.value.toLowerCase() === target || opt.textContent.trim().toLowerCase() === target) {
                           el.value = opt.value;
                           el.dispatchEvent(new Event('change', { bubbles: true }));
                           return true;
                 }
         }
         return false;
   }

   function dataUrlToFile(dataUrl, filename, mime) {
         const parts = dataUrl.split(',');
         const binary = atob(parts[1]);
         const bytes = new Uint8Array(binary.length);
         for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
         return new File([bytes], filename, { type: mime || 'application/pdf' });
   }

   function attachFile(inputEl, file) {
         try {
                 const dt = new DataTransfer();
                 dt.items.add(file);
                 inputEl.files = dt.files;
                 inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                 return true;
         } catch (err) {
                 return false;
         }
   }

   function isResumeFileInput(el) {
         const accept = (el.getAttribute('accept') || '').toLowerCase();
         const ctx = FM.getLabelText(el).toLowerCase();
         return el.type === 'file' && (/pdf|doc|resume|cv/.test(accept) || /resume|\bcv\b/.test(ctx));
   }

   function isVisible(el) {
         if (!el.offsetParent && el.tagName !== 'SELECT') return false;
         const rect = el.getBoundingClientRect();
         return rect.width > 0 && rect.height > 0;
   }

   function getAllFields(root) {
         return Array.from(root.querySelectorAll('input, textarea, select')).filter((el) => {
                 if (el.disabled || el.readOnly) return false;
                 if (['hidden', 'submit', 'button', 'checkbox', 'radio', 'image'].includes(el.type)) return false;
                 return isVisible(el);
         });
   }

   function fillProfileAndTailored(root, profile, tailored) {
         let filledCount = 0;
         let riskyCount = 0;

      for (const el of getAllFields(root)) {
              const labelText = FM.getLabelText(el);

           if (el.tagName === 'TEXTAREA') {
                     if (/cover\s*letter/i.test(labelText) && tailored && tailored.coverLetter && !el.value) {
                                 setNativeValue(el, tailored.coverLetter);
                                 filledCount++;
                                 continue;
                     }
                     if (/professional\s*summary|about\s*(you|yourself)|summary\s*statement/i.test(labelText) && tailored && tailored.summary && !el.value) {
                                 const combined = [tailored.summary, ...(tailored.bullets || []).map((b) => `- ${b}`)].join('\n');
                                 setNativeValue(el, combined);
                                 filledCount++;
                                 continue;
                     }
           }

           const riskyCategory = RF.classify(el, labelText);
              if (riskyCategory) {
                        RF.highlight(el, RF.AMBER, `AutoApply: needs your input (${riskyCategory})`);
                        riskyCount++;
                        continue;
              }

           const key = FM.classifyField(el);
              if (!key || !profile || !profile[key]) {
                        if (el.required && !el.value) {
                                    RF.highlight(el, RF.AMBER, 'AutoApply: unrecognized required field');
                                    riskyCount++;
                        }
                        continue;
              }

           if (el.value) continue;

           if (el.tagName === 'SELECT') {
                     if (setSelectValue(el, profile[key])) filledCount++;
           } else {
                     setNativeValue(el, profile[key]);
                     filledCount++;
           }
      }

      return { filledCount, riskyCount };
   }

   function attachResume(resumeFile) {
         if (!resumeFile || !resumeFile.dataUrl) return false;
         const fileInputs = Array.from(document.querySelectorAll('input[type="file"]')).filter(isResumeFileInput);
         if (!fileInputs.length) return false;
         const file = dataUrlToFile(resumeFile.dataUrl, resumeFile.name || 'resume.pdf', resumeFile.type);
         let attached = false;
         for (const input of fileInputs) {
                 if (attachFile(input, file)) attached = true;
         }
         return attached;
   }

   function highlightSubmit(adapter) {
         const btn = adapter.findSubmitButton && adapter.findSubmitButton();
         if (btn) RF.highlight(btn, RF.GREEN, 'AutoApply: review, then click yourself');
         return !!btn;
   }

   function extractJobInfo(adapter) {
         return {
                 description: adapter.getJobDescription ? adapter.getJobDescription() : '',
                 title: adapter.getJobTitle ? adapter.getJobTitle() : '',
                 company: adapter.getCompany ? adapter.getCompany() : '',
         };
   }

   async function runFillCycle(adapter) {
         const { profile, masterResume, resumeFile } = await sendMessage({ type: 'GET_PROFILE_DATA' });

      let { context } = await sendMessage({ type: 'GET_JOB_CONTEXT' });
         if (!context || !context.jobDescription) {
                 const info = extractJobInfo(adapter);
                 if (info.description) {
                           await sendMessage({
                                       type: 'JOB_DETECTED',
                                       jobTitle: info.title,
                                       company: info.company,
                                       jobDescription: info.description,
                                       sourceUrl: location.href,
                                       site: adapter.siteName,
                           });
                           context = { jobTitle: info.title, company: info.company, jobDescription: info.description };
                 }
         }

      let tailored = context && context.tailored;
         if (!tailored && context && context.jobDescription && masterResume) {
                 const resp = await sendMessage({
                           type: 'REQUEST_TAILORED_CONTENT',
                           jobDescription: context.jobDescription,
                           jobTitle: context.jobTitle,
                           company: context.company,
                 });
                 if (resp && resp.result) tailored = resp.result;
         }

      const root = (adapter.getFormRoot && adapter.getFormRoot()) || document;
         attachResume(resumeFile);
         const { filledCount, riskyCount } = fillProfileAndTailored(root, profile, tailored);
         const hasSubmit = highlightSubmit(adapter);

      await sendMessage({
              type: 'LOG_APPLICATION',
              title: (context && context.jobTitle) || (adapter.getJobTitle && adapter.getJobTitle()) || document.title,
              company: (context && context.company) || (adapter.getCompany && adapter.getCompany()) || '',
              status: riskyCount > 0 ? 'needs review' : 'ready to submit',
              url: location.href,
      });

      return { filledCount, riskyCount, hasSubmit };
   }

   let observing = false;
    function watchForStepChanges(adapter) {
          if (observing) return;
          observing = true;
          let debounce = null;
          const obs = new MutationObserver(() => {
                  clearTimeout(debounce);
                  debounce = setTimeout(() => {
                            // Re-scan for risky fields and the submit button on every DOM change so multi-step
                                                // wizards (Workday's My Info -> My Experience -> Review, LinkedIn's Easy Apply modal
                                                // steps) get flagged again on each new step.
                                                const root = (adapter.getFormRoot && adapter.getFormRoot()) || document;
                            for (const el of getAllFields(root)) {
                                        if (el.getAttribute('data-autoapply-highlighted')) continue;
                                        const labelText = FM.getLabelText(el);
                                        const cat = RF.classify(el, labelText);
                                        if (cat) RF.highlight(el, RF.AMBER, `AutoApply: needs your input (${cat})`);
                            }
                            highlightSubmit(adapter);
                  }, 600);
          });
          obs.observe(document.body, { childList: true, subtree: true });
    }

   window.AutoApplyEngine = {
         init(adapter) {
                 watchForStepChanges(adapter);

           // Passive detection: capture the job description as soon as we land on a posting page
           // (before Apply is even clicked) so a later new-tab or same-tab redirect to an ATS can
           // reuse it without the user re-triggering anything.
           if (adapter.detectJobPosting) {
                     const info = adapter.detectJobPosting();
                     if (info && info.description) {
                                 sendMessage({
                                               type: 'JOB_DETECTED',
                                               jobTitle: info.title,
                                               company: info.company,
                                               jobDescription: info.description,
                                               sourceUrl: location.href,
                                               site: adapter.siteName,
                                 });
                     }
           }

           chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
                     if (msg.type === 'RUN_FILL' || msg.type === 'AUTO_CONTINUE') {
                                 runFillCycle(adapter).then(sendResponse).catch((err) => sendResponse({ error: String(err) }));
                                 return true;
                     }
           });

           if (adapter.isApplicationFormOpen && adapter.isApplicationFormOpen()) {
                     runFillCycle(adapter);
           }
         },
         runFillCycle,
   };
})();
