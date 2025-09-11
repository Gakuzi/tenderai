import React from 'react';
import { NavLink } from 'react-router-dom';
import { BotMessageSquare, LucideIcon } from 'lucide-react';
import { useLocalization } from '../hooks/useLocalization';

interface SidebarLink {
    href: string;
    label: string;
    icon: LucideIcon;
}

interface SidebarProps {
    links: SidebarLink[];
}

const Sidebar: React.FC<SidebarProps> = ({ links }) => {
  const { t } = useLocalization();

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
        <BotMessageSquare className="h-8 w-8 text-indigo-500" />
        <span className="ml-3 text-xl font-semibold text-gray-800 dark:text-white">TenderAI</span>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2">
        {links.map(link => (
          <NavLink
            key={link.href}
            to={link.href}
            className={({ isActive }) =>
              `flex items-center px-4 py-2 text-sm font-medium rounded-md group ${
                isActive
                  ? 'bg-indigo-500 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
            }
          >
            <link.icon className="h-5 w-5 mr-3" />
            {t(link.label)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
