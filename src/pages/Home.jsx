import React from 'react';
import { Typography, Card, Row, Col } from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

function Home() {
  const studentCount = useSelector(state => state.students.list.length);
  const teacherCount = useSelector(state => state.teachers.list.length);
  const navigate = useNavigate();

  return (
    <div>
      <Row gutter={32} style={{ marginTop: 32 }}>
        <Col span={12}>
          <Card
            variant="outlined"
            style={{ textAlign: 'center', cursor: 'pointer' }}
            onClick={() => navigate('/students')}
            hoverable
          >
            <UserOutlined style={{ fontSize: 32, color: '#1677ff', marginBottom: 8 }} />
            <Title level={4}>学生数量</Title>
            <div style={{ fontSize: 40, fontWeight: 'bold', color: '#1677ff' }}>{studentCount}</div>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            variant="outlined"
            style={{ textAlign: 'center', cursor: 'pointer' }}
            onClick={() => navigate('/teachers')}
            hoverable
          >
            <TeamOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
            <Title level={4}>教师数量</Title>
            <div style={{ fontSize: 40, fontWeight: 'bold', color: '#52c41a' }}>{teacherCount}</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Home;