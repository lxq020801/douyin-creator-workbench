import type {
  AccountProfile,
  AccountReport,
  ResearchVideo,
  RuntimeSettings,
  TaskRecord,
  VideoBreakdown,
} from '../types';

export const sampleVideoUrl = 'https://v.douyin.com/example-video/';
export const sampleAccountUrl = 'https://www.douyin.com/user/example-account';

export const sampleBreakdown: VideoBreakdown = {
  source: {
    id: 'video-001',
    url: sampleVideoUrl,
    title: '一条视频，拆出 20 个能直接拍的选题',
    author: '内容实验室',
    duration: '00:47',
    coverTone: 'red',
    metrics: {
      views: 3268000,
      likes: 184000,
      comments: 12600,
      shares: 31800,
      collects: 49600,
      publishedAt: '2026-06-18 19:42',
    },
  },
  summary: '视频用一个反常识结果切入，把“不会找选题”的模糊焦虑，转换成可见、可验证的操作过程，最后用批量结果完成价值兑现。',
  theme: '用真实操作证明 AI 能把对标内容转成可执行选题，而不是只给抽象建议。',
  hook: {
    copy: '我让 AI 拆了一条 300 万的爆款。',
    mechanism: '先抛出高数据样本建立注意，再马上说明“拆”这个具体动作，让观众预期会看到过程和结果。',
    visualAction: '数字先出现，红色批注线连接到真实录屏；0.8 秒内让观众同时看到证据、人物和任务。',
  },
  beats: [
    { timecode: '00:00–00:03', originalCopy: '我让 AI 拆了一条 300 万的爆款。', role: '结果前置', emotion: '好奇', visual: '大数字 + 作品数据 + 真人判断', transition: '由红色批注线带入录屏' },
    { timecode: '00:03–00:10', originalCopy: '不是让它照抄，而是找出这条视频为什么有人看。', role: '消除质疑', emotion: '可信', visual: '报告结构逐项点亮', transition: '从结果切到分析方法' },
    { timecode: '00:10–00:24', originalCopy: '钩子、情绪、画面和承接关系，被拆成了可以复用的结构。', role: '展示过程', emotion: '理解', visual: '时间轴逐段展开，录屏局部放大', transition: '跟随鼠标进入关键字段' },
    { timecode: '00:24–00:38', originalCopy: '再把我的行业资料放进去，它会重新生成一批适合我的方向。', role: '完成迁移', emotion: '期待', visual: '选择账号资料卡，原结构映射为新选题', transition: '红线分叉为选题节点' },
    { timecode: '00:38–00:47', originalCopy: '5 分钟，我拿到了 20 个可以继续筛的选题。', role: '价值兑现', emotion: '确定', visual: '20 个结果节点出现，保留前 5 条可读', transition: '停留结果并给出下一步' },
  ],
  craft: {
    filming: ['真人使用中近景，视线朝向录屏区域', '录屏只保留当前操作，不展示整张桌面', '结果镜头停留超过 1 秒'],
    editing: ['前 3 秒两次信息变化', '解释段节奏放缓，避免持续跳字', '使用同一条视觉线索连接全片'],
    audio: ['人声优先，BGM 只承担轻微推进', '结果出现时增加一次短促确认音', '关键数字前留出约 0.2 秒停顿'],
    captions: ['常驻字幕每行 9–14 字', '只有数字和动词脱离字幕轨', '字幕不遮挡脸和当前操作'],
  },
  evidence: [
    { label: '强收藏动机', evidence: '收藏 4.96 万，高于评论；内容更像“以后可照着做”的工作方法。', confidence: '高' },
    { label: '结果前置有效', evidence: '开头 3 秒同时交代爆款数据、AI 动作和任务结果，信息密度高但目标单一。', confidence: '中' },
    { label: '过程提升可信度', evidence: '中段展示实际录屏和字段变化，不只用口播描述工具能力。', confidence: '高' },
    { label: '传播因果', evidence: '现有数据只能证明内容表现与这些特征同时出现，无法单条视频确认严格因果。', confidence: '待验证' },
  ],
  transferable: ['先展示样本与任务，再解释方法', '把抽象能力转成看得见的操作过程', '结果必须可计数、可浏览、可继续执行', '用同一视觉线索连接讲解和录屏'],
  avoidCopying: ['不要在没有真实来源时使用“300 万”', '不要照搬原作者的人设语气', '不要把 20 个低质量结果当作价值本身'],
  boundary: '报告依据公开互动数据与视频内容作出专业推断。互动指标受账号体量、发布时间和分发环境影响，不代表唯一因果。',
};

export const initialProfiles: AccountProfile[] = [
  {
    id: 'profile-ai-director',
    name: 'AI 编导实验',
    color: 'red',
    industry: 'AI 工具 × 短视频编导',
    creatorIdentity: '有商业短视频编导经验，正在公开记录如何用 Codex 和 AI 做内容工具。',
    audience: '想提高选题、文案和制作效率的编导、内容创作者与小团队。',
    valuePromise: '不只推荐工具，而是展示 AI 如何进入真实编导工作流并产出可用结果。',
    formatsAndResources: '真人讲解、真实录屏、持续动效；可独立完成策划、拍摄和后期。',
    constraints: '前期以抖音为主；不投流；单条内容制作时间需要能支撑持续更新。',
    originalDescription: '我是一个短视频编导，准备做一个记录自己用 Codex 和 AI 做工具、解决编导问题的账号。',
    inferredFields: ['目标受众', '持续价值'],
    updatedAt: '今天 18:24',
  },
  {
    id: 'profile-local-service',
    name: '本地生意观察',
    color: 'blue',
    industry: '本地生活服务',
    creatorIdentity: '门店经营者，以真实案例分享获客和服务经验。',
    audience: '正在经营本地门店、但缺少内容能力的老板和店长。',
    valuePromise: '把同行案例拆成普通门店也能执行的内容动作。',
    formatsAndResources: '门店实拍、老板口播、顾客反馈、运营后台录屏。',
    constraints: '表达能力一般；每周最多拍摄两次；避免复杂布景。',
    originalDescription: '我做本地门店，想参考同行视频生成能直接拍的文案。',
    inferredFields: ['内容价值', '素材资源'],
    updatedAt: '昨天 21:06',
  },
];

export const initialTasks: TaskRecord[] = [
  { id: 'task-01', kind: 'video', title: '为什么这条工具演示被收藏 4.9 万次', source: '内容实验室', status: 'completed', progress: 100, createdAt: '今天 16:40', detail: '单条视频拆解' },
  { id: 'task-02', kind: 'account', title: '内容实验室账号打法研究', source: '186 条作品 · 深拆 12 条', status: 'completed', progress: 100, createdAt: '昨天 22:18', detail: '账号打法地图' },
  { id: 'task-03', kind: 'remake', title: '迁移到“AI 编导实验”', source: '生成 8 个测试选题', status: 'completed', progress: 100, createdAt: '昨天 21:43', detail: '复刻产物' },
  { id: 'task-04', kind: 'account', title: '餐饮老板说账号采集', source: '91 条作品 · 深拆 9 条', status: 'failed', progress: 36, createdAt: '07-25 19:20', detail: 'Cookie 已失效' },
];

export const researchVideos: ResearchVideo[] = [
  { id: 'rv-01', title: '我把 100 条爆款喂给了 AI', publishedAt: '2026-07-19', likes: 184000, comments: 12600, shares: 31800, status: 'completed', sampleRole: '爆款' },
  { id: 'rv-02', title: '做选题最浪费时间的其实不是搜案例', publishedAt: '2026-07-12', likes: 73000, comments: 6800, shares: 9100, status: 'completed', sampleRole: '爆款' },
  { id: 'rv-03', title: '第一次用 Agent 做完整策划', publishedAt: '2026-06-28', likes: 18500, comments: 1400, shares: 2300, status: 'completed', sampleRole: '转折' },
  { id: 'rv-04', title: '一个没跑通的自动化工作流', publishedAt: '2026-06-14', likes: 4200, comments: 630, shares: 290, status: 'completed', sampleRole: '常态' },
  { id: 'rv-05', title: '让 AI 模仿文案为什么总是一股 AI 味', publishedAt: '2026-05-30', likes: 26000, comments: 3200, shares: 4100, status: 'completed', sampleRole: '常态' },
  { id: 'rv-06', title: '这个账号刚开始时只发录屏', publishedAt: '2026-04-11', likes: 1800, comments: 96, shares: 120, status: 'completed', sampleRole: '早期' },
];

export const sampleAccountReport: AccountReport = {
  promise: '把复杂的内容方法变成创作者可以直接执行的工作流。',
  account: { name: '内容实验室', handle: 'content_lab', followers: 482000, videos: 186, promise: '把复杂的内容方法变成创作者可以直接执行的工作流。' },
  pillars: [
    { name: '工具实测', ratio: 38, note: '真实操作、结果前置，是账号稳定流量来源。' },
    { name: '方法拆解', ratio: 27, note: '用具体案例解释内容结构，收藏率更稳定。' },
    { name: '公开实验', ratio: 21, note: '成功与失败都记录，承担人物信任。' },
    { name: '观点判断', ratio: 14, note: '频率低，但能建立专业差异。' },
  ],
  timeline: [
    { phase: '试探期', range: '前 32 条', action: '集中发布工具录屏，用强结果标题测试需求。', signal: '播放波动大，收藏开始高于评论。' },
    { phase: '验证期', range: '33–71 条', action: '增加真人判断，并把录屏变成证据而非主体。', signal: '完播和关注转化同时上升。' },
    { phase: '起量期', range: '72–118 条', action: '重复“结果前置 → 过程拆解 → 可执行产物”公式。', signal: '连续出现 3 条百万播放。' },
    { phase: '承接期', range: '119–186 条', action: '用公开实验和失败复盘扩大选题边界。', signal: '常态内容数据提升，账号不再依赖单一爆款。' },
  ],
  hookPatterns: ['我用 X 做了一个真实任务', '你以为最费时间的是 A，其实是 B', '先展示结果，再解释为什么能做到', '用失败结果反向证明方法边界'],
  viralVsNormal: [
    { dimension: '开头任务', viral: '具体对象 + 可计数结果', normal: '泛泛介绍工具能力', conclusion: '任务越具体，观众越快判断与自己是否相关。' },
    { dimension: '证据呈现', viral: '人物判断与真实录屏交替', normal: '全程录屏或纯口播', conclusion: '可信度来自判断和证据同时存在。' },
    { dimension: '结果停留', viral: '结果可浏览并停留 1 秒以上', normal: '结果快速闪过', conclusion: '观众需要时间确认产物不是口头承诺。' },
  ],
  transferable: [
    { rule: '先讲真实任务，不先介绍工具', evidence: '8/12 条高表现样本在首句出现具体任务。', boundary: '任务必须是创作者真实做过或即将做的。' },
    { rule: '人物负责判断，录屏负责举证', evidence: '高表现样本的真人画面占比集中在 30%–50%。', boundary: '录屏中的按钮和结果必须在手机上可读。' },
    { rule: '把一次结果扩展成可继续测试的清单', evidence: '收藏较高的内容都留下模板、步骤或候选方向。', boundary: '数量不能替代质量，需要说明筛选标准。' },
  ],
  risks: ['不要照搬对方的夸张数字和话术', '账号已有体量会放大早期互动，不能只看绝对数据', '工具更新很快，长期价值应落在编导判断而非工具名称'],
  testTopics: [
    { title: '我让 AI 拆了一条真实爆款，5 分钟拿到 20 个选题', reason: '同时验证强结果钩子、真实操作和工具产物。', priority: '优先' },
    { title: '为什么 AI 写的选题总是一股 AI 味？', reason: '用编导判断切入，差异化强。', priority: '优先' },
    { title: '同一条爆款，换 3 个行业还能不能成立？', reason: '展示迁移能力，容易形成系列。', priority: '优先' },
    { title: '我把失败的 Agent 项目重新做了一遍', reason: '公开实验建立人物信任。', priority: '备选' },
    { title: '不写提示词，只说一句人话能生成账号资料吗？', reason: '对应资料问诊功能，演示直观。', priority: '备选' },
    { title: '编导和普通人用 AI，差别到底在哪里？', reason: '建立账号长期观点，但需要真实案例支撑。', priority: '备选' },
  ],
};

export const defaultSettings: RuntimeSettings = {
  apiKey: '',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  model: 'doubao-seed-1-6-vision-250815',
  timeout: 900,
  videoFps: 1,
  maxConcurrent: 3,
  douyinCookie: '',
  prompts: {
    videoBreakdown: '你是一名严谨的短视频编导。拆解视频内容与平台数据证据，区分事实、推断与未知信息。',
    videoTopics: '只在用户确认账号资料后进行结构迁移。生成20个不同选题，保留机制，不复制原作者表达和事实。',
    profileIntake: '把用户自然语言整理成最小可用的内容生产上下文；缺失信息只追问一到两轮。',
    accountSummary: '结合50条元数据与最多30条逐条深拆报告，输出当前样本范围内的内容地图、起量路径、爆款与常态差异及可迁移动作。',
    accountTopics: '基于账号综合报告和目标资料生成20个可执行选题。',
    scriptGeneration: '把选题写成包含台词、画面提示、节奏和结尾互动的编导可拍稿。',
    globalFacts: '不得虚构播放量、来源或用户经历。证据不足时明确标记待确认。',
  },
};

export function compactNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 1 : 2).replace(/\.0$/, '')}万`;
  return value.toLocaleString('zh-CN');
}
