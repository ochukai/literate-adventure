import { CLASS_DURATION, BREAK_DURATION, MORNING_START, MORNING_END, AFTERNOON_START, AFTERNOON_END, LUNCH_START, LUNCH_END, MAX_LESSONS_PER_TEACHER, MAX_WORKLOAD_DIFFERENCE, WORKLOAD_WARNING_THRESHOLD, LOG_LEVEL } from './constants.js';
import { log } from './logger.js';
import { calculateScheduleStats, generateTeacherWorkloadReport } from './workloadStats.js';

// 辅助函数：创建ID到对象的映射
function createIdMap(items, idField = 'id') {
  const map = {};
  items.forEach(item => {
    map[item[idField]] = item;
  });
  return map;
}

// 时间字符串转分钟
export function toMinutes(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

// 生成一天的可用时间段（上午/下午）
export function generateDaySlots() {
  const slots = [];
  let t = toMinutes(MORNING_START);
  const morningEnd = toMinutes(MORNING_END);

  // 生成上午时段
  while (t + CLASS_DURATION <= morningEnd) {
    slots.push({ start: t, end: t + CLASS_DURATION, period: 'morning' });
    t += CLASS_DURATION + BREAK_DURATION;
  }

  // 生成下午时段
  t = toMinutes(AFTERNOON_START);
  const afternoonEnd = toMinutes(AFTERNOON_END);
  while (t + CLASS_DURATION <= afternoonEnd) {
    slots.push({ start: t, end: t + CLASS_DURATION, period: 'afternoon' });
    t += CLASS_DURATION + BREAK_DURATION;
  }

  return slots;
}

// 判断课程是否跨午休
function isCrossLunch(start, duration) {
  const lunchStart = toMinutes(LUNCH_START);
  const lunchEnd = toMinutes(LUNCH_END);
  return start < lunchStart && start + duration > lunchEnd;
}

// 拆分长课程，240分钟拆成180+60，超过180分钟的课就要分成两次上
function splitLongCourse(duration) {
  if (duration > 180) {
    return [180, duration - 180];
  }

  return [duration];
}

// 将课程分配给老师
function assignCourseToTeacher(student, teacherId, day, period, duration, 
  schedule, teacherBusy, teacherWork, daySlots, teacherMap, teacherStudentContinuity) {
  // 初始化老师的忙碌状态
  if (!teacherBusy[teacherId]) teacherBusy[teacherId] = {};
  if (!teacherBusy[teacherId][day]) teacherBusy[teacherId][day] = {};
  
  // 初始化老师-学生连续排课记录
  if (!teacherStudentContinuity[teacherId]) teacherStudentContinuity[teacherId] = {};
  if (!teacherStudentContinuity[teacherId][student.id]) teacherStudentContinuity[teacherId][student.id] = [];
  
  // 检查老师是否在前一天给该学生上课（避免连续上课）
  const prevDayAssignments = teacherStudentContinuity[teacherId][student.id];
  if (prevDayAssignments.includes(day - 1)) {
    // 如果老师前一天给该学生上过课，尝试其他老师
    return false;
  }
  
  // 获取老师信息（通过映射快速查找）
  const teacher = teacherMap[teacherId];
  const teacherName = teacher ? teacher.name : `未知老师${teacherId}`;
  
  // 检查老师是否已经超过最大课时限制
  const currentWork = teacherWork[teacherId] || 0;
  const courseLessons = Math.ceil(duration / CLASS_DURATION); // 计算课程的课时数
  
  // 调试信息
  if (currentWork >= WORKLOAD_WARNING_THRESHOLD) {
    log(LOG_LEVEL.WARNING, `⚠️ 老师${teacherName}当前工作量较高: ${currentWork}课时`);
  }
  
  // 检查是否超过最大课时限制
  if (currentWork + courseLessons > MAX_LESSONS_PER_TEACHER) {
    log(LOG_LEVEL.DEBUG, `❌ 老师${teacherName}已达最大课时限制，无法分配课程`);
    return false;
  }
  
  const slots = daySlots.filter(s => s.period === period);
  const slotCount = Math.ceil(duration / CLASS_DURATION);
  
  if (slots.length < slotCount) {
    log(LOG_LEVEL.DEBUG, `  ❌ 没有足够的连续${period}时段`);
    return false;
  }

  // 查找连续的空闲时段
  for (let i = 0; i <= slots.length - slotCount; i++) {
    let canAssign = true;

    // 检查时段是否空闲
    for (let j = 0; j < slotCount; j++) {
      const slot = slots[i + j];
      if (teacherBusy[teacherId][day][slot.start]) {
        canAssign = false;
        break;
      }
    }

    // 不允许跨午休时间排课
    const firstSlot = slots[i];
    if (duration <= 180 && isCrossLunch(firstSlot.start, duration)) {
      canAssign = false;
      continue;
    }

    if (!canAssign) continue;

    // 分配课程
    for (let j = 0; j < slotCount; j++) {
      const slot = slots[i + j];
      schedule.push({
        studentId: student.id,
        teacherId,
        day,
        start: slot.start,
        end: slot.end,
        period,
        duration: CLASS_DURATION
      });
      teacherBusy[teacherId][day][slot.start] = true;
    }
    
    // 更新老师的工作量
    teacherWork[teacherId] = (teacherWork[teacherId] || 0) + slotCount;
    
    // 记录老师-学生的排课记录，避免连续排课
    teacherStudentContinuity[teacherId][student.id].push(day);

    // log(LOG_LEVEL.DEBUG, `${student.name} 星期${day} ${period} ${duration}分钟 分配给 ${teacherName} 成功`);
    return true;
  }

  return false;
}

// 生成单周课表
function generateSingleWeekSchedule(students, teachers) {
  const daySlots = generateDaySlots();
  const schedule = [];
  const teacherBusy = {}; // 记录老师的忙碌时段
  const teacherWork = {}; // 记录老师的工作量
  const studentTeacherAssignments = {}; // 记录每个学生的两个老师分配
  const teacherMap = createIdMap(teachers); // 创建老师ID到老师信息的映射，提升查找效率
  // 新增：记录老师-学生的连续排课情况
  const teacherStudentContinuity = {};

  // 记录排课失败信息
  const failedAssignments = [];

  log(LOG_LEVEL.INFO, `一周排课开始，学生总数: ${students.length}`);

  // 1. 为每个学生分配两位老师
  // 初始化每个老师的学生数量计数
  const teacherStudentCount = {};
  teachers.forEach(teacher => {
    teacherStudentCount[teacher.id] = 0;
  });
  
  // 优化老师排序逻辑
  const sortTeachersByWorkloadAndStudents = (teachersList, workMap, studentCountMap) => {
    return [...teachersList].sort((a, b) => {
      const workA = workMap[a.id] || 0;
      const workB = workMap[b.id] || 0;
      const countA = studentCountMap[a.id] || 0;
      const countB = studentCountMap[b.id] || 0;
      
      // 先按工作量排序
      if (workA !== workB) {
        return workA - workB;
      }
      // 工作量相同时，按学生数量排序
      if (countA !== countB) {
        return countA - countB;
      }
      // 学生数量也相同时，随机排序
      return Math.random() - 0.5;
    });
  };
  
  for (const student of students) {
    const sortedTeachers = sortTeachersByWorkloadAndStudents(teachers, teacherWork, teacherStudentCount);

    let teacherA = null;
    let teacherB = null;

    // 尝试为学生分配两个不同的老师，优先选择工作量少和学生数量少的老师
    for (let i = 0; i < sortedTeachers.length; i++) {
      for (let j = i + 1; j < sortedTeachers.length; j++) {
        // 避免为同一个学生分配两个工作量差异过大的老师
        const workA = teacherWork[sortedTeachers[i].id] || 0;
        const workB = teacherWork[sortedTeachers[j].id] || 0;
        if (Math.abs(workA - workB) > MAX_WORKLOAD_DIFFERENCE) {
          continue; // 如果两位老师工作量差异超过阈值，跳过这对组合
        }
        
        teacherA = sortedTeachers[i].id;
        teacherB = sortedTeachers[j].id;
        break;
      }
      if (teacherA && teacherB) break;
    }
    
    // 如果没有找到合适的组合，则使用原始方法
    if (!teacherA || !teacherB) {
      for (let i = 0; i < sortedTeachers.length; i++) {
        for (let j = i + 1; j < sortedTeachers.length; j++) {
          teacherA = sortedTeachers[i].id;
          teacherB = sortedTeachers[j].id;
          break;
        }
        if (teacherA && teacherB) break;
      }
    }

    studentTeacherAssignments[student.id] = { teacherA, teacherB };
    
    // 更新老师的学生数量计数
    teacherStudentCount[teacherA]++;
    teacherStudentCount[teacherB]++;
    
    log(LOG_LEVEL.DEBUG, `学生 ${student.name} 分配老师: ${teacherMap[teacherA]?.name} 和 ${teacherMap[teacherB]?.name}`);
  }

  // 按课程时长排序学生，优先排课时长的学生
  const studentsByDuration = [...students].sort((a, b) => b.classDuration - a.classDuration);

  // 辅助函数：为学生分配一次课程
  function assignSingleLesson(student, teacherId, day, period, courseParts, schedule, teacherBusy, teacherWork, daySlots, teacherMap, teacherStudentContinuity) {
    // 检查该学生当天是否已经排课
    const existingLessons = schedule.filter(lesson =>
      lesson.studentId === student.id && lesson.day === day
    ).length;
    
    if (existingLessons > 0) {
      return false; // 学生当天已经有排课，不重复分配
    }
    
    // 对于240分钟的课程，需要特殊处理
    if (student.classDuration === 240) {
      // 随机决定上午排180分钟下午排60分钟，还是上午排60分钟下午排180分钟
      const morningLonger = Math.random() > 0.5;
      const morningDuration = morningLonger ? 180 : 60;
      const afternoonDuration = morningLonger ? 60 : 180;
      
      // 尝试分配上午课程
      if (!assignCourseToTeacher(student, teacherId, day, 'morning', morningDuration,
        schedule, teacherBusy, teacherWork, daySlots, teacherMap, teacherStudentContinuity)) {
        return false;
      }
      
      // 尝试分配下午课程
      if (!assignCourseToTeacher(student, teacherId, day, 'afternoon', afternoonDuration,
        schedule, teacherBusy, teacherWork, daySlots, teacherMap, teacherStudentContinuity)) {
        // 如果失败，需要清理已分配的上午课程
        const assignedLessons = schedule.filter(lesson =>
          lesson.studentId === student.id && lesson.day === day && lesson.period === 'morning'
        );
        assignedLessons.forEach(lesson => {
          const index = schedule.indexOf(lesson);
          if (index > -1) schedule.splice(index, 1);
          teacherBusy[teacherId][day][lesson.start] = false;
          teacherWork[teacherId] -= 1; // 修正：应该减去课时数而不是分钟数
          // 同时清理连续性记录
          const continuityIndex = teacherStudentContinuity[teacherId][student.id].indexOf(day);
          if (continuityIndex > -1) {
            teacherStudentContinuity[teacherId][student.id].splice(continuityIndex, 1);
          }
        });
        return false;
      }
      
      return true;
    }
    
    // 其他课程尝试在同一时段分配所有部分
    let allPartsAssigned = true;
    for (const partDuration of courseParts) {
      if (!assignCourseToTeacher(student, teacherId, day, period, partDuration,
        schedule, teacherBusy, teacherWork, daySlots, teacherMap, teacherStudentContinuity)) {
        allPartsAssigned = false;
        break;
      }
    }
    
    return allPartsAssigned;
  }
  
  // 辅助函数：尝试为学生排课，减少重复代码
  const attemptToAssignLessons = (student, teacherIds, day, periods, courseParts) => {
    for (const teacherId of teacherIds) {
      if (!teacherBusy[teacherId]) teacherBusy[teacherId] = {};
      if (!teacherBusy[teacherId][day]) teacherBusy[teacherId][day] = {};
      
      for (const period of periods) {
        if (assignSingleLesson(student, teacherId, day, period, courseParts,
          schedule, teacherBusy, teacherWork, daySlots, teacherMap, teacherStudentContinuity)) {
          return true;
        }
      }
    }
    return false;
  };

  // 3. 为每个学生安排课程
  for (const student of studentsByDuration) {
    const { teacherA, teacherB } = studentTeacherAssignments[student.id];
    // 拆分长课程
    const courseParts = splitLongCourse(student.classDuration);

    // 处理一周5天的排课
    for (let day = 1; day <= 5; day++) {
      // 确定当天的主要老师和备用老师
      // 由于现在是单周排课，我们可以简化老师分配逻辑
      const teacherId = [1, 3, 5].includes(day) ? teacherA : teacherB;
      const backupTeacherId = teacherId === teacherA ? teacherB : teacherA;

      // 初始化老师忙碌状态
      if (!teacherBusy[teacherId]) teacherBusy[teacherId] = {};
      if (!teacherBusy[teacherId][day]) teacherBusy[teacherId][day] = {};
      if (!teacherBusy[backupTeacherId]) teacherBusy[backupTeacherId] = {};
      if (!teacherBusy[backupTeacherId][day]) teacherBusy[backupTeacherId][day] = {};

      // 根据每天上课次数决定排课策略
      if (student.dailyClasses === 1) {
        // 每天上课次数为1时，只需要排一次课（上午或下午）
        let assigned = false;
        
        // 检查该学生当天是否已经排课
        const existingLessons = schedule.filter(lesson =>
          lesson.studentId === student.id && lesson.day === day
        ).length;
        
        if (existingLessons > 0) {
          continue; // 学生当天已经有排课，跳过
        }
        
        // 随机选择上午或下午开始尝试排课
        const periods = Math.random() > 0.5 ? ['morning', 'afternoon'] : ['afternoon', 'morning'];
        
        // 首先尝试主要老师
        assigned = attemptToAssignLessons(student, [teacherId], day, periods, courseParts);
        
        // 如果主要老师排课失败，尝试备用老师
        if (!assigned) {
          assigned = attemptToAssignLessons(student, [backupTeacherId], day, periods, courseParts);
        }
        
        // 如果备用老师也排课失败，尝试其他可用老师（按工作量排序）
        if (!assigned) {
          // 按照工作量从小到大排序其他老师
          const otherTeachersSorted = [...teachers]
            .filter(t => t.id !== teacherId && t.id !== backupTeacherId)
            .sort((a, b) => (teacherWork[a.id] || 0) - (teacherWork[b.id] || 0));
          
          assigned = attemptToAssignLessons(student, otherTeachersSorted, day, periods, courseParts);
        }
      } else {
        // 对于每天上课次数大于1的学生，优先保证上午和下午各排一次课，并且两次课由同一个老师上
        let assignedTeacher = null;
        let morningAssigned = false;
        let afternoonAssigned = false;
        
        // 检查该学生当天是否已经排课
        const existingLessons = schedule.filter(lesson =>
          lesson.studentId === student.id && lesson.day === day
        ).length;
        
        if (existingLessons >= student.dailyClasses * courseParts.length) {
          continue; // 学生当天已经达到预期排课数量，跳过
        }
        
        // 首先尝试使用同一个老师安排上午和下午的课程（主要老师）
        let canAssignWithSameTeacher = true;
        
        // 检查主要老师是否可以同时排上午和下午的课
        for (const partDuration of courseParts) {
          // 检查上午
          if (!morningAssigned) {
            if (!assignCourseToTeacher(student, teacherId, day, 'morning', partDuration,
              schedule, teacherBusy, teacherWork, daySlots, teacherMap, teacherStudentContinuity)) {
              canAssignWithSameTeacher = false;
              break;
            }
            morningAssigned = true;
          }
          
          // 检查下午
          if (!afternoonAssigned) {
            if (!assignCourseToTeacher(student, teacherId, day, 'afternoon', partDuration,
              schedule, teacherBusy, teacherWork, daySlots, teacherMap, teacherStudentContinuity)) {
              canAssignWithSameTeacher = false;
              break;
            }
            afternoonAssigned = true;
          }
        }
        
        // 如果主要老师可以同时排上午和下午的课，记录老师
        if (canAssignWithSameTeacher) {
          assignedTeacher = teacherId;
        } else {
          // 如果主要老师不能同时排上午和下午的课，回滚刚才的排课并尝试备用老师
          // 回滚上午的排课
          if (morningAssigned) {
            const morningLessonsToRemove = schedule.filter(l => 
              l.studentId === student.id && l.teacherId === teacherId && l.day === day && l.period === 'morning'
            );
            morningLessonsToRemove.forEach(lesson => {
              const index = schedule.indexOf(lesson);
              if (index > -1) schedule.splice(index, 1);
              teacherWork[teacherId]--;
              delete teacherBusy[teacherId][day][lesson.period];
            });
            morningAssigned = false;
          }
          
          // 回滚下午的排课
          if (afternoonAssigned) {
            const afternoonLessonsToRemove = schedule.filter(l => 
              l.studentId === student.id && l.teacherId === teacherId && l.day === day && l.period === 'afternoon'
            );
            afternoonLessonsToRemove.forEach(lesson => {
              const index = schedule.indexOf(lesson);
              if (index > -1) schedule.splice(index, 1);
              teacherWork[teacherId]--;
              delete teacherBusy[teacherId][day][lesson.period];
            });
            afternoonAssigned = false;
          }
          
          // 尝试使用备用老师安排上午和下午的课程
          canAssignWithSameTeacher = true;
          
          for (const partDuration of courseParts) {
            // 检查上午
            if (!morningAssigned) {
              if (!assignCourseToTeacher(student, backupTeacherId, day, 'morning', partDuration,
                schedule, teacherBusy, teacherWork, daySlots, teacherMap, teacherStudentContinuity)) {
                canAssignWithSameTeacher = false;
                break;
              }
              morningAssigned = true;
            }
            
            // 检查下午
            if (!afternoonAssigned) {
              if (!assignCourseToTeacher(student, backupTeacherId, day, 'afternoon', partDuration,
                schedule, teacherBusy, teacherWork, daySlots, teacherMap, teacherStudentContinuity)) {
                canAssignWithSameTeacher = false;
                break;
              }
              afternoonAssigned = true;
            }
          }
          
          // 如果备用老师可以同时排上午和下午的课，记录老师
          if (canAssignWithSameTeacher) {
            assignedTeacher = backupTeacherId;
          } else {
            // 如果备用老师也不能同时排上午和下午的课，回滚刚才的排课并尝试其他老师
            // 回滚上午的排课
            if (morningAssigned) {
              const morningLessonsToRemove = schedule.filter(l => 
                l.studentId === student.id && l.teacherId === backupTeacherId && l.day === day && l.period === 'morning'
              );
              morningLessonsToRemove.forEach(lesson => {
                const index = schedule.indexOf(lesson);
                if (index > -1) schedule.splice(index, 1);
                teacherWork[backupTeacherId]--;
                delete teacherBusy[backupTeacherId][day][lesson.period];
              });
              morningAssigned = false;
            }
            
            // 回滚下午的排课
            if (afternoonAssigned) {
              const afternoonLessonsToRemove = schedule.filter(l => 
                l.studentId === student.id && l.teacherId === backupTeacherId && l.day === day && l.period === 'afternoon'
              );
              afternoonLessonsToRemove.forEach(lesson => {
                const index = schedule.indexOf(lesson);
                if (index > -1) schedule.splice(index, 1);
                teacherWork[backupTeacherId]--;
                delete teacherBusy[backupTeacherId][day][lesson.period];
              });
              afternoonAssigned = false;
            }
            
            // 尝试其他老师
            const otherTeachersSorted = [...teachers]
              .filter(t => t.id !== teacherId && t.id !== backupTeacherId)
              .sort((a, b) => (teacherWork[a.id] || 0) - (teacherWork[b.id] || 0));
            
            for (const otherTeacher of otherTeachersSorted) {
              if (!teacherBusy[otherTeacher.id]) teacherBusy[otherTeacher.id] = {};
              if (!teacherBusy[otherTeacher.id][day]) teacherBusy[otherTeacher.id][day] = {};
              
              canAssignWithSameTeacher = true;
              
              // 尝试用同一个老师安排上午和下午的课程
              for (const partDuration of courseParts) {
                // 检查上午
                if (!morningAssigned) {
                  if (!assignCourseToTeacher(student, otherTeacher.id, day, 'morning', partDuration,
                    schedule, teacherBusy, teacherWork, daySlots, teacherMap, teacherStudentContinuity)) {
                    canAssignWithSameTeacher = false;
                    break;
                  }
                  morningAssigned = true;
                }
                
                // 检查下午
                if (!afternoonAssigned) {
                  if (!assignCourseToTeacher(student, otherTeacher.id, day, 'afternoon', partDuration,
                    schedule, teacherBusy, teacherWork, daySlots, teacherMap, teacherStudentContinuity)) {
                    canAssignWithSameTeacher = false;
                    break;
                  }
                  afternoonAssigned = true;
                }
              }
              
              // 如果这个老师可以同时排上午和下午的课，记录老师并退出循环
              if (canAssignWithSameTeacher) {
                assignedTeacher = otherTeacher.id;
                break;
              } else {
                // 否则回滚刚才的排课
                // 回滚上午的排课
                if (morningAssigned) {
                  const morningLessonsToRemove = schedule.filter(l => 
                    l.studentId === student.id && l.teacherId === otherTeacher.id && l.day === day && l.period === 'morning'
                  );
                  morningLessonsToRemove.forEach(lesson => {
                    const index = schedule.indexOf(lesson);
                    if (index > -1) schedule.splice(index, 1);
                    teacherWork[otherTeacher.id]--;
                    delete teacherBusy[otherTeacher.id][day][lesson.period];
                  });
                  morningAssigned = false;
                }
                
                // 回滚下午的排课
                if (afternoonAssigned) {
                  const afternoonLessonsToRemove = schedule.filter(l => 
                    l.studentId === student.id && l.teacherId === otherTeacher.id && l.day === day && l.period === 'afternoon'
                  );
                  afternoonLessonsToRemove.forEach(lesson => {
                    const index = schedule.indexOf(lesson);
                    if (index > -1) schedule.splice(index, 1);
                    teacherWork[otherTeacher.id]--;
                    delete teacherBusy[otherTeacher.id][day][lesson.period];
                  });
                  afternoonAssigned = false;
                }
              }
            }
          }
        }
      }

      // 检查是否有排课失败
      const expectedLessons = student.dailyClasses;
      const actualLessons = schedule.filter(lesson =>
        lesson.studentId === student.id && lesson.day === day
      ).length / courseParts.length; // 除以课程拆分的部分数

      if (actualLessons < expectedLessons) {
        failedAssignments.push({
          studentId: student.id,
          studentName: student.name,
          day,
          teacherId,
          expectedLessons,
          actualLessons,
          weekType: 'week'
        });
        log(LOG_LEVEL.ERROR, `${student.name} 星期${day} 排课失败: 期望${expectedLessons}课时，实际${actualLessons}课时`);
      }
    }
  }

  log(LOG_LEVEL.INFO, `一周排课结束，已排课时: ${schedule.length}`);
  log(LOG_LEVEL.INFO, `老师工作量统计: ${teachers.map(t => `${t.name}: ${teacherWork[t.id] || 0}课时`).join(', ')}`);

  return { schedule, teacherWork, studentTeacherAssignments, failedAssignments };
}

// 生成一周课表，这是主要的导出函数
/**
 * 生成一周的排课计划
 * @param {Array} students 学生列表 [{ id, name, dailyClasses, classDuration }]
 * @param {Array} teachers 教师列表 [{ id, name }]
 * @returns {Object} 包含一周课表和统计信息
 */
export function generateWeekSchedule(students, teachers) {
  console.log('开始生成一周课表...');
  console.log(`学生数量: ${students.length}, 老师数量: ${teachers.length}`);

  // 1. 生成一周课表
  const { schedule, teacherWork, studentTeacherAssignments, failedAssignments } = 
    generateSingleWeekSchedule(students, teachers);

  // 2. 计算统计信息
  const stats = calculateScheduleStats(schedule, students);

  // 统计排课失败的学生
  const failedStudents = new Set();
  failedAssignments.forEach(failure => {
    failedStudents.add(failure.studentId);
  });

  const failedStudentDetails = Array.from(failedStudents).map(studentId => {
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

  // 准备返回结果
  const result = {
    schedule,
    assignmentStats: stats,
    teacherWorkloads: teacherWork,
    failedStudents: failedStudentDetails,
    studentTeacherAssignments // 返回学生和老师的分配关系
  };

  console.log('排课完成！');
  console.log(`一周总期望课时: ${stats.totalExpectedLessons}`);
  console.log(`一周总已分配课时: ${stats.totalAssignedLessons}`);
  console.log(`排课失败学生数量: ${failedStudentDetails.length}`);

  // 输出老师工作量统计
  const workloadReport = generateTeacherWorkloadReport(teacherWork, teachers);
  console.log('老师工作量统计（一周总计）:');
  workloadReport.sortedTeachers.forEach(teacher => {
    console.log(`  - ${teacher.name}: ${teacher.workload}课时`);
  });

  if (failedStudentDetails.length > 0) {
    console.log('排课失败学生列表:');
    failedStudentDetails.forEach(student => {
      console.log(`  - ${student.studentName}: 每天${student.dailyClasses}节课, 每节课${student.classDuration}分钟, 失败天数: ${student.totalFailures}`);
    });
  }

  return result;
}

/**
 * 生成最优排课计划（运行多次排课并选择老师工作量差距最小的结果）
 * @param {Array} students 学生列表 [{ id, name, dailyClasses, classDuration }]
 * @param {Array} teachers 教师列表 [{ id, name }]
 * @param {number} iterations 运行排课的次数，默认为10次
 * @returns {Object} 包含最优排课计划和统计信息
 */
export function generateOptimalSchedule(students, teachers, iterations = 10) {
  console.log(`开始生成最优排课计划，将运行${iterations}次排课并选择最优结果...`);
  console.log(`学生数量: ${students.length}, 老师数量: ${teachers.length}`);

  let bestSchedule = null;
  let bestWorkloadDifference = Infinity;
  let allResults = [];

  // 运行多次排课
  for (let i = 0; i < iterations; i++) {
    console.log(`正在进行第${i + 1}/${iterations}次排课...`);
    
    // 生成一周课表
    const { schedule, teacherWork, studentTeacherAssignments, failedAssignments } = 
      generateSingleWeekSchedule(students, teachers);

    // 计算工作量统计
    const workloadReport = generateTeacherWorkloadReport(teacherWork, teachers);
    const workloadDifference = workloadReport.stats.workloadDifference;
    
    // 计算排课统计信息
    const stats = calculateScheduleStats(schedule, students);
    
    // 记录结果
    const result = {
      schedule,
      teacherWork,
      studentTeacherAssignments,
      failedAssignments,
      workloadDifference,
      stats
    };
    
    allResults.push(result);
    
    // 更新最优结果
    if (workloadDifference < bestWorkloadDifference) {
      bestWorkloadDifference = workloadDifference;
      bestSchedule = result;
      console.log(`  找到更优的排课方案，当前最小工作量差异: ${bestWorkloadDifference}课时`);
    }
    
    // 输出本次排课的工作量差异
    console.log(`  第${i + 1}次排课完成，工作量差异: ${workloadDifference}课时`);
  }

  console.log(`所有排课完成！最小工作量差异为: ${bestWorkloadDifference}课时`);
  
  // 处理最优结果
  const { schedule, teacherWork, studentTeacherAssignments, failedAssignments, stats } = bestSchedule;
  
  // 统计排课失败的学生
  const failedStudents = new Set();
  failedAssignments.forEach(failure => {
    failedStudents.add(failure.studentId);
  });

  const failedStudentDetails = Array.from(failedStudents).map(studentId => {
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

  // 准备返回结果
  const finalResult = {
    schedule,
    assignmentStats: stats,
    teacherWorkloads: teacherWork,
    failedStudents: failedStudentDetails,
    studentTeacherAssignments,
    optimizationInfo: {
      iterations,
      bestWorkloadDifference,
      allDifferences: allResults.map(r => r.workloadDifference)
    }
  };

  console.log('最优排课结果：');
  console.log(`一周总期望课时: ${stats.totalExpectedLessons}`);
  console.log(`一周总已分配课时: ${stats.totalAssignedLessons}`);
  console.log(`排课失败学生数量: ${failedStudentDetails.length}`);

  // 输出老师工作量统计
  const workloadReport = generateTeacherWorkloadReport(teacherWork, teachers);
  console.log('老师工作量统计（一周总计）:');
  workloadReport.sortedTeachers.forEach(teacher => {
    console.log(`  - ${teacher.name}: ${teacher.workload}课时`);
  });

  // 输出工作量统计信息
  console.log('工作量统计信息:');
  console.log(`  - 总工作量: ${workloadReport.stats.totalWorkload}课时`);
  console.log(`  - 平均工作量: ${workloadReport.stats.avgWorkload}课时`);
  console.log(`  - 最大工作量: ${workloadReport.stats.maxWorkload}课时`);
  console.log(`  - 最小工作量: ${workloadReport.stats.minWorkload}课时`);
  console.log(`  - 工作量差异: ${workloadReport.stats.workloadDifference}课时`);

  if (failedStudentDetails.length > 0) {
    console.log('排课失败学生列表:');
    failedStudentDetails.forEach(student => {
      console.log(`  - ${student.studentName}: 每天${student.dailyClasses}节课, 每节课${student.classDuration}分钟, 失败天数: ${student.totalFailures}`);
    });
  }

  return finalResult;
}
