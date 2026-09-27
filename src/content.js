(function exposeContentScript(globalScope) {
  'use strict';

  const BUTTON_ATTRIBUTE = 'data-x-copy-button';
  const ACTION_TEST_IDS = ['reply', 'retweet', 'like', 'unlike', 'bookmark'];
  const FEEDBACK_DURATION_MS = 1800;

  const ICONS = {
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7V4.75C7 3.78 7.78 3 8.75 3h8.5C18.22 3 19 3.78 19 4.75v8.5c0 .97-.78 1.75-1.75 1.75H15v2.25c0 .97-.78 1.75-1.75 1.75h-8.5C3.78 19 3 18.22 3 17.25v-8.5C3 7.78 3.78 7 4.75 7H7Zm1.5 0h4.75c.97 0 1.75.78 1.75 1.75v4.75h2.25a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25V7Zm-3.75 1.5a.25.25 0 0 0-.25.25v8.5c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-8.5Z"/></svg>',
    success: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.55 17.65-5.2-5.2 1.3-1.3 3.9 3.9 8.8-8.8 1.3 1.3-10.1 10.1Z"/></svg>',
    warning: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.08 4.58a1.05 1.05 0 0 1 1.84 0l8.03 14.5a1.05 1.05 0 0 1-.92 1.56H3.97a1.05 1.05 0 0 1-.92-1.56l8.03-14.5ZM12 9a.9.9 0 0 0-.9.9v4.2a.9.9 0 0 0 1.8 0V9.9A.9.9 0 0 0 12 9Zm0 8.75a1.05 1.05 0 1 0 0-2.1 1.05 1.05 0 0 0 0 2.1Z"/></svg>',
  };

  function findActionBar(article) {
    if (!article || typeof article.querySelectorAll !== 'function') {
      return null;
    }

    const groups = article.querySelectorAll('[role="group"]');

    for (const group of groups) {
      if (group.closest('article') !== article) {
        continue;
      }

      const hasTweetAction = ACTION_TEST_IDS.some((testId) =>
        group.querySelector(`[data-testid="${testId}"]`),
      );

      if (hasTweetAction) {
        return group;
      }
    }

    return null;
  }

  function fallbackCopyText(text, documentRef) {
    const textarea = documentRef.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    documentRef.body.appendChild(textarea);
    textarea.select();

    try {
      if (!documentRef.execCommand || !documentRef.execCommand('copy')) {
        throw new Error('浏览器拒绝了复制请求');
      }
    } finally {
      textarea.remove();
    }
  }

  async function copyText(text, navigatorRef, documentRef) {
    if (navigatorRef?.clipboard?.writeText) {
      await navigatorRef.clipboard.writeText(text);
      return;
    }

    fallbackCopyText(text, documentRef);
  }

  function setButtonState(button, state, label, icon) {
    button.dataset.copyState = state;
    button.dataset.tooltip = label;
    button.setAttribute('aria-label', label);
    button.querySelector('.x-copy-icon').innerHTML = icon;
    button.querySelector('.x-copy-status').textContent = label;
  }

  function resetButtonLater(button, durationMs) {
    const timer = setTimeout(() => {
      if (button.isConnected) {
        setButtonState(button, 'idle', '复制帖子正文', ICONS.copy);
      }
    }, durationMs);
    timer.unref?.();
  }

  function injectCopyButton(article, options = {}) {
    const actionBar = findActionBar(article);
    if (!actionBar) {
      return null;
    }

    const existingButton = actionBar.querySelector(`[${BUTTON_ATTRIBUTE}]`);
    if (existingButton) {
      return existingButton;
    }

    const documentRef = article.ownerDocument;
    const wrapper = documentRef.createElement('div');
    wrapper.className = 'x-copy-action';

    const button = documentRef.createElement('button');
    button.type = 'button';
    button.className = 'x-copy-button';
    button.setAttribute(BUTTON_ATTRIBUTE, '');
    button.dataset.copyState = 'idle';
    button.dataset.tooltip = '复制帖子正文';
    button.setAttribute('aria-label', '复制帖子正文');
    button.innerHTML = `
      <span class="x-copy-icon" aria-hidden="true">${ICONS.copy}</span>
      <span class="x-copy-status" role="status" aria-live="polite"></span>
    `;

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (button.dataset.copyState === 'copying') {
        return;
      }

      const text = globalScope.XPostCopy.extractPostText(article);
      const durationMs = options.feedbackDurationMs ?? FEEDBACK_DURATION_MS;

      if (!text) {
        setButtonState(
          button,
          'empty',
          '该帖子没有可复制的正文',
          ICONS.warning,
        );
        resetButtonLater(button, durationMs);
        return;
      }

      button.dataset.copyState = 'copying';
      button.disabled = true;

      try {
        if (options.writeText) {
          await options.writeText(text);
        } else {
          await copyText(text, globalScope.navigator, documentRef);
        }
        setButtonState(button, 'success', '已复制', ICONS.success);
      } catch (error) {
        console.warn('[X 正文一键复制] 复制失败：', error);
        setButtonState(button, 'error', '复制失败，请重试', ICONS.warning);
      } finally {
        button.disabled = false;
        resetButtonLater(button, durationMs);
      }
    });

    wrapper.appendChild(button);
    actionBar.appendChild(wrapper);
    return button;
  }

  function scanPosts(root = globalScope.document) {
    if (!root || typeof root.querySelectorAll !== 'function') {
      return;
    }

    if (root.matches?.('article')) {
      injectCopyButton(root);
    }

    for (const article of root.querySelectorAll('article')) {
      injectCopyButton(article);
    }
  }

  function start() {
    if (!globalScope.document?.documentElement) {
      return;
    }

    let scanQueued = false;
    const queueScan = () => {
      if (scanQueued) {
        return;
      }
      scanQueued = true;
      globalScope.requestAnimationFrame(() => {
        scanQueued = false;
        scanPosts();
      });
    };

    scanPosts();
    const observer = new MutationObserver(queueScan);
    observer.observe(globalScope.document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  const api = {
    copyText,
    findActionBar,
    injectCopyButton,
    scanPosts,
    start,
  };

  globalScope.XPostCopy = Object.assign(globalScope.XPostCopy || {}, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  const hostname = globalScope.location?.hostname;
  if (hostname === 'x.com' || hostname === 'twitter.com') {
    start();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
