import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Typography, Table, Button, Form, Input, Space, Popconfirm, Radio, Modal } from 'antd';
import { addTeacher, updateTeacher, deleteTeacher } from '../store/teachersSlice';

const { Title } = Typography;

function Teachers() {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const dispatch = useDispatch();
  const teachers = useSelector(state => state.teachers.list);

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
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button onClick={() => showModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该教师吗？"
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

  const showModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.setFieldsValue({ gender: 'female' });
    }
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        dispatch(updateTeacher({ ...values, id: editingId }));
      } else {
        dispatch(addTeacher(values));
      }
      setModalVisible(false);
      form.resetFields();
    } catch {
      // 表单验证失败
    }
  };

  const handleDelete = (id) => {
    dispatch(deleteTeacher(id));
  };

  return (
    <div>
      <Space style={{ marginBottom: 24, justifyContent: 'space-between', width: '100%' }}>
        <Title level={2}>教师管理</Title>
        <Button type="primary" onClick={() => showModal()}>
          添加教师
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={teachers}
        rowKey="id"
        pagination={{
          total: teachers.length,
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条记录`,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
      />

      <Modal
        title={editingId ? "编辑教师" : "添加教师"}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        maskClosable={false}
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
            <Input style={{ width: 200 }} />
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
        </Form>
      </Modal>
    </div>
  );
}

export default Teachers;