export const agents = [
  {
    id: 'hermes',
    title: 'Hermes Manager',
    name: 'Hermes',
    subtitle: 'Strategic orchestrator. He runs the business and delegates to specialists.',
    role: 'Command · Manager',
    district: 'command',
    avatarColor: '#818cf8',
    color: '#8b93ff',
    buildingStyle: 'command-center',
    stats: { accuracy: 95, generated: 0, creativity: 88, speed: 70 },
    level: 9, xp: 62, xpMax: 100, rank: 'CMD-3',
    x: 380, y: 120,
    agentX: 400, agentY: 170,
    persona: 'Balanced',
    perks: [
      { level: 10, id: 'multi_thread', name: 'Multi-Thread Command', desc: '+10% Mission Revenue', active: false },
      { level: 15, id: 'neural_sync', name: 'Neural Sync', desc: 'Reduces agent failures by 5%', active: false }
    ]
  },
  {
    id: 'dennis',
    title: 'Dennis',
    name: 'Dennis',
    subtitle: 'Research & Ideation Specialist.',
    role: 'Research · Ideation',
    district: 'research',
    avatarColor: '#34d399',
    color: '#33e6c1',
    buildingStyle: 'research-lab',
    stats: { accuracy: 92, generated: 0, creativity: 94, speed: 60 },
    level: 7, xp: 20, xpMax: 100, rank: 'RSC-2',
    x: 190, y: 260,
    agentX: 210, agentY: 310,
    persona: 'Creative',
    perks: [
      { level: 8, id: 'trend_finder', name: 'Trend Finder', desc: 'Unlocks advanced niche ideas', active: false },
      { level: 12, id: 'viral_logic', name: 'Viral Logic', desc: '+15% Creativity stat', active: false }
    ]
  },
  {
    id: 'comment_analyst',
    title: 'Comment Analyst',
    name: 'Comment Analyst',
    subtitle: 'YouTube comment insights.',
    role: 'Research · Sentiment',
    district: 'research',
    avatarColor: '#ef4444',
    color: '#ff5d5d',
    buildingStyle: 'research-lab',
    stats: { accuracy: 94, generated: 0, creativity: 75, speed: 82 },
    level: 5, xp: 80, xpMax: 100, rank: 'RSC-1',
    x: 190, y: 400,
    agentX: 210, agentY: 450,
    persona: 'Skeptical',
    perks: [
      { level: 6, id: 'bs_detector', name: 'B.S. Detector', desc: 'Identifies low-intent keywords', active: false }
    ]
  },
  {
    id: 'bunk',
    title: 'Bunk',
    name: 'Bunk',
    subtitle: 'Production & Physical Design Specialist.',
    role: 'Production · Design',
    district: 'production',
    avatarColor: '#f472b6',
    color: '#ff4d7e',
    buildingStyle: 'media-tower',
    stats: { accuracy: 89, generated: 0, creativity: 82, speed: 66 },
    level: 8, xp: 44, xpMax: 100, rank: 'PRD-2',
    x: 570, y: 260,
    agentX: 590, agentY: 310,
    persona: 'Balanced',
    perks: [
      { level: 10, id: 'rapid_fab', name: 'Rapid Fabrication', desc: '-20% Production time (Simulated)', active: false },
      { level: 14, id: 'cost_cutter', name: 'Cost Optimization', desc: 'Increases profit margins', active: false }
    ]
  },
  {
    id: 'shopify_agent',
    title: 'Shopify Expert',
    name: 'Shopify Expert',
    subtitle: 'E-commerce optimization.',
    role: 'Launch Pad · Ecommerce',
    district: 'launch',
    avatarColor: '#94a3b8',
    color: '#94a3b8',
    buildingStyle: 'launch-pad',
    stats: { accuracy: 90, generated: 0, creativity: 70, speed: 75 },
    level: 4, xp: 10, xpMax: 100, rank: 'LP-1',
    x: 120, y: 540,
    agentX: 140, agentY: 590,
    persona: 'Balanced',
    perks: [
      { level: 5, id: 'conversion_king', name: 'Conversion King', desc: '+5% Sales probability', active: false }
    ]
  },
  {
    id: 'etsy_agent',
    title: 'Etsy Expert',
    name: 'Etsy Expert',
    subtitle: 'Handmade/Unique optimization.',
    role: 'Launch Pad · Handmade',
    district: 'launch',
    avatarColor: '#94a3b8',
    color: '#94a3b8',
    buildingStyle: 'launch-pad',
    stats: { accuracy: 90, generated: 0, creativity: 70, speed: 75 },
    level: 3, xp: 55, xpMax: 100, rank: 'LP-1',
    x: 260, y: 560,
    agentX: 280, agentY: 610,
    persona: 'Balanced',
    perks: [
      { level: 5, id: 'seo_guru', name: 'SEO Guru', desc: 'Optimizes for long-tail keywords', active: false }
    ]
  },
  {
    id: 'amazon_agent',
    title: 'Amazon Expert',
    name: 'Amazon Expert',
    subtitle: 'SEO & Technical optimization.',
    role: 'Launch Pad · SEO',
    district: 'launch',
    avatarColor: '#94a3b8',
    color: '#94a3b8',
    buildingStyle: 'launch-pad',
    stats: { accuracy: 90, generated: 0, creativity: 70, speed: 75 },
    level: 5, xp: 5, xpMax: 100, rank: 'LP-2',
    x: 400, y: 575,
    agentX: 420, agentY: 625,
    persona: 'Balanced',
    perks: [
      { level: 6, id: 'buy_box', name: 'Buy Box Pro', desc: 'Priority listing placement', active: false }
    ]
  },
  {
    id: 'pinterest_agent',
    title: 'Pinterest Expert',
    name: 'Pinterest Expert',
    subtitle: 'Visual discovery optimization.',
    role: 'Launch Pad · Visual',
    district: 'launch',
    avatarColor: '#94a3b8',
    color: '#94a3b8',
    buildingStyle: 'launch-pad',
    stats: { accuracy: 90, generated: 0, creativity: 70, speed: 75 },
    level: 4, xp: 70, xpMax: 100, rank: 'LP-1',
    x: 540, y: 560,
    agentX: 560, agentY: 610,
    persona: 'Balanced',
    perks: [
      { level: 5, id: 'pin_viral', name: 'Viral Pinner', desc: 'Automated board scheduling', active: false }
    ]
  },
  {
    id: 'tiktok_agent',
    title: 'TikTok Expert',
    name: 'TikTok Expert',
    subtitle: 'Short-form content optimization.',
    role: 'Launch Pad · Short-form',
    district: 'launch',
    avatarColor: '#94a3b8',
    color: '#94a3b8',
    buildingStyle: 'launch-pad',
    stats: { accuracy: 90, generated: 0, creativity: 70, speed: 75 },
    level: 6, xp: 30, xpMax: 100, rank: 'LP-2',
    x: 660, y: 540,
    agentX: 680, agentY: 590,
    persona: 'Aggressive',
    perks: [
      { level: 7, id: 'hook_master', name: 'Hook Master', desc: 'Higher retention headlines', active: false }
    ]
  },
  {
    id: 'youtube_agent',
    title: 'YouTube Expert',
    name: 'YouTube Expert',
    subtitle: 'Video metadata optimization.',
    role: 'Launch Pad · Video',
    district: 'launch',
    avatarColor: '#94a3b8',
    color: '#94a3b8',
    buildingStyle: 'launch-pad',
    stats: { accuracy: 90, generated: 0, creativity: 70, speed: 75 },
    level: 5, xp: 90, xpMax: 100, rank: 'LP-2',
    x: 700, y: 400,
    agentX: 720, agentY: 450,
    persona: 'Balanced',
    perks: [
      { level: 6, id: 'algo_hacker', name: 'Algo Hacker', desc: 'Exploits search algorithms', active: false }
    ]
  }
];