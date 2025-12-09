
import React, { useState, useEffect } from 'react';
import { Asset } from '../../types';
import { X, Sparkles, User, Image as ImageIcon, Box } from 'lucide-react';
import { polishPrompt, generateImageWithImagen } from '../../services/geminiService';

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Asset) => void;
  initialData?: Partial<Asset>;
}

export const CreateAssetModal: React.FC<CreateAssetModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [type, setType] = useState<'character' | 'scene' | 'prop'>('character');
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialData) {
        if (initialData.type) setType(initialData.type);
        if (initialData.name) setName(initialData.name);
        if (initialData.description) setPrompt(initialData.description); // Use description as prompt base
        // If initialData has image, maybe we don't select it because we want to create NEW?
        // But user can just save immediately if they want to copy.
        // Let's not pre-select image to encourage generation, unless needed.
    } else if (isOpen && !initialData) {
        // Reset
        setName('');
        setPrompt('');
        setGeneratedImages([]);
        setSelectedImage(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handlePolish = async () => {
     if(!prompt) return;
     setIsPolishing(true);
     const result = await polishPrompt(`Character/Scene description for: ${name}. ${prompt}`);
     setPrompt(result);
     setIsPolishing(false);
  };

  const handleGenerate = async () => {
      if(!prompt || !name) return;
      setIsGenerating(true);
      // Simulate batch of 4
      try {
          const results = [];
          for(let i=0; i<4; i++) {
              const url = await generateImageWithImagen(`${prompt} --variation ${i}`, '1:1');
              results.push(url);
          }
          setGeneratedImages(results);
      } catch(e) {
          console.error(e);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSave = () => {
      if(!name || !selectedImage) return;
      onSave({
          id: `new_${Date.now()}`,
          name,
          type,
          img: selectedImage,
          description: prompt // Save the prompt as description for future use
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
       <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-gray-700 bg-gray-850">
            <h3 className="text-xl font-bold text-white flex items-center"><Sparkles className="mr-2 text-blue-500"/> {initialData ? '重新生成/创建资产' : '创建新资产'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24}/></button>
          </div>

          <div className="flex flex-1 overflow-hidden">
             {/* Left: Input */}
             <div className="w-1/2 p-6 overflow-y-auto custom-scrollbar border-r border-gray-700">
                <div className="mb-6">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">1. 资产类型</label>
                    <div className="flex space-x-2">
                        {[
                            { id: 'character', icon: User, label: '角色' },
                            { id: 'scene', icon: ImageIcon, label: '场景' },
                            { id: 'prop', icon: Box, label: '道具' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setType(item.id as any)}
                                className={`flex-1 py-3 rounded-lg border flex items-center justify-center transition-all ${type === item.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-750 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                            >
                                <item.icon size={16} className="mr-2" />
                                <span className="text-sm font-bold">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-6">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">2. 名称</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-750 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                        placeholder="例如：赛博侦探 Jack"
                    />
                </div>

                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">3. 描述</label>
                        <button onClick={handlePolish} disabled={isPolishing} className="text-xs text-purple-400 hover:text-purple-300 flex items-center">
                            {isPolishing ? '思考中...' : 'AI 扩写'}
                        </button>
                    </div>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full h-40 bg-gray-750 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none resize-none"
                        placeholder="描述外观、风格、服装、材质等..."
                    />
                </div>

                <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !name || !prompt}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold text-lg shadow-lg shadow-blue-900/40 disabled:opacity-50 transition-all"
                >
                    {isGenerating ? '正在生成候选图...' : '生成资产'}
                </button>
             </div>

             {/* Right: Preview */}
             <div className="w-1/2 p-6 bg-gray-900 flex flex-col">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 block">生成结果</label>
                
                <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden relative">
                    {generatedImages.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                             <Sparkles size={48} className="mb-4 opacity-20" />
                             <p>等待生成...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 p-2 h-full overflow-y-auto custom-scrollbar">
                            {generatedImages.map((img, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => setSelectedImage(img)}
                                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedImage === img ? 'border-green-500 ring-2 ring-green-500/20' : 'border-transparent hover:border-blue-500'}`}
                                >
                                    <img src={img} alt={`Gen ${idx}`} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}

                    {isGenerating && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
                            <div className="w-10 h-10 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                            <span className="text-blue-400 font-medium animate-pulse">Imagen 正在绘制...</span>
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleSave}
                    disabled={!selectedImage}
                    className="mt-4 w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-bold transition-all"
                >
                    保存到项目
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};
