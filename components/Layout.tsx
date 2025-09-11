import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { LucideIcon } from 'lucide-react';

interface SidebarLink {
    href: string;
    label: string;
    icon: LucideIcon;
}

interface LayoutProps {
  links: SidebarLink[];
}

const Layout: React.FC<LayoutProps> = ({ links }) => {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <Sidebar links={links} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;