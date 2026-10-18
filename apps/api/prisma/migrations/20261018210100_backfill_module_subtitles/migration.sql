UPDATE "module_display_configs"
SET "subtitle" = CASE "key"
  WHEN 'chat' THEN '100+大模型'
  WHEN 'draw' THEN '绘图 / 修图 / 图片创作'
  WHEN 'agents' THEN '1000+功能'
  WHEN 'retouch' THEN '抠图、一键PS'
  WHEN 'image-generation' THEN '3D手办、文生图'
  WHEN 'video' THEN 'Seedance2.0'
  WHEN 'canvas' THEN '画布生图 / 画布视频'
  WHEN 'commerce' THEN '试衣、换背景'
  WHEN 'music' THEN '真人、克隆'
  WHEN 'workbench' THEN '写作、表格、汇报'
  WHEN 'map' THEN '全部能力一览'
  WHEN 'all-tools' THEN '更多功能'
  ELSE "subtitle"
END
WHERE "subtitle" IS NULL
  AND "key" IN (
    'chat',
    'draw',
    'agents',
    'retouch',
    'image-generation',
    'video',
    'canvas',
    'commerce',
    'music',
    'workbench',
    'map',
    'all-tools'
  );
