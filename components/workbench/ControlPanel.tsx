
import React, { useState, useEffect, useRef } from 'react';
import { Project, Task, WorkbenchMode, Asset, VideoGenerationType, Version } from '../../types';
import { Sparkles, Image as ImageIcon, Video, ChevronDown, Plus, Trash2, Box, Wand2, History, SplitSquareHorizontal, CheckCircle, Star, X, Upload, CopyPlus, Type, Clapperboard, Film, Layers, ArrowRightLeft, Maximize2, User } from 'lucide-react';
import { polishPrompt } from '../../services/geminiService';
import { AssetSelectorModal } from '../modals/AssetSelectorModal';
import toast from 'react-hot-toast';

interface ControlPanelProps {
  mode: WorkbenchMode;
  task: Task | null;
  project: Project;
  isGenerating: boolean;
  onGenerate: (prompt: string, count: number, config?: any) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onOpenCompareModal: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
    mode, 
    task, 
    project, 
    isGenerating, 
    onGenerate, 
    onUpdateTask,
    onOpenCompareModal
}) => {
  const [prompt, setPrompt] = useState('');
  const [batchSize, setBatchSize] = useState(1);
  const [isPolishing, setIsPolishing] = useState(false);
  
  // --- T2I (Shot Gen) State ---
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- I2V (Video Gen) State ---
  // Replaced videoGenType with i2vMode for the new UI logic
  const [i2vMode, setI2vMode] = useState<'multi_ref' | 'frame_control'>('multi_ref');
  
  const [startFrame, setStartFrame] = useState<string | null>(null);
  const [endFrame, setEndFrame] = useState<string | null>(null);
  const [multiRefImages, setMultiRefImages] = useState<string[]>([]);
  
  // Image Preview State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Refs for I2V inputs
  const startFrameInputRef = useRef<HTMLInputElement>(null);
  const endFrameInputRef = useRef<HTMLInputElement>(null);
  const multiRefInputRef = useRef<HTMLInputElement>(null);

  // Asset Selection States
  const [activeAssetType, setActiveAssetType] = useState<'char' | 'scene' | 'prop' | null>(null);
  const [showMultiAssetModal, setShowMultiAssetModal] = useState(false);
  const [referencedAssets, setReferencedAssets] = useState<Asset[]>([]);

  // Shared Configs
  const [duration, setDuration] = useState<'2s' | '5s' | '8s'>('5s');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('1080p');
  const [motion, setMotion] = useState('自动');
  const [stylePreference, setStylePreference] = useState('创意');

  // Sync state
  useEffect(() => {
    if (task) {
      const latestVersion = task.versions.length > 0 ? task.versions[task.versions.length - 1] : null;
      setPrompt(latestVersion ? latestVersion.prompt : task.prompt);
      
      // Initialize Start Frame for I2V with keyframe if available
      if (mode === 'workbench_i2v') {
          // If task has a keyframe, default to Frame Control mode and set it as Start Frame
          if (task.keyframeImage) {
              setI2vMode('frame_control');
              setStartFrame(task.keyframeImage);
          } else {
              setI2vMode('multi_ref');
              setStartFrame(null);
          }
      } else {
          setReferenceImage(null);
      }
      
      setEndFrame(null);
      setMultiRefImages([]);

      const initialAssets: Asset[] = [];

      // Helper for deep search (Find Asset or SubAsset by ID)
      const findAssetDeep = (id: string): Asset | undefined => {
          const allAssets = [...project.assets.characters, ...project.assets.scenes, ...project.assets.props];
          
          const topLevel = allAssets.find(a => a.id === id);
          if (topLevel) return topLevel;

          for (const parent of allAssets) {
              if (parent.subAssets) {
                  const sub = parent.subAssets.find(s => s.id === id);
                  if (sub) {
                      return {
                          id: sub.id,
                          name: `${parent.name} - ${sub.label}`,
                          img: sub.img,
                          type: parent.type,
                          description: sub.description || parent.description,
                          subAssets: [] 
                      };
                  }
              }
          }
          return undefined;
      };

      if (task.assets.char) initialAssets.push(task.assets.char);
      if (task.assets.scene) initialAssets.push(task.assets.scene);
      if (task.assets.prop) initialAssets.push(task.assets.prop);
      
      if (task.extractedTags) {
          const { characters = [], scenes = [], props = [] } = task.extractedTags;
          const allTags = [...characters, ...scenes, ...props];
          allTags.forEach(tagName => {
              const found = project.assets.characters.find(a => a.name === tagName) ||
                            project.assets.scenes.find(a => a.name === tagName) ||
                            project.assets.props.find(a => a.name === tagName);
              if (found && !initialAssets.some(a => a.id === found.id)) initialAssets.push(found);
          });
      }

      if (task.referencedAssetIds) {
          task.referencedAssetIds.forEach(id => {
              const found = findAssetDeep(id);
              if (found && !initialAssets.some(a => a.id === found.id)) initialAssets.push(found);
          });
      }

      setReferencedAssets(initialAssets);
    } else {
      setPrompt('');
      setReferencedAssets([]);
      setReferenceImage(null);
      setStartFrame(null);
    }
  }, [task, project.assets, mode]);

  const handlePolish = async () => {
    if (!prompt) return;
    setIsPolishing(true);
    const polished = await polishPrompt(prompt);
    setPrompt(polished);
    setIsPolishing(false);
  };

  const handleGenerateClick = () => {
      // Determine generation type based on inputs
      let videoType: VideoGenerationType = 'text_to_video';
      if (i2vMode === 'frame_control' && startFrame) videoType = 'image_to_video';
      if (i2vMode === 'multi_ref' && multiRefImages.length > 0) videoType = 'image_to_video';

      const config = {
          model: mode === 'workbench_i2v' ? 'Veo 3.0 Pro' : 'Imagen 3',
          aspectRatio: aspectRatio,
          resolution: resolution,
          duration: mode === 'workbench_i2v' ? duration : undefined,
          motion: mode === 'workbench_i2v' ? motion : undefined,
          style: mode === 'workbench_i2v' ? stylePreference : undefined,
          referencedAssets: referencedAssets, 
          
          referenceImage: referenceImage, // T2I Reference
          
          // I2V Specifics
          videoGenType: videoType,
          // Only pass relevant data based on mode
          startFrame: i2vMode === 'frame_control' ? startFrame : null,
          endFrame: i2vMode === 'frame_control' ? endFrame : null,
          multiRefImages: i2vMode === 'multi_ref' ? multiRefImages : []
      };
      onGenerate(prompt, batchSize, config);
  };

  const handleToggleFavorite = (versionId: string) => {
      if(!task) return;
      const updatedVersions = task.versions.map(v => v.id === versionId ? {...v, isFavorite: !v.isFavorite} : v);
      onUpdateTask(task.id, { versions: updatedVersions });
  };

  const handleRemoveAsset = (assetId: string) => {
      setReferencedAssets(prev => prev.filter(a => a.id !== assetId));
      if (task) {
          const currentIds = task.referencedAssetIds || [];
          if (currentIds.includes(assetId)) {
               const newIds = currentIds.filter(id => id !== assetId);
               onUpdateTask(task.id, { referencedAssetIds: newIds });
          }
      }
  };

  const readImage = (file: File, callback: (res: string) => void) => {
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result as string);
      reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) readImage(file, setter);
    // Reset input
    e.target.value = '';
  };

  const handleMultiFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const files = Array.from(e.target.files);
          files.forEach((file: unknown) => {
              readImage(file as File, (res) => {
                  setMultiRefImages(prev => [...prev, res]);
              });
          });
      }
      e.target.value = '';
  };

  const handleUseAsReference = (e: React.MouseEvent, version: Version) => {
    e.stopPropagation();
    if (!task) return;

    if (mode === 'workbench_i2v') {
         // Logic for "Use as Reference" button in history list for I2V
         // If current mode is Multi-Ref, add to list. If Frame Control, set as Start Frame.
         if (i2vMode === 'frame_control') {
             setStartFrame(version.imgUrl);
             toast.success('已载入为首帧');
         } else {
             setMultiRefImages(prev => [...prev, version.imgUrl]);
             toast.success('已添加到参考图列表');
         }
    } else {
         setReferenceImage(version.imgUrl);
         toast.success('已载入参考图');
    }
  };

  const renderAssetSection = (title: string, type: 'char' | 'scene' | 'prop') => {
      const assetType = type === 'char' ? 'character' : type;
      const assets = referencedAssets.filter(a => a.type === assetType);
      
      return (
          <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{title}</label>
                  <button 
                      onClick={() => { setActiveAssetType(type); setShowMultiAssetModal(true); }}
                      className="text-[10px] text-indigo-400 hover:text-white flex items-center"
                  >
                      <Plus size={10} className="mr-1"/> 添加
                  </button>
              </div>
              
              {assets.length === 0 ? (
                  <div className="text-[10px] text-gray-600 italic border border-dashed border-gray-700 rounded p-2 text-center">
                      未关联资产
                  </div>
              ) : (
                  <div className="space-y-2">
                      {assets.map(asset => (
                          <div key={asset.id} className="flex items-center justify-between bg-gray-800 p-2 rounded border border-gray-700">
                              <div className="flex items-center space-x-2 overflow-hidden">
                                  <img src={asset.img} className="w-6 h-6 rounded object-cover" alt={asset.name} />
                                  <span className="text-xs text-gray-300 truncate">{asset.name}</span>
                              </div>
                              <button onClick={() => handleRemoveAsset(asset.id)} className="text-gray-500 hover:text-red-400">
                                  <X size={12} />
                              </button>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  };

  // --- RENDER MODES ---

  if (!task) {
      return (
          <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
              <div className="p-4 border-b border-gray-800 bg-gray-900">
                  <h3 className="font-bold text-gray-100 flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-emerald-400" />
                      {mode === 'workbench_i2v' ? '视频生成' : '镜头生成'}
                  </h3>
              </div>
              <div className="p-6 flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                      <Wand2 size={24} className="opacity-50" />
                  </div>
                  <p className="text-sm font-medium text-gray-300">请选择一个镜头</p>
              </div>
          </div>
      );
  }

  // --- VIDEO PRODUCTION INTERFACE (I2V) ---
  if (mode === 'workbench_i2v') {
      const modelName = i2vMode === 'multi_ref' ? 'Veo 3.0 (Multi-Ref)' : 'Veo 3.0 (Frame-Ctrl)';

      return (
        <div className="flex flex-col h-full bg-gray-850 border-l border-gray-800 relative">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
                <h3 className="font-bold text-gray-100 flex items-center gap-2 text-sm">
                    <Clapperboard className="w-4 h-4 text-green-400" />
                    视频制作
                </h3>
                {/* Auto Model Badge */}
                <div className="flex items-center space-x-2">
                     <span className="text-[10px] text-gray-500">模型:</span>
                     <div className="text-[10px] bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-mono">
                         {modelName}
                     </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                
                {/* UNIFIED INPUT WINDOW */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden mb-3 shadow-inner relative group">
                    {/* 1. Prompt Area (Top) */}
                    <div className="relative">
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full h-24 bg-transparent border-none p-3 text-xs text-gray-200 focus:ring-0 focus:outline-none resize-none leading-relaxed placeholder-gray-600"
                            placeholder="描述视频内容、运动方式、光影氛围..."
                        />
                        <button onClick={handlePolish} disabled={isPolishing} className="absolute bottom-2 right-2 text-[10px] text-purple-400 hover:text-purple-300 bg-gray-900/80 px-2 py-0.5 rounded flex items-center border border-gray-700">
                            <Sparkles size={10} className="mr-1"/> 润色
                        </button>
                    </div>

                    {/* 2. Image Reference Area (Bottom) */}
                    <div className="bg-gray-850/50 border-t border-gray-800 p-2">
                        {i2vMode === 'multi_ref' ? (
                            /* Multi-Reference Mode */
                            <div className="flex flex-wrap gap-2">
                                {multiRefImages.map((img, i) => (
                                    <div key={i} className="w-12 h-12 bg-black rounded border border-gray-700 overflow-hidden relative group/item shrink-0">
                                        <img 
                                            src={img} 
                                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => setPreviewImage(img)}
                                            alt={`Ref ${i}`}
                                        />
                                        <button 
                                            onClick={() => setMultiRefImages(prev => prev.filter((_, idx) => idx !== i))}
                                            className="absolute top-0 right-0 bg-red-600/80 text-white p-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                        >
                                            <X size={8}/>
                                        </button>
                                    </div>
                                ))}
                                {/* Always visible Add Button */}
                                <div 
                                    onClick={() => multiRefInputRef.current?.click()}
                                    className="w-12 h-12 border border-dashed border-gray-600 rounded bg-gray-800/50 hover:bg-gray-700 hover:border-gray-500 hover:text-white flex items-center justify-center cursor-pointer text-gray-500 transition-colors"
                                    title="添加参考图"
                                >
                                    <Plus size={16}/>
                                </div>
                                <input type="file" multiple ref={multiRefInputRef} onChange={handleMultiFileUpload} className="hidden" accept="image/*"/>
                            </div>
                        ) : (
                            /* Start/End Frame Mode */
                            <div className="flex space-x-2">
                                {/* Start Frame Slot */}
                                <div className="flex-1 relative">
                                    <div className="text-[9px] text-gray-500 font-bold mb-1 ml-1 uppercase">首帧 (Start Frame)</div>
                                    {startFrame ? (
                                        <div className="h-16 w-full bg-black rounded border border-green-500/50 overflow-hidden relative group/item">
                                            <img src={startFrame} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewImage(startFrame)} alt="Start Frame"/>
                                            <button onClick={() => setStartFrame(null)} className="absolute top-0 right-0 p-1 bg-black/60 text-red-400 opacity-0 group-hover/item:opacity-100 hover:text-white transition-opacity"><Trash2 size={10}/></button>
                                        </div>
                                    ) : (
                                        <div 
                                            onClick={() => startFrameInputRef.current?.click()}
                                            className="h-16 w-full border border-dashed border-gray-600 rounded bg-gray-800/30 hover:bg-gray-800 hover:text-green-400 flex flex-col items-center justify-center cursor-pointer text-gray-500 transition-colors"
                                        >
                                            <Upload size={14} className="mb-1 opacity-70"/>
                                            <span className="text-[9px]">上传首帧</span>
                                        </div>
                                    )}
                                    <input type="file" ref={startFrameInputRef} onChange={(e) => handleFileUpload(e, setStartFrame)} className="hidden" accept="image/*"/>
                                </div>

                                {/* Arrow Icon */}
                                <div className="flex items-center justify-center pt-4 text-gray-600">
                                    <ArrowRightLeft size={12} />
                                </div>

                                {/* End Frame Slot */}
                                <div className="flex-1 relative">
                                    <div className="text-[9px] text-gray-500 font-bold mb-1 ml-1 uppercase">尾帧 (End Frame)</div>
                                    {endFrame ? (
                                        <div className="h-16 w-full bg-black rounded border border-blue-500/50 overflow-hidden relative group/item">
                                            <img src={endFrame} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewImage(endFrame)} alt="End Frame"/>
                                            <button onClick={() => setEndFrame(null)} className="absolute top-0 right-0 p-1 bg-black/60 text-red-400 opacity-0 group-hover/item:opacity-100 hover:text-white transition-opacity"><Trash2 size={10}/></button>
                                        </div>
                                    ) : (
                                        <div 
                                            onClick={() => endFrameInputRef.current?.click()}
                                            className="h-16 w-full border border-dashed border-gray-600 rounded bg-gray-800/30 hover:bg-gray-800 hover:text-blue-400 flex flex-col items-center justify-center cursor-pointer text-gray-500 transition-colors"
                                        >
                                            <Plus size={14} className="mb-1 opacity-70"/>
                                            <span className="text-[9px]">添加尾帧</span>
                                        </div>
                                    )}
                                    <input type="file" ref={endFrameInputRef} onChange={(e) => handleFileUpload(e, setEndFrame)} className="hidden" accept="image/*"/>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* MODE SWITCHER */}
                <div className="flex space-x-4 mb-6 px-1">
                    <button 
                        onClick={() => setI2vMode('multi_ref')}
                        className={`text-xs font-bold flex items-center transition-colors ${i2vMode === 'multi_ref' ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <div className={`w-3 h-3 rounded-full border mr-2 ${i2vMode === 'multi_ref' ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}></div>
                        多图参考 (Multi-Ref)
                    </button>
                    <button 
                        onClick={() => setI2vMode('frame_control')}
                        className={`text-xs font-bold flex items-center transition-colors ${i2vMode === 'frame_control' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <div className={`w-3 h-3 rounded-full border mr-2 ${i2vMode === 'frame_control' ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}`}></div>
                        首尾帧 (Frame Ctrl)
                    </button>
                </div>

                {/* Video Parameters */}
                <div className="space-y-4 mb-4 border-t border-gray-800 pt-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">时长</label>
                                <div className="flex bg-gray-900 rounded border border-gray-700 p-0.5">
                                    {['2s', '5s', '8s'].map(d => (
                                        <button 
                                            key={d}
                                            onClick={() => setDuration(d as any)}
                                            className={`flex-1 text-[10px] py-1 rounded transition-colors ${duration === d ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">宽高比</label>
                                <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-xs text-gray-300 rounded px-2 py-1.5 focus:border-green-500 outline-none">
                                    <option>16:9</option>
                                    <option>9:16</option>
                                    <option>21:9</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">运动幅度</label>
                                <select value={motion} onChange={e => setMotion(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-xs text-gray-300 rounded px-2 py-1.5 focus:border-green-500 outline-none">
                                    <option>自动 (Auto)</option>
                                    <option>轻微 (Low)</option>
                                    <option>正常 (Medium)</option>
                                    <option>剧烈 (High)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">清晰度</label>
                                <select value={resolution} onChange={e => setResolution(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-xs text-gray-300 rounded px-2 py-1.5 focus:border-green-500 outline-none">
                                    <option>1080p</option>
                                    <option>4K</option>
                                </select>
                            </div>
                        </div>
                </div>

                {/* Associated Assets (Compact) */}
                <div className="mb-6 border-t border-gray-800 pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">关联资产</label>
                        <div className="flex gap-1">
                             <button onClick={() => { setActiveAssetType('char'); setShowMultiAssetModal(true); }} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-blue-400 border border-gray-700/50" title="添加角色"><User size={12}/></button>
                             <button onClick={() => { setActiveAssetType('scene'); setShowMultiAssetModal(true); }} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-green-400 border border-gray-700/50" title="添加场景"><ImageIcon size={12}/></button>
                             <button onClick={() => { setActiveAssetType('prop'); setShowMultiAssetModal(true); }} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-orange-400 border border-gray-700/50" title="添加道具"><Box size={12}/></button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[30px]">
                        {referencedAssets.length === 0 ? (
                            <div className="w-full text-center py-2 border border-dashed border-gray-800 rounded bg-gray-900/30 text-[10px] text-gray-600 italic">
                                暂无关联资产，点击上方图标添加
                            </div>
                        ) : (
                            referencedAssets.map(asset => (
                                <div key={asset.id} className="flex items-center bg-gray-900 border border-gray-700 rounded pr-2 overflow-hidden max-w-[120px]">
                                     <img src={asset.img} className="w-6 h-6 object-cover mr-2 shrink-0" alt=""/>
                                     <span className="text-[10px] text-gray-300 truncate">{asset.name}</span>
                                     <button onClick={() => handleRemoveAsset(asset.id)} className="ml-2 text-gray-500 hover:text-red-400 shrink-0"><X size={10}/></button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Generate Action */}
                <div className="mb-8">
                    <button 
                        onClick={handleGenerateClick}
                        disabled={isGenerating || !prompt}
                        className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded font-bold text-xs shadow-lg shadow-green-900/40 transition-all flex items-center justify-center"
                    >
                        {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"/> : <Clapperboard size={14} className="mr-2"/>}
                        {isGenerating ? '生成中...' : '生成视频'}
                    </button>
                    {i2vMode === 'frame_control' && !startFrame && (
                        <p className="text-[10px] text-yellow-500 text-center mt-2">提示：未上传首帧将自动退化为文生视频模式</p>
                    )}
                </div>

                 {/* Version History (Video Only Filter?) */}
                 <div className="border-t border-gray-700 pt-4">
                     <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 block">视频生成记录</label>
                     <div className="space-y-3">
                         {task.versions.filter(v => v.type === 'video').length === 0 && <div className="text-[10px] text-gray-600 italic text-center">暂无视频版本</div>}
                         {[...task.versions].reverse().filter(v => v.type === 'video').map((v) => (
                             <div key={v.id} className="group flex gap-3 p-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-600 cursor-pointer" onClick={() => onUpdateTask(task.id, { keyframeImage: v.imgUrl })}> 
                                 <div className="w-16 h-10 bg-black rounded overflow-hidden shrink-0 relative">
                                     <video src={v.imgUrl} className="w-full h-full object-cover"/>
                                     <div className="absolute top-0 right-0 p-0.5 bg-black/60 rounded-bl text-[8px] text-white">Video</div>
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <div className="text-[10px] text-gray-400 truncate">{v.prompt}</div>
                                     <div className="text-[9px] text-gray-600 mt-1">{new Date(v.timestamp).toLocaleTimeString()}</div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>

            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} className="max-w-full max-h-full rounded-lg shadow-2xl" alt="Preview" />
                    <button className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={32}/></button>
                </div>
            )}
        </div>
      );
  }

  // --- ORIGINAL IMAGE GENERATION INTERFACE (T2I) ---
  // Preserved exactly as requested for workbench_t2i mode
  return (
    <div className="flex flex-col h-full bg-gray-850 border-l border-gray-800">
        <div className="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
            <h3 className="font-bold text-gray-100 flex items-center gap-2 text-sm">
                <Box className="w-4 h-4 text-indigo-400" />
                镜头属性
            </h3>
            <div className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">
                {task.id.split('_').pop()}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {/* 1. Prompt Editor */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">提示词 (Prompt)</label>
                    <button onClick={handlePolish} disabled={isPolishing} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center">
                        <Sparkles size={10} className="mr-1"/> AI 润色
                    </button>
                </div>
                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-24 bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-200 focus:border-indigo-500 focus:outline-none resize-none leading-relaxed"
                    placeholder="输入提示词..."
                />
            </div>

            {/* 1.5 Reference Image Section (Simple) */}
            <div className="mb-6">
                 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block flex justify-between">
                     <span>参考图片 (Reference)</span>
                     {referenceImage && (
                         <button onClick={() => setReferenceImage(null)} className="text-[10px] text-red-400 hover:text-red-300 flex items-center">
                             <Trash2 size={10} className="mr-1"/> 清除
                         </button>
                     )}
                 </label>
                 
                 {referenceImage ? (
                     <div className="relative w-full h-24 bg-gray-900 rounded border border-indigo-500 overflow-hidden group">
                         <img src={referenceImage} alt="Ref" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                             <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">已应用参考</span>
                         </div>
                     </div>
                 ) : (
                     <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-16 bg-gray-900 border border-dashed border-gray-700 rounded hover:border-blue-500 hover:bg-gray-800 cursor-pointer flex flex-col items-center justify-center text-gray-500 transition-all"
                     >
                         <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, setReferenceImage)} accept="image/*" className="hidden" />
                         <div className="flex items-center space-x-2">
                             <Upload size={14} />
                             <span className="text-xs">+ 参考图片</span>
                         </div>
                     </div>
                 )}
            </div>

            {/* 2. T2I Parameters */}
            <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">分辨率</label>
                        <select value={resolution} onChange={e => setResolution(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-xs text-gray-300 rounded px-2 py-1.5 focus:border-indigo-500 outline-none">
                            <option>1080p</option>
                            <option>4K</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">比例</label>
                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-xs text-gray-300 rounded px-2 py-1.5 focus:border-indigo-500 outline-none">
                            <option>16:9</option>
                            <option>9:16</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 3. Assets */}
            <div className="mb-6 border-t border-gray-700 pt-4">
                {renderAssetSection('关联角色', 'char')}
                {renderAssetSection('关联场景', 'scene')}
                {renderAssetSection('关联道具', 'prop')}
            </div>

            {/* 4. Generation Button */}
            <div className="mb-8">
                <button 
                    onClick={handleGenerateClick}
                    disabled={isGenerating || !prompt}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded font-bold text-xs shadow-lg shadow-indigo-900/40 transition-all flex items-center justify-center"
                >
                    {isGenerating ? '生成中...' : '生成图片'}
                </button>
            </div>

            {/* 5. Version History */}
            <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center">
                        <History size={12} className="mr-1"/> 版本历史 ({task.versions.length})
                    </label>
                    <button 
                        onClick={onOpenCompareModal}
                        className="text-[10px] px-2 py-0.5 rounded flex items-center transition-colors bg-gray-800 text-blue-400 hover:text-white border border-gray-700 hover:border-gray-500"
                    >
                        <SplitSquareHorizontal size={10} className="mr-1"/> 版本对比
                    </button>
                </div>

                <div className="space-y-3">
                    {[...task.versions].reverse().map((v, idx) => {
                        const isKeyframe = task.keyframeImage === v.imgUrl;
                        const realIdx = task.versions.length - idx;

                        return (
                            <div 
                                key={v.id}
                                onClick={() => onUpdateTask(task.id, { keyframeImage: v.imgUrl })}
                                className={`group flex gap-3 p-2 rounded-lg cursor-pointer border transition-all ${
                                    isKeyframe ? 'bg-gray-800 border-indigo-500 shadow-sm' : 'bg-gray-900 border-transparent hover:bg-gray-800 hover:border-gray-700'
                                }`}
                            >
                                {/* Thumb */}
                                <div className="w-16 h-10 bg-black rounded overflow-hidden shrink-0 relative">
                                    {v.type === 'video' ? <video src={v.imgUrl} className="w-full h-full object-cover"/> : <img src={v.imgUrl} className="w-full h-full object-cover" alt="Version"/>}
                                    {isKeyframe && <div className="absolute inset-0 border-2 border-indigo-500 rounded pointer-events-none"></div>}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex justify-between items-center">
                                        <span className={`text-[10px] font-bold ${isKeyframe ? 'text-indigo-400' : 'text-gray-400'}`}>V{realIdx}</span>
                                        <div className="flex items-center space-x-2">
                                            {/* Reference Button */}
                                            {v.type === 'image' && (
                                                <button 
                                                    onClick={(e) => handleUseAsReference(e, v)} 
                                                    className="text-gray-600 hover:text-green-400 transition-colors"
                                                    title="载入为参考"
                                                >
                                                    <CopyPlus size={10} />
                                                </button>
                                            )}
                                            {/* Favorite Button */}
                                            <button onClick={(e) => {e.stopPropagation(); handleToggleFavorite(v.id)}} className="text-gray-600 hover:text-yellow-400">
                                                <Star size={10} className={v.isFavorite ? "fill-yellow-400 text-yellow-400" : ""} />
                                            </button>
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-gray-500 mt-0.5 font-mono">{new Date(v.timestamp).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
        
        {/* Asset Selector Modal (Nested) */}
        {showMultiAssetModal && activeAssetType && (
            <AssetSelectorModal
                isOpen={showMultiAssetModal}
                type={activeAssetType}
                project={project}
                multiSelect={true}
                onClose={() => setShowMultiAssetModal(false)}
                onMultiSelect={(assets) => {
                    const newAssets = [...referencedAssets];
                    assets.forEach(a => {
                        if (!newAssets.some(existing => existing.id === a.id)) {
                            newAssets.push(a);
                        }
                    });
                    setReferencedAssets(newAssets);
                    
                    if (task) {
                        const currentIds = task.referencedAssetIds || [];
                        const newIds = [...currentIds];
                        assets.forEach(a => {
                            if (!newIds.includes(a.id)) newIds.push(a.id);
                        });
                        onUpdateTask(task.id, { referencedAssetIds: newIds });
                    }
                    setShowMultiAssetModal(false);
                }}
            />
        )}
    </div>
  );
};
