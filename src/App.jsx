import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { HomeOutlined, UserOutlined, TeamOutlined, CalendarOutlined, UploadOutlined } from '@ant-design/icons';
import { Layout, Menu, Spin } from 'antd';
import './App.css';

// 使用React.lazy进行组件懒加载
const Home = lazy(() => import('./pages/Home'));
const Students = lazy(() => import('./pages/Students'));
const Teachers = lazy(() => import('./pages/Teachers'));
const Schedule = lazy(() => import('./pages/Schedule'));
const DataImport = lazy(() => import('./pages/DataImport'));

const { Header, Content, Sider } = Layout;

function AppLayout() {
  const location = useLocation();
  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">首页</Link> },
    { key: '/students', icon: <UserOutlined />, label: <Link to="/students">学生管理</Link> },
    { key: '/teachers', icon: <TeamOutlined />, label: <Link to="/teachers">教师管理</Link> },
    { key: '/schedule', icon: <CalendarOutlined />, label: <Link to="/schedule">课程排期</Link> },
    { key: '/data-import', icon: <UploadOutlined />, label: <Link to="/data-import">数据导入</Link> },
  ];

  const routeMap = {
    '/': <Home />,
    '/students': <Students />,
    '/teachers': <Teachers />,
    '/schedule': <Schedule />,
    '/data-import': <DataImport />,
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <h1 style={{ color: '#fff', margin: 0 }}>系统</h1>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <Layout style={{ padding: '24px' }}>
          <Content style={{
            padding: 24,
            margin: 0,
            background: '#fff',
            borderRadius: '4px'
          }}>
            <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px 0' }}><Spin size="large" tip="加载中..." /></div>}>
              <Routes>
                {Object.entries(routeMap).map(([path, element]) => (
                  <Route key={path} path={path} element={element} />
                ))}
              </Routes>
            </Suspense>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
