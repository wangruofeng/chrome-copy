(function exposePostContent(globalScope) {
  'use strict';

  const TWEET_TEXT_SELECTOR = '[data-testid="tweetText"]';
  const QUOTE_TWEET_SELECTOR = '[data-testid="quoteTweet"]';

  function findOwnPostTextElement(article) {
    if (!article || typeof article.querySelectorAll !== 'function') {
      return null;
    }

    const candidates = article.querySelectorAll(TWEET_TEXT_SELECTOR);

    for (const candidate of candidates) {
      if (candidate.closest('article') !== article) {
        continue;
      }

      const quoteTweet = candidate.closest(QUOTE_TWEET_SELECTOR);
      if (quoteTweet && article.contains(quoteTweet)) {
        continue;
      }

      return candidate;
    }

    return null;
  }

  function extractPostText(article) {
    const textElement = findOwnPostTextElement(article);

    if (!textElement) {
      return '';
    }

    const visibleText =
      typeof textElement.innerText === 'string'
        ? textElement.innerText
        : textElement.textContent || '';

    return visibleText.trim();
  }

  const api = {
    extractPostText,
    findOwnPostTextElement,
  };

  globalScope.XPostCopy = Object.assign(globalScope.XPostCopy || {}, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
