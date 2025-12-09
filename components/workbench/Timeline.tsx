

import React, { useRef, useEffect } from 'react';
import { Scene, Task } from '../../types';
import { Play, SkipBack, SkipForward, Settings2, Image as ImageIcon } from 'lucide-react';

interface TimelineProps {
  scenes: Scene[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  height: number;
}

export const Timeline: React.FC<TimelineProps> = ({ scenes, selectedTaskId, onSelectTask, height }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to selected item
  useEffect(() => {
    if (selectedTaskId && containerRef.current) {
        const el = document.getElementById(`timeline-item-${selectedTaskId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
  }, [selectedTaskId]);

  const allTasks = scenes.flatMap(s => s.tasks);

  // Dynamic Sizing Constants
  const HEADER_H = 40; // h-10
  const RULER_H = 24;  // h-6
  const PADDING_Y = 32; // py-4 (16px * 2)
  const ITEM_LABEL_H = 24; // h-6 bottom label
  
  // Calculate Item Dimensions based on parent Height
  // available height for the actual track area
  const trackAreaHeight = Math.max(0, height - HEADER_H - RULER_H - PADDING_Y);
  
  // Ensure we have a minimum sensible height (e.g. 50px) to prevent breaking
  const itemHeight = Math.max(50, trackAreaHeight);
  
  // Calculate Thumbnail Height (Item Height - Label Height)
  const thumbnailHeight = Math.max(0, itemHeight - ITEM_LABEL_H);
  
  // Determine Width based on Aspect Ratio (16:9) to keep proportionality
  // As height grows, width grows proportionally
  const itemWidth = Math.max(120, thumbnailHeight * (16 / 9));

  return (
    <div className="h-full bg-gray-950 flex flex-col shrink-0 relative z-30">
      {/* Toolbar */}
      <div className="h-10 bg-gray-900 border-b border-gray-700 flex items-center px-4 justify-between shrink-0 select-none">
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-800 rounded p-0.5 border border-gray-700">
                <button className="p-1 hover:bg-gray-700 rounded text-gray-400"><SkipBack size={14}/></button>
                <button className="p-1 hover:bg-gray-700 rounded text-indigo-400"><Play size={14} fill="currentColor"/></button>
                <button className="p-1 hover:bg-gray-700 rounded text-gray-400"><SkipForward size={14}/></button>
            </div>
            <span className="font-mono text-xs text-indigo-400">00:00:14:05</span>
        </div>
        <div className="flex items-center gap-2">
            <button className="text-gray-500 hover:text-white"><Settings2 size={16}/></button>
            <div className="h-4 w-px bg-gray-700 mx-1"></div>
            <div className="flex items-center">
               <input type="range" className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>
        </div>
      </div>

      {/* Tracks Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar bg-gray-900/50 relative" ref={containerRef}>
         {/* Time Ruler */}
         <div className="h-6 border-b border-gray-800 flex items-end px-2 select-none sticky top-0 bg-gray-900/90 z-10 min-w-max">
             {Array.from({ length: 20 }).map((_, i) => (
                 <div key={i} className="w-[140px] border-l border-gray-800 pl-1">
                     <span className="text-[9px] text-gray-600">00:0{i}:00</span>
                 </div>
             ))}
         </div>

         {/* Main Track */}
         <div className="px-4 py-4 flex items-center gap-1 min-w-max relative">
             {/* Track Line */}
             <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-800 -z-10"></div>

             {allTasks.map((task, idx) => {
                 const isSelected = task.id === selectedTaskId;
                 const hasVersions = task.versions && task.versions.length > 0;
                 const activeVersion = hasVersions ? task.versions[task.versions.length - 1] : null;
                 const thumb = task.keyframeImage || activeVersion?.imgUrl;

                 return (
                     <div 
                        id={`timeline-item-${task.id}`}
                        key={task.id}
                        onClick={() => onSelectTask(task.id)}
                        style={{ width: `${itemWidth}px`, height: `${itemHeight}px` }}
                        className={`
                            relative rounded-lg border-2 cursor-pointer transition-all flex flex-col overflow-hidden bg-gray-800 group
                            ${isSelected 
                                ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] ring-1 ring-indigo-500/50' 
                                : 'border-gray-700 hover:border-gray-600'
                            }
                        `}
                     >
                        {/* Thumbnail */}
                        <div className="flex-1 bg-black relative overflow-hidden">
                            {thumb ? (
                                <img src={thumb} alt="shot" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-700">
                                    <ImageIcon size={20}/>
                                </div>
                            )}
                            <div className="absolute bottom-1 right-1 bg-black/60 px-1 rounded text-[9px] text-white font-mono">
                                {task.duration || '3s'}
                            </div>
                        </div>
                        
                        {/* Label */}
                        <div className={`h-6 px-2 flex items-center text-[10px] font-medium border-t shrink-0 ${isSelected ? 'bg-indigo-900/30 border-indigo-500/30 text-indigo-300' : 'bg-gray-850 border-gray-700 text-gray-400'}`}>
                            <span className="truncate w-full">{task.title.split(':')[0]}</span>
                        </div>
                     </div>
                 );
             })}
         </div>
      </div>
    </div>
  );
};