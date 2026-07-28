export type StyleMeta = {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly descriptor: string;
  readonly bestFor: string;
};

export const styleMeta: readonly StyleMeta[] = [
  {id: "StyleAEditorial", code: "A", name: "清亮编辑部", descriptor: "杂志版式 + 校对痕迹", bestFor: "方法、判断与案例拆解"},
  {id: "StyleBStoryboard", code: "B", name: "导演时间线", descriptor: "分镜台 + 播放头", bestFor: "编导身份与创作过程"},
  {id: "StyleCFieldNotes", code: "C", name: "蓝图手记", descriptor: "方格纸 + 手写批注", bestFor: "边做边讲、实验记录"},
  {id: "StyleDBroadcast", code: "D", name: "数据演播室", descriptor: "新闻条带 + 证据窗口", bestFor: "爆款、数据与快节奏结论"},
  {id: "StyleESystem", code: "E", name: "命令行工作台", descriptor: "终端语言 + 精确反馈", bestFor: "AI Agent 与自动化过程"},
  {id: "StyleFDiagram", code: "F", name: "连续图解", descriptor: "一个节点持续变形", bestFor: "概念、流程与因果解释"},
  {id: "StyleGPoster", code: "G", name: "海报冲击", descriptor: "巨型数字 + 人物切片", bestFor: "强钩子与短促观点"},
  {id: "StyleHProduct", code: "H", name: "产品纪录片", descriptor: "克制 UI + 人物旁证", bestFor: "工具演示与真实结果"},
  {id: "StyleIEvidence", code: "I", name: "档案取证", descriptor: "证据编号 + 扫描叙事", bestFor: "对标拆解与真实性证明"},
  {id: "StyleJCollage", code: "J", name: "动态拼贴", descriptor: "剪报块面 + 栏目节奏", bestFor: "更年轻的观点与跨行业选题"},
] as const;

