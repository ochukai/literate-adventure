// 工作量统计工具
import {
  calculateTotalStudentLessons,
  calculateStudentDailyLessons
} from './lessonUtils.js';

/**
 * 计算排课统计信息
 * @param {Array} schedule - 排课计划
 * @param {Array} students - 学生列表
 * @returns {Object} 统计信息
 */
export function calculateScheduleStats(schedule, students) {
  const totalExpectedLessons = calculateTotalStudentLessons(students);

  const totalAssignedLessons = schedule.length;
  const assignmentFailures = [];

  // 检查每个学生每天的排课情况
  for (const student of students) {
    const expectedDailyLessons = calculateStudentDailyLessons(student);

    for (let day = 1; day <= 5; day++) {
      const dailyLessons = schedule.filter(lesson =>
        lesson.studentId === student.id && lesson.day === day
      ).length;

      if (dailyLessons < expectedDailyLessons) {
        assignmentFailures.push({
          studentId: student.id,
          studentName: student.name,
          day,
          expectedLessons: expectedDailyLessons,
          assignedLessons: dailyLessons
        });
      }
    }
  }

  return {
    totalExpectedLessons,
    totalAssignedLessons,
    assignmentFailures
  };
}

/**
 * 统计排课失败的学生
 * @param {Array} failedAssignments - 排课失败记录
 * @param {Array} students - 学生列表
 * @returns {Array} 排课失败的学生详情
 */
export function getFailedStudentDetails(failedAssignments, students) {
  const failedStudents = new Set();
  failedAssignments.forEach(failure => {
    failedStudents.add(failure.studentId);
  });

  return Array.from(failedStudents).map(studentId => {
    const student = students.find(s => s.id === studentId);
    const failures = failedAssignments.filter(f => f.studentId === studentId);
    return {
      studentId,
      studentName: student.name,
      dailyClasses: student.dailyClasses,
      classDuration: student.classDuration,
      totalFailures: failures.length
    };
  });
}

/**
 * 生成老师工作量统计报告
 * @param {Object} teacherWork - 老师工作量数据
 * @param {Array} teachers - 老师列表
 * @returns {Object} 工作量统计报告
 */
export function generateTeacherWorkloadReport(teacherWork, teachers) {
  // 按工作量排序老师
  const sortedTeachers = [...teachers].sort((a, b) => (teacherWork[a.id] || 0) - (teacherWork[b.id] || 0));

  // 计算统计数据
  const workloads = teachers.map(t => teacherWork[t.id] || 0);
  const totalWorkload = workloads.reduce((sum, w) => sum + w, 0);
  const avgWorkload = totalWorkload / workloads.length;
  const maxWorkload = Math.max(...workloads);
  const minWorkload = Math.min(...workloads);

  return {
    sortedTeachers: sortedTeachers.map(t => ({
      id: t.id,
      name: t.name,
      workload: teacherWork[t.id] || 0
    })),
    stats: {
      totalWorkload,
      avgWorkload: Math.round(avgWorkload * 10) / 10,
      maxWorkload,
      minWorkload,
      workloadDifference: maxWorkload - minWorkload
    }
  };
}