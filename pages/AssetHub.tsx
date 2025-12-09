
import React from 'react';
import { Project, PageType } from '../types';
import { Package, Users, Image as ImageIcon, Box } from 'lucide-react';

interface AssetHubProps {
  project: Project;
  onNavigate: (page: PageType) => void;
  onCreateAsset: () => void;
}

export const AssetHub: React.FC<AssetHubProps> = ({ project, onNavigate, onCreateAsset }) => {
  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Package className="mr-3 text-blue-500" /> 资产中心
          </h2>
          <p className="text-gray-400 text-sm mt-1 ml-9">管理 <span className="text-gray-200 font-bold">{project.name}</span> 的角色、场景和道具</p>
        </div>
        <button 
          onClick={onCreateAsset}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/50 flex items-center"
        >
          <span className="text-lg mr-2">+</span> 创建资产
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
        {/* Main Assets Card */}
        <div 
          onClick={() => onNavigate('assets_detail')}
          className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:border-blue-500 hover:shadow-xl hover:shadow-blue-900/10 transition-all group"
        >
          <div className="h-40 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 bg-gray-900 opacity-20 group-hover:opacity-0 transition-opacity"></div>
             <div className="flex space-x-2">
                 <Users className="text-gray-500 group-hover:text-blue-400 transition-colors transform group-hover:scale-110 duration-300" size={40} />
                 <ImageIcon className="text-gray-500 group-hover:text-green-400 transition-colors transform group-hover:scale-110 duration-300 delay-75" size={40} />
             </div>
          </div>
          <div className="p-5 border-t border-gray-700 bg-gray-850">
            <h3 className="text-lg font-bold text-white mb-1">核心资产库</h3>
            <p className="text-sm text-gray-400 mb-4">角色、环境与道具</p>
            <div className="flex space-x-4 text-xs font-medium text-gray-500">
               <span className="flex items-center"><Users size={12} className="mr-1"/> {project.assets.characters.length} 角色</span>
               <span className="flex items-center"><ImageIcon size={12} className="mr-1"/> {project.assets.scenes.length} 场景</span>
               <span className="flex items-center"><Box size={12} className="mr-1"/> {project.assets.props.length} 道具</span>
            </div>
          </div>
        </div>

        {/* LoRA / Styles Card (Mock) */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:border-purple-500 hover:shadow-xl hover:shadow-purple-900/10 transition-all opacity-70 hover:opacity-100">
           <div className="h-40 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
             <span className="text-4xl font-mono text-purple-500/50 font-bold">LoRA</span>
           </div>
           <div className="p-5 border-t border-gray-700 bg-gray-850">
            <h3 className="text-lg font-bold text-white mb-1">风格模型</h3>
            <p className="text-sm text-gray-400">自定义 LoRA 与微调模型</p>
           </div>
        </div>
      </div>
    </div>
  );
};
