import { testStudents, testTeachers } from './data.js';
import { generateOptimalSchedule, generateDaySlots } from './logic.js';
import { CLASS_DURATION } from './constants.js';
import { generateScheduleExcel } from './excelGenerator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 模拟学生数据
const mockStudents = testStudents;

// 模拟老师数据
const mockTeachers = testTeachers;

// 获取当前文件路径和目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// 测试Excel生成功能
async function generateExcelSchedule() {
  try {
    console.log('\n=== 开始生成Excel排课表 ===');
    // 生成Excel文件的Buffer
    const excelBuffer = await generateScheduleExcel(mockStudents, mockTeachers);
    
    // 保存文件到当前目录
    const outputPath = path.join(__dirname, 'schedule_output.xlsx');
    fs.writeFileSync(outputPath, excelBuffer);
    
    console.log(`Excel排课表已成功生成！`);
    console.log(`文件路径: ${outputPath}`);
  } catch (error) {
    console.error('生成Excel排课表失败:', error);
  }
}

// 运行排课算法并生成Excel
async function runScheduleTest() {
  console.log('开始测试排课系统...');

  // 调试信息：检查可用的时间段
  const daySlots = generateDaySlots();
  console.log(`可用时间段数量: ${daySlots.length}`);
  console.log(`每节课时长: ${CLASS_DURATION}分钟`);
  console.log(`上午时段: ${daySlots.filter(s => s.period === 'morning').length}个`);
  console.log(`下午时段: ${daySlots.filter(s => s.period === 'afternoon').length}个`);

// 调试信息：检查学生和老师数据
console.log(`学生数量: ${mockStudents.length}`);
console.log(`老师数量: ${mockTeachers.length}`);

const result = generateOptimalSchedule(mockStudents, mockTeachers);

// 详细输出统计结果
console.log('\n=== 排课统计结果 ===');
console.log('一周排课统计:');
console.log(`  - 期望课时: ${result.assignmentStats.totalExpectedLessons}`);
console.log(`  - 已分配课时: ${result.assignmentStats.totalAssignedLessons}`);
console.log(`  - 未分配课时: ${result.assignmentStats.totalExpectedLessons - result.assignmentStats.totalAssignedLessons}`);

// 输出每个学生的课程需求和已安排课程
console.log('\n=== 学生排课详细信息 ===');
mockStudents.forEach(student => {
  console.log(`\n学生: ${student.name}, 每天${student.dailyClasses}节课, 每节课${student.classDuration}分钟`);
  
  // 根据系统实际排课行为计算理论需求
  let lessonsPerPeriod = 0;
  if (student.classDuration === 240) {
    // 240分钟课程被拆分为180+60，总共8课时
    lessonsPerPeriod = 8;
  } else if (student.classDuration === 120) {
    // 120分钟课程每次排120分钟(4课时×30分钟)
    lessonsPerPeriod = 4;
  } else if (student.classDuration === 60) {
    // 60分钟课程每次排60分钟(2课时×30分钟)
    lessonsPerPeriod = 2;
  }
  
  // 根据每天上课次数计算每周总课时
  let dailyLessonCount = 0;
  if (student.dailyClasses === 1) {
    // 每天上课次数为1时，每天排一次课
    dailyLessonCount = 1;
  } else {
    // 每天上课次数大于1时，每天上午和下午各排一次课
    dailyLessonCount = 2;
  }
  
  const weeklyLessons = lessonsPerPeriod * dailyLessonCount * 5;
  
  // 一周已排课数量
  const weekLessons = result.schedule.filter(lesson => lesson.studentId === student.id).length;
  
  console.log('一周排课情况:');
  console.log(`  - 理论需求: ${weeklyLessons}课时`);
  console.log(`  - 已排课时: ${weekLessons}课时`);
  
  // 检查排课问题
  if (weekLessons !== weeklyLessons) {
    console.log(`  - 问题: 排课数量不匹配，理论${weeklyLessons}课时，实际${weekLessons}课时`);
  }
  
  // 检查是否有排课失败
  const studentFailures = (result.assignmentStats.assignmentFailures || []).filter(failure => failure.studentId === student.id);
  if (studentFailures.length > 0) {
    console.log(`  - 排课失败天数: ${studentFailures.length}天`);
    studentFailures.forEach(failure => {
      console.log(`    * 星期${failure.day}: 期望${failure.expectedLessons}课时`);
    });
  }
  
  // 显示一周具体排课情况
  console.log('  一周具体排课:');
  const studentLessons = result.schedule.filter(lesson => lesson.studentId === student.id);
  if (studentLessons.length > 0) {
    // 按天分组显示
    const lessonsByDay = {};
    studentLessons.forEach(lesson => {
      if (!lessonsByDay[lesson.day]) lessonsByDay[lesson.day] = [];
      lessonsByDay[lesson.day].push(lesson);
    });
    
    for (let day = 1; day <= 5; day++) {
      if (lessonsByDay[day]) {
        const teacherIds = [...new Set(lessonsByDay[day].map(lesson => lesson.teacherId))];
        const teacherNames = teacherIds.map(id => mockTeachers.find(t => t.id === id)?.name || `老师${id}`).join('、');
        const periods = [...new Set(lessonsByDay[day].map(lesson => lesson.period))].join('、');
        console.log(`    * 星期${day}: ${teacherNames}, ${periods}时段`);
      } else {
        console.log(`    * 星期${day}: 未排课`);
      }
    }
  } else {
    console.log('    无排课记录');
  }
});

// 输出排课失败详情
if (result.assignmentStats.assignmentFailures && result.assignmentStats.assignmentFailures.length > 0) {
  console.log('\n=== 排课失败详情 ===');
  result.assignmentStats.assignmentFailures.forEach(failure => {
    console.log(`学生: ${failure.studentName}, 星期${failure.day}, 老师ID: ${failure.teacherId}`);
  });
}

// 输出具体课时分配
console.log('\n=== 一周课时分配详情 ===');
const teacherAssignments = {};
result.schedule.forEach(lesson => {
  const teacherId = lesson.teacherId;
  teacherAssignments[teacherId] = (teacherAssignments[teacherId] || 0) + 1;
});

Object.entries(teacherAssignments).forEach(([teacherId, count]) => {
  const teacherName = mockTeachers.find(t => t.id === parseInt(teacherId))?.name || `老师${teacherId}`;
  console.log(`${teacherName}: ${count}课时`);
});


  // 调用Excel生成功能
  await generateExcelSchedule();
  
  console.log('\n测试完成！');
}

// 执行测试
runScheduleTest().catch(error => {
  console.error('测试过程中发生错误:', error);
});
