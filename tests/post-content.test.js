const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const {
  extractPostText,
  findOwnPostTextElement,
} = require('../src/post-content.js');

function createArticle(innerHtml) {
  const dom = new JSDOM(`<article>${innerHtml}</article>`);
  return dom.window.document.querySelector('article');
}

test('extractPostText 返回普通帖子的正文', () => {
  const article = createArticle('<div data-testid="tweetText">你好，X！</div>');

  assert.equal(extractPostText(article), '你好，X！');
});

test('extractPostText 保留正文内部换行并清理首尾空白', () => {
  const article = createArticle(
    '<div data-testid="tweetText">  第一行<br>第二行  </div>',
  );
  const textElement = article.querySelector('[data-testid="tweetText"]');
  Object.defineProperty(textElement, 'innerText', {
    configurable: true,
    value: '  第一行\n第二行  ',
  });

  assert.equal(extractPostText(article), '第一行\n第二行');
});

test('extractPostText 只返回外层正文，不包含引用帖子', () => {
  const article = createArticle(`
    <div data-testid="tweetText">我的评论</div>
    <div data-testid="quoteTweet">
      <div data-testid="tweetText">被引用的正文</div>
    </div>
  `);

  assert.equal(extractPostText(article), '我的评论');
});

test('extractPostText 在只有引用帖子正文时返回空字符串', () => {
  const article = createArticle(`
    <div data-testid="quoteTweet">
      <div data-testid="tweetText">被引用的正文</div>
    </div>
  `);

  assert.equal(findOwnPostTextElement(article), null);
  assert.equal(extractPostText(article), '');
});

test('extractPostText 排除嵌套 article 中的正文', () => {
  const article = createArticle(`
    <article><div data-testid="tweetText">嵌套正文</div></article>
  `);

  assert.equal(extractPostText(article), '');
});
