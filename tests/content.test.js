const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const { extractPostText } = require('../src/post-content.js');
globalThis.XPostCopy = { extractPostText };

const {
  findActionBar,
  injectCopyButton,
} = require('../src/content.js');

function createPost(text = '测试正文') {
  const dom = new JSDOM(`
    <article>
      ${text === null ? '' : `<div data-testid="tweetText">${text}</div>`}
      <div role="group" aria-label="42 次查看">
        <button data-testid="reply">回复</button>
        <button data-testid="retweet">转发</button>
        <button data-testid="like">喜欢</button>
        <button aria-label="分享帖子">分享</button>
      </div>
    </article>
  `);

  return {
    article: dom.window.document.querySelector('article'),
    dom,
  };
}

function waitForEventLoop() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test('copy button 找到属于当前帖子的操作栏', () => {
  const { article } = createPost();

  assert.equal(findActionBar(article), article.querySelector('[role="group"]'));
});

test('copy button 注入带有中文无障碍标签的按钮且不会重复', () => {
  const { article } = createPost();
  const firstButton = injectCopyButton(article);
  const secondButton = injectCopyButton(article);

  assert.ok(firstButton);
  assert.equal(firstButton.getAttribute('aria-label'), '复制帖子正文');
  assert.equal(secondButton, firstButton);
  assert.equal(article.querySelectorAll('[data-x-copy-button]').length, 1);
});

test('copy button 点击后复制当前正文并显示成功状态', async () => {
  const { article } = createPost('只复制这一段');
  const copied = [];
  const button = injectCopyButton(article, {
    writeText: async (text) => copied.push(text),
  });

  button.click();
  await waitForEventLoop();

  assert.deepEqual(copied, ['只复制这一段']);
  assert.equal(button.dataset.copyState, 'success');
  assert.equal(button.getAttribute('aria-label'), '已复制');
});

test('copy button 对无正文帖子显示提示且不写入剪贴板', async () => {
  const { article } = createPost(null);
  let writeCount = 0;
  const button = injectCopyButton(article, {
    writeText: async () => {
      writeCount += 1;
    },
  });

  button.click();
  await waitForEventLoop();

  assert.equal(writeCount, 0);
  assert.equal(button.dataset.copyState, 'empty');
  assert.equal(button.getAttribute('aria-label'), '该帖子没有可复制的正文');
});
