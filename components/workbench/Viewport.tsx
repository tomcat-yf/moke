
import React, { useState, useEffect } from 'react';
import { Task, Version } from '../../types';
import { Star, Maximize2, Minimize2, Download, Image as ImageIcon, Expand, ScanLine, MoreHorizontal, Brush, Edit3, Video } from 'lucide-react';
import { VideoFrameExtractorModal } from '../modals/VideoFrameExtractorModal';

interface ViewportProps {
  task: Task | null;
  activeVersionId: string | null;
  isGenerating: boolean;
  zenMode: boolean;
  onToggleZenMode: () => void;
  onSetKeyframe?: (taskId: string, url: string) => void;
  onAddVersion?: (taskId: string, version: Version) => void;
}

export const Viewport: React.FC<ViewportProps> = ({ 
    task, 
    activeVersionId, 
    isGenerating, 
    zenMode, 
    onToggleZenMode, 
    onSetKeyframe,
    onAddVersion
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isVideoExtractorOpen, setIsVideoExtractorOpen] = useState(false);

  useEffect(() => {
    setShowMoreMenu(false);
  }, [task]);

  const activeVersion = task?.versions.find(v => v.id === activeVersionId);
  const isKeyframe = task && activeVersion && task.keyframeImage === activeVersion.imgUrl;

  // Controls for Zen Mode
  const ZenToggle = () => (
    <button 
      onClick={onToggleZenMode}
      className="absolute top-4 left-4 z-30 p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-300 rounded-md transition-colors border border-gray-600"
      title={zenMode ? "退出全屏" : "展开画布"}
    >
      {zenMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
    </button>
  );

  const handleFrameCaptured = (base64Image: string) => {
      if (!task || !onAddVersion) return;
      
      const newVersion: Version = {
          id: `v_frame_${Date.now()}`,
          imgUrl: base64Image,
          prompt: activeVersion?.prompt || task.prompt,
          timestamp: Date.now(),
          isFavorite: false,
          type: 'image',
          model: 'Video Frame Extraction'
      };
      
      onAddVersion(task.id, newVersion);
  };

  if (!task) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 relative">
            <ZenToggle />
            <span className="mt-4">选择一个分镜以开始</span>
        </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <ZenToggle />

      {/* Main Preview Area */}
      <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden p-4">
        {isGenerating ? (
           <div className="flex flex-col items-center animate-pulse">
             <div className="w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
             <span className="text-blue-400 font-medium">正在生成高保真内容...</span>
           </div>
        ) : activeVersion ? (
            <div className="relative w-full h-full flex items-center justify-center group">
               {activeVersion.type === 'video' ? (
                   <video src={activeVersion.imgUrl} controls autoPlay loop className="max-w-full max-h-full object-contain rounded shadow-2xl" />
               ) : (
                   <img src={activeVersion.imgUrl} alt="Generated" className="max-w-full max-h-full object-contain rounded shadow-2xl" />
               )}
               
               {/* Top Right Actions Overlay */}
               <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                 {/* Set as Keyframe Button */}
                 {onSetKeyframe && activeVersion.type === 'image' && (
                     <button 
                        onClick={() => onSetKeyframe(task.id, activeVersion.imgUrl)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center ${isKeyframe ? 'bg-green-600 text-white cursor-default' : 'bg-gray-900/80 text-white hover:bg-blue-600'}`}
                        disabled={isKeyframe}
                     >
                        <ImageIcon size={14} className="mr-1" />
                        {isKeyframe ? '当前分镜图' : '设为分镜图'}
                     </button>
                 )}
                 <button className="p-2 bg-gray-900/80 rounded-full text-white hover:bg-green-600 transition-colors">
                   <Download size={16} />
                 </button>
               </div>

               {/* Bottom Floating Toolbar (Fine-tuning) */}
               {activeVersion.type === 'image' && (
                   <div className="absolute bottom-8 z-30 bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg px-2 py-1.5 shadow-2xl flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                       
                       <button className="flex items-center px-3 py-1.5 rounded hover:bg-gray-800 text-gray-200 hover:text-blue-400 transition-colors space-x-1.5">
                           <Expand size={14} />
                           <span className="text-xs font-medium">扩图</span>
                       </button>
                       
                       <div className="w-px h-4 bg-gray-700 mx-1"></div>
                       
                       <button className="flex items-center px-3 py-1.5 rounded hover:bg-gray-800 text-gray-200 hover:text-blue-400 transition-colors space-x-1.5">
                           <ScanLine size={14} />
                           <span className="text-xs font-medium">抠图</span>
                       </button>
                       
                       <div className="w-px h-4 bg-gray-700 mx-1"></div>
                       
                       {/* Video Frame Extractor Button */}
                       <button 
                           onClick={() => setIsVideoExtractorOpen(true)}
                           className="flex items-center px-3 py-1.5 rounded hover:bg-gray-800 text-gray-200 hover:text-green-400 transition-colors space-x-1.5"
                       >
                           <Video size={14} />
                           <span className="text-xs font-medium">视频截帧</span>
                       </button>

                       <div className="w-px h-4 bg-gray-700 mx-1"></div>
                       
                       <button className="flex items-center px-3 py-1.5 rounded hover:bg-gray-800 text-gray-200 hover:text-blue-400 transition-colors space-x-1.5">
                           <div className="border border-current rounded-[3px] px-[1px] text-[8px] font-bold leading-none">HD</div>
                           <span className="text-xs font-medium">增强</span>
                       </button>
                       
                       <div className="w-px h-4 bg-gray-700 mx-1"></div>
                       
                       <div className="relative">
                           <button 
                              className="flex items-center px-3 py-1.5 rounded hover:bg-gray-800 text-gray-200 hover:text-blue-400 transition-colors space-x-1.5"
                              onClick={() => setShowMoreMenu(!showMoreMenu)}
                              onBlur={() => setTimeout(() => setShowMoreMenu(false), 200)}
                           >
                               <MoreHorizontal size={14} />
                               <span className="text-xs font-medium">更多</span>
                           </button>
                           
                           {showMoreMenu && (
                               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden py-1 animate-fade-in-up">
                                   <button className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-gray-700 hover:text-white flex items-center transition-colors">
                                       <Brush size={12} className="mr-2" /> 局部重绘
                                   </button>
                                   <button className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-gray-700 hover:text-white flex items-center transition-colors">
                                       <Edit3 size={12} className="mr-2" /> 图片编辑器
                                   </button>
                               </div>
                           )}
                       </div>
                   </div>
               )}
            </div>
        ) : (
            <div className="text-center opacity-50">
                <div className="text-6xl mb-4 grayscale">🖼️</div>
                <p>暂无生成内容</p>
            </div>
        )}
      </div>

      {/* Frame Extractor Modal */}
      {isVideoExtractorOpen && activeVersion?.imgUrl && (
          <VideoFrameExtractorModal 
              isOpen={isVideoExtractorOpen}
              onClose={() => setIsVideoExtractorOpen(false)}
              imageUrl={activeVersion.imgUrl}
              onSave={handleFrameCaptured}
          />
      )}
    </div>
  );
};
