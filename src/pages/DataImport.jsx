import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Typography, Button, Input, Form, message, Select, Tabs, Card, Divider } from "antd";
import { UploadOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { addStudent } from '../store/studentsSlice';
import { addTeacher } from '../store/teachersSlice';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

function DataImport() {
  const [importForm] = Form.useForm();
  const [exportForm] = Form.useForm();
  const [importType, setImportType] = useState('students');
  const [exportType, setExportType] = useState('students');
  const [exportData, setExportData] = useState('');
  const dispatch = useDispatch();
  const students = useSelector(state => state.students.list);
  const teachers = useSelector(state => state.teachers.list);

  const handleImport = async () => {
    try {
      const values = await importForm.validateFields();
      const jsonData = values.jsonData;
      
      let parsedData;
      try {
        parsedData = JSON.parse(jsonData);
      } catch (error) {
        message.error('JSON格式不正确，请检查输入内容');
        return;
      }

      if (!Array.isArray(parsedData)) {
        message.error('导入的数据必须是数组格式');
        return;
      }

      if (parsedData.length === 0) {
        message.warning('没有数据需要导入');
        return;
      }

      // 保存数据到Redux
      if (importType === 'students') {
        // 验证学生数据格式
        const isValid = parsedData.every(student => 
          student.name && student.gender && student.age !== undefined && 
          student.dailyClasses !== undefined && student.classDuration !== undefined
        );

        if (!isValid) {
          message.error('学生数据格式不正确，必须包含name、gender、age、dailyClasses和classDuration字段');
          return;
        }

        // 如果导入的数据没有id，自动添加id
        parsedData.forEach((student, index) => {
          dispatch(addStudent({
            ...student,
            id: student.id || Date.now() + index
          }));
        });
        message.success(`成功导入 ${parsedData.length} 名学生数据`);
      } else if (importType === 'teachers') {
        // 验证教师数据格式
        const isValid = parsedData.every(teacher => teacher.name && teacher.gender);

        if (!isValid) {
          message.error('教师数据格式不正确，必须包含name和gender字段');
          return;
        }

        // 如果导入的数据没有id，自动添加id
        parsedData.forEach((teacher, index) => {
          dispatch(addTeacher({
            ...teacher,
            id: teacher.id || Date.now() + index
          }));
        });
        message.success(`成功导入 ${parsedData.length} 名教师数据`);
      }

      // 清空输入框
      importForm.resetFields(['jsonData']);
    } catch (error) {
      message.error('导入失败，请重试');
    }
  };

  const getSampleData = () => {
    if (importType === 'students') {
      return JSON.stringify([
        {
          "id": 1,
          "name": "张三",
          "gender": "male",
          "age": 8,
          "dailyClasses": 1,
          "classDuration": 60
        },
        {
          "id": 2,
          "name": "李四",
          "gender": "female",
          "age": 7,
          "dailyClasses": 2,
          "classDuration": 90
        }
      ], null, 2);
    } else {
      return JSON.stringify([
        {
          "id": 1,
          "name": "王老师",
          "gender": "female"
        },
        {
          "id": 2,
          "name": "李老师",
          "gender": "male"
        }
      ], null, 2);
    }
  };

  const handleLoadSample = () => {
    importForm.setFieldsValue({
      jsonData: getSampleData()
    });
  };

  const handleImportTypeChange = (value) => {
    setImportType(value);
    importForm.resetFields(['jsonData']);
  };

  const handleExportTypeChange = (value) => {
    setExportType(value);
    setExportData('');
  };

  const handleExport = async () => {
    try {
      let dataToExport = [];
      
      if (exportType === 'students') {
        // 导出学生数据，包含id字段
        dataToExport = students.map(student => ({
          id: student.id,
          name: student.name,
          gender: student.gender,
          age: student.age,
          dailyClasses: student.dailyClasses,
          classDuration: student.classDuration
        }));
      } else if (exportType === 'teachers') {
        // 导出教师数据，包含id字段
        dataToExport = teachers.map(teacher => ({
          id: teacher.id,
          name: teacher.name,
          gender: teacher.gender
        }));
      }

      if (dataToExport.length === 0) {
        message.warning(`暂无${exportType === 'students' ? '学生' : '教师'}数据可导出`);
        setExportData('');
        return;
      }

      // 将数据转换为格式化的JSON字符串
      const jsonStr = JSON.stringify(dataToExport, null, 2);
      
      // 复制到剪贴板
      await navigator.clipboard.writeText(jsonStr);
      
      // 更新导出数据显示
      setExportData(jsonStr);
      
      message.success(`成功导出 ${dataToExport.length} 条${exportType === 'students' ? '学生' : '教师'}数据到剪贴板`);
    } catch (error) {
      message.error('导出失败，请重试');
      console.error('Export error:', error);
    }
  };

  const handleClearImport = () => {
    importForm.resetFields(['jsonData']);
  };

  const handleCopyExport = async () => {
    if (exportData) {
      try {
        await navigator.clipboard.writeText(exportData);
        message.success('数据已复制到剪贴板');
      } catch (error) {
        message.error('复制失败，请手动复制');
      }
    }
  };

  const renderImportTab = () => (
    <Form
      form={importForm}
      layout="vertical"
      style={{ maxWidth: 800 }}
    >
      <Form.Item
        name="importType"
        label="导入类型"
        rules={[{ required: true }]}
        initialValue="students"
      >
        <Select onChange={handleImportTypeChange}>
          <Option value="students">学生数据</Option>
          <Option value="teachers">教师数据</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="jsonData"
        label={`${importType === 'students' ? '学生' : '教师'}数据(JSON格式)`}
        rules={[{ required: true, message: '请输入JSON格式的数据' }]}
      >
        <TextArea 
          rows={12} 
          placeholder={`请粘贴${importType === 'students' ? '学生' : '教师'}数据的JSON格式内容`} 
          style={{ fontFamily: 'monospace', fontSize: '14px' }}
        />
      </Form.Item>

      <Form.Item>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button 
            type="primary" 
            icon={<UploadOutlined />}
            onClick={handleImport}
          >
            导入数据
          </Button>
          <Button onClick={handleLoadSample}>
            加载示例数据
          </Button>
          <Button onClick={handleClearImport} danger>
            清空输入
          </Button>
        </div>
      </Form.Item>

      <Card size="small" title="数据格式说明" style={{ marginTop: 20 }}>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {importType === 'students' ? (
            <>
              <li>学生数据必须包含：name（姓名）、gender（性别）、age（年龄）、dailyClasses（每天上课次数）、classDuration（上课时长）</li>
              <li>gender取值为：male（男）或female（女）</li>
              <li>dailyClasses取值为：1或2</li>
              <li>classDuration取值为：30, 60, 90, 120等分钟数</li>
            </>
          ) : (
            <>
              <li>教师数据必须包含：name（姓名）、gender（性别）</li>
              <li>gender取值为：male（男）或female（女）</li>
            </>
          )}
          <li>数据必须是JSON数组格式</li>
        </ul>
      </Card>
    </Form>
  );

  const renderExportTab = () => (
    <div style={{ maxWidth: 800 }}>
      <Form.Item 
        label="导出类型" 
        style={{ marginBottom: 24 }}
      >
        <Select 
          value={exportType} 
          onChange={handleExportTypeChange}
          style={{ width: 200 }}
        >
          <Option value="students">学生数据</Option>
          <Option value="teachers">教师数据</Option>
        </Select>
      </Form.Item>

      <Button 
        type="primary" 
        icon={<DownloadOutlined />}
        onClick={handleExport}
        style={{ marginBottom: 16 }}
      >
        生成导出数据
      </Button>

      {exportData && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Typography.Text strong>
              {exportType === 'students' ? '学生' : '教师'}数据预览
            </Typography.Text>
            <Button size="small" onClick={handleCopyExport} icon={<FileTextOutlined />}>
              复制到剪贴板
            </Button>
          </div>
          
          <Card size="small" bordered={false}>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '16px',
              borderRadius: '4px',
              overflowX: 'auto',
              margin: 0,
              fontFamily: 'monospace',
              fontSize: '13px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {exportData}
            </pre>
          </Card>
        </>
      )}

      <Divider style={{ margin: '20px 0' }} />
      
      <Card size="small" title="导出说明" style={{ marginTop: 8 }}>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>点击"生成导出数据"按钮生成当前系统中的数据</li>
          <li>数据将自动复制到剪贴板，并在下方预览区域显示</li>
          <li>您可以点击"复制到剪贴板"按钮再次复制数据</li>
          <li>导出的数据格式与导入所需格式一致，确保兼容性</li>
        </ul>
      </Card>
    </div>
  );

  return (
    <div>
      <Title level={2}>数据管理</Title>
      
      <Tabs 
        defaultActiveKey="import" 
        items={[
          {
            key: 'import',
            label: '数据导入',
            children: renderImportTab(),
          },
          {
            key: 'export',
            label: '数据导出',
            children: renderExportTab(),
          },
        ]}
        style={{ maxWidth: 800 }}
      />
    </div>
  );
}

export default DataImport;