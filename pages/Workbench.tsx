

import React, { useState, useEffect, useRef } from 'react';
import { Project, Task, Scene, WorkbenchMode, Asset, Version, I2VConfig } from '../types';
import { Viewport } from '../components/workbench/Viewport';
import { ControlPanel } from '../components/workbench/ControlPanel';
import { ShotList } from '../components/workbench/ShotList';
import { Timeline } from '../components/workbench/Timeline';
import { CompareModal } from '../components/modals/CompareModal';
import { generateImageWithImagen, generateVideoWithVeo } from '../services/geminiService';
import toast from 'react-hot-toast';
import { ChevronDown, ArrowLeft, LayoutTemplate, GripHorizontal } from 'lucide-react';

interface WorkbenchProps {
  mode: WorkbenchMode;
  project: Project;
  activeEpisodeId: string | null;
  onUpdateProject: (p: Project) => void;
  onChangeEpisode: (epId: string) => void;
  onBack?: () => void;
}

export const Workbench: React.FC<WorkbenchProps> = ({ mode, project, activeEpisodeId, onUpdateProject, onChangeEpisode, onBack }) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [zenMode, setZenMode] = useState(false);

  // Comparison State
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Timeline Resize State
  const [timelineHeight, setTimelineHeight] = useState(300);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // 1. Determine active scenes based on Episode ID
  const allEpisodes = project.scripts?.flatMap(s => s.episodes) || [];
  
  // Auto-select first episode if activeEpisodeId is null or invalid, ensuring timeline always has content
  const currentEpisode = allEpisodes.find(ep => ep.id === activeEpisodeId) || allEpisodes[0];
  
  // Update parent state if we auto-selected an episode to keep UI in sync
  useEffect(() => {
      if (!activeEpisodeId && currentEpisode && allEpisodes.length > 0) {
          onChangeEpisode(currentEpisode.id);
      }
  }, [activeEpisodeId, currentEpisode, allEpisodes, onChangeEpisode]);
  
  const activeScenes: Scene[] = currentEpisode 
    ? currentEpisode.scenes 
    : (project.scenes || []); 

  // Initial selection logic
  useEffect(() => {
    // If selectedTaskId is no longer valid in current scenes, clear it
    const currentTaskValid = activeScenes.some(s => s.tasks.some(t => t.id === selectedTaskId));
    if (selectedTaskId && !currentTaskValid) {
        setSelectedTaskId(null);
    }
  }, [activeScenes, selectedTaskId]);

  // Derived Selected Task
  const selectedScene = activeScenes.find(s => s.tasks.some(t => t.id === selectedTaskId));
  const selectedTask = selectedScene?.tasks.find(t => t.id === selectedTaskId);

  // Sync activeVersionId when selection changes
  useEffect(() => {
      if (selectedTask) {
          // If the task has an explicit keyframe assigned (active choice), use that
          if (selectedTask.keyframeImage) {
              const versionMatch = selectedTask.versions.find(v => v.imgUrl === selectedTask.keyframeImage);
              setActiveVersionId(versionMatch ? versionMatch.id : 'temp_keyframe');
          } else if (selectedTask.versions.length > 0) {
              // Fallback to latest
              setActiveVersionId(selectedTask.versions[selectedTask.versions.length - 1].id);
          } else {
              setActiveVersionId(null);
          }
      } else {
          setActiveVersionId(null);
      }
      
      // Reset comparison modal when changing tasks
      setIsCompareModalOpen(false);
  }, [selectedTaskId, selectedTask]); // Depend on task object to catch updates

  // Handle Resize Events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const deltaY = startYRef.current - e.clientY;
        // Constraints: Min 150px, Max 80% of screen
        const newHeight = Math.min(Math.max(150, startHeightRef.current + deltaY), window.innerHeight * 0.8);
        setTimelineHeight(newHeight);
    };

    const handleMouseUp = () => {
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleStartResizing = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = timelineHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const handleGenerate = async (prompt: string, count: number, config?: any) => {
    if (!selectedTask || !selectedScene) {
        toast.error('请先在分镜头列表或时间线上选择一个镜头');
        return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('正在生成内容...');

    // Prompt Augmentation Logic for Asset Reference
    const referencedAssets: Asset[] = config?.referencedAssets || [];
    // Only augment prompt for T2I, usually. For I2V prompt is motion description.
    
    let finalPrompt = prompt;

    if (mode === 'workbench_t2i' && referencedAssets.length > 0) {
        const assetDescriptions = referencedAssets
            .map(a => `[Reference ${a.type.toUpperCase()}: ${a.name}] ${a.description || ''}`)
            .join('\n');
        
        // Strengthened prompt for visual consistency
        finalPrompt = `Visual References:\n${assetDescriptions}\n\nTask: Generate an image based on the following description, ensuring consistency with the visual references above.\nDescription: ${prompt}`;
        console.log("Augmented Prompt:", finalPrompt);
    }

    try {
      const newVersions = [];
      for (let i = 0; i < count; i++) {
        let resultUrl = '';
        if (mode === 'workbench_i2v') {
             // Prepare I2V Configuration
             const i2vConfig: I2VConfig = {
                 type: config?.videoGenType || 'image_to_video',
                 duration: config?.duration,
                 aspectRatio: config?.aspectRatio,
                 resolution: config?.resolution,
                 model: config?.model,
                 motion: config?.motion,
                 startFrameImage: config?.startFrame,
                 endFrameImage: config?.endFrame,
                 referenceImages: config?.multiRefImages
             };
             resultUrl = await generateVideoWithVeo(prompt, i2vConfig);
        } else {
             // Pass referenceImage if available
             resultUrl = await generateImageWithImagen(finalPrompt, config?.aspectRatio, config?.referenceImage);
        }

        newVersions.push({
          id: `v_${Date.now()}_${i}`,
          imgUrl: resultUrl,
          prompt: prompt, // Store original prompt for display
          timestamp: Date.now(),
          isFavorite: false,
          type: mode === 'workbench_i2v' ? 'video' : 'image' as const,
          model: config?.model,
          aspectRatio: config?.aspectRatio,
          resolution: config?.resolution,
          duration: config?.duration,
          referencedAssetIds: referencedAssets.map(a => a.id)
        });
      }

      // Deep Update
      const updatedScripts = project.scripts.map(script => ({
          ...script,
          episodes: script.episodes.map(ep => {
              const sceneIndex = ep.scenes.findIndex(s => s.id === selectedScene.id);
              if (sceneIndex === -1) return ep;

              const updatedScenes = [...ep.scenes];
              updatedScenes[sceneIndex] = {
                  ...selectedScene,
                  tasks: selectedScene.tasks.map(t => {
                      if (t.id !== selectedTask.id) return t;
                      // Update versions AND set the latest as the keyframe (active view)
                      const latestUrl = newVersions[newVersions.length -1].imgUrl;
                      // If generating video, we typically keep the image keyframe but might show video overlay?
                      // For now, if video generated, it just adds to versions, doesn't replace keyframe IMAGE unless wanted.
                      // Let's NOT auto-replace keyframeImage with video URL, but maybe we should allow it if we support video playback in keyframe slot.
                      // The Viewport handles playback if activeVersion is video.
                      
                      // Auto-select latest version
                      return {
                          ...t,
                          status: 'done',
                          versions: [...t.versions, ...newVersions],
                          // Only update keyframeImage if it was an image generation, OR if we decide keyframe can be video
                          keyframeImage: mode === 'workbench_t2i' ? latestUrl : t.keyframeImage
                      } as Task;
                  })
              };
              return { ...ep, scenes: updatedScenes };
          })
      }));
      
      onUpdateProject({ ...project, scripts: updatedScripts });
      toast.success('生成完成！', { id: toastId });

    } catch (e) {
      console.error(e);
      toast.error('生成失败', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  // Add a new version (e.g. extracted frame) manually to a task
  const handleAddNewVersion = (taskId: string, newVersion: Version) => {
      const updatedScripts = project.scripts.map(script => ({
          ...script,
          episodes: script.episodes.map(ep => ({
              ...ep,
              scenes: ep.scenes.map(s => ({
                  ...s,
                  tasks: s.tasks.map(t => {
                      if (t.id !== taskId) return t;
                      return {
                          ...t,
                          versions: [...t.versions, newVersion],
                          keyframeImage: newVersion.imgUrl // Auto select newly added version
                      };
                  })
              }))
          }))
      }));
      onUpdateProject({ ...project, scripts: updatedScripts });
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
      const updatedScripts = project.scripts.map(script => ({
          ...script,
          episodes: script.episodes.map(ep => ({
              ...ep,
              scenes: ep.scenes.map(s => ({
                  ...s,
                  tasks: s.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
              }))
          }))
      }));
      onUpdateProject({ ...project, scripts: updatedScripts });
  };

  const handleSetKeyframe = (taskId: string, imgUrl: string) => {
      handleUpdateTask(taskId, { keyframeImage: imgUrl });
      toast.success('已设为分镜图');
  };

  // NLE Layout Structure:
  // Header
  // Main Row: Left (Shot List) | Center (Viewport Padded) | Right (Inspector Wide)
  // Bottom Row: Timeline

  return (
    <div className="flex flex-col h-full w-full bg-gray-900 text-gray-200 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      
      {/* Header */}
      <header className="h-12 bg-gray-900 border-b border-gray-700 flex items-center px-4 justify-between shrink-0 z-40 relative">
          <div className="flex items-center space-x-4">
              {onBack && (
                  <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                      <ArrowLeft size={18} />
                  </button>
              )}
              <div className="flex items-center gap-2 font-bold text-sm">
                  <LayoutTemplate className="w-4 h-4 text-indigo-500" />
                  <span>Timeline Editor</span>
              </div>
              <div className="h-4 w-px bg-gray-700"></div>
              {/* Episode Selector */}
              <div className="relative group">
                  <button className="flex items-center text-xs font-medium hover:text-indigo-400 transition-colors">
                      {currentEpisode ? currentEpisode.title : "选择分集"} <ChevronDown size={12} className="ml-1 opacity-50"/>
                  </button>
                  <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl hidden group-hover:block z-50">
                      {allEpisodes.map(ep => (
                          <div 
                            key={ep.id} 
                            onClick={() => onChangeEpisode(ep.id)}
                            className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-700 ${ep.id === currentEpisode?.id ? 'text-indigo-400' : 'text-gray-300'}`}
                          >
                              {ep.title}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
          
          <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 font-mono">
                  {activeScenes.length} Scenes / {activeScenes.reduce((acc, s) => acc + s.tasks.length, 0)} Clips
              </span>
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-all">
                  Export
              </button>
          </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 flex flex-col min-h-0">
          
          {/* Top Section (Shot List + Viewport + Inspector) */}
          <div className="flex-1 flex min-h-0 relative">
              
              {/* Left Sidebar: Shot List (Replaced Library) 
                  Changed z-index from 50 to 20 to avoid covering Timeline/Modal
              */}
              <div className="w-80 shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col z-20">
                  <ShotList 
                      scenes={activeScenes} 
                      selectedTaskId={selectedTaskId} 
                      onSelectTask={setSelectedTaskId} 
                  />
              </div>

              {/* Center: Viewport (Visually shrunk with padding) */}
              <div className="flex-1 bg-gray-950 flex flex-col min-w-0 relative px-10 py-4">
                  <div className="w-full h-full bg-black rounded-xl border border-gray-800 shadow-2xl relative overflow-hidden">
                      <Viewport 
                          task={selectedTask || null}
                          activeVersionId={activeVersionId}
                          isGenerating={isGenerating}
                          zenMode={zenMode}
                          onToggleZenMode={() => setZenMode(!zenMode)}
                          onSetKeyframe={handleSetKeyframe}
                          onAddVersion={handleAddNewVersion}
                      />
                      {/* Overlay message if no selection */}
                      {!selectedTask && (
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-gray-400 text-xs px-3 py-1 rounded-full pointer-events-none backdrop-blur-sm border border-white/10 z-20">
                              Select a shot from the list to edit
                          </div>
                      )}
                  </div>
              </div>

              {/* Right Sidebar: Context Panel (Widened) */}
              <div className="w-[420px] shrink-0 bg-gray-850 border-l border-gray-700 flex flex-col z-30 shadow-xl">
                  <ControlPanel 
                      mode={mode}
                      task={selectedTask || null}
                      project={project}
                      isGenerating={isGenerating}
                      onGenerate={handleGenerate}
                      onUpdateTask={handleUpdateTask}
                      onOpenCompareModal={() => setIsCompareModalOpen(true)}
                  />
              </div>
          </div>

          {/* Resizer Handle */}
          <div 
              className="h-1 bg-gray-900 hover:bg-blue-600 cursor-row-resize z-40 border-t border-gray-700 transition-colors w-full flex justify-center items-center shrink-0 group relative"
              onMouseDown={handleStartResizing}
          >
             <div className="absolute -top-2 -bottom-2 w-full z-50 cursor-row-resize"></div>
             {/* Visual Grip */}
             <div className="w-12 h-1 rounded-full bg-gray-600 group-hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>

          {/* Bottom Section: Timeline (Resizable) */}
          <div 
             style={{ height: timelineHeight }} 
             className="shrink-0 bg-gray-900 z-30 flex flex-col"
          >
              <Timeline 
                  scenes={activeScenes}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={setSelectedTaskId}
                  height={timelineHeight}
              />
          </div>
      </div>

      {/* Global Compare Modal Overlay */}
      {isCompareModalOpen && selectedTask && (
          <CompareModal 
              isOpen={isCompareModalOpen}
              onClose={() => setIsCompareModalOpen(false)}
              task={selectedTask}
          />
      )}
    </div>
  );
};