// 日志工具函数
import { LOG_LEVEL, CURRENT_LOG_LEVEL } from './constants.js';

/**
 * 日志输出工具
 * @param {number} level - 日志级别
 * @param {string} message - 日志消息
 */
export function log(level, message) {
  if (level >= CURRENT_LOG_LEVEL) {
    console.log(`[${Object.keys(LOG_LEVEL).find(key => LOG_LEVEL[key] === level)}] ${message}`);
  }
}