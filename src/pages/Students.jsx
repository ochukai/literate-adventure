import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Typography, Table, Button, Modal, Form, Input, Space, Popconfirm, Radio, InputNumber, Select } from 'antd';
import { addStudent, updateStudent, deleteStudent } from '../store/studentsSlice';

const { Title } = Typography;

function Students() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  
  const dispatch = useDispatch();
  const students = useSelector(state => state.students.list);

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender) => gender === 'male' ? '男' : '女',
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: '每天上课次数',
      dataIndex: 'dailyClasses',
      key: 'dailyClasses',
    },
    {
      title: '上课时长(分钟)',
      dataIndex: 'classDuration',
      key: 'classDuration',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该学生吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    dispatch(deleteStudent(id));
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (editingId) {
        dispatch(updateStudent({ ...values, id: editingId }));
      } else {
        dispatch(addStudent(values));
      }
      setIsModalVisible(false);
    });
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Title level={2}>学生管理</Title>
        <Button type="primary" onClick={handleAdd}>
          添加学生
        </Button>
      </Space>

      <Table 
        columns={columns} 
        dataSource={students}
        rowKey="id"
        pagination={{
          total: students.length,
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条记录`,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
      />

      <Modal
        title={editingId ? "编辑学生" : "添加学生"}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        maskClosable={false}
        width={500}
      >
        <Form 
          form={form} 
          layout="horizontal"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input style={{ width: 200 }}/>
          </Form.Item>
          <Form.Item
            name="gender"
            label="性别"
            rules={[{ required: true, message: '请选择性别' }]}
          >
            <Radio.Group>
              <Radio value="male">男</Radio>
              <Radio value="female">女</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="age"
            label="年龄"
            rules={[{ required: true, message: '请输入年龄' }]}
          >
            <InputNumber 
              min={3} 
              max={30} 
              style={{ width: 150 }}
              placeholder="请输入年龄"
            />
          </Form.Item>
          <Form.Item
            name="dailyClasses"
            label="每天上课次数"
            rules={[{ required: true, message: '请选择每天上课次数' }]}
          >
            <Radio.Group>
              <Radio value={1}>1</Radio>
              <Radio value={2}>2</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="classDuration"
            label="上课时长"
            rules={[{ required: true, message: '请选择上课时长' }]}
          >
            <Select
              style={{ width: 200 }}
              placeholder="请选择上课时长"
              options={[
                { value: 30, label: '30分钟' },
                { value: 60, label: '60分钟' },
                { value: 90, label: '90分钟' },
                { value: 120, label: '120分钟' },
                { value: 150, label: '150分钟' },
                { value: 180, label: '180分钟' },
                { value: 210, label: '210分钟' },
                { value: 240, label: '240分钟' },
                { value: 270, label: '270分钟' },
                { value: 300, label: '300分钟' },
                { value: 330, label: '330分钟' },
                { value: 360, label: '360分钟' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Students;