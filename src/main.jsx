import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ConfigProvider, App as AntdApp } from 'antd';

createRoot(document.getElementById('root')).render(
  <ConfigProvider>
    <AntdApp>
      <App />
    </AntdApp>
  </ConfigProvider>
);
