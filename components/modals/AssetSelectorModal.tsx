

import React, { useState } from 'react';
import { Project, Asset, SubAsset } from '../../types';
import { X, Check, User, Image as ImageIcon, Box, ArrowLeft, Layers, CornerDownRight, FolderOpen } from 'lucide-react';

interface AssetSelectorModalProps {
  isOpen: boolean;
  type: 'char' | 'scene' | 'prop';
  project: Project;
  onClose: () => void;
  onSelect?: (asset: Asset) => void;
  multiSelect?: boolean;
  onMultiSelect?: (assets: Asset[]) => void;
}

export const AssetSelectorModal: React.FC<AssetSelectorModalProps> = ({ 
  isOpen, 
  type: initialType, 
  project, 
  onClose, 
  onSelect,
  multiSelect = false,
  onMultiSelect
}) => {
  const [activeTab, setActiveTab] = useState<'char' | 'scene' | 'prop'>(initialType);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  
  // Drill-down state
  const [viewLevel, setViewLevel] = useState<'list' | 'detail'>('list');
  const [currentParentAsset, setCurrentParentAsset] = useState<Asset | null>(null);

  if (!isOpen) return null;

  const getAssets = (t: 'char' | 'scene' | 'prop') => {
      const key = t === 'char' ? 'characters' : t === 'scene' ? 'scenes' : 'props';
      return project.assets[key];
  };

  const assets = getAssets(activeTab);
  
  const typeLabels = {
      char: '角色',
      scene: '场景',
      prop: '道具'
  };

  const tabs = [
      { id: 'char', label: '角色', icon: User },
      { id: 'scene', label: '场景', icon: ImageIcon },
      { id: 'prop', label: '道具', icon: Box },
  ];

  // Helper: Check if an asset (or pseudo-asset from sub-asset) is selected
  const isSelected = (id: string) => selectedAssets.some(a => a.id === id);

  // Helper: Count how many items related to this parent are selected
  const getSelectedCountForParent = (parent: Asset) => {
      let count = 0;
      if (isSelected(parent.id)) count++;
      if (parent.subAssets) {
          parent.subAssets.forEach(sub => {
              if (isSelected(sub.id)) count++;
          });
      }
      return count;
  };

  const handleParentClick = (asset: Asset) => {
      // Always drill down if it has sub-assets, or if we are in multi-select mode?
      // Logic:
      // If asset has sub-assets: Open detail view to let user choose main or sub.
      // If asset has NO sub-assets:
      //    - If multi-select: Select/Deselect immediately (or open detail? maybe simpler to just select)
      //    - If single-select: Select and close.
      
      const hasSub = asset.subAssets && asset.subAssets.length > 0;

      if (hasSub || multiSelect) {
          setCurrentParentAsset(asset);
          setViewLevel('detail');
      } else {
          onSelect?.(asset);
      }
  };

  const handleBack = () => {
      setViewLevel('list');
      setCurrentParentAsset(null);
  };

  const toggleSelection = (assetToToggle: Asset) => {
      if (isSelected(assetToToggle.id)) {
          setSelectedAssets(prev => prev.filter(a => a.id !== assetToToggle.id));
      } else {
          setSelectedAssets(prev => [...prev, assetToToggle]);
      }
  };

  const handleSubAssetClick = (sub: SubAsset | null) => {
      if (!currentParentAsset) return;

      let assetToToggle: Asset;

      if (!sub) {
          // Selecting the Main Parent Image
          assetToToggle = currentParentAsset;
      } else {
          // Selecting a Sub-Asset
          // Create a transient Asset object for the sub-asset
          assetToToggle = {
              id: sub.id,
              name: `${currentParentAsset.name} - ${sub.label}`,
              img: sub.img,
              type: currentParentAsset.type,
              description: sub.description || currentParentAsset.description, // Inherit description if missing
              subAssets: [] 
          };
      }

      if (multiSelect) {
          toggleSelection(assetToToggle);
      } else {
          onSelect?.(assetToToggle);
          onClose();
      }
  };

  const handleConfirm = () => {
      if (onMultiSelect) {
          onMultiSelect(selectedAssets);
      }
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-850 shrink-0">
           <div className="flex items-center space-x-4">
               {viewLevel === 'detail' && (
                   <button onClick={handleBack} className="mr-2 text-gray-400 hover:text-white transition-colors">
                       <ArrowLeft size={20} />
                   </button>
               )}
               <div>
                   <h3 className="text-lg font-bold text-white capitalize flex items-center">
                       {viewLevel === 'detail' && currentParentAsset 
                          ? <><span className="opacity-50 mr-2">{typeLabels[activeTab]} /</span> {currentParentAsset.name}</>
                          : multiSelect ? '选择引用资产' : `选择${typeLabels[initialType]}`}
                   </h3>
                   {viewLevel === 'detail' && (
                       <p className="text-xs text-gray-500 mt-0.5">选择该资产下的具体视觉参考（主图或细节图）</p>
                   )}
               </div>
               
               {multiSelect && (
                   <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                       已选: {selectedAssets.length}
                   </span>
               )}
           </div>
           <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        
        {/* Tabs (Only in List Level & Multi-select) */}
        {multiSelect && viewLevel === 'list' && (
            <div className="flex border-b border-gray-700 bg-gray-850 px-4 pt-2 space-x-1 shrink-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.id 
                            ? 'border-blue-500 text-blue-400 bg-gray-800 rounded-t' 
                            : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        <tab.icon size={14} className="mr-2"/>
                        {tab.label}
                    </button>
                ))}
            </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-900/50">
           
           {/* LEVEL 1: PARENT LIST */}
           {viewLevel === 'list' && (
               <>
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {assets.map(asset => {
                          const selectionCount = getSelectedCountForParent(asset);
                          const hasSubAssets = asset.subAssets && asset.subAssets.length > 0;
                          
                          return (
                            <div 
                                key={asset.id} 
                                onClick={() => handleParentClick(asset)}
                                className={`group cursor-pointer bg-gray-800 border rounded-lg overflow-hidden transition-all relative ${
                                    selectionCount > 0
                                    ? 'border-blue-500/50 shadow-lg shadow-blue-900/10' 
                                    : 'border-gray-700 hover:border-gray-500'
                                }`}
                            >
                                <div className="relative h-28 w-full">
                                    <img src={asset.img} alt={asset.name} className="w-full h-full object-cover" />
                                    
                                    {/* Sub-asset Indicator - Folder Badge */}
                                    {hasSubAssets && (
                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur rounded px-1.5 py-0.5 flex items-center border border-white/20 shadow-md">
                                            <FolderOpen size={10} className="text-yellow-400 mr-1" />
                                            <span className="text-[9px] text-gray-200 font-bold">{asset.subAssets!.length}</span>
                                        </div>
                                    )}

                                    {/* Selection Counter */}
                                    {selectionCount > 0 && (
                                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow border border-white/20">
                                            {selectionCount}
                                        </div>
                                    )}
                                    
                                    {/* Drill Down Hint */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-black/70 px-2 py-1 rounded text-xs text-white flex items-center backdrop-blur-sm border border-gray-600">
                                            {hasSubAssets ? (
                                                <><Layers size={12} className="mr-1" /> 查看子资产</>
                                            ) : (
                                                <><Check size={12} className="mr-1" /> 选择</>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className={`p-2 text-center text-xs font-medium truncate ${selectionCount > 0 ? 'text-blue-300' : 'text-gray-300'}`}>
                                    {asset.name}
                                </div>
                            </div>
                          );
                      })}
                   </div>
                   {assets.length === 0 && (
                       <div className="text-center py-10 text-gray-500">该分类下暂无资产</div>
                   )}
               </>
           )}

           {/* LEVEL 2: DETAIL (SUB-ASSETS) */}
           {viewLevel === 'detail' && currentParentAsset && (
               <div className="animate-fade-in-up">
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                       
                       {/* 1. Main Parent Asset Card */}
                       <div 
                           onClick={() => handleSubAssetClick(null)}
                           className={`group cursor-pointer bg-gray-800 border-2 rounded-lg overflow-hidden transition-all relative ${
                               isSelected(currentParentAsset.id)
                               ? 'border-blue-500 ring-1 ring-blue-500 shadow-lg' 
                               : 'border-gray-700 hover:border-gray-500'
                           }`}
                       >
                           <div className="relative h-32 w-full">
                               <img src={currentParentAsset.img} alt="Main" className="w-full h-full object-cover" />
                               <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                   isSelected(currentParentAsset.id) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/50 border-gray-400'
                               }`}>
                                   {isSelected(currentParentAsset.id) && <Check size={12} />}
                               </div>
                               <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-[9px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm">
                                   主资产
                               </div>
                           </div>
                           <div className={`p-2 text-center text-xs font-medium ${isSelected(currentParentAsset.id) ? 'bg-blue-900/20 text-blue-200' : 'text-gray-300'}`}>
                               {currentParentAsset.name} (通用)
                           </div>
                       </div>

                       {/* 2. Sub Assets Cards */}
                       {(currentParentAsset.subAssets || []).map(sub => {
                           const subId = sub.id;
                           const selected = isSelected(subId);
                           return (
                               <div 
                                   key={subId} 
                                   onClick={() => handleSubAssetClick(sub)}
                                   className={`group cursor-pointer bg-gray-800 border-2 rounded-lg overflow-hidden transition-all relative ${
                                       selected
                                       ? 'border-blue-500 ring-1 ring-blue-500 shadow-lg' 
                                       : 'border-gray-700 hover:border-gray-500'
                                   }`}
                               >
                                   <div className="relative h-32 w-full">
                                       <img src={sub.img} alt={sub.label} className="w-full h-full object-cover" />
                                       <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                           selected ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/50 border-gray-400'
                                       }`}>
                                           {selected && <Check size={12} />}
                                       </div>
                                       {/* Decorative corner icon for hierarchy */}
                                       <div className="absolute bottom-2 right-2 opacity-50">
                                            <CornerDownRight size={14} className="text-gray-300"/>
                                       </div>
                                   </div>
                                   <div className={`p-2 text-center text-xs font-medium truncate ${selected ? 'bg-blue-900/20 text-blue-200' : 'text-gray-300'}`}>
                                       {sub.label}
                                   </div>
                               </div>
                           );
                       })}
                       
                       {/* Add placeholder if no sub assets */}
                       {(!currentParentAsset.subAssets || currentParentAsset.subAssets.length === 0) && (
                           <div className="col-span-2 flex items-center justify-center border border-dashed border-gray-700 rounded-lg text-gray-500 text-xs">
                               暂无更多子资产
                           </div>
                       )}
                   </div>
               </div>
           )}
        </div>

        {/* Footer for Multi-Select */}
        {multiSelect && (
            <div className="p-4 border-t border-gray-700 bg-gray-800 flex justify-between items-center shrink-0">
                <div className="text-xs text-gray-500">
                    {selectedAssets.length > 0 ? `已准备引用 ${selectedAssets.length} 个参考对象` : '请选择至少一个对象'}
                </div>
                <div className="flex space-x-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={selectedAssets.length === 0}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-bold rounded-lg shadow-lg transition-all"
                    >
                        确认引用 ({selectedAssets.length})
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
