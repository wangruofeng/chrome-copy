import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(projectRoot, 'icons', 'icon.svg');
const sizes = [16, 32, 48, 128];

await Promise.all(
  sizes.map((size) =>
    sharp(source)
      .resize(size, size)
      .png()
      .toFile(path.join(projectRoot, 'icons', `icon${size}.png`)),
  ),
);

console.log(`已生成图标：${sizes.map((size) => `${size}×${size}`).join('、')}`);
