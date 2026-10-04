/* DOM rendering and user interactions. Runs without a server or build step. */
(function () {
  'use strict';
  const C = window.ShiguangCore, S = window.ShiguangStore;
  const $ = selector => document.querySelector(selector);
  const E = C.escapeHTML;
  const main = $('#main'), modal = $('#modal');
  const paths = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    arrow: '<path d="m9 5 7 7-7 7"/>',
    back: '<path d="m14 5-7 7 7 7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    leaf: '<path d="M5 19C1 7 11 3 20 4c0 10-5 17-15 15Zm0 0L16 8"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M5 16H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  const initial = S.load(storage, window.ShiguangSeed(), `owner-${crypto.randomUUID()}`);
  let state = initial.state, failure = initial.error || '';
  let filters = { keyword: '', type: 'all', category: '', area: '', status: 'active', sort: 'latest' };
  /* Remember which list page opened the detail view, so the back link survives a reload. */
  const listMemory = {
    read() { try { return sessionStorage.getItem('shiguang:lastList') || 'home'; } catch { return 'home'; } },
    write(value) { try { sessionStorage.setItem('shiguang:lastList', value); } catch { /* A non-persistent session is fine. */ } }
  };
  let mineStatus = 'all', lastList = listMemory.read(), toastTimer, photo = '', uploadToken = 0, uploading = false;
  let draft = S.loadDraft(storage), lastFocus = null;
  function toast(message) {
    const t = $('#toast'); t.textContent = message; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4500);
  }
  function illustration(p) {
    const mapping = { '证件卡片': 'card', '数码产品': 'headphones', '钥匙': 'keys', '生活用品': 'bottle', '书本文具': 'book', '衣物配饰': 'scarf', '其他': 'box' };
    const name = ['card', 'bottle', 'umbrella', 'keys', 'headphones', 'book', 'scarf'].includes(p.illustration) ? p.illustration : mapping[p.category] || 'box';
    return { name, src: p.photo || `assets/${name}.svg` };
  }
  function tag(p) { return `<span class="status ${p.status === 'done' ? 'done' : p.type}">${C.statusLabel(p)}</span>`; }
  function options(list, value, emptyLabel) {
    return (emptyLabel ? `<option value="">${emptyLabel}</option>` : '') + list.map(x => `<option value="${E(x)}"${value === x ? ' selected' : ''}>${E(x)}</option>`).join('');
  }
  function card(p, own = false) {
    const art = illustration(p);
    return `<article class="item-card"><a class="card-link" href="#detail/${encodeURIComponent(p.id)}" aria-label="查看${E(p.title)}详情">
      <div class="item-cover tone-${art.name}${p.photo ? ' photo' : ''}"><img src="${E(art.src)}" alt="${p.photo ? E(p.title) + '照片' : E(p.category) + '示意图'}" loading="lazy"><span class="type-badge ${p.type}">${p.type === 'lost' ? '寻物启事' : '失物招领'}</span>${p.demo ? '<span class="demo-badge">演示信息</span>' : ''}</div>
      <div class="card-body"><div class="card-title-row"><h3>${E(p.title)}</h3>${tag(p)}</div><p class="card-description">${E(p.description)}</p><div class="card-meta"><span class="place">${icon('pin')}${E(p.location)}</span><span>${E(p.eventDate.slice(5).replace('-', '.'))}</span></div></div></a>
      ${own ? `<div class="card-actions"><span>${p.status === 'done' ? '状态已同步到详情' : '物品有着落后记得更新'}</span>${p.status === 'active' ? `<button class="button small soft" data-complete="${E(p.id)}">标记${p.type === 'lost' ? '已找到' : '已归还'}</button>` : tag(p)}</div>` : ''}</article>`;
  }
  function empty(title, description, my = false) {
    return `<div class="empty-state"><img src="assets/box.svg" alt=""><h2>${title}</h2><p>${description}</p>${my ? '' : '<button class="button" data-action="reset">清空筛选</button>'}<a class="button primary" href="#publish">发布一条信息</a></div>`;
  }
  function home() {
    lastList = 'home'; listMemory.write('home');
    const active = state.posts.filter(p => p.status === 'active').length;
    const done = state.posts.length - active;
    main.innerHTML = `<div class="container"><section class="hero"><div><span class="eyebrow">每一件小事，都值得被认真对待</span><h1>让失物，<br>回到<em>主人身边。</em></h1><p>校园里的小小牵挂，在这里有回应。</p><div class="hero-links"><a class="button primary" href="#publish/lost">我丢了东西 ${icon('arrow')}</a><a class="button" href="#publish/found">我捡到了东西</a></div></div><img class="hero-art" src="assets/hero.svg" alt="校园卡、雨伞与钥匙汇聚在失物招领信封中"></section>
      <div class="intro-line"><span class="hint">${icon('leaf')}先核对特征，再联系归还。让善意多走一步。</span><span>本机记录 · 进行中 <b>${active}</b> 已完成 <b>${done}</b> <span>（含演示）</span></span></div>
      <section aria-labelledby="square-title"><div class="section-heading"><div><h2 id="square-title">失物招领广场</h2><p>或许你寻找的，刚好在这里。</p></div><form class="search-form" id="search-form" role="search">${icon('search')}<label class="sr-only" for="search-input">搜索物品名称、特征或地点</label><input id="search-input" name="keyword" type="search" placeholder="搜索物品名称、特征或地点" value="${E(filters.keyword)}" maxlength="100" autocomplete="off"><button class="button primary" type="submit">搜索</button></form></div>
      <div class="filter-panel"><div class="segmented" aria-label="信息类型">${[['all', '全部信息'], ['found', '失物招领'], ['lost', '寻物启事']].map(([value, label]) => `<button class="${filters.type === value ? 'active' : ''}" aria-pressed="${filters.type === value}" data-type="${value}">${label}</button>`).join('')}</div><div class="filter-selects"><label><span class="sr-only">物品分类筛选</span><select data-filter="category" aria-label="物品分类筛选">${options(C.CATEGORIES, filters.category, '全部分类')}</select></label><label><span class="sr-only">地点筛选</span><select data-filter="area" aria-label="地点筛选">${options(C.AREAS, filters.area, '全部地点')}</select></label><label><span class="sr-only">状态筛选</span><select data-filter="status" aria-label="状态筛选"><option value="active"${filters.status === 'active' ? ' selected' : ''}>仅进行中</option><option value="all"${filters.status === 'all' ? ' selected' : ''}>全部状态</option><option value="done"${filters.status === 'done' ? ' selected' : ''}>已完成</option></select></label><button class="reset" data-action="reset">重置</button></div></div>
      <div class="result-line"><span id="result-count" aria-live="polite"></span><label>排序 <select data-filter="sort" aria-label="排序"><option value="latest"${filters.sort === 'latest' ? ' selected' : ''}>最新发布</option><option value="event"${filters.sort === 'event' ? ' selected' : ''}>遗失 / 拾获日期</option></select></label></div><div id="results"></div></section>
      <div class="guide-strip"><span><b>一个小提醒</b>认领时核对物品特征，归还后由发布者更新状态。</span><a href="#help">查看指南 ↗</a></div></div>`;
    renderResults();
  }
  function renderResults() {
    const posts = C.queryPosts(state.posts, filters);
    $('#result-count').textContent = filters.keyword ? `“${filters.keyword}” · 找到 ${posts.length} 条信息` : `共 ${posts.length} 条${filters.status === 'active' ? '进行中的' : ''}信息`;
    $('#results').innerHTML = posts.length ? `<div class="card-grid">${posts.map(p => card(p)).join('')}</div>` : empty('暂时没有找到相关信息', '试试更短的关键词或放宽分类、地点和状态，也可以留下你的寻物信息。');
  }
  function mine() {
    lastList = 'mine'; listMemory.write('mine');
    const all = C.queryPosts(state.posts, { ownerId: state.ownerId });
    const counts = { all: all.length, active: all.filter(p => p.status === 'active').length, done: all.filter(p => p.status === 'done').length };
    const posts = C.queryPosts(all, { status: mineStatus });
    main.innerHTML = `<div class="container"><div class="page-top"><span class="eyebrow">每一条线索，都有后续</span><h1>我的发布</h1><p>找回或归还物品后，在这里为信息画上句号。</p></div><div class="notice">这里显示你在当前浏览器发布的信息。更换设备不会自动同步。<a href="#help"><u>了解本地保存</u></a></div><div class="segmented mine-tabs">${[['all', '全部'], ['active', '进行中'], ['done', '已完成']].map(([v, label]) => `<button class="${mineStatus === v ? 'active' : ''}" aria-pressed="${mineStatus === v}" data-mine-status="${v}">${label} ${counts[v]}</button>`).join('')}</div>${posts.length ? `<div class="card-grid">${posts.map(p => card(p, true)).join('')}</div>` : empty(all.length ? '这里还没有对应状态的信息' : '你的第一条线索，从这里开始', all.length ? '可切换上方状态查看其他发布。' : '发布寻物或招领后，可以在这里查看并更新状态。', true)}</div>`;
  }
  function field(name, label, html, wide = false, hint = '') {
    return `<div class="field${wide ? ' wide' : ''}"><label for="${name}">${label}</label>${html}<p class="field-error" id="error-${name}"></p>${hint ? `<p class="field-help">${hint}</p>` : ''}</div>`;
  }
  function publish(type) {
    const values = draft || { type: 'lost', category: '', area: '', contactType: '微信', eventDate: C.localDate(), nickname: '', photo: '' };
    if (['lost', 'found'].includes(type)) values.type = type;
    const kind = values.type === 'found' ? 'found' : 'lost'; photo = values.photo || '';
    const input = (name, placeholder, max, type = 'text') => `<input id="${name}" name="${name}" type="${type}" value="${E(values[name] || '')}" placeholder="${placeholder}"${max ? ` maxlength="${max}"` : ''}${type === 'date' ? ` min="2000-01-01" max="${C.localDate()}"` : ''} aria-describedby="error-${name}">`;
    const select = (name, list, emptyLabel) => `<select id="${name}" name="${name}" aria-describedby="error-${name}">${options(list, values[name], emptyLabel)}</select>`;
    main.innerHTML = `<div class="container"><div class="page-top"><a class="back-link" href="#home">${icon('back')}返回广场</a><h1>发布一条线索</h1><p>写下物品的特征，让对的人更容易找到。</p></div><div class="form-layout"><form class="form-card" id="publish-form" novalidate><div id="form-alert" class="form-alert" role="alert" hidden></div><fieldset><legend>你想发布什么？</legend><div class="type-options">${[['lost', '我丢了东西', '发布寻物，等待线索'], ['found', '我捡到了东西', '发布招领，寻找失主']].map(([v, l, d]) => `<label class="type-option"><input type="radio" name="type" value="${v}"${kind === v ? ' checked' : ''}><span><b>${l}</b><small>${d}</small></span></label>`).join('')}</div></fieldset><div class="form-grid">
      ${field('title', '物品名称', input('title', '例如：蓝色保温杯', 40))}${field('category', '物品分类', select('category', C.CATEGORIES, '请选择分类'))}
      ${field('eventDate', '<span id="date-label">' + (kind === 'lost' ? '遗失' : '拾获') + '日期</span>', input('eventDate', '', 0, 'date'))}${field('area', '所在区域', select('area', C.AREAS, '请选择区域'))}
      ${field('location', '具体地点', input('location', '例如：图书馆二楼靠窗自习区', 60), true)}
      ${field('description', '物品特征与补充说明', `<textarea id="description" name="description" placeholder="颜色、外观、时间线……多一个细节，就多一份找回的可能。" maxlength="500" aria-describedby="error-description">${E(values.description || '')}</textarea>`, true, '5–500 字。招领信息可保留一两个细节，联系时再核对。')}
      ${field('photo', '物品图片 <span class="optional">（选填）</span>', '<input id="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="error-photo"><div class="upload-preview" id="upload-preview"></div>', true, '支持 JPG、PNG、WebP，原图不超过 5 MB。上传后自动压缩。')}
      </div><hr class="form-divider"><fieldset><legend>留下联系方式</legend><div class="form-grid">${field('nickname', '联系称呼', input('nickname', '希望对方如何称呼你', 20))}${field('contactType', '联系方式类型', select('contactType', C.CONTACTS))}${field('contact', '联系方式', input('contact', '填写可联系到你的账号或号码', 100), true, '联系方式会在此信息详情中展示，请确认愿意公开。')}</div></fieldset><div class="form-end"><p class="draft-note" id="draft-note">${draft ? '已恢复上次未发布的草稿。' : '填写内容会自动保存为本机草稿。'}<br>除图片外，以上信息均需填写。</p><button type="submit" class="button primary" id="publish-submit">确认发布 ${icon('arrow')}</button></div></form><aside class="aside-card"><h2>让线索更有用</h2><ol><li>名称简明，方便按关键词查找。</li><li>写清日期与具体地点，缩小寻找范围。</li><li>联系时核对特征，约在校内公共地点交接。</li><li>有结果后，到“我的发布”标记已找到或已归还。</li></ol><div class="aside-divider"><p>本机发布会保存在当前浏览器。关闭再打开仍可查看；清理浏览器数据会影响记录。</p></div><div class="aside-mark">“</div><p class="quote">让一件小事，<br>有一个温暖的回音。</p></aside></div></div>`;
    updatePhoto();
  }
  function readForm() {
    const form = $('#publish-form'); if (!form) return draft;
    return { ...Object.fromEntries(new FormData(form)), photo };
  }
  function saveDraft() {
    if (!$('#publish-form')) return;
    draft = readForm();
    const result = S.saveDraft(storage, draft);
    $('#draft-note').textContent = result.ok ? '草稿已自动保存到当前浏览器。' : result.error;
  }
  function updatePhoto() {
    const el = $('#upload-preview'); if (!el) return;
    el.innerHTML = photo ? `<img src="${E(photo)}" alt="上传图片预览"><button class="button small" type="button" data-action="remove-photo">移除图片</button>` : '';
  }
  async function upload(file) {
    const token = ++uploadToken;
    const err = $('#error-photo'); err.textContent = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { err.textContent = '请选择不超过 5 MB 的 JPG、PNG 或 WebP 图片。'; return; }
    uploading = true; $('#publish-submit').disabled = true;
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 50000000) { bitmap.close(); throw new Error('图片尺寸过大，请缩小后重试。'); }
      const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      let value = canvas.toDataURL('image/jpeg', .78);
      if (value.length > 420000) value = canvas.toDataURL('image/jpeg', .45);
      if (!C.isPhoto(value)) throw new Error('图片压缩后仍过大，请换一张较小的图片。');
      if (token === uploadToken && $('#publish-form')) { photo = value; updatePhoto(); saveDraft(); }
    } catch (error) { if (token === uploadToken && $('#error-photo')) $('#error-photo').textContent = error instanceof DOMException ? '无法读取图片内容，请换一张完整的 JPG、PNG 或 WebP 图片。' : error.message || '无法读取图片，请更换文件。'; }
    finally { if (token === uploadToken) { uploading = false; if ($('#publish-submit')) $('#publish-submit').disabled = false; } }
  }
  function detail(id) {
    const p = state.posts.find(p => p.id === id);
    if (!p) { main.innerHTML = `<div class="container page-top">${empty('这条信息不存在', '链接可能有误，请返回广场重新查找。')}</div>`; return; }
    const art = illustration(p), own = C.canManage(p, state.ownerId);
    main.innerHTML = `<div class="container"><div class="page-top"><a class="back-link" href="#${lastList}">${icon('back')}返回${lastList === 'mine' ? '我的发布' : '广场'}</a></div><div class="detail-layout"><div><div class="detail-cover${p.photo ? ' photo' : ''}"><img src="${E(art.src)}" alt="${E(p.title)}${p.photo ? '照片' : '分类示意图'}">${p.demo ? '<span class="demo-badge">演示信息</span>' : ''}</div><div class="notice">${p.photo ? '照片由发布者提供。' : '图片为分类示意，请以文字描述为准。'}认领时请核对物品特征。</div></div><article class="detail-panel"><div class="detail-badges">${tag(p)}<span class="tag">${p.type === 'lost' ? '寻物启事' : '失物招领'}</span><span class="tag">${E(p.category)}</span></div><h1>${E(p.title)}</h1><dl class="detail-data"><dt>${p.type === 'lost' ? '遗失' : '拾获'}日期</dt><dd>${E(p.eventDate)}</dd><dt>所在区域</dt><dd>${E(p.area)}</dd><dt>具体地点</dt><dd>${E(p.location)}</dd><dt>发布者</dt><dd>${E(p.nickname)}${own ? '（你）' : ''}</dd><dt>发布时间</dt><dd>${new Date(p.createdAt).toLocaleString('zh-CN', { hour12: false })}</dd></dl><h2>物品特征与补充说明</h2><p class="detail-description">${E(p.description)}</p>
      ${p.demo ? '<div class="notice">这是一条虚构的演示信息，联系方式仅供测试。</div>' : ''}${p.status === 'done' ? `<div class="notice">${icon('check')} 发布者已标记“${C.statusLabel(p)}”，请避免重复询问。</div>` : ''}<div class="detail-actions"><button class="button ${p.status === 'done' ? '' : 'primary'}" data-contact="${E(p.id)}">${p.status === 'done' ? '查看原联系方式' : '查看联系方式'}</button>${own && p.status === 'active' ? `<button class="button soft" data-complete="${E(p.id)}">标记${p.type === 'lost' ? '已找到' : '已归还'}</button>` : ''}</div><p class="detail-footnote">${own ? '此信息由你发布，可在此页或“我的发布”中更新状态。' : '信息状态由发布者更新。'}${p.status === 'done' ? ` 最后更新：${new Date(p.updatedAt).toLocaleString('zh-CN', { hour12: false })}` : ''}</p></article></div></div>`;
  }
  function success(id) {
    const p = state.posts.find(p => p.id === id);
    if (!p || !C.canManage(p, state.ownerId)) { detail(id); return; }
    main.innerHTML = `<div class="container"><section class="success"><div class="success-icon">${icon('check')}</div><span class="eyebrow">你的线索，已经留下</span><h1>发布成功</h1><p class="success-title">${E(p.title)}</p><p>这条${p.type === 'lost' ? '寻物' : '招领'}信息已保存到当前浏览器。<br>有结果后，记得在“我的发布”里更新状态。</p><div class="success-buttons"><a class="button primary" href="#detail/${encodeURIComponent(id)}">查看信息</a><a class="button" href="#mine">我的发布</a><a class="button" href="#home">返回广场</a></div></section></div>`;
  }
  function help() {
    main.innerHTML = `<div class="container help-width"><div class="page-top"><span class="eyebrow">从一条线索，到一次失而复得</span><h1>使用指南</h1><p>延续第一次结对作业“拾光”的浏览、发布、搜索和联系流程。</p></div><div class="help-grid">${[
      ['发布信息', '点击“发布信息”，选择寻物或招领，填写名称、分类、日期、区域、具体地点、特征、称呼和联系方式。图片选填，完成后点击“确认发布”。'],
      ['查找线索', '在广场输入物品名称、特征或地点。多个关键词用空格分开，所有词都匹配才会显示。可以组合分类、地点和类型筛选。'],
      ['核对与联系', '打开卡片查看同一件物品的详细描述，再查看或复制联系方式。复制受限时可选中文字手动复制；演示信息不能用于真实联系。'],
      ['更新状态', '联系并核对、交接完成后，由发布者进入“我的发布”或详情，确认标记“已找到”或“已归还”。首页默认只看进行中，可切换全部状态查看完成记录。']
    ].map(([title, body], i) => `<section class="help-card"><span class="step-no">0${i + 1}</span><h2>${title}</h2><p>${body}</p></section>`).join('')}</div><section class="help-card" style="margin-top:22px"><h2>关于本地演示版</h2><p>用 Chrome 打开 index.html 即可运行，无需安装依赖或连接网络。首次打开有 7 条虚构演示信息，均带标记；你提交的信息会出现在广场和“我的发布”中。</p><p>本版记录和草稿保存在当前浏览器的本地存储中。使用另一个浏览器、换设备、移动文件路径或清理浏览器数据，可能无法继续读取原记录。请保持文件位置固定，勿用无痕模式保存重要信息。</p><p>本机身份用于演示“只有发布者可更新”的操作边界，不提供真实登录与服务端权限校验，不能用于跨设备的校园正式服务。实际上线需要数据库和服务端身份验证。</p><h2>常见情况</h2><p><b>找不到信息：</b>先重置筛选；如果已经完成，可切换“全部状态”。<br><b>填到一半离开：</b>草稿会自动保存，重新进入发布页面可以继续。<br><b>无法保存：</b>页面会明确报错并保留输入，尝试移除图片或检查浏览器存储设置，不会把失败当作发布成功。<br><b>不能修改演示卡片：</b>示例属于其他发布者。请先自行发布一条信息再测试状态更新。</p><a class="button primary" href="#home">开始寻找 ${icon('arrow')}</a></section></div>`;
  }
  function showModal(content) {
    lastFocus = document.activeElement;
    $('#modal-content').innerHTML = content; modal.showModal();
  }
  function closeModal() { modal.close(); if (lastFocus?.isConnected) lastFocus.focus(); }
  function contact(id) {
    const p = state.posts.find(p => p.id === id); if (!p) return;
    showModal(`<h2 id="modal-title">联系发布者</h2><p>${E(p.nickname)} · ${E(p.title)}</p><div class="contact-box"><label for="contact-value">${E(p.contactType)}${p.demo ? ' · 演示账号' : ''}</label><input readonly id="contact-value" value="${E(p.contact)}" aria-label="联系方式"></div><p class="contact-notice">${p.status === 'done' ? `此信息已${C.statusLabel(p).slice(1)}，请避免重复联系。` : '联系时先说明物品，核对特征后再约定交接。'}${p.demo ? ' 此联系方式为虚构样例，请勿发送消息。' : ''}</p><p id="copy-feedback" role="status" class="contact-notice"></p><div class="modal-actions"><button class="button" data-action="close-modal">关闭</button><button class="button primary" data-action="copy">${icon('copy')}复制联系方式</button></div>`);
  }
  function confirmComplete(id) {
    const p = state.posts.find(p => p.id === id);
    if (!C.canManage(p, state.ownerId) || p.status !== 'active') { toast('只有发布者可以更新进行中的信息。'); return; }
    const label = p.type === 'lost' ? '已找到' : '已归还';
    showModal(`<h2 id="modal-title">确认${label}？</h2><p>“${E(p.title)}”将标记为${label}，并从广场默认的进行中列表隐藏。所有查看此信息的人都能看到最新状态。</p><p>请在实际找回或完成归还后操作。</p><div class="modal-actions"><button class="button" data-action="close-modal">暂不更新</button><button class="button primary" data-confirm="${E(id)}">确认${label}</button></div>`);
  }
  function refreshData() {
    const current = S.load(storage, [], state.ownerId);
    if (!current.ok) { toast(current.error); return false; }
    state = current.state; return true;
  }
  function finish(id) {
    if (!refreshData()) return;
    const result = C.completePost(state.posts, id, state.ownerId);
    if (!result.ok) { toast(result.error); closeModal(); render(); return; }
    const next = { ...state, posts: result.posts }, saved = S.save(storage, next);
    if (!saved.ok) { toast(saved.error); return; }
    state = next; closeModal(); render(); toast('状态已更新，广场和详情已同步。');
  }
  async function copyContact() {
    const input = $('#contact-value'), feedback = $('#copy-feedback'); if (!input) return;
    let copied = false;
    try { await navigator.clipboard.writeText(input.value); copied = true; } catch { input.focus(); input.select(); try { copied = document.execCommand('copy'); } catch { /* Manual selection remains available. */ } }
    feedback.textContent = copied ? '联系方式已复制。' : '自动复制受限，请选中上方文字，按 Ctrl+C（Mac 用 ⌘C）复制。';
    if (!copied) { input.focus(); input.select(); }
  }
  function submitPost(event) {
    event.preventDefault(); if (uploading) return;
    const data = readForm(), result = C.createPost(data, state.ownerId);
    document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
    document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    const alert = $('#form-alert'); alert.hidden = true;
    if (!result.ok) {
      alert.textContent = result.error || '还有信息需要补充，请检查下方提示。'; alert.hidden = false;
      for (const [key, message] of Object.entries(result.errors || {})) { const el = $(`#error-${key}`); if (el) el.textContent = message; $(`#${key}`)?.setAttribute('aria-invalid', 'true'); }
      const first = Object.keys(result.errors || {})[0]; if (first) $(`#${first}`)?.focus(); return;
    }
    if (!refreshData()) return;
    const next = { ...state, posts: [result.post, ...state.posts] }, saved = S.save(storage, next);
    if (!saved.ok) { alert.textContent = saved.error; alert.hidden = false; return; }
    state = next; draft = null; photo = ''; const cleared = S.clearDraft(storage);
    $('#publish-submit').disabled = true;
    location.hash = `success/${encodeURIComponent(result.post.id)}`;
    if (!cleared.ok) toast(cleared.error);
  }
  function render() {
    if (modal.open) closeModal();
    uploadToken++; uploading = false;
    if (failure) {
      main.innerHTML = `<div class="container page-top"><section class="help-card"><h1>暂时无法读取本地记录</h1><p>${E(failure)}</p><p>为保护已有内容，本次没有覆盖存储。你可以导出原始数据，检查浏览器设置后重新打开。</p><button class="button" data-action="export-raw">导出原始记录</button> <button class="button primary" data-action="reload">重新读取</button></section></div>`; return;
    }
    const parts = location.hash.slice(1).split('/'); const route = parts[0] || 'home'; let id = '';
    try { id = decodeURIComponent(parts.slice(1).join('/')); } catch { id = ''; }
    document.querySelectorAll('[data-nav]').forEach(a => { if (a.dataset.nav === route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = `${({ home: '失物招领', mine: '我的发布', publish: '发布信息', detail: '物品详情', success: '发布成功', help: '使用指南' })[route] || '失物招领'} · 拾光`;
    if (route === 'publish') publish(id); else if (route === 'mine') mine(); else if (route === 'detail') detail(id); else if (route === 'success') success(id); else if (route === 'help') help(); else home();
  }
  function resetFilters() { filters = { keyword: '', type: 'all', category: '', area: '', status: 'active', sort: 'latest' }; if (location.hash !== '#home' && location.hash !== '') location.hash = 'home'; else home(); }
  document.addEventListener('click', event => {
    if (event.target.closest('.skip-link')) { event.preventDefault(); main.focus(); main.scrollIntoView(); return; }
    const el = event.target.closest('button'); if (!el) return;
    /* Update the segmented buttons and the result list only, so a keyword typed but not yet
       submitted in the search box is not wiped out by a full re-render of the home page. */
    if (el.dataset.type) {
      filters.type = el.dataset.type;
      document.querySelectorAll('.segmented[aria-label="信息类型"] button').forEach(b => {
        const active = b.dataset.type === filters.type;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      renderResults();
    }
    if (el.dataset.mineStatus) { mineStatus = el.dataset.mineStatus; mine(); }
    if (el.dataset.contact) contact(el.dataset.contact);
    if (el.dataset.complete) confirmComplete(el.dataset.complete);
    if (el.dataset.confirm) finish(el.dataset.confirm);
    switch (el.dataset.action) {
      case 'reset': resetFilters(); break;
      case 'close-modal': closeModal(); break;
      case 'copy': copyContact(); break;
      case 'remove-photo': uploadToken++; uploading = false; photo = ''; $('#photo').value = ''; $('#publish-submit').disabled = false; updatePhoto(); saveDraft(); break;
      case 'reload': location.reload(); break;
      case 'export-raw': {
        try { const text = storage.getItem(S.KEY); const url = URL.createObjectURL(new Blob([text || '没有可读取的原始记录'], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = '拾光-原始记录备份.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch { toast('浏览器拒绝读取原始记录，请检查存储设置。'); }
        break;
      }
    }
  });
  document.addEventListener('submit', event => {
    if (event.target.id === 'publish-form') submitPost(event);
    if (event.target.id === 'search-form') { event.preventDefault(); filters.keyword = $('#search-input').value.trim(); renderResults(); }
  });
  document.addEventListener('change', event => {
    const el = event.target;
    if (el.dataset.filter) { filters[el.dataset.filter] = el.value; renderResults(); }
    if (el.id === 'photo') upload(el.files[0]);
    if (el.closest('#publish-form') && el.id !== 'photo') { if (el.name === 'type') $('#date-label').textContent = el.value === 'lost' ? '遗失日期' : '拾获日期'; saveDraft(); }
  });
  document.addEventListener('input', event => { if (event.target.closest('#publish-form') && event.target.id !== 'photo') saveDraft(); });
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); main.focus({ preventScroll: true }); });
  window.addEventListener('storage', event => { if (event.key === S.KEY && !$('#publish-form')) { const r = S.load(storage, [], state?.ownerId || `owner-${crypto.randomUUID()}`); if (r.ok) { state = r.state; failure = ''; } else failure = r.error; render(); } });
  modal.addEventListener('click', event => { if (event.target === modal) { const r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); } });
  render();
})();
