import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-400">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Header />
        <main className="flex-1 p-6 mt-16 overflow-auto bg-gray-50 dark:bg-dark-400">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;