
import React from 'react';
import { Scene } from '../../types';
import { CheckCircle, Clock, Image as ImageIcon } from 'lucide-react';

interface ShotListProps {
  scenes: Scene[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
}

export const ShotList: React.FC<ShotListProps> = ({ scenes, selectedTaskId, onSelectTask }) => {
  let globalShotIndex = 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-900 border-r border-gray-800">
         <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0 bg-gray-900">
            <h3 className="font-bold text-gray-100 text-sm">分镜头管理列表</h3>
            <span className="text-xs text-gray-500">{scenes.reduce((acc, s) => acc + s.tasks.length, 0)} 镜头</span>
         </div>
         
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6 pb-24">
            {scenes.map(scene => (
                <div key={scene.id}>
                    {/* Scene Header */}
                    <div className="flex items-center mb-3 px-1 sticky top-0 bg-gray-900 z-10 py-2 border-b border-gray-800/50">
                        <div className="w-1 h-4 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-xs font-bold text-gray-300 truncate" title={scene.title}>{scene.title}</span>
                    </div>
                    
                    <div className="space-y-3">
                        {scene.tasks.map((task) => {
                            globalShotIndex++;
                            const isSelected = task.id === selectedTaskId;
                            const hasVersions = task.versions && task.versions.length > 0;
                            // Prefer keyframe, then latest version
                            const thumbnailUrl = task.keyframeImage || (hasVersions ? task.versions[task.versions.length - 1].imgUrl : null);
                            
                            // Parse title if it fits "Shot N: Summary" format or construct it
                            // Use the breakdown subject if available for a cleaner "Summary"
                            const summary = task.breakdown?.subject || task.title.replace(/^Shot \d+:/, '').trim() || task.title;
                            const displayTitle = `镜头 ${globalShotIndex}: ${summary}`;

                            return (
                                <div 
                                    key={task.id}
                                    onClick={() => onSelectTask(task.id)}
                                    className={`group rounded-lg cursor-pointer border transition-all duration-200 overflow-hidden flex flex-col ${isSelected ? 'bg-gray-800 border-blue-500 shadow-md ring-1 ring-blue-500/20' : 'bg-gray-800/40 border-gray-700 hover:bg-gray-800 hover:border-gray-600'}`}
                                >
                                    {/* Header: Title */}
                                    <div className={`px-3 py-2 border-b border-gray-700/50 flex justify-between items-center ${isSelected ? 'bg-blue-900/10' : 'bg-gray-800/50'}`}>
                                        <div className={`text-xs font-bold truncate ${isSelected ? 'text-blue-300' : 'text-gray-200'}`}>
                                            {displayTitle}
                                        </div>
                                        <div className="flex items-center ml-2 shrink-0">
                                            {task.status === 'done' && <CheckCircle size={12} className="text-green-500" />}
                                            {task.status === 'queued' && <Clock size={12} className="text-gray-500" />}
                                            {task.status === 'generating' && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>}
                                        </div>
                                    </div>

                                    <div className="p-2 flex gap-3 h-20">
                                        {/* Script Content (Left - Expanded) */}
                                        <div className="flex-1 min-w-0 flex flex-col py-0.5">
                                            <div className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">脚本内容</div>
                                            <div className="text-[10px] text-gray-300 line-clamp-3 leading-relaxed" title={task.script}>
                                                {task.script || <span className="text-gray-600 italic">暂无描述...</span>}
                                            </div>
                                        </div>

                                        {/* Thumbnail (Right) */}
                                        <div className="w-24 aspect-video bg-black rounded overflow-hidden shrink-0 border border-gray-700 relative self-center">
                                             {thumbnailUrl ? (
                                                 <img src={thumbnailUrl} className="w-full h-full object-cover" alt="Thumb" />
                                             ) : (
                                                 <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">
                                                     <ImageIcon size={16} />
                                                 </div>
                                             )}
                                             <div className="absolute bottom-0 right-0 bg-black/60 px-1 rounded-tl text-[8px] text-white font-mono">
                                                 {task.duration}
                                             </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
