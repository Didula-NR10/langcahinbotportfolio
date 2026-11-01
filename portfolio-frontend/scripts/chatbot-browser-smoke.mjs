import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const edge = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const frontend = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const artifacts = join(process.cwd(), 'test-artifacts');

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

const browser = await chromium.launch({ executablePath: edge, headless: true });
try {
  await mkdir(artifacts, { recursive: true });
  for (const { name, width, height, theme } of [
    { name: 'desktop-dark', width: 1440, height: 900, theme: 'dark' },
    { name: 'tablet-light', width: 820, height: 1180, theme: 'light' },
    { name: 'mobile-dark', width: 390, height: 844, theme: 'dark' },
    { name: 'small-mobile-light', width: 320, height: 640, theme: 'light' }
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await context.addInitScript(value => localStorage.setItem('portfolio-theme', value), theme);
    const page = await context.newPage();
    await page.goto(frontend, { waitUntil: 'domcontentloaded' });
    const launcher = page.getByRole('button', { name: 'Open AI assistant' });
    await launcher.waitFor();
    const palette = page.getByRole('button', { name: 'Customize Theme' });
    assert.equal(overlaps(await launcher.boundingBox(), await palette.boundingBox()), false, `${name}: launcher overlaps palette`);
    await launcher.click();
    const dialog = page.getByRole('dialog', { name: 'Portfolio AI Assistant' });
    await dialog.waitFor({ state: 'visible' });
    const box = await dialog.boundingBox();
    assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `${name}: dialog overflows viewport`);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme, `${name}: theme differs`);
    assert.equal(await dialog.getAttribute('aria-modal'), width <= 600 ? 'true' : null, `${name}: modal semantics`);
    if (width <= 600) {
      const topmostSend = await page.getByRole('button', { name: 'Send message' }).evaluate(element => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return hit === element || element.contains(hit);
      });
      assert.equal(topmostSend, true, `${name}: send button is covered`);
    }
    await page.screenshot({ path: join(artifacts, `chat-${name}.png`) });

    if (name === 'desktop-dark') {
      const input = page.getByRole('textbox', { name: 'Your message' });
      await input.fill("What is the developer's GPA?");
      const firstResponse = page.waitForResponse(response => response.url().endsWith('/api/v1/chat') && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Send message' }).click();
      const first = await firstResponse;
      assert.equal(first.status(), 200);
      const firstBody = await first.json();
      assert.ok(firstBody.session_id);
      await page.getByText("I don't have verified portfolio information to answer that question.").waitFor();

      await input.fill('Can you tell me that GPA?');
      const secondResponse = page.waitForResponse(response => response.url().endsWith('/api/v1/chat') && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Send message' }).click();
      const second = await secondResponse;
      assert.equal(second.status(), 200);
      assert.equal(second.request().postDataJSON().session_id, firstBody.session_id);
      assert.equal((await second.json()).session_id, firstBody.session_id);
      await page.locator('.portfolio-chat-message--assistant').nth(1).waitFor();
    }

    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Open AI assistant' }).waitFor();
    console.log(`${name}: passed`);
    await context.close();
  }
} finally {
  await browser.close();
}
