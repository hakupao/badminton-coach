# JSON 内容结构指南

本项目通过 `content/i18n/{lang}` 目录提供多语言内容，页面只负责读取并渲染 JSON。你只需要维护这些 JSON 文件即可。

**目录结构**
```
content/
  i18n/
    en/
      site.json
      course/
        index.json
        2026/
          2026-01-14-basic-footwork.json
      knowledge/
        index.json
        footwork/
          split-step-basics.json
    zh/
      site.json
      course/
      knowledge/
  media/
    images/
```

**基础约定**
- `lang` 目前支持 `en` / `zh`，结构必须一致。
- `path` 都是相对 `content/i18n/{lang}` 的路径。
- `slug` 必须唯一，页面通过 `?slug=` 读取内容。
- `date` 使用 `YYYY-MM-DD`。
- `accent` 是 16 进制颜色字符串（如 `#e9c46a`），可选。
- 字段允许少量缺省，UI 会自动忽略缺失字段。

**site.json**
用于首页与全站 UI 文案。
```json
{
  "title": "站点名称",
  "tagline": "副标题",
  "description": "简介",
  "cta": { "label": "按钮文案", "href": "#courses" },
  "highlights": [
    { "label": "标签", "value": "值" }
  ],
  "ui": {
    "navCourses": "课程",
    "navKnowledge": "知识",
    "navAllCourses": "全部课程",
    "navAllTopics": "全部主题",
    "navStartTraining": "开始训练",
    "heroEyebrow": "训练框架",
    "heroSecondaryCta": "查看知识",
    "heroPanelTitle": "课程结构",
    "heroPanelItems": [
      "热身激活身体。",
      "聚焦一个关键要点。"
    ],
    "coursesEyebrow": "课程",
    "coursesTitle": "可复用的训练方案",
    "coursesDescription": "每节课包含目标、练习和教练提示。",
    "knowledgeEyebrow": "知识",
    "knowledgeTitle": "短小精炼的提醒",
    "knowledgeDescription": "用知识卡片强化技术与安全提示。",
    "courseEyebrow": "课程",
    "courseGoalsTitle": "训练目标",
    "knowledgeQuickTitle": "快速要点",
    "courseCountLabel": "课程",
    "topicCountLabel": "主题",
    "durationUnit": "分钟",
    "sectionStructureTitle": "课程结构",
    "sectionDrillsTitle": "练习",
    "sectionCoachingNotesTitle": "教练提示",
    "sectionSafetyTitle": "安全",
    "sectionEquipmentTitle": "器材",
    "metaCategoryPrefix": "分类：",
    "metaUpdatedPrefix": "更新：",
    "errorCourses": "课程加载失败。",
    "errorCourseNotFound": "未找到课程。",
    "errorCourseLoad": "无法加载课程。",
    "errorTopicsNotFound": "未找到主题。",
    "errorTopicLoad": "无法加载主题。",
    "errorBackHome": "返回首页",
    "errorSeeCourses": "查看全部课程",
    "errorSeeTopics": "查看全部主题"
  },
  "footerNote": "页脚备注"
}
```

**course/index.json**
课程列表（首页卡片来源）。
```json
{
  "updated": "2026-01-21",
  "items": [
    {
      "slug": "2026-01-14-basic-footwork",
      "title": "基础步伐",
      "date": "2026-01-14",
      "level": "初学",
      "durationMin": 90,
      "summary": "课程简介",
      "tags": ["步伐", "平衡"],
      "accent": "#e9c46a",
      "path": "course/2026/2026-01-14-basic-footwork.json"
    }
  ]
}
```

**course/{year}/{slug}.json**
课程详情页。
```json
{
  "slug": "2026-01-14-basic-footwork",
  "title": "基础步伐",
  "date": "2026-01-14",
  "level": "初学",
  "durationMin": 90,
  "summary": "课程概要",
  "accent": "#e9c46a",
  "goals": ["目标 1", "目标 2"],
  "structure": [
    { "title": "热身", "items": ["动作 1", "动作 2"] }
  ],
  "drills": [
    {
      "name": "练习名称",
      "durationMin": 12,
      "focus": ["要点 1", "要点 2"],
      "notes": ["提示 1", "提示 2"]
    }
  ],
  "coachingNotes": ["教练提示 1"],
  "safety": ["安全提示 1"],
  "equipment": ["器材 1"],
  "tags": ["步伐"]
}
```

**knowledge/index.json**
知识库分类与卡片列表。
```json
{
  "updated": "2026-01-21",
  "categories": [
    {
      "id": "footwork",
      "title": "步伐",
      "summary": "分类简介",
      "items": [
        {
          "slug": "split-step-basics",
          "title": "分腿跳基础",
          "summary": "短简介",
          "tags": ["时机", "落地"],
          "accent": "#f4a261",
          "path": "knowledge/footwork/split-step-basics.json"
        }
      ]
    }
  ]
}
```

**knowledge/{category}/{slug}.json**
知识详情页。
```json
{
  "slug": "split-step-basics",
  "title": "分腿跳基础",
  "summary": "知识概要",
  "accent": "#f4a261",
  "tags": ["时机", "落地"],
  "sections": [
    { "title": "要点", "items": ["内容 1", "内容 2"] }
  ],
  "drills": [
    {
      "name": "练习名称",
      "durationMin": 6,
      "focus": ["要点 1"],
      "notes": ["提示 1"]
    }
  ]
}
```

**新增内容流程**
新增课程：
1. 在 `content/i18n/{lang}/course/{year}/` 新建课程详情 JSON。
2. 在 `content/i18n/{lang}/course/index.json` 添加一条 `items` 记录。
3. 两个语言目录都新增对应内容（结构一致）。

新增知识：
1. 在 `content/i18n/{lang}/knowledge/{category}/` 新建知识详情 JSON。
2. 在 `content/i18n/{lang}/knowledge/index.json` 的分类 `items` 中追加条目。
3. 若新分类，新增 `categories` 节点并创建对应文件夹。

