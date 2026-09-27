const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

test('manifest 使用 MV3 且只加载目标站点需要的文件', () => {
  const manifestPath = path.join(projectRoot, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions || [], []);
  assert.equal(manifest.background, undefined);
  assert.deepEqual(manifest.content_scripts, [
    {
      matches: ['https://x.com/*', 'https://twitter.com/*'],
      js: ['src/post-content.js', 'src/content.js'],
      css: ['src/content.css'],
      run_at: 'document_idle',
    },
  ]);
});

test('manifest 引用的内容脚本、样式和图标都存在', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'manifest.json'), 'utf8'),
  );
  const referencedFiles = [
    ...manifest.content_scripts[0].js,
    ...manifest.content_scripts[0].css,
    ...Object.values(manifest.icons),
  ];

  for (const relativePath of referencedFiles) {
    assert.equal(
      fs.existsSync(path.join(projectRoot, relativePath)),
      true,
      `${relativePath} 应该存在`,
    );
  }
});
