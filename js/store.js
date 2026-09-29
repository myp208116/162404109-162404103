(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.ShiguangStore = factory(root.ShiguangCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core) {
  'use strict';
  const KEY = 'shiguang.data.v1';
  const DRAFT_KEY = 'shiguang.draft.v1';
  const VERSION = 1;
  function validState(data) {
    return data && data.version === VERSION && typeof data.ownerId === 'string' && data.ownerId.length > 0
      && Array.isArray(data.posts) && data.posts.every(Core.validPost)
      && new Set(data.posts.map(p => p.id)).size === data.posts.length;
  }
  function save(storage, state) {
    if (!validState(state)) return { ok: false, error: '数据校验失败，未保存。' };
    try { storage.setItem(KEY, JSON.stringify(state)); return { ok: true }; }
    catch { return { ok: false, error: '未能保存。浏览器存储可能已满或被禁用，请保留当前内容，尝试移除图片后重试。' }; }
  }
  function load(storage, seeds = [], ownerId) {
    try {
      const raw = storage.getItem(KEY);
      if (raw !== null) {
        const state = JSON.parse(raw);
        if (!validState(state)) return { ok: false, error: '本地记录格式异常，原始数据已保留。请先导出原始记录，再检查浏览器设置。' };
        return { ok: true, state };
      }
      const state = { version: VERSION, ownerId, posts: seeds };
      const result = save(storage, state);
      return result.ok ? { ok: true, state } : result;
    } catch { return { ok: false, error: '无法读取本地记录。原始数据未覆盖，请检查浏览器是否允许本地存储。' }; }
  }
  function saveDraft(storage, data) {
    try { storage.setItem(DRAFT_KEY, JSON.stringify(data)); return { ok: true }; }
    catch { return { ok: false, error: '草稿未保存，请保留当前页面内容。' }; }
  }
  function loadDraft(storage) {
    try {
      const data = JSON.parse(storage.getItem(DRAFT_KEY) || 'null');
      if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
      const safe = {};
      for (const key of ['type', 'title', 'category', 'area', 'location', 'eventDate', 'description', 'contactType', 'contact', 'nickname']) safe[key] = typeof data[key] === 'string' ? data[key].slice(0, 600) : '';
      safe.photo = Core.isPhoto(data.photo) ? data.photo : '';
      return safe;
    } catch { return null; }
  }
  function clearDraft(storage) {
    try { storage.removeItem(DRAFT_KEY); return { ok: true }; }
    catch { return { ok: false, error: '发布已保存，但旧草稿未清除，请勿重复提交。' }; }
  }
  return { KEY, DRAFT_KEY, VERSION, validState, save, load, saveDraft, loadDraft, clearDraft };
});
