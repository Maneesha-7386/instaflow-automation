/**
 * InstaFlow - Core Constants & Configuration
 * Tagline: Create. Automate. Publish.
 */

export const NAV_ITEMS = [
  { id: 'home', icon: '▦', label: 'Dashboard' },
  { id: 'accounts', icon: '◉', label: 'Accounts' },
  { id: 'content', icon: '▶', label: 'Reels' },
  { id: 'ai', icon: '✨', label: 'AI Studio' },
  { id: 'schedule', icon: '◷', label: 'Schedule' },
  { id: 'automations', icon: '⚡', label: 'Automations' },
  { id: 'history', icon: '☰', label: 'History' },
];

export const INITIAL_ACCOUNTS = [];

export const WORKFLOW_DEFINITIONS = {
  triggers: [
    { id: 'new_comment', label: 'New comment', defaultDetail: 'On any Reel or Post', metaSupported: true },
    { id: 'dm_received', label: 'DM received', defaultDetail: 'Contains “info” or keywords', metaSupported: true },
    { id: 'story_mention', label: 'Story mention', defaultDetail: 'Tagged your Instagram account', metaSupported: true },
    { id: 'reel_published', label: 'Reel published', defaultDetail: 'When a new Reel goes live', metaSupported: true },
    { id: 'new_follower', label: 'New follower', defaultDetail: 'Monitored via follower delta polling', metaSupported: false, note: 'Meta restriction: polled every 15m' },
  ],
  conditions: [
    { id: 'keyword_matches', label: 'Keyword matches', defaultDetail: '“price”, “link”, “cost”' },
    { id: 'follower_count_over', label: 'Follower count over', defaultDetail: 'Threshold: 1,000' },
    { id: 'time_window', label: 'Time window', defaultDetail: '9 AM – 9 PM IST' },
  ],
  actions: [
    { id: 'send_dm', label: 'Send DM', defaultDetail: 'Send product link & discount' },
    { id: 'reply_comment', label: 'Reply to comment', defaultDetail: 'Thanks! Check your direct messages ✉️' },
    { id: 'like_comment', label: 'Like comment', defaultDetail: 'Like incoming comment automatically' },
    { id: 'ai_smart_reply', label: 'AI smart reply', defaultDetail: 'AI answers in your brand voice' },
    { id: 'add_to_queue', label: 'Add to queue', defaultDetail: 'Save to high-priority review list' },
    { id: 'notify_me', label: 'Notify me', defaultDetail: 'Push notification + Email' },
  ],
};

export const INITIAL_AUTOMATIONS = [
  {
    id: 'auto_1',
    name: 'Comment keyword → DM',
    enabled: true,
    runs: 412,
    steps: [
      { type: 'trigger', key: 'New comment', detail: 'On any Reel' },
      { type: 'cond', key: 'Keyword matches', detail: '“price”, “link”' },
      { type: 'action', key: 'Send DM', detail: 'Send product link' },
    ],
  },
  {
    id: 'auto_2',
    name: 'Welcome new followers',
    enabled: true,
    runs: 238,
    steps: [
      { type: 'trigger', key: 'New follower', detail: 'Delta polling check' },
      { type: 'cond', key: 'Follower count over', detail: '1,000' },
      { type: 'action', key: 'Send DM', detail: 'Welcome message & guide' },
    ],
  },
  {
    id: 'auto_3',
    name: 'Thank story mentions',
    enabled: false,
    runs: 96,
    steps: [
      { type: 'trigger', key: 'Story mention', detail: 'Tagged @lumen.studio' },
      { type: 'action', key: 'Reply to comment', detail: 'Thanks for sharing our work!' },
      { type: 'action', key: 'Notify me', detail: 'Email + push' },
    ],
  },
];

export const INITIAL_HISTORY = [
  {
    id: 'hist_1',
    time: 'Today, 10:42 AM',
    source: 'Comment keyword → DM',
    message: 'Sent DM to @maya.codes',
    account: '@lumen.studio',
    status: 'success',
  },
  {
    id: 'hist_2',
    time: 'Today, 10:15 AM',
    source: 'Welcome new followers',
    message: 'Sent DM to @dev_arjun',
    account: '@urbanbrew.co',
    status: 'success',
  },
  {
    id: 'hist_3',
    time: 'Today, 9:00 AM',
    source: 'Publisher',
    message: 'Posted “Latte art in 15 seconds”',
    account: '@urbanbrew.co',
    status: 'success',
  },
  {
    id: 'hist_4',
    time: 'Yesterday, 7:12 PM',
    source: 'Thank story mentions',
    message: 'Reply blocked: Meta rate limit (Graph API #32)',
    account: '@lumen.studio',
    status: 'failed',
    retryable: true,
  },
  {
    id: 'hist_5',
    time: 'Yesterday, 6:30 PM',
    source: 'Publisher',
    message: 'Posted “New cold brew launch”',
    account: '@urbanbrew.co',
    status: 'success',
  },
  {
    id: 'hist_6',
    time: 'Nov 6, 5:00 PM',
    source: 'Publisher',
    message: 'Token expired for @tripwithtara (OAuth 190)',
    account: '@tripwithtara',
    status: 'failed',
    retryable: false,
  },
  {
    id: 'hist_7',
    time: 'Nov 6, 2:20 PM',
    source: 'Comment keyword → DM',
    message: 'Waiting for next comment event',
    account: '@lumen.studio',
    status: 'running',
  },
];

export const FAQ_ITEMS = [
  {
    pattern: /best time|when.*post/i,
    answer: 'In the last 30 days, your highest engagement across @lumen.studio was between 6:30 PM and 8:00 PM IST on weekdays. Would you like me to schedule your next Reel for 6:30 PM today?',
  },
  {
    pattern: /fail|error|token/i,
    answer: '“Hidden gems of Kyoto” failed because Meta OAuth session expired for @tripwithtara. Open the Accounts module, click Reconnect to refresh your 60-day token, and the retry job will re-queue automatically.',
  },
  {
    pattern: /caption|hashtag/i,
    answer: 'Recommended viral hook: “Your new favourite ritual starts here ☕ Tap the link in bio to try it first.” Hashtags: #coldbrew #specialtycoffee #baristadaily #reelsindia #coffeetime',
  },
  {
    pattern: /automat|dm|comment/i,
    answer: 'Under Meta policy, you can send 1 direct message to a commenter within 7 days using the Private Replies API. Go to Automations, activate “Comment keyword → DM”, and attach an AI smart reply action for instant lead capture.',
  },
  {
    pattern: /connect|account/i,
    answer: 'Go to Accounts and click "+ Connect Instagram account". Ensure your account is an Instagram Professional (Business or Creator) account linked to a Facebook Page to grant publishing permissions.',
  },
  {
    pattern: /video|reel|generate/i,
    answer: 'In AI Studio, you have two options: 1) AI Reel Creator: input your topic to generate script, scenes, voiceover, and video; or 2) Normal Reel Creator: upload your own recorded video and use our preview composer.',
  },
];

