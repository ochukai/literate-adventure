// 排课系统常量定义
export const CLASS_DURATION = 30; // 每节课30分钟
export const BREAK_DURATION = 5; // 课间休息5分钟
export const MORNING_START = '08:30'; // 上午开始时间
export const MORNING_END = '12:00'; // 上午结束时间
export const AFTERNOON_START = '14:00'; // 下午开始时间
export const AFTERNOON_END = '17:30'; // 下午结束时间
export const LUNCH_START = '12:00'; // 午休开始时间
export const LUNCH_END = '14:00'; // 午休结束时间
export const MAX_LESSONS_PER_TEACHER = 60; // 每个老师的最大课时量（降低到45以提供更多余量）
export const MAX_WORKLOAD_DIFFERENCE = 15; // 老师之间最大工作量差异限制
export const WORKLOAD_WARNING_THRESHOLD = 40; // 工作量警告阈值

// 日志级别控制
export const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3
};

export const CURRENT_LOG_LEVEL = LOG_LEVEL.DEBUG; // 当前日志级别