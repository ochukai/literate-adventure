import ExcelJS from 'exceljs';
import { generateWeekSchedule, generateDaySlots } from './logic.js';
import { CLASS_DURATION } from './constants.js';

// 时间格式化工具
function minutesToStr(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * 生成课程表Excel文件（单周排课表）
 * @param {Array} students - 学生数据数组
 * @param {Array} teachers - 老师数据数组
 * @returns {Promise<Buffer>} Excel文件的Buffer
 */
export async function generateScheduleExcel(students, teachers) {
  // 生成工作簿
  const workbook = new ExcelJS.Workbook();
  
  // 设置Excel属性
  workbook.creator = '排课系统';
  workbook.lastModifiedBy = '排课系统';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // 创建主要排课工作表（按老师和时间展示）
  createMainScheduleSheet(workbook, students, teachers);
  
  // 创建学生详细排课工作表
  createStudentScheduleSheet(workbook, students, teachers);
  
  // 创建统计信息工作表
  createStatisticsSheet(workbook, students, teachers);
  
  // 返回Excel文件的Buffer
  return await workbook.xlsx.writeBuffer();
}

/**
 * 在浏览器环境中下载Excel文件
 * @param {Array} students - 学生数据数组
 * @param {Array} teachers - 老师数据数组
 * @param {string} filename - 文件名
 */
export async function downloadScheduleExcel(students, teachers, filename = '课程表.xlsx') {
  try {
    // 生成Excel文件的Buffer
    const buffer = await generateScheduleExcel(students, teachers);
    
    // 创建Blob对象
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('下载Excel文件失败:', error);
    return false;
  }
}

/**
 * 创建主要排课工作表（支持合并单元格）
 */
function createMainScheduleSheet(workbook, students, teachers) {
  const sheet = workbook.addWorksheet('课程表');
  
  // 生成排课数据
  const { schedule } = generateWeekSchedule(students, teachers);
  const slots = generateDaySlots();
  
  // 定义星期标签
  const days = ['1', '2', '3', '4', '5'];
  const dayLabels = ['周一', '周二', '周三', '周四', '周五'];
  
  // 设置表头
  let columnIndex = 1;
  
  // 设置表头（只使用一行）
  sheet.getCell(1, 1).value = '老师';
  sheet.getCell(1, 1).font = { bold: true };
  sheet.getCell(1, 1).alignment = { vertical: 'middle', horizontal: 'center' };
  
  sheet.getCell(1, 2).value = '星期';
  sheet.getCell(1, 2).font = { bold: true };
  sheet.getCell(1, 2).alignment = { vertical: 'middle', horizontal: 'center' };
  
  columnIndex = 3;
  // 为每个时间段设置列标题
  slots.forEach((slot, idx) => {
    const start = minutesToStr(slot.start);
    const end = minutesToStr(slot.end);
    const label = `${start} - ${end}`;
    
    sheet.getCell(1, columnIndex).value = label;
    sheet.getCell(1, columnIndex).font = { bold: true };
    sheet.getCell(1, columnIndex).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // 设置列宽
    sheet.getColumn(columnIndex).width = 12;
    
    columnIndex++;
  });
  
  // 设置固定列的宽度
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 8;
  
  // 填充表格数据
  let rowIndex = 2; // 从第2行开始
  
  teachers.forEach((teacher, teacherIdx) => {
    // 合并老师姓名列（每个老师有多行课程）
    const daysCount = days.length;
    if (daysCount > 1) {
      sheet.mergeCells(rowIndex, 1, rowIndex + daysCount - 1, 1);
    }
    
    days.forEach((day, dayIdx) => {
      // 设置老师和星期信息
      sheet.getCell(rowIndex, 1).value = teacher.name;
      sheet.getCell(rowIndex, 1).alignment = { vertical: 'middle', horizontal: 'center' };
      
      sheet.getCell(rowIndex, 2).value = dayLabels[dayIdx];
      sheet.getCell(rowIndex, 2).alignment = { vertical: 'middle', horizontal: 'center' };
      
      // 填充每个时间段的数据，并处理连续课程的合并
      let lastStudentId = null;
      let currentColumn = 3;
      let mergeStartColumn = null;
      
      slots.forEach((slot, slotIdx) => {
        // 找到该老师该天该时间段的课程
        const course = schedule.find(s => 
          s.teacherId === teacher.id && 
          s.day === Number(day) && 
          s.start === slot.start && 
          s.end === slot.end
        );
        
        if (!course) {
          // 没有课程，检查是否需要合并之前的单元格
          if (mergeStartColumn !== null && currentColumn - 1 > mergeStartColumn) {
            // 合并连续的课程单元格
            sheet.mergeCells(rowIndex, mergeStartColumn, rowIndex, currentColumn - 1);
          }
          mergeStartColumn = null;
          lastStudentId = null;
          sheet.getCell(rowIndex, currentColumn).value = '';
        } else {
          const student = students.find(s => s.id === course.studentId);
          if (student) {
            // 检查是否是同一个学生的连续课程
            if (student.id === lastStudentId) {
              // 是连续课程，继续累积合并范围
              if (mergeStartColumn === null) {
                mergeStartColumn = currentColumn - 1;
              }
              // 当前单元格不设置值，由合并后的起始单元格显示
              sheet.getCell(rowIndex, currentColumn).value = '';
            } else {
              // 不是连续课程，检查是否需要合并之前的单元格
              if (mergeStartColumn !== null && currentColumn - 1 > mergeStartColumn) {
                sheet.mergeCells(rowIndex, mergeStartColumn, rowIndex, currentColumn - 1);
              }
              // 设置新的课程信息
              sheet.getCell(rowIndex, currentColumn).value = student.name;
              sheet.getCell(rowIndex, currentColumn).alignment = { vertical: 'middle', horizontal: 'center' };
              lastStudentId = student.id;
              mergeStartColumn = null;
            }
          } else {
            // 没有找到学生
            sheet.getCell(rowIndex, currentColumn).value = '';
            lastStudentId = null;
            mergeStartColumn = null;
          }
        }
        
        currentColumn++;
      });
      
      // 检查并合并该行最后一个连续的课程单元格
      if (mergeStartColumn !== null && currentColumn - 1 > mergeStartColumn) {
        sheet.mergeCells(rowIndex, mergeStartColumn, rowIndex, currentColumn - 1);
      }
      
      rowIndex++;
    });
  });
  
  // 添加边框
  addBordersToRange(sheet, 1, 1, rowIndex - 1, slots.length + 2);
}

/**
 * 创建学生详细排课工作表（支持合并同一个学生连续上课的单元格）
 */
function createStudentScheduleSheet(workbook, students, teachers) {
  const sheet = workbook.addWorksheet('学生排课明细');
  
  // 生成排课数据
  const { schedule } = generateWeekSchedule(students, teachers);
  
  // 设置表头
  sheet.getCell(1, 1).value = '学生姓名';
  sheet.getCell(1, 2).value = '老师姓名';
  sheet.getCell(1, 3).value = '星期';
  sheet.getCell(1, 4).value = '时段';
  sheet.getCell(1, 5).value = '开始时间';
  sheet.getCell(1, 6).value = '结束时间';
  
  // 设置表头样式
  for (let i = 1; i <= 6; i++) {
    sheet.getCell(1, i).font = { bold: true };
    sheet.getCell(1, i).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(1, i).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };
  }
  
  // 设置列宽
  sheet.getColumn(1).width = 15;
  sheet.getColumn(2).width = 15;
  sheet.getColumn(3).width = 8;
  sheet.getColumn(4).width = 8;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 12;
  
  // 填充学生排课数据
  let rowIndex = 2;
  
  students.forEach(student => {
    // 该学生所有课程
    const studentLessons = schedule.filter(item => item.studentId === student.id);
    
    if (studentLessons.length === 0) {
      // 无排课记录
      sheet.getCell(rowIndex, 1).value = student.name;
      sheet.getCell(rowIndex, 2).value = '无排课';
      
      // 设置单元格对齐
      for (let i = 1; i <= 6; i++) {
        sheet.getCell(rowIndex, i).alignment = { vertical: 'middle', horizontal: 'center' };
      }
      
      rowIndex++;
    } else {
      // 对学生的课程进行排序，按照星期和时间段排序
      studentLessons.sort((a, b) => {
        // 先按星期排序
        if (a.day !== b.day) {
          return a.day - b.day;
        }
        // 再按时间段排序（上午在前，下午在后）
        if (a.period !== b.period) {
          return a.period === 'morning' ? -1 : 1;
        }
        // 最后按开始时间排序
        return a.start - b.start;
      });
      
      // 处理连续课程，合并单元格
      let mergeStartRow = rowIndex;
      let currentTeacherId = studentLessons[0].teacherId;
      let currentDay = studentLessons[0].day;
      
      studentLessons.forEach((item, idx) => {
        const teacher = teachers.find(t => t.id === item.teacherId);
        
        sheet.getCell(rowIndex, 1).value = student.name;
        sheet.getCell(rowIndex, 2).value = teacher ? teacher.name : '未知老师';
        sheet.getCell(rowIndex, 3).value = `星期${item.day}`;
        sheet.getCell(rowIndex, 4).value = item.period === 'morning' ? '上午' : '下午';
        sheet.getCell(rowIndex, 5).value = minutesToStr(item.start);
        sheet.getCell(rowIndex, 6).value = minutesToStr(item.end);
        
        // 设置单元格对齐
        for (let i = 1; i <= 6; i++) {
          sheet.getCell(rowIndex, i).alignment = { vertical: 'middle', horizontal: 'center' };
        }
        
        // 检查是否是连续的课程（相同老师，相同星期，且是当前连续序列的最后一个元素）
        const isLastItem = idx === studentLessons.length - 1;
        const isNextItemDifferent = !isLastItem && 
          (studentLessons[idx + 1].teacherId !== currentTeacherId || 
           studentLessons[idx + 1].day !== currentDay);
        
        if (isLastItem || isNextItemDifferent) {
          // 需要合并单元格
          if (rowIndex > mergeStartRow) {
            // 合并学生姓名和老师姓名列
            sheet.mergeCells(mergeStartRow, 1, rowIndex, 1);
            sheet.mergeCells(mergeStartRow, 2, rowIndex, 2);
          }
          
          // 重置合并开始行和当前课程信息
          if (!isLastItem) {
            mergeStartRow = rowIndex + 1;
            currentTeacherId = studentLessons[idx + 1].teacherId;
            currentDay = studentLessons[idx + 1].day;
          }
        }
        
        rowIndex++;
      });
    }
    
    // 在每个学生后添加一行空行
    rowIndex++;
  });
  
  // 添加边框
  addBordersToRange(sheet, 1, 1, rowIndex - 1, 6);
}

/**
 * 创建统计信息工作表（按单周课时量计算）
 */
function createStatisticsSheet(workbook, students, teachers) {
  const sheet = workbook.addWorksheet('排课统计');
  
  // 生成排课数据
  const { schedule, assignmentStats } = generateWeekSchedule(students, teachers);
  
  // 统计老师可安排总课时（单周计算）
  const slots = generateDaySlots();
  const teacherTotalLessons = teachers.length * slots.length * 5; // 5天（单周）
  
  // 统计每个老师的已安排课时（单周计算）
  const teacherLessonCount = {};
  
  // 统计每个老师的总课时
  schedule.forEach(s => {
    teacherLessonCount[s.teacherId] = (teacherLessonCount[s.teacherId] || 0) + 1;
  });
  
  // 计算平均课时（单周计算）
  const teacherCount = teachers.length;
  const totalLessons = assignmentStats?.totalAssignedLessons || 
                      Object.values(teacherLessonCount).reduce((a, b) => a + b, 0);
  const avgLessons = teacherCount > 0 ? Math.round(totalLessons / teacherCount) : 0;
  
  // 学生期望总课时（单周计算）
  const studentTotalLessons = assignmentStats?.totalExpectedLessons || 
    students.reduce((sum, s) => sum + Math.ceil(s.dailyClasses * s.classDuration * 5 / CLASS_DURATION), 0);
  
  // 设置标题
  sheet.mergeCells(1, 1, 1, 3);
  sheet.getCell(1, 1).value = '排课统计信息';
  sheet.getCell(1, 1).font = { bold: true, size: 16 };
  sheet.getCell(1, 1).alignment = { vertical: 'middle', horizontal: 'center' };
  
  // 设置统计数据
  let rowIndex = 3;
  
  // 总体统计
  sheet.getCell(rowIndex, 1).value = '老师可安排总课时';
  sheet.getCell(rowIndex, 2).value = teacherTotalLessons;
  sheet.getCell(rowIndex, 3).value = '课时';
  rowIndex++;
  
  sheet.getCell(rowIndex, 1).value = '学生需求总课时';
  sheet.getCell(rowIndex, 2).value = studentTotalLessons;
  sheet.getCell(rowIndex, 3).value = '课时';
  rowIndex++;
  
  sheet.getCell(rowIndex, 1).value = '已分配总课时';
  sheet.getCell(rowIndex, 2).value = totalLessons;
  sheet.getCell(rowIndex, 3).value = '课时';
  rowIndex++;
  
  sheet.getCell(rowIndex, 1).value = '平均课时';
  sheet.getCell(rowIndex, 2).value = avgLessons;
  sheet.getCell(rowIndex, 3).value = '课时/老师';
  rowIndex++;
  
  // 空行
  rowIndex++;
  
  // 老师课时统计标题
  sheet.getCell(rowIndex, 1).value = '老师';
  sheet.getCell(rowIndex, 2).value = '已分配课时';
  sheet.getCell(rowIndex, 3).value = '状态';
  rowIndex++;
  
  // 老师课时统计数据
  teachers.forEach(teacher => {
    const lessons = teacherLessonCount[teacher.id] || 0;
    let status = '正常';
    
    if (lessons === 0) {
      status = '无排课';
    } else if (lessons < avgLessons * 0.5) {
      status = '课时较少';
    } else if (lessons > avgLessons * 1.5) {
      status = '课时较多';
    }
    
    sheet.getCell(rowIndex, 1).value = teacher.name;
    sheet.getCell(rowIndex, 2).value = lessons;
    sheet.getCell(rowIndex, 3).value = status;
    
    // 设置单元格对齐
    for (let i = 1; i <= 3; i++) {
      sheet.getCell(rowIndex, i).alignment = { vertical: 'middle', horizontal: 'center' };
    }
    
    rowIndex++;
  });
  
  // 设置列宽
  sheet.getColumn(1).width = 15;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 12;
  
  // 添加边框
  addBordersToRange(sheet, 3, 1, rowIndex - 1, 3);
  addBordersToRange(sheet, 1, 1, 1, 3); // 标题边框
}

/**
 * 为指定范围的单元格添加边框
 */
function addBordersToRange(sheet, startRow, startCol, endRow, endCol) {
  const borderStyle = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      sheet.getCell(row, col).border = borderStyle;
    }
  }
}