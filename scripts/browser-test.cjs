/* Optional browser regression. Each run uses a fresh, isolated browser profile. */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const images = path.join(root, 'docs/images'); fs.mkdirSync(images, { recursive: true });
const url = pathToFileURL(path.join(root, 'index.html')).href;
const log = [], errors = [], external = [];
let browser, page, context;
async function step(name, fn) { await fn(); log.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); }
async function shot(name) { await page.screenshot({ path: path.join(images, name), fullPage: true }); }
async function go(route) { await page.goto(url + '#' + route); await page.locator('#main h1, #main h2').first().waitFor(); }
async function fillForm(type, title) {
  await page.locator(`input[name="type"][value="${type}"]`).check();
  await page.getByLabel('物品名称', { exact: true }).fill(title);
  await page.getByLabel('物品分类', { exact: true }).selectOption('生活用品');
  await page.locator('#eventDate').fill('2026-09-28');
  await page.getByLabel('所在区域', { exact: true }).selectOption('图书馆');
  await page.getByLabel('具体地点', { exact: true }).fill('图书馆三楼 301 自习室');
  await page.getByLabel('物品特征与补充说明', { exact: true }).fill('浅绿色杯身，杯底有星星贴纸，请联系核对。');
  await page.getByLabel('联系称呼', { exact: true }).fill('测试同学');
  await page.getByLabel('联系方式类型', { exact: true }).selectOption('邮箱');
  await page.getByLabel('联系方式', { exact: true }).fill('student@example.com');
}
(async () => {
  browser = await chromium.launch({ ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : { channel: 'chrome' }), headless: true });
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN', timezoneId: 'Asia/Shanghai', offline: true });
  page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url())) external.push(r.url()); });
  const version = browser.version();
  await step('01 file:// 离线首页加载与 6 条进行中示例', async () => { await go('home'); assert.equal(await page.locator('.item-card').count(), 6); assert.ok(await page.getByRole('heading', { name: '失物招领广场' }).isVisible()); await shot('01-home.png'); });
  await step('02 任意关键词检索与返回保留结果', async () => { await page.getByRole('searchbox').fill('校园卡'); await page.getByRole('button', { name: '搜索', exact: true }).click(); assert.equal(await page.locator('.item-card').count(), 1); await shot('03-search.png'); await page.getByRole('link', { name: '查看校园卡详情' }).click(); await page.getByRole('heading', { name: '校园卡', exact: true }).waitFor(); assert.equal(await page.locator('[data-complete]').count(), 0); await shot('04-detail.png'); });
  await step('03 联系弹窗与复制成功反馈（剪贴板替身）', async () => { await page.getByRole('button', { name: '查看联系方式', exact: true }).click(); await page.locator('#modal[open]').waitFor(); await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied = text; } } }); }); await page.getByRole('button', { name: '复制联系方式' }).click(); await page.getByText('联系方式已复制。', { exact: true }).waitFor(); assert.equal(await page.evaluate(() => window.__copied), 'demo@example.com'); await shot('05-contact.png'); });
  await step('04 剪贴板拒绝时保留手动复制入口', async () => { await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw Error('denied'); } } }); document.execCommand = () => false; }); await page.getByRole('button', { name: '复制联系方式' }).click(); await page.getByText('自动复制受限', { exact: false }).waitFor(); assert.equal(await page.locator('#contact-value').inputValue(), 'demo@example.com'); await page.getByRole('button', { name: '关闭', exact: true }).click(); await page.getByRole('link', { name: '返回广场', exact: true }).click(); await page.locator('.item-card').first().waitFor(); assert.equal(await page.locator('.item-card').count(), 1); });
  await step('05 分类、区域、类型组合筛选与空结果', async () => { await page.getByRole('button', { name: '重置', exact: true }).click(); await page.getByLabel('物品分类筛选').selectOption('生活用品'); await page.getByLabel('地点筛选').selectOption('食堂'); assert.equal(await page.locator('.item-card').count(), 1); await page.getByRole('searchbox').fill('不存在的红色自行车'); await page.getByRole('button', { name: '搜索', exact: true }).click(); await page.getByRole('heading', { name: '暂时没有找到相关信息' }).waitFor(); await shot('07-empty.png'); });
  await step('06 空表阻止发布并定位错误', async () => { await go('publish'); await page.getByRole('button', { name: '确认发布' }).click(); assert.ok(await page.locator('#error-title').isVisible()); assert.equal(await page.locator('#title').getAttribute('aria-invalid'), 'true'); });
  await step('07 草稿跨路由和刷新恢复', async () => { await page.locator('#title').fill('草稿测试保温杯'); await page.getByRole('link', { name: '返回广场', exact: true }).click(); await page.getByRole('link', { name: '发布信息', exact: true }).click(); assert.equal(await page.locator('#title').inputValue(), '草稿测试保温杯'); await page.reload(); assert.equal(await page.locator('#title').inputValue(), '草稿测试保温杯'); });
  await step('08 图片压缩、预览、移除', async () => {
    await page.locator('#photo').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
    await page.getByText('无法读取图片内容', { exact: false }).waitFor();
    const dataUrl = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#7da586'; ctx.fillRect(0, 0, 64, 64); return canvas.toDataURL('image/png'); });
    const pixel = Buffer.from(dataUrl.split(',')[1], 'base64');
    await page.locator('#photo').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: pixel }); await page.locator('#upload-preview img').waitFor(); assert.ok((await page.locator('#upload-preview img').getAttribute('src')).startsWith('data:image/jpeg')); await page.getByRole('button', { name: '移除图片', exact: true }).click(); assert.equal(await page.locator('#upload-preview img').count(), 0);
  });
  await step('09 完整发布寻物并清除草稿', async () => { await fillForm('lost', '绿色保温杯（验收）'); await shot('02-publish.png'); await page.getByRole('button', { name: '确认发布' }).click(); await page.getByRole('heading', { name: '发布成功', exact: true }).waitFor(); assert.equal(await page.evaluate(() => localStorage.getItem('shiguang.draft.v1')), null); await page.getByRole('link', { name: '我的发布', exact: true }).last().click(); await page.getByRole('heading', { name: '我的发布', exact: true }).waitFor(); assert.equal(await page.locator('.item-card').count(), 1); });
  await step('10 完成确认可取消，确认后状态一致', async () => { await page.getByRole('button', { name: '标记已找到', exact: true }).click(); await page.getByRole('button', { name: '暂不更新', exact: true }).click(); assert.ok(await page.getByRole('button', { name: '标记已找到', exact: true }).isVisible()); await page.getByRole('button', { name: '标记已找到', exact: true }).click(); await page.getByRole('button', { name: '确认已找到', exact: true }).click(); assert.equal(await page.locator('[data-complete]').count(), 0); await page.getByRole('link', { name: '查看绿色保温杯（验收）详情' }).click(); assert.ok(await page.locator('.detail-badges').getByText('已找到').isVisible()); await page.reload(); assert.ok(await page.locator('.detail-badges').getByText('已找到').isVisible()); });
  await step('11 完整招领流程与已归还', async () => { await go('publish/found'); await fillForm('found', '米色雨伞（验收）'); await page.getByRole('button', { name: '确认发布' }).click(); await page.getByRole('heading', { name: '发布成功', exact: true }).waitFor(); await page.getByRole('link', { name: '查看信息', exact: true }).click(); await page.getByRole('button', { name: '标记已归还', exact: true }).click(); await page.getByRole('button', { name: '确认已归还', exact: true }).click(); assert.ok(await page.locator('.detail-badges').getByText('已归还').isVisible()); await go('mine'); assert.equal(await page.locator('.item-card').count(), 2); await shot('06-my-posts.png'); });
  await step('12 完成记录默认隐藏、全部状态可搜索', async () => { await go('home'); await page.getByRole('button', { name: '重置', exact: true }).click(); await page.getByRole('searchbox').fill('验收'); await page.getByRole('button', { name: '搜索', exact: true }).click(); assert.equal(await page.locator('.item-card').count(), 0); await page.getByLabel('状态筛选').selectOption('all'); assert.equal(await page.locator('.item-card').count(), 2); });
  await step('13 XSS 文本按原样展示且不执行', async () => { await go('publish'); await fillForm('lost', '<img src=x onerror=alert(1)>'); await page.getByRole('button', { name: '确认发布' }).click(); await page.getByRole('heading', { name: '发布成功', exact: true }).waitFor(); await page.getByRole('link', { name: '查看信息', exact: true }).click(); assert.equal(await page.locator('.detail-panel h1').textContent(), '<img src=x onerror=alert(1)>'); assert.equal(await page.locator('.detail-panel h1 img').count(), 0); });
  await step('14 保存失败不跳成功页、不丢表单', async () => { await go('publish'); await fillForm('lost', '保存失败测试'); await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'shiguang.data.v1') throw new DOMException('full', 'QuotaExceededError'); return original.call(this, key, value); }; }); await page.getByRole('button', { name: '确认发布' }).click(); await page.locator('#form-alert').waitFor(); assert.ok((await page.locator('#form-alert').textContent()).includes('未能保存')); assert.equal(await page.locator('#title').inputValue(), '保存失败测试'); await page.reload(); });
  await step('15 无效详情路由有提示', async () => { await go('detail/no-such-id'); assert.ok(await page.getByRole('heading', { name: '这条信息不存在' }).isVisible()); });
  await step('16 390 px 首页及发布页无横向溢出', async () => { const fresh = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-CN', timezoneId: 'Asia/Shanghai', offline: true }); const previous = page; page = await fresh.newPage(); await go('home'); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await shot('08-mobile.png'); await go('publish'); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await shot('09-mobile-publish.png'); await fresh.close(); page = previous; });
  await step('17 键盘跳转到主要内容保留当前路由', async () => { const before = page.url(); await page.locator('.skip-link').focus(); await page.keyboard.press('Enter'); assert.equal(page.url(), before); assert.equal(await page.evaluate(() => document.activeElement.id), 'main'); });
  await step('18 损坏存储重载后不被样例覆盖', async () => { await page.evaluate(() => localStorage.setItem('shiguang.data.v1', '{broken')); await page.reload(); await page.getByRole('heading', { name: '暂时无法读取本地记录' }).waitFor(); assert.equal(await page.evaluate(() => localStorage.getItem('shiguang.data.v1')), '{broken'); });
  await step('19 浏览器无脚本异常、无外部网络请求', async () => { assert.deepEqual(errors, []); assert.deepEqual(external, []); });
  fs.writeFileSync(path.join(root, 'docs/browser-test-report.json'), JSON.stringify({ timestamp: new Date().toISOString(), browser: `Google Chrome for Testing ${version}`, protocol: 'file://', offline: true, viewport: '1440x1000 and 390x844', passed: log.length, failed: 0, checks: log, errors, externalRequests: external }, null, 2));
  console.log(`All ${log.length} browser checks passed in Chrome ${version}.`);
})().catch(async error => {
  console.error(error.stack);
  fs.mkdirSync(path.join(root, '.test-artifacts'), { recursive: true });
  if (page) await page.screenshot({ path: path.join(root, '.test-artifacts/failure.png'), fullPage: true }).catch(() => {});
  fs.writeFileSync(path.join(root, 'docs/browser-test-report.json'), JSON.stringify({ timestamp: new Date().toISOString(), passed: log.length, failed: 1, checks: log, error: error.message, errors }, null, 2));
  process.exitCode = 1;
}).finally(async () => { if (browser) await browser.close(); });
