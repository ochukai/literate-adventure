import { generateOptimalSchedule } from './logic.js';
import { CLASS_DURATION } from './constants.js';
import { testStudents, testTeachers } from './data.js';

// 测试修复后的排课逻辑
function testFixedScheduleLogic() {
  console.log('开始测试修复后的排课逻辑...');
  console.log(`测试数据: ${testStudents.length}个学生, ${testTeachers.length}个老师`);

  // 运行排课算法
  const result = generateOptimalSchedule(testStudents, testTeachers);
  
  // 1. 统计总体排课情况
  console.log('\n=== 总体排课统计 ===');
  console.log(`期望总课时: ${result.assignmentStats.totalExpectedLessons}`);
  console.log(`已排总课时: ${result.assignmentStats.totalAssignedLessons}`);
  console.log(`排课成功率: ${((result.assignmentStats.totalAssignedLessons / result.assignmentStats.totalExpectedLessons) * 100).toFixed(2)}%`);
  
  // 2. 检查每天上课两次的学生排课情况和是否由同一老师上课
  console.log('\n=== 每天上课两次学生排课情况 ===');
  const twiceDailyStudents = testStudents.filter(s => s.dailyClasses === 2);
  let twiceDailySuccessCount = 0;
  let sameTeacherSuccessCount = 0;
  
  twiceDailyStudents.forEach(student => {
    console.log(`\n学生: ${student.name}, 每节课${student.classDuration}分钟`);
    
    // schedule是一维数组，直接过滤
    const weeklyLessons = result.schedule.filter(lesson => lesson.studentId === student.id).length;
    
    // 计算理论需求课时
    const courseParts = splitLongCourse(student.classDuration);
    const theoreticalWeeklyLessons = student.dailyClasses * courseParts.length * 5;
    
    console.log(`  - 理论需求: ${theoreticalWeeklyLessons}课时`);
    console.log(`  - 实际排课: ${weeklyLessons}课时`);
    
    // 检查每天排课情况和是否由同一老师上课
    const lessonsByDay = {};
    const dailySameTeacherCheck = {};
    let dailySuccess = true;
    let allDaysSameTeacher = true;
    
    for (let day = 1; day <= 5; day++) {
      const dayLessons = result.schedule.filter(l => l.studentId === student.id && l.day === day);
      lessonsByDay[day] = dayLessons.length;
      
      // 检查当天是否由同一老师上课
      if (dayLessons.length >= 2) {
        const teacherIds = [...new Set(dayLessons.map(l => l.teacherId))];
        dailySameTeacherCheck[day] = teacherIds.length === 1;
        if (teacherIds.length > 1) {
          allDaysSameTeacher = false;
          console.log(`  警告: 学生${student.name}星期${day}的课程由不同老师教授: ${teacherIds.join(', ')}`);
        }
      } else {
        dailySameTeacherCheck[day] = true; // 如果当天没有足够的课程，默认通过检查
      }
    }
    
    console.log('  - 每天排课情况:');
    for (let day = 1; day <= 5; day++) {
      const dayLessons = lessonsByDay[day];
      const expectedDailyLessons = student.dailyClasses * courseParts.length;
      const dayStatus = dayLessons >= expectedDailyLessons ? '✓' : '✗';
      const teacherStatus = dailySameTeacherCheck[day] ? '同一老师' : '不同老师';
      console.log(`    星期${day}: ${dayLessons}/${expectedDailyLessons}课时 ${dayStatus} [${teacherStatus}]`);
      if (dayLessons < expectedDailyLessons) dailySuccess = false;
    }
    
    if (dailySuccess) twiceDailySuccessCount++;
    if (allDaysSameTeacher) sameTeacherSuccessCount++;
  });
  
  console.log(`\n每天上课两次学生排课成功率: ${((twiceDailySuccessCount / twiceDailyStudents.length) * 100).toFixed(2)}%`);
  console.log(`每天上课两次学生由同一老师教授率: ${((sameTeacherSuccessCount / twiceDailyStudents.length) * 100).toFixed(2)}%`);
  
  // 3. 老师工作量分布
  console.log('\n=== 老师工作量分布 ===');
  const teacherWorkload = {};
  let totalLessons = 0;
  
  // 遍历所有课程
  result.schedule.forEach(lesson => {
    totalLessons++;
    if (lesson.teacherId !== undefined) {
      const id = String(lesson.teacherId);
      teacherWorkload[id] = (teacherWorkload[id] || 0) + 1;
    }
  });
  
  console.log(`  总课程数: ${totalLessons}`);
  
  Object.entries(teacherWorkload).forEach(([teacherId, workload]) => {
    // 尝试两种类型的匹配，确保找到正确的老师
    const teacher = testTeachers.find(t => 
      t.id === parseInt(teacherId) || 
      String(t.id) === teacherId
    );
    // 确保不会输出undefined
    const teacherName = teacher?.name || `未知老师(${teacherId})`;
    console.log(`${teacherName}: ${workload}课时`);
  });
  
  // 4. 检查老师连续给同一学生上课的情况
  console.log('\n=== 老师连续排课检查 ===');
  let continuityIssues = 0;
  const teacherStudentContinuity = {};
  
  // 按学生和老师分组统计排课情况
  result.schedule.forEach(lesson => {
    const key = `${lesson.teacherId}-${lesson.studentId}`;
    if (!teacherStudentContinuity[key]) {
      teacherStudentContinuity[key] = [];
    }
    teacherStudentContinuity[key].push(lesson.day);
  });
  
  // 检查每个老师-学生组合是否有连续排课
  Object.entries(teacherStudentContinuity).forEach(([key, days]) => {
    // 按天数排序
    days.sort((a, b) => a - b);
    
    // 检查是否有连续的天数
    for (let i = 1; i < days.length; i++) {
      if (days[i] - days[i-1] === 1) {
        continuityIssues++;
        const [teacherId, studentId] = key.split('-');
        const teacher = testTeachers.find(t => t.id === parseInt(teacherId) || String(t.id) === teacherId);
        const student = testStudents.find(s => s.id === parseInt(studentId) || String(s.id) === studentId);
        
        console.log(`  - 老师${teacher?.name || teacherId}在星期${days[i-1]}和星期${days[i]}连续给学生${student?.name || studentId}上课`);
      }
    }
  });
  
  console.log(`总共有${continuityIssues}起老师连续排课的情况`);

  console.log('\n测试完成！');
  return {
    totalSuccessRate: (result.assignmentStats.totalAssignedLessons / result.assignmentStats.totalExpectedLessons) * 100,
    twiceDailySuccessRate: (twiceDailySuccessCount / twiceDailyStudents.length) * 100,
    sameTeacherRate: (sameTeacherSuccessCount / twiceDailyStudents.length) * 100,
    continuityIssues
  };
}

// 辅助函数：拆分长课程
function splitLongCourse(classDuration) {
  // 将长课程拆分为多个30分钟的基本单元
  const baseDuration = CLASS_DURATION; // 30分钟
  const courseParts = [];
  
  if (classDuration === 240) {
    // 240分钟课程拆分为180+60
    courseParts.push(180);
    courseParts.push(60);
  } else if (classDuration === 180) {
    // 180分钟课程拆分为120+60
    courseParts.push(120);
    courseParts.push(60);
  } else if (classDuration === 120) {
    // 120分钟课程作为一个整体
    courseParts.push(120);
  } else if (classDuration === 60) {
    // 60分钟课程作为一个整体
    courseParts.push(60);
  }
  
  return courseParts;
}

// 运行测试
const testResults = testFixedScheduleLogic();
console.log('\n=== 测试结果汇总 ===');
console.log(`总体排课成功率: ${testResults.totalSuccessRate.toFixed(2)}%`);
console.log(`每天上课两次学生排课成功率: ${testResults.twiceDailySuccessRate.toFixed(2)}%`);
console.log(`每天上课两次学生由同一老师教授率: ${testResults.sameTeacherRate.toFixed(2)}%`);
console.log(`老师连续排课问题数: ${testResults.continuityIssues}`);

export { testFixedScheduleLogic };