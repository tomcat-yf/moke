
import React, { useState } from 'react';
import { Project, Asset } from '../../types';
import { Search, Image as ImageIcon, Box, User, Upload, X, Grid } from 'lucide-react';

interface LibrarySidebarProps {
  project: Project;
}

type Category = 'all' | 'character' | 'scene' | 'prop' | 'upload';

export const LibrarySidebar: React.FC<LibrarySidebarProps> = ({ project }) => {
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const allAssets = [
    ...project.assets.characters,
    ...project.assets.scenes,
    ...project.assets.props
  ];

  const getAssetsByCategory = (cat: Category) => {
      switch(cat) {
          case 'character': return project.assets.characters;
          case 'scene': return project.assets.scenes;
          case 'prop': return project.assets.props;
          default: return allAssets;
      }
  };

  const currentAssets = activeCategory ? getAssetsByCategory(activeCategory) : [];

  const NavItem = ({ id, icon: Icon, label }: { id: Category, icon: any, label: string }) => (
      <button 
        onClick={() => setActiveCategory(activeCategory === id ? null : id)}
        className={`w-full h-14 flex flex-col items-center justify-center gap-1 transition-all relative group ${activeCategory === id ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
      >
          <div className={`p-2 rounded-lg transition-all ${activeCategory === id ? 'bg-indigo-500/20' : 'group-hover:bg-gray-800'}`}>
            <Icon size={20} />
          </div>
          <span className="text-[9px] font-medium">{label}</span>
          {activeCategory === id && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-500 rounded-r-full"></div>}
      </button>
  );

  return (
    <div className="flex h-full relative group">
      {/* Icon Strip */}
      <div className="w-16 flex flex-col h-full bg-gray-900 items-center py-4 gap-2 z-50 relative">
          <NavItem id="all" icon={Grid} label="全部" />
          <NavItem id="character" icon={User} label="角色" />
          <NavItem id="scene" icon={ImageIcon} label="场景" />
          <NavItem id="prop" icon={Box} label="道具" />
          <div className="h-px w-8 bg-gray-800 my-2"></div>
          <NavItem id="upload" icon={Upload} label="上传" />
      </div>

      {/* Slide-out Drawer */}
      {activeCategory && (
          <div className="absolute left-16 top-0 bottom-0 w-64 bg-gray-850 border-r border-gray-700 shadow-2xl flex flex-col z-40 animate-in slide-in-from-left duration-200">
              <div className="h-12 px-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 shrink-0">
                  <h3 className="font-bold text-gray-200 text-sm capitalize">
                      {activeCategory === 'all' ? '全部资源' : 
                       activeCategory === 'character' ? '角色库' :
                       activeCategory === 'scene' ? '场景库' :
                       activeCategory === 'prop' ? '道具库' : '上传资源'}
                  </h3>
                  <button onClick={() => setActiveCategory(null)} className="text-gray-500 hover:text-white"><X size={16}/></button>
              </div>
              
              <div className="p-3 border-b border-gray-700 bg-gray-850 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="搜索..." 
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-1.5 pl-8 pr-3 text-xs text-gray-300 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-gray-850">
                  {currentAssets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                          <Box size={32} className="mb-2 opacity-20"/>
                          <div className="text-xs">暂无内容</div>
                      </div>
                  ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {currentAssets.map((asset) => (
                            <div key={asset.id} className="aspect-square bg-gray-800 rounded-lg border border-gray-700 overflow-hidden relative group cursor-grab hover:border-indigo-500 transition-colors">
                                <img src={asset.img} alt={asset.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 pt-4">
                                    <span className="text-[10px] text-gray-200 font-medium truncate block">{asset.name}</span>
                                </div>
                            </div>
                        ))}
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
