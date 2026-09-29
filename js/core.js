/* Business rules shared by the offline page and Node.js tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShiguangCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const CATEGORIES = ['证件卡片', '数码产品', '钥匙', '生活用品', '书本文具', '衣物配饰', '其他'];
  const AREAS = ['图书馆', '教学楼', '食堂', '宿舍区', '运动场', '校园其他'];
  const CONTACTS = ['微信', 'QQ', '手机', '邮箱'];
  const TEXT_LIMITS = { title: 40, location: 60, description: 500, contact: 100, nickname: 20 };
  const STATUS = { lost: { active: '寻找中', done: '已找到' }, found: { active: '待认领', done: '已归还' } };
  const clean = value => typeof value === 'string' ? value.trim() : '';
  const norm = value => clean(value).normalize('NFKC').toLocaleLowerCase('zh-CN');
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function isDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return year >= 2000 && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
  }
  function isPhoto(value) {
    return value === '' || (typeof value === 'string' && value.length <= 420000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value));
  }
  function validatePost(input, today = localDate()) {
    const x = input && typeof input === 'object' ? input : {};
    const data = {};
    const errors = {};
    for (const key of ['type', 'title', 'category', 'area', 'location', 'eventDate', 'description', 'contactType', 'contact', 'nickname']) data[key] = clean(x[key]);
    data.photo = typeof x.photo === 'string' ? x.photo : '';
    if (!Object.hasOwn(STATUS, data.type)) errors.type = '请选择寻物或招领。';
    if (!data.title) errors.title = '请填写物品名称。';
    if (!CATEGORIES.includes(data.category)) errors.category = '请选择物品分类。';
    if (!AREAS.includes(data.area)) errors.area = '请选择所在区域。';
    if (!data.location) errors.location = '请填写具体地点。';
    if (!isDate(data.eventDate)) errors.eventDate = '请选择有效的遗失或拾获日期。';
    else if (data.eventDate > today) errors.eventDate = '日期不能晚于今天。';
    if (data.description.length < 5) errors.description = '请至少填写 5 个字的物品特征，方便核对。';
    if (!data.nickname) errors.nickname = '请填写联系称呼。';
    if (!CONTACTS.includes(data.contactType)) errors.contactType = '请选择联系方式类型。';
    if (!data.contact) errors.contact = '请填写联系方式。';
    else if (data.contactType === '手机' && !/^1[3-9]\d{9}$/.test(data.contact)) errors.contact = '请填写 11 位大陆手机号码。';
    else if (data.contactType === '邮箱' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact)) errors.contact = '请填写有效的邮箱地址。';
    else if (data.contactType === 'QQ' && !/^[1-9]\d{4,11}$/.test(data.contact)) errors.contact = 'QQ 号码须为 5–12 位数字，不能以 0 开头。';
    else if (data.contactType === '微信' && !/^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/.test(data.contact)) errors.contact = '微信号须为 6–20 位，以字母开头，可含数字、下划线和减号。';
    for (const [key, max] of Object.entries(TEXT_LIMITS)) if (data[key].length > max) errors[key] = `最多填写 ${max} 个字符。`;
    if (!isPhoto(data.photo)) errors.photo = '图片格式不受支持或压缩后仍过大，请换一张图片。';
    return { ok: Object.keys(errors).length === 0, data, errors };
  }
  function createPost(input, ownerId, now = new Date(), id) {
    const result = validatePost(input, localDate(now));
    if (!result.ok) return result;
    if (!clean(ownerId)) return { ok: false, error: '无法识别本机发布者，请重新打开页面。' };
    return { ok: true, post: { ...result.data, id: id || `post-${globalThis.crypto.randomUUID()}`, ownerId, status: 'active', createdAt: now.toISOString(), updatedAt: now.toISOString(), demo: false } };
  }
  function statusLabel(post) { return STATUS[post.type]?.[post.status] || '未知状态'; }
  function canManage(post, ownerId) { return Boolean(post && !post.demo && ownerId && post.ownerId === ownerId); }
  function completePost(posts, id, ownerId, now = new Date()) {
    const post = posts.find(p => p.id === id);
    if (!post) return { ok: false, error: '这条信息不存在。' };
    if (!canManage(post, ownerId)) return { ok: false, error: '只有发布者可以更新状态。' };
    if (post.status === 'done') return { ok: false, error: '这条信息已经完成，无需重复操作。' };
    return { ok: true, posts: posts.map(p => p.id === id ? { ...p, status: 'done', updatedAt: now.toISOString() } : p) };
  }
  function queryPosts(posts, filters = {}) {
    const tokens = norm(filters.keyword).split(/\s+/).filter(Boolean);
    return posts.filter(p => (!filters.ownerId || p.ownerId === filters.ownerId)
      && (!filters.type || filters.type === 'all' || p.type === filters.type)
      && (!filters.status || filters.status === 'all' || p.status === filters.status)
      && (!filters.category || p.category === filters.category)
      && (!filters.area || p.area === filters.area)
      && tokens.every(t => norm(`${p.title} ${p.description} ${p.location} ${p.area} ${p.category}`).includes(t)))
      .sort((a, b) => filters.sort === 'event' ? b.eventDate.localeCompare(a.eventDate) || b.createdAt.localeCompare(a.createdAt) : b.createdAt.localeCompare(a.createdAt));
  }
  function validPost(p) {
    if (!p || typeof p !== 'object' || !clean(p.id) || !clean(p.ownerId)) return false;
    if (!['active', 'done'].includes(p.status) || typeof p.demo !== 'boolean') return false;
    if (!Number.isFinite(Date.parse(p.createdAt)) || !Number.isFinite(Date.parse(p.updatedAt))) return false;
    return validatePost(p, '9999-12-31').ok;
  }
  return { CATEGORIES, AREAS, CONTACTS, TEXT_LIMITS, escapeHTML, localDate, isDate, isPhoto, validatePost, createPost, statusLabel, canManage, completePost, queryPosts, validPost };
});
