
import React from 'react';
import { Role, PageType } from '../types';
import { NAV_CONFIG } from '../constants';
import * as Icons from 'lucide-react';

interface SidebarProps {
  role: Role;
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  onRoleChange: (role: Role) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, currentPage, onNavigate, onRoleChange }) => {
  const menuGroups = NAV_CONFIG[role];

  // Helper to render Lucide icon dynamically
  const renderIcon = (name: string) => {
    const IconComponent = (Icons as any)[name];
    return IconComponent ? <IconComponent size={18} className="mr-3" /> : null;
  };

  return (
    <nav className="w-60 bg-gray-800 flex-shrink-0 border-r border-gray-700 flex flex-col h-full z-30 shadow-xl">
      <div className="p-6 mb-2 flex flex-col items-center">
        <h1 className="text-xl font-bold tracking-wider flex items-center justify-center text-white">
          <span className="text-blue-500 mr-2">博采</span> AI
        </h1>
        <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded mt-2">V2.43 专业版</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-6 custom-scrollbar">
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            <div className="px-3 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">{group.label}</div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key as PageType)}
                  className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    currentPage === item.key
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {renderIcon(item.icon)}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-700 bg-gray-850">
        <div className="text-[10px] text-gray-500 mb-3 uppercase font-bold tracking-wide">当前角色</div>
        <div className="flex bg-gray-700 rounded-lg p-1 border border-gray-600">
          <button
            onClick={() => onRoleChange('production')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              role === 'production' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            制作
          </button>
          <button
            onClick={() => onRoleChange('director')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              role === 'director' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            导演
          </button>
        </div>
      </div>
    </nav>
  );
};
