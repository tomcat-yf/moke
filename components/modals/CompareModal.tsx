
import React, { useState } from 'react';
import { Version, Task } from '../../types';
import { X, Monitor, Plus, ChevronRight, CheckCircle } from 'lucide-react';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
}

export const CompareModal: React.FC<CompareModalProps> = ({ isOpen, onClose, task }) => {
  const [leftVersionId, setLeftVersionId] = useState<string | null>(null);
  const [rightVersionId, setRightVersionId] = useState<string | null>(null);
  // Tracks which slot the user will fill next (left or right)
  const [activeSlot, setActiveSlot] = useState<'left' | 'right'>('left');

  if (!isOpen) return null;

  const versions = [...task.versions].reverse(); // Show newest first

  const handleVersionClick = (versionId: string) => {
    if (activeSlot === 'left') {
        // If clicking same version in left slot, do nothing or deselect? Let's just set it.
        setLeftVersionId(versionId);
        // Automatically move focus to right slot for next selection flow
        setActiveSlot('right');
    } else {
        setRightVersionId(versionId);
        // Automatically move focus back to left? Or stay? Staying is usually better for adjustments.
        // But for "fill A then B" flow, let's keep it simple.
        setActiveSlot('left');
    }
  };

  const getVersionById = (id: string | null) => task.versions.find(v => v.id === id);

  const renderSlot = (slot: 'left' | 'right', versionId: string | null) => {
      const version = getVersionById(versionId);
      const isActive = activeSlot === slot;

      return (
          <div 
             onClick={() => setActiveSlot(slot)}
             className={`flex-1 flex flex-col min-w-0 bg-gray-900/50 rounded-xl border overflow-hidden h-full shadow-inner relative transition-all cursor-pointer ${isActive ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-700 hover:border-gray-600'}`}
          >
              {/* Header */}
              <div className={`px-4 py-3 border-b flex justify-between items-center shrink-0 ${isActive ? 'bg-blue-900/20 border-blue-500/30' : 'bg-gray-800 border-gray-700'}`}>
                <span className={`font-bold text-sm flex items-center ${isActive ? 'text-blue-400' : 'text-gray-400'}`}>
                    {slot === 'left' ? 'Slot A' : 'Slot B'}
                    {version && <span className="ml-2 text-white bg-gray-700 px-1.5 rounded text-xs">V{version.id.split('_').pop()}</span>}
                </span>
                {version && <span className="text-xs text-gray-500 font-mono">{new Date(version.timestamp).toLocaleTimeString()}</span>}
              </div>

              {/* Empty State */}
              {!version && (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                      <div className={`w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center mb-4 ${isActive ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-gray-700 bg-gray-800'}`}>
                          <Plus size={24} />
                      </div>
                      <p className="text-sm">点击上方列表选择版本</p>
                      {isActive && <p className="text-xs text-blue-400 mt-2 animate-pulse">当前正在选择...</p>}
                  </div>
              )}

              {/* Content */}
              {version && (
                  <>
                    <div className="flex-1 min-h-0 bg-black relative flex items-center justify-center border-b border-gray-700 w-full p-2">
                        {version.type === 'video' ? (
                        <video src={version.imgUrl} controls className="w-full h-full object-contain" />
                        ) : (
                        <img src={version.imgUrl} alt="Version Preview" className="w-full h-full object-contain" />
                        )}
                    </div>
                    <div className="h-48 shrink-0 p-4 overflow-y-auto custom-scrollbar bg-gray-800/30">
                         {/* Parameters */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                           <div className="bg-gray-800/80 p-2 rounded border border-gray-700/50">
                                <div className="text-[9px] text-gray-500 uppercase">Model</div>
                                <div className="text-xs text-gray-300">{version.model || 'N/A'}</div>
                           </div>
                           <div className="bg-gray-800/80 p-2 rounded border border-gray-700/50">
                                <div className="text-[9px] text-gray-500 uppercase">Ratio</div>
                                <div className="text-xs text-gray-300">{version.aspectRatio}</div>
                           </div>
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase mb-1">Prompt</div>
                        <div className="text-xs text-gray-400 leading-relaxed font-mono">{version.prompt}</div>
                    </div>
                  </>
              )}
          </div>
      );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 animate-in fade-in duration-200">
      <div className="bg-gray-800 border border-gray-700 w-full h-full rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header & Version Strip */}
        <div className="border-b border-gray-700 bg-gray-850 shrink-0 flex flex-col">
           <div className="flex justify-between items-center px-6 py-3 border-b border-gray-700/50">
                <div className="flex items-center space-x-3">
                    <div className="bg-blue-600 p-1.5 rounded-lg shadow-blue-900/50 shadow-md">
                        <Monitor size={18} className="text-white"/>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">版本对比</h2>
                        <p className="text-xs text-gray-400">选择两个历史版本进行详细参数与视觉对比</p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
           </div>
           
           {/* Horizontal Version List */}
           <div className="h-28 flex items-center px-6 space-x-4 overflow-x-auto custom-scrollbar bg-gray-900/50">
                {versions.map((v, idx) => {
                    const isLeft = leftVersionId === v.id;
                    const isRight = rightVersionId === v.id;
                    const isSelected = isLeft || isRight;

                    return (
                        <div 
                            key={v.id}
                            onClick={() => handleVersionClick(v.id)}
                            className={`group relative flex-shrink-0 w-32 h-20 bg-black rounded-lg border-2 cursor-pointer overflow-hidden transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-700 hover:border-gray-500'}`}
                        >
                            {v.type === 'video' ? <video src={v.imgUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100"/> : <img src={v.imgUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100"/>}
                            
                            {/* Overlay Badge */}
                            <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/90 to-transparent flex justify-between items-end">
                                <span className="text-[10px] text-gray-300 font-mono">V{task.versions.length - idx}</span>
                                {v.type === 'video' && <span className="text-[8px] bg-purple-600 px-1 rounded text-white">Video</span>}
                            </div>
                            
                            {/* Selection Indicators */}
                            {isLeft && (
                                <div className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow font-bold">A</div>
                            )}
                            {isRight && (
                                <div className="absolute top-1 right-1 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow font-bold">B</div>
                            )}
                        </div>
                    );
                })}
           </div>
        </div>

        {/* Comparison Body */}
        <div className="flex-1 p-4 overflow-hidden bg-gray-900 relative">
           <div className="flex h-full gap-4">
               {renderSlot('left', leftVersionId)}
               {renderSlot('right', rightVersionId)}
           </div>
           
           {/* Center Divider/Action Hint */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
               <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-gray-500 shadow-xl">
                   <Monitor size={14} />
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};
