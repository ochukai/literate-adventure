import { Layout, Menu } from 'antd';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HomeOutlined, UserOutlined, TeamOutlined, CalendarOutlined, UploadOutlined } from '@ant-design/icons';
import './App.css';

// 导入页面组件
import Home from './pages/Home';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Schedule from './pages/Schedule';
import DataImport from './pages/DataImport';

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
            <Routes>
              {Object.entries(routeMap).map(([path, element]) => (
                <Route key={path} path={path} element={element} />
              ))}
            </Routes>
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
