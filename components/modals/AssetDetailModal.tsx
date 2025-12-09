
import React, { useState } from 'react';
import { Asset, SubAsset } from '../../types';
import { X, Plus, Trash2, RefreshCcw, Image as ImageIcon, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AssetDetailModalProps {
  asset: Asset;
  onClose: () => void;
  onUpdate: (asset: Asset) => void;
  onRegenerate: (asset: Asset, subAssetLabel?: string) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ asset, onClose, onUpdate, onRegenerate }) => {
  const [newSubLabel, setNewSubLabel] = useState('三视图');

  const handleAddSubAsset = () => {
      // Mock uploading a sub asset or creating a placeholder
      const newSub: SubAsset = {
          id: `sub_${Date.now()}`,
          img: `https://picsum.photos/seed/${Date.now()}/300/300`,
          label: newSubLabel,
          type: 'image'
      };
      const updatedSubAssets = [...(asset.subAssets || []), newSub];
      onUpdate({ ...asset, subAssets: updatedSubAssets });
      toast.success('已添加子资产');
  };

  const handleDeleteSubAsset = (id: string) => {
      const updatedSubAssets = (asset.subAssets || []).filter(s => s.id !== id);
      onUpdate({ ...asset, subAssets: updatedSubAssets });
      toast.success('已删除子资产');
  };

  const labels = ['三视图', '面部特写', '背面图', '细节描写', '表情差分', '其他'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-5xl h-[80vh] flex overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            
            {/* Left: Main Asset Info */}
            <div className="w-1/3 bg-gray-850 border-r border-gray-700 p-6 flex flex-col">
                <div className="aspect-square bg-black rounded-lg overflow-hidden border border-gray-700 mb-4 relative group">
                    <img src={asset.img} alt={asset.name} className="w-full h-full object-cover" />
                    <button className="absolute bottom-2 right-2 p-2 bg-black/50 text-white rounded hover:bg-blue-600 transition-colors opacity-0 group-hover:opacity-100">
                        <Maximize2 size={16} />
                    </button>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">{asset.name}</h2>
                <span className="inline-block px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded mb-4 self-start capitalize">{asset.type}</span>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">描述</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">
                        {asset.description || "暂无描述..."}
                    </p>
                </div>

                <button 
                    onClick={() => onRegenerate(asset)}
                    className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center transition-all shadow-lg"
                >
                    <RefreshCcw size={16} className="mr-2" /> 重新生成主资产
                </button>
            </div>

            {/* Right: Sub Assets */}
            <div className="flex-1 flex flex-col bg-gray-900">
                <div className="h-14 px-6 border-b border-gray-700 flex justify-between items-center bg-gray-850">
                    <h3 className="font-bold text-gray-200">子资产库 ({asset.subAssets?.length || 0})</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(asset.subAssets || []).map((sub) => (
                            <div key={sub.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden group relative hover:border-blue-500 transition-all">
                                <div className="aspect-square bg-black relative">
                                    <img src={sub.img} alt={sub.label} className="w-full h-full object-cover" />
                                    
                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                        <button 
                                            onClick={() => onRegenerate(asset, sub.label)}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-full font-bold flex items-center transform hover:scale-105 transition-all"
                                        >
                                            <RefreshCcw size={12} className="mr-1" /> 重新生成
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteSubAsset(sub.id)}
                                            className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded-full font-bold flex items-center transform hover:scale-105 transition-all"
                                        >
                                            <Trash2 size={12} className="mr-1" /> 删除
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2 bg-gray-850 border-t border-gray-700 flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-300">{sub.label}</span>
                                </div>
                            </div>
                        ))}

                        {/* Add New Placeholder */}
                        <div className="aspect-square bg-gray-800/30 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center p-4">
                             <div className="mb-3 w-full">
                                 <select 
                                    value={newSubLabel}
                                    onChange={(e) => setNewSubLabel(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 text-xs text-gray-300 rounded px-2 py-1 focus:border-blue-500 outline-none"
                                 >
                                     {labels.map(l => <option key={l} value={l}>{l}</option>)}
                                 </select>
                             </div>
                             <button 
                                onClick={handleAddSubAsset}
                                className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold rounded flex items-center justify-center transition-colors"
                             >
                                 <Plus size={14} className="mr-1" /> 添加子资产
                             </button>
                             <p className="text-[10px] text-gray-500 mt-2 text-center">支持三视图、细节图等</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
