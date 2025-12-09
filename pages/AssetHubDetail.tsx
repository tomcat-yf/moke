
import React, { useState } from 'react';
import { Project, Asset } from '../types';
import { ArrowLeft, Plus } from 'lucide-react';
import { AssetDetailModal } from '../components/modals/AssetDetailModal';

interface AssetHubDetailProps {
  project: Project;
  onBack: () => void;
  onCreateAsset: (initialData?: Partial<Asset>) => void;
  onUpdateProject: (project: Project) => void;
}

export const AssetHubDetail: React.FC<AssetHubDetailProps> = ({ project, onBack, onCreateAsset, onUpdateProject }) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const handleUpdateAsset = (updatedAsset: Asset) => {
      const collectionName = updatedAsset.type === 'character' ? 'characters' : updatedAsset.type === 'scene' ? 'scenes' : 'props';
      const updatedCollection = project.assets[collectionName].map(a => a.id === updatedAsset.id ? updatedAsset : a);
      
      const updatedProject = {
          ...project,
          assets: {
              ...project.assets,
              [collectionName]: updatedCollection
          }
      };
      
      onUpdateProject(updatedProject);
      setSelectedAsset(updatedAsset);
  };

  const handleRegenerate = (asset: Asset, subAssetLabel?: string) => {
      // Close detail modal and open Create Asset modal with pre-filled data
      setSelectedAsset(null);
      const initialData: Partial<Asset> = {
          name: asset.name + (subAssetLabel ? ` - ${subAssetLabel}` : ' (New Ver)'),
          type: asset.type,
          description: asset.description,
          // We can't pre-fill prompt strictly as Asset doesn't store prompt, but we can use description
          // The CreateAssetModal uses 'prompt' state, we might map description to it if we modify CreateAssetModal logic, 
          // or just assume user fills it.
          // For now, let's pass description which might serve as prompt foundation.
      };
      onCreateAsset(initialData);
  };
  
  const renderAssetGrid = (title: string, color: string, assets: Asset[]) => (
    <div className="mb-10 animate-fade-in-up">
      <h3 className={`text-xl font-bold mb-4 text-gray-200 border-l-4 ${color} pl-3 flex items-center`}>
        {title} <span className="text-xs text-gray-500 ml-2 font-normal bg-gray-800 px-2 py-0.5 rounded-full">{assets.length}</span>
      </h3>
      {assets.length === 0 ? (
        <div className="border border-dashed border-gray-700 rounded-lg p-8 text-center text-gray-500 text-sm">
          暂无{title}，请创建。
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {assets.map((asset) => (
            <div 
                key={asset.id} 
                onClick={() => setSelectedAsset(asset)}
                className="group bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-blue-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer shadow-md"
            >
              <div className="relative h-32 overflow-hidden">
                <img src={asset.img} alt={asset.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {asset.subAssets && asset.subAssets.length > 0 && (
                    <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded backdrop-blur">
                        +{asset.subAssets.length}
                    </div>
                )}
              </div>
              <div className="p-3">
                <h4 className="text-white text-sm font-medium truncate" title={asset.name}>{asset.name}</h4>
              </div>
            </div>
          ))}
          <div 
             onClick={() => onCreateAsset()}
             className="bg-gray-800/40 border border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-800 hover:border-blue-500/50 hover:text-blue-400 text-gray-500 transition-all min-h-[160px]"
          >
            <Plus size={24} className="mb-2" />
            <span className="text-xs font-medium">新建</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center transition-colors">
          <ArrowLeft size={18} className="mr-2" /> 返回中心
        </button>
        <button 
           onClick={() => onCreateAsset()}
           className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium shadow-lg shadow-blue-900/50 flex items-center"
        >
          <Plus size={16} className="mr-2" /> 创建资产
        </button>
      </div>

      <h2 className="text-3xl font-bold text-white mb-8">{project.name} <span className="text-gray-600 text-2xl font-normal mx-2">/</span> 资产库</h2>

      {renderAssetGrid('角色 (Characters)', 'border-blue-500', project.assets.characters)}
      {renderAssetGrid('场景 (Scenes)', 'border-green-500', project.assets.scenes)}
      {renderAssetGrid('道具 (Props)', 'border-yellow-500', project.assets.props)}

      {/* Detail Modal */}
      {selectedAsset && (
          <AssetDetailModal 
            asset={selectedAsset}
            onClose={() => setSelectedAsset(null)}
            onUpdate={handleUpdateAsset}
            onRegenerate={handleRegenerate}
          />
      )}
    </div>
  );
};
