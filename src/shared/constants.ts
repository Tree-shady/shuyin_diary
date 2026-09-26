/** IPC 通道名，主进程与 preload 共用 */
export const IPC = {
  DIARY_LIST: 'diary:list',
  DIARY_GET: 'diary:get',
  DIARY_CREATE: 'diary:create',
  DIARY_UPDATE: 'diary:update',
  DIARY_DELETE: 'diary:delete',
  TAG_LIST: 'tag:list',
  TAG_CREATE: 'tag:create',
  TAG_DELETE: 'tag:delete',
  SETTINGS_GET_ALL: 'settings:getAll',
  SETTINGS_SET: 'settings:set',
  EXPORT: 'diary:export',
} as const;

export const MOODS = [
  { value: 'happy', label: '开心', emoji: '😊' },
  { value: 'calm', label: '平静', emoji: '😌' },
  { value: 'neutral', label: '一般', emoji: '😐' },
  { value: 'sad', label: '难过', emoji: '😢' },
  { value: 'angry', label: '生气', emoji: '😠' },
  { value: 'tired', label: '疲惫', emoji: '😪' },
];

export const WEATHERS = [
  { value: 'sunny', label: '晴', emoji: '☀️' },
  { value: 'cloudy', label: '多云', emoji: '⛅' },
  { value: 'rainy', label: '雨', emoji: '🌧️' },
  { value: 'snowy', label: '雪', emoji: '❄️' },
  { value: 'windy', label: '风', emoji: '💨' },
  { value: 'foggy', label: '雾', emoji: '🌫️' },
];

export const DEFAULT_SETTINGS = {
  theme: 'light' as const,
  fontSize: 15,
};
