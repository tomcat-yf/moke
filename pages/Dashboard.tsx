import React from 'react';
import { Project } from '../types';
import { FolderOpen, Clock, MoreVertical } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ projects, onSelectProject }) => {
  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
        <FolderOpen className="mr-3 text-blue-500" /> 我的项目
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((p) => (
          <div 
            key={p.id} 
            onClick={() => onSelectProject(p.id)}
            className="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-blue-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-blue-900/20"
          >
            <div className="relative h-40 overflow-hidden">
              <img src={p.cover} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute top-2 right-2 bg-gray-900/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-green-400 border border-green-500/30">
                {p.status}
              </div>
            </div>
            
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-white leading-tight">{p.name}</h3>
                <button className="text-gray-500 hover:text-white">
                  <MoreVertical size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-4">{p.type}</p>
              
              <div className="flex items-center text-[10px] text-gray-500 border-t border-gray-700 pt-3 mt-2">
                <Clock size={12} className="mr-1" />
                <span>2小时前更新</span>
                <span className="mx-2">•</span>
                <span>{p.scenes.length} 个场景</span>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Project Card */}
        <div className="bg-gray-800/50 border border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center p-6 text-gray-500 hover:text-white hover:border-blue-500 hover:bg-gray-800 transition-all cursor-pointer min-h-[280px]">
          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
            <span className="text-2xl">+</span>
          </div>
          <span className="font-medium">创建新项目</span>
        </div>
      </div>
    </div>
  );
};