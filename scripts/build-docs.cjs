const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/images');
fs.mkdirSync(out, { recursive: true });
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#557e67"/></marker></defs><rect width="${w}" height="${h}" rx="20" fill="#f7f8f2"/><g font-family="Microsoft YaHei, sans-serif">${body}</g></svg>`;
const text = (x, y, s, size = 18, color = '#294438') => `<text x="${x}" y="${y}" fill="${color}" font-size="${size}">${esc(s)}</text>`;
const node = (x, y, n, title, lines = [], w = 285, h = 146) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#ffffff" stroke="#ccdbc8" stroke-width="2"/>${text(x + 20, y + 34, n, 14, '#65895d')}${text(x + 20, y + 65, title, 23)}${lines.map((s, i) => text(x + 20, y + 96 + i * 25, s, 16, '#68806d')).join('')}`;
const arrow = d => `<path d="${d}" stroke="#557e67" stroke-width="2.5" fill="none" marker-end="url(#arrow)"/>`;
let flow = text(45, 57, '拾光 · 从发布到完成的业务流程', 30) + text(45, 93, '两类信息走同一条流程，状态文案由类型决定。', 18, '#68806d');
flow += node(45, 145, '01  发布者', '填写信息', ['选择寻物 / 招领', '填写物品和联系方式']);
flow += node(395, 145, '02  程序', '校验并保存', ['字段合法，写入成功', '才进入发布成功页']);
flow += node(745, 145, '03  查看者', '浏览或组合搜索', ['关键词 + 分类 + 地点', '结果保留同一记录 ID']);
flow += node(1095, 145, '04  查看者', '详情与联系方式', ['核对描述、日期和地点', '查看 / 复制联系账号']);
flow += arrow('M330 218H390') + arrow('M680 218H740') + arrow('M1030 218H1090');
flow += `<rect x="395" y="337" width="285" height="85" rx="12" fill="#fcf0dd"/>${text(416, 370, '失败：给出具体提示', 19, '#98662b')}${text(416, 401, '保留输入，不显示发布成功', 16, '#98662b')}` + arrow('M537 292V332');
flow += node(1095, 488, '05  应用外', '核对与交接', ['联系发布者并确认特征', '实际找回 / 归还后再完成']);
flow += node(745, 488, '06  发布者', '确认更新状态', ['我的发布 / 本人详情', '检查权限、进行中、确认']);
flow += node(395, 488, '07  程序', '写入完成状态', ['寻物 → 已找到', '招领 → 已归还']);
flow += node(45, 488, '08  各入口', '显示同一结果', ['默认进行中列表隐藏', '全部状态与详情仍可查看']);
flow += arrow('M1238 292V482') + arrow('M1095 561H1036') + arrow('M745 561H686') + arrow('M395 561H336');
flow += text(766, 375, '取消 / 非本人 / 已完成：', 18, '#98662b') + text(766, 405, '保持原记录，不越权更新。', 17, '#98662b') + arrow('M888 488V431');
flow += text(45, 703, '边界：本地浏览器演示；没有即时聊天、跨设备共享或真实身份认证。', 18, '#68806d');
fs.writeFileSync(path.join(out, '10-workflow.svg'), svg(1425, 750, flow));
let data = text(45, 56, '拾光 · 页面与存储的数据流', 30) + text(45, 91, '业务规则集中处理，三个查看入口读取同一份记录。', 18, '#68806d');
data += node(45, 160, '输入', '表单 / 搜索条件', ['app.js 收集与展示'], 270, 140);
data += node(370, 160, '业务规则', 'core.js', ['校验、检索、权限、状态'], 270, 140);
data += node(695, 160, '持久化', 'store.js', ['版本校验、异常反馈'], 270, 140);
data += node(1020, 160, '本地存储', 'localStorage', ['记录集合与独立草稿'], 270, 140);
data += arrow('M315 230H364') + arrow('M640 230H689') + arrow('M965 217H1014') + arrow('M1020 257H971');
data += node(225, 424, '查看入口 01', '广场 / 搜索结果', ['条件过滤后显示卡片'], 285, 135);
data += node(565, 424, '查看入口 02', '物品详情与联系', ['按同一 ID 读取数据'], 285, 135);
data += node(905, 424, '查看入口 03', '我的发布', ['按 ownerId 过滤'], 285, 135);
data += arrow('M829 300V354H368V418') + arrow('M829 354H708V418') + arrow('M829 354H1048V418');
data += text(45, 622, '保存失败：保持输入和原状态；数据损坏：保留原始记录并明确提示。', 18, '#68806d');
fs.writeFileSync(path.join(out, '11-dataflow.svg'), svg(1335, 670, data));

const original = fs.readFileSync(path.join(root, 'docs/博客_杜玉鹤.md'), 'utf8');
const companion = original
  .replace('| 姓名与学号 | 杜玉鹤 162404109 |', '| 姓名与学号 | 蔡信坡 162404103 |')
  .replace('| 结对同学 | 蔡信坡 162404103 |', '| 结对同学 | 杜玉鹤 162404109 |')
  .replace('**待补：蔡信坡的博客园个人主页或本次文章链接**', '**待补：杜玉鹤的博客园个人主页或本次文章链接**')
  .replace('| 搭档 GitHub | [popochus](https://github.com/popochus) |', '| 搭档 GitHub | [myp208116](https://github.com/myp208116) |')
  .replace('杜玉鹤的总结建议围绕“从预设页面到真实校验和持久化”：说明本人读懂或修改的函数、一次独立复测的发现，以及下一次如何提前安排异常路径测试。', '蔡信坡的总结建议围绕“从点通页面到可复现测试”：说明本人独立检查的用户路径、fork 中完成的实际改进、PR 互审反馈，以及下一次如何设计更有效的异常用例。')
  .replace('**评价蔡信坡待本人填写：**', '**评价杜玉鹤待本人填写：**');
fs.writeFileSync(path.join(root, 'docs/博客_蔡信坡.md'), companion);

(async () => {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await chromium.launch({ ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : { channel: 'chrome' }), headless: true });
  try {
    const page = await browser.newPage();
    for (const [name, width, height] of [['10-workflow', 1425, 750], ['11-dataflow', 1335, 670]]) {
      await page.setViewportSize({ width, height });
      await page.setContent(`<html><head><meta charset="utf-8"></head><body style="margin:0">${fs.readFileSync(path.join(out, name + '.svg'), 'utf8')}</body></html>`);
      await page.screenshot({ path: path.join(out, name + '.png') });
    }
  } finally { await browser.close(); }
  console.log('Created workflow / data-flow diagrams and companion blog draft.');
})().catch(e => { console.error(e.message); process.exitCode = 1; });
