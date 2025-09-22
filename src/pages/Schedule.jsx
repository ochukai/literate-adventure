import React, { useState, useEffect } from "react";
import { Typography, Table, Card, Row, Col, Tabs, Button, Modal, message } from "antd";
import { useSelector, useDispatch } from "react-redux";
import { generateWeekSchedule, generateDaySlots } from "../schedule/logic";
import { downloadScheduleExcel } from '../schedule/excelGenerator.js';
import { UserOutlined, TeamOutlined, StarOutlined } from "@ant-design/icons";
import { addSchedule, updateSchedule } from "../store/scheduleSlice";
import { CLASS_DURATION } from "../schedule/constants";
import {
  calculateTotalStudentLessons,
  calculateTeacherLessonStats,
  calculateAverageLessons
} from "../schedule/lessonUtils";

const { TabPane } = Tabs;

const { Title } = Typography;

const { confirm } = Modal;

// 时间格式化工具
function minutesToStr(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function Schedule() {
  const students = useSelector((state) => state.students.list);
  const teachers = useSelector((state) => state.teachers.list);
  const savedSchedule = useSelector((state) => state.schedule.list[0]);
  const dispatch = useDispatch();
  const [schedule, setSchedule] = useState([]);
  const [assignmentStats, setAssignmentStats] = useState(null);

  // 初始排课和更新排课的函数
  const performScheduling = () => {
    const newScheduleData = generateWeekSchedule(students, teachers);
    setSchedule(newScheduleData.schedule);
    setAssignmentStats(newScheduleData.assignmentStats);
    
    // 保存排课结果到Redux
    const scheduleDataToSave = {
      schedule: newScheduleData.schedule,
      assignmentStats: newScheduleData.assignmentStats,
      timestamp: new Date().toISOString()
    };
    
    if (savedSchedule) {
      dispatch(updateSchedule({ id: savedSchedule.id, ...scheduleDataToSave }));
    } else {
      dispatch(addSchedule(scheduleDataToSave));
    }
    
    // 输出排课统计信息
    console.log("排课统计更新:", newScheduleData.assignmentStats);
  };

  // 导出Excel文件
  const handleExportExcel = async () => {
    message.loading('正在生成Excel文件...', 0);
    try {
      const success = await downloadScheduleExcel(students, teachers);
      if (success) {
        message.destroy();
        message.success('Excel文件导出成功！');
      } else {
        message.destroy();
        message.error('Excel文件导出失败，请重试。');
      }
    } catch (error) {
      message.destroy();
      console.error('导出Excel时出错:', error);
      message.error('导出Excel文件时发生错误：' + error.message);
    }
  };

  // 重新排课按钮的处理函数
  const handleReschedule = () => {
    confirm({
      title: '确认重新排课',
      content: '重新排课将生成新的课表，当前课表将被替换。确定要继续吗？',
      okText: '确定',
      okType: 'primary',
      cancelText: '取消',
      onOk() {
        performScheduling();
        console.log("重新排课已执行");
      },
      onCancel() {
        console.log("取消重新排课");
      },
    });
  };

  // 组件挂载时执行初始排课或加载已保存的排课结果
  useEffect(() => {
    if (savedSchedule && savedSchedule.schedule) {
      // 如果有已保存的排课结果且包含schedule属性，直接加载
      setSchedule(savedSchedule.schedule);
      setAssignmentStats(savedSchedule.assignmentStats);
      console.log("已加载保存的排课结果");
    } else {
      // 如果没有已保存的排课结果或数据格式不兼容，执行新的排课
      performScheduling();
    }
  }, [students, teachers, savedSchedule]);

  // 统计老师可安排总课时（所有老师一周所有可用时间段，单周）
  const slots = generateDaySlots();
  const teacherTotalLessons = teachers.length * slots.length * 5; // 5天（单周）

  // 修复：使用排课算法返回的准确统计数据
  const studentTotalLessons =
    assignmentStats?.totalExpectedLessons ||
    calculateTotalStudentLessons(students);

  // 使用统一的函数计算老师课时统计
  const { teacherLessonCount, totalLessons } = calculateTeacherLessonStats(schedule);

  // 计算平均课时（单周）
  const teacherCount = teachers.length;
  const avgLessons = calculateAverageLessons(totalLessons, teacherCount);

  // 显示统计信息以便调试
  console.log("课时统计信息:");
  console.log("  - 学生期望总课时:", studentTotalLessons);
  console.log("  - 老师已分配课时:", totalLessons);
  console.log("  - 课时差:", studentTotalLessons - totalLessons);

  // y轴：周一到周五
  const days = ["1", "2", "3", "4", "5"];
  const dayLabels = ["周一", "周二", "周三", "周四", "周五"];

  // 构造表格列：每个时间段一列
  const columns = [
    {
      title: "老师",
      dataIndex: "teacher",
      key: "teacher",
      fixed: "left",
      width: 120,
    },
    {
      title: "星期",
      dataIndex: "day",
      key: "day",
      fixed: "left",
      width: 80,
    },
    ...slots.map((slot, idx) => ({
      title: (() => {
        const start = minutesToStr(slot.start);
        const end = minutesToStr(slot.end);
        let label = `${start} - ${end}`;
        return label;
      })(),
      dataIndex: `slot${idx}`,
      key: `slot${idx}`,
      align: "center",
      width: 120,
    })),
  ];

  // 构造表格数据：每个老师*每个星期为一行
  const tableData = [];

  teachers.forEach((teacher) => {
    days.forEach((day, dayIdx) => {
      const row = {
        key: `${teacher.id}_${day}`,
        teacher: teacher.name,
        day: dayLabels[dayIdx],
      };

      // 填充每个时间段的课程信息
      slots.forEach((slot, slotIdx) => {
        row[`slot${slotIdx}`] = "";

        // 找到该老师该天该时间段的课程（添加存在性检查）
        const course = schedule && Array.isArray(schedule) ? schedule.find(
          (s) =>
            s.teacherId === teacher.id &&
            s.day === Number(day) &&
            s.start === slot.start &&
            s.end === slot.end
        ) : null;
        if (course) {
          const student = students.find((s) => s.id === course.studentId);
          if (student) {
            row[`slot${slotIdx}`] = student.name;
          }
        }
      });

      tableData.push(row);
    });
  });

  return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Title level={2}>课程排期</Title>
          <div style={{ display: "flex", gap: "12px" }}>
            <Button 
              onClick={handleExportExcel} 
              type="primary"
              style={{ backgroundColor: "#52c41a" }}
            >
              导出Excel
            </Button>
            <Button type="primary" onClick={handleReschedule} style={{ backgroundColor: "#1890ff" }}>
              重新排课
            </Button>
          </div>
        </div>
        <Tabs defaultActiveKey="1" style={{ marginBottom: 24 }}>
        {/* 排课统计信息标签页 */}
        <TabPane tab="排课统计信息" key="1">
          <Row gutter={16} style={{ marginBottom: 24 }}>
            {teachers.map((t) => (
              <Col key={t.id} span={4}>
                <Card
                  variant="outlined"
                  style={{
                    textAlign: "center",
                    marginBottom: 8,
                    background: "#fffbe6",
                    borderColor: "#faad14",
                  }}
                  bodyStyle={{ padding: 12 }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      color: "#888",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <UserOutlined style={{ color: "#faad14" }} />
                    {t.name} 课时统计
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: "bold",
                      color: "#faad14",
                      marginTop: 8,
                    }}
                  >
                    {teacherLessonCount[t.id] || 0} 课时
                  </div>
                </Card>
              </Col>
            ))}
            <Col span={4}>
              <Card
                variant="outlined"
                style={{
                  textAlign: "center",
                  marginBottom: 8,
                  background: "#e6fffb",
                  borderColor: "#13c2c2",
                }}
                bodyStyle={{ padding: 12 }}
              >
                <div
                  style={{
                    fontSize: 16,
                    color: "#888",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <StarOutlined style={{ color: "#13c2c2" }} />
                  平均课时
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: "bold",
                    color: "#13c2c2",
                    marginTop: 4,
                  }}
                >
                  {avgLessons}
                </div>
              </Card>
            </Col>
          </Row>
          <Row gutter={32}>
            <Col span={12}>
              <Card
                variant="outlined"
                style={{
                  textAlign: "center",
                  background: "#f0f5ff",
                  borderColor: "#2f54eb",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    color: "#888",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <TeamOutlined style={{ color: "#2f54eb" }} />
                  老师可安排总课时
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: "bold",
                    color: "#2f54eb",
                    marginTop: 4,
                  }}
                >
                  {teacherTotalLessons} 课时
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card
                variant="outlined"
                style={{
                  textAlign: "center",
                  background: "#f6ffed",
                  borderColor: "#52c41a",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    color: "#888",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <UserOutlined style={{ color: "#52c41a" }} />
                  学生需求总课时
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: "bold",
                    color: "#52c41a",
                    marginTop: 4,
                  }}
                >
                  {studentTotalLessons} 课时
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 课表标签页 */}
        <TabPane tab="课表" key="2">
          {teachers.length === 0 ? (
            <div style={{ color: "#888", marginTop: 32, fontSize: 18 }}>
              当前没有老师，无法排课，请先添加老师。
            </div>
          ) : (
            <Table
              columns={columns}
              bordered
              dataSource={tableData}
              pagination={false}
              scroll={{ x: true }}
              rowKey="key"
            />
          )}
        </TabPane>

        {/* 原始课表标签页 */}
        <TabPane tab="原始课表" key="3">
          {teachers.length === 0 ? (
            <div style={{ color: "#888", marginTop: 32, fontSize: 18 }}>
              当前没有老师，无法排课，请先添加老师。
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {students.map((student) => {
                // 该学生所有课程（添加存在性检查）
                const lessons = schedule && Array.isArray(schedule) ? schedule.filter(
                  (item) => item.studentId === student.id
                ) : [];
                return (
                  <Col span={8} key={student.id}>
                    <Card
                      size="small"
                      style={{
                        marginBottom: 8,
                        background: "#f0f5ff",
                        borderColor: "#adc6ff",
                      }}
                      bodyStyle={{ padding: 12 }}
                      title={
                        <div>
                          <UserOutlined style={{ marginRight: 8 }} />
                          {student.name}
                        </div>
                      }
                    >
                      {lessons.length === 0 ? (
                        <div style={{ color: "#bbb" }}>无排课</div>
                      ) : (
                        lessons.map((item, idx) => {
                          const teacher = teachers.find(
                            (t) => t.id === item.teacherId
                          );
                          return (
                            <div key={idx} style={{ marginBottom: 8 }}>
                              <span style={{ color: "#888" }}>老师：</span>
                              <span>
                                {teacher ? teacher.name : "未知老师"}
                              </span>
                              <span
                                style={{ marginLeft: 8, color: "#888" }}
                              >
                                时间：
                              </span>
                              <span>
                                星期{item.day}{" "}
                                {item.period === "morning"
                                  ? "上午"
                                  : "下午"}{" "}
                                {minutesToStr(item.start)} - {" "}
                                {minutesToStr(item.end)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </TabPane>
      </Tabs>
    </div>
  );
}

export default Schedule;
