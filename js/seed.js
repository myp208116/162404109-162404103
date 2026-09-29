/* Fictitious examples; never show real classmates' contact information. */
(function (root) {
  'use strict';
  const samples = [
    ['card', 'found', '校园卡', '证件卡片', '图书馆', '图书馆二楼自习区', '在靠窗的自习桌上发现一张校园卡，装在浅绿色卡套里。请认领时说明姓名和卡套上的图案。', '小林', 1],
    ['bottle', 'lost', '蓝色保温杯', '生活用品', '教学楼', '教学楼 A 座 302 教室', '蓝色杯身，银色杯盖，约 500 毫升，杯底贴着一枚小小的星星贴纸。离开教室后发现忘了带走。', '小周', 1],
    ['umbrella', 'found', '米色雨伞', '生活用品', '食堂', '第一食堂门口雨伞架', '一把米色长柄雨伞，木色弯柄，伞面边缘有棕色细线。暂放在食堂服务台，可先联系核对。', '小陈', 2],
    ['keys', 'found', '带棕色挂件的钥匙', '钥匙', '运动场', '运动场东侧看台', '捡到一串钥匙，带棕色圆形挂件。请说明钥匙数量和形状，核对后约定归还地点。', '小许', 2],
    ['headphones', 'lost', '白色无线耳机', '数码产品', '宿舍区', '宿舍区通往图书馆的步道', '白色耳机充电盒，外面套着淡蓝色保护套，侧面有一道浅浅的划痕。只遗失充电盒。', '小吴', 3],
    ['book', 'found', '高等数学笔记本', '书本文具', '教学楼', '教学楼 B 座一楼走廊', '深绿色封皮的横线笔记本，内有高等数学课堂笔记。扉页写有名字，请联系时核对。', '小杨', 3],
    ['scarf', 'lost', '灰色围巾', '衣物配饰', '校园其他', '校内公交站旁长椅', '灰色针织围巾，末端有细流苏。已经在长椅附近找到，感谢提供线索的同学。', '小叶', 4]
  ];
  root.ShiguangSeed = function () {
    return samples.map(([id, type, title, category, area, location, description, nickname, days]) => {
      const d = new Date(); d.setDate(d.getDate() - days); d.setHours(10, 15, 0, 0);
      return { id: `demo-${id}`, type, title, category, area, location, description, nickname,
        eventDate: root.ShiguangCore.localDate(d), contactType: '邮箱', contact: 'demo@example.com',
        photo: '', ownerId: `demo-owner-${id}`, status: id === 'scarf' ? 'done' : 'active',
        createdAt: d.toISOString(), updatedAt: d.toISOString(), demo: true, illustration: id };
    });
  };
})(globalThis);
