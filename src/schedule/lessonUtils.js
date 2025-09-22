import { CLASS_DURATION } from './constants.js';

/**
 * 计算单个学生的周课时量
 * @param {Object} student - 学生对象
 * @returns {number} 学生周课时量
 */
export function calculateStudentWeeklyLessons(student) {
  // 按照统一公式：课时量 = 上课次数 * 上课时长 * 5 / 每节课时长
  return (student.dailyClasses * student.classDuration * 5) / CLASS_DURATION;
}

/**
 * 计算所有学生的总课时量
 * @param {Array} students - 学生列表
 * @returns {number} 所有学生的总课时量
 */
export function calculateTotalStudentLessons(students) {
  return students.reduce((sum, student) => {
    return sum + calculateStudentWeeklyLessons(student);
  }, 0);
}

/**
 * 计算单个学生每天的课时量
 * @param {Object} student - 学生对象
 * @returns {number} 学生每天的课时量
 */
export function calculateStudentDailyLessons(student) {
  // 每天课时量 = 每天上课次数 * 上课时长 / 每节课时长
  return (student.dailyClasses * student.classDuration) / CLASS_DURATION;
}

/**
 * 计算老师课时统计
 * @param {Array} schedule - 排课计划
 * @returns {Object} 包含课时统计信息的对象
 */
export function calculateTeacherLessonStats(schedule) {
  const teacherLessonCount = {};
  let totalLessons = 0;

  if (schedule && Array.isArray(schedule)) {
    schedule.forEach((lesson) => {
      teacherLessonCount[lesson.teacherId] = 
        (teacherLessonCount[lesson.teacherId] || 0) + 1;
      totalLessons++;
    });
  }

  return {
    teacherLessonCount,
    totalLessons
  };
}

/**
 * 计算平均课时
 * @param {number} totalLessons - 总课时数
 * @param {number} teacherCount - 老师数量
 * @returns {number} 平均课时数
 */
export function calculateAverageLessons(totalLessons, teacherCount) {
  return teacherCount > 0 ? Math.round(totalLessons / teacherCount) : 0;
}