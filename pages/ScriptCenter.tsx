
import React, { useState, useEffect } from 'react';
import { Project, ScriptDraft, ScriptEpisode, Scene, Task, CameraMovement, WorkbenchMode, Asset } from '../types';
import { FileText, ArrowLeft, Plus, Trash2, Calendar, CheckCircle, Clock, Sparkles, Layout, List, Film, PlayCircle, UploadCloud, Clipboard, Edit3, Split, X, Wand2, ChevronRight, Save, AlignLeft, ChevronDown, Image as ImageIcon, Video, RefreshCcw, History, User, Box, ArchiveRestore, AlertTriangle, MoreHorizontal, Volume2 } from 'lucide-react';
import { analyzeScript, breakdownScriptToEpisodes, analyzeScene, polishPrompt } from '../services/geminiService';
import toast from 'react-hot-toast';

export type ScriptCenterView = 'overview' | 'episode_detail';
export type OverviewTab = 'info' | 'episodes';
export type EpisodeMode = 'segmentation' | 'storyboard';

export interface ScriptCenterState {
  view: ScriptCenterView;
  draftId: string | null;
  overviewTab: OverviewTab;
  activeEpisodeId: string | null;
  episodeMode: EpisodeMode;
}

interface ImportArchive {
    timestamp: number;
    content: string;
    note: string;
}

interface ScriptCenterProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
  onEnterProduction: (episodeId: string, mode: WorkbenchMode) => void;
  initialState?: ScriptCenterState;
  onStateChange?: (state: ScriptCenterState) => void;
  onCreateProject: () => void;
}

// --- CONSTANTS FOR DROPDOWNS ---
const SHOT_SIZES = [
  { value: 'ELS', label: '特大远景 (ELS)' },
  { value: 'LS', label: '远景 (LS)' },
  { value: 'FS', label: '全景 (FS)' },
  { value: 'MLS', label: '中远景 (MLS)' },
  { value: 'MS', label: '中景 (MS)' },
  { value: 'MCU', label: '中特写 (MCU)' },
  { value: 'CU', label: '特写 (CU)' },
  { value: 'ECU', label: '特大特写 (ECU)' },
];

const CAMERA_ANGLES = [
  { value: 'Eye-level', label: '平视 (Eye-level)' },
  { value: 'Low Angle', label: '仰视 (Low Angle)' },
  { value: 'High Angle', label: '俯视 (High Angle)' },
  { value: 'Bird\'s Eye', label: '鸟瞰 (Bird\'s Eye)' },
  { value: 'Worm\'s Eye', label: '虫视 (Worm\'s Eye)' },
  { value: 'Canted', label: '斜视 (Canted)' },
];

const CAMERA_MOVEMENTS = [
  { value: 'Static', label: '固定 (Static)' },
  { value: 'Pan', label: '摇镜头 (Pan)' },
  { value: 'Tilt', label: '倾斜 (Tilt)' },
  { value: 'Zoom In', label: '推镜头 (Zoom In)' },
  { value: 'Zoom Out', label: '拉镜头 (Zoom Out)' },
  { value: 'Dolly', label: '移镜头 (Dolly)' },
  { value: 'Truck', label: '跟镜头 (Truck)' },
  { value: 'Handheld', label: '手持 (Handheld)' },
  { value: 'Arc', label: '弧形 (Arc)' },
];

const DURATIONS = ['1s','2s','3s','4s','5s','6s','7s','8s','10s'];

export const ScriptCenter: React.FC<ScriptCenterProps> = ({ project, onUpdateProject, onEnterProduction, initialState, onStateChange, onCreateProject }) => {
  // State Initialization
  const [view, setView] = useState<ScriptCenterView>(initialState?.view || 'overview');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(initialState?.draftId || null);
  const [overviewTab, setOverviewTab] = useState<OverviewTab>(initialState?.overviewTab || 'info');
  
  // Episode Detail State
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(initialState?.activeEpisodeId || null);
  const [episodeMode, setEpisodeMode] = useState<EpisodeMode>(initialState?.episodeMode || 'segmentation');
  
  // Loading & Import States
  const [loading, setLoading] = useState(false);
  const [importText, setImportText] = useState('');
  
  // Import History & Confirmation
  const [importArchives, setImportArchives] = useState<ImportArchive[]>([]);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Selection state for Episode List Sidebar
  const [selectedEpisodeIdForPreview, setSelectedEpisodeIdForPreview] = useState<string | null>(null);

  // Selection state for Storyboard View
  const [activeStoryboardTaskId, setActiveStoryboardTaskId] = useState<string | null>(null);
  
  // Polishing state map
  const [polishingTasks, setPolishingTasks] = useState<Record<string, boolean>>({});

  // History Modal State
  const [historyModalData, setHistoryModalData] = useState<{sceneId: string, task: Task} | null>(null);

  // Sync state changes to parent
  useEffect(() => {
    onStateChange?.({
        view,
        draftId: currentDraftId,
        overviewTab,
        activeEpisodeId,
        episodeMode
    });
  }, [view, currentDraftId, overviewTab, activeEpisodeId, episodeMode, onStateChange]);

  // Helper: Get Current Draft
  const currentDraft = project.scripts?.find(s => s.id === currentDraftId);
  const currentEpisode = currentDraft?.episodes.find(e => e.id === activeEpisodeId);

  // Auto-select first episode for preview if none selected
  useEffect(() => {
      if (overviewTab === 'episodes' && currentDraft?.episodes.length > 0 && !selectedEpisodeIdForPreview) {
          setSelectedEpisodeIdForPreview(currentDraft.episodes[0].id);
      }
  }, [overviewTab, currentDraft]);

  // --- ACTIONS: PROJECT / DRAFT ---

  const handleCreateDraft = () => {
    // Note: Parent component now handles New Project creation. 
    // This logic is kept for internal draft creation if needed.
    const newDraft: ScriptDraft = {
      id: `sd_${Date.now()}`,
      title: '新剧本项目',
      updatedAt: Date.now(),
      status: '草稿',
      episodes: []
    };
    const updatedProject = {
      ...project,
      scripts: [...(project.scripts || []), newDraft]
    };
    onUpdateProject(updatedProject);
    setCurrentDraftId(newDraft.id);
    setView('overview');
    setOverviewTab('info');
    setImportText('');
  };

  const handleOpenDraft = (id: string) => {
    setCurrentDraftId(id);
    setView('overview');
    setOverviewTab('episodes'); 
  };

  const handleDeleteDraft = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个剧本吗？')) return;
    const updatedProject = {
      ...project,
      scripts: project.scripts.filter(s => s.id !== id)
    };
    onUpdateProject(updatedProject);
    if(currentDraftId === id) setCurrentDraftId(null);
  };

  const updateCurrentDraft = (updates: Partial<ScriptDraft>) => {
    if (!currentDraftId) return;
    const updatedScripts = project.scripts.map(s => 
      s.id === currentDraftId ? { ...s, ...updates, updatedAt: Date.now() } : s
    );
    onUpdateProject({ ...project, scripts: updatedScripts });
  };

  const updateEpisode = (episodeId: string, updates: Partial<ScriptEpisode>) => {
    if (!currentDraft) return;
    const updatedEpisodes = currentDraft.episodes.map(e => 
      e.id === episodeId ? { ...e, ...updates } : e
    );
    updateCurrentDraft({ episodes: updatedEpisodes });
  };

  // --- ACTIONS: EPISODE MANAGEMENT & IMPORT ---

  const handleAddEpisode = () => {
    if (!currentDraft) return;
    const newEpisode: ScriptEpisode = {
      id: `ep_${Date.now()}`,
      title: `第 ${currentDraft.episodes.length + 1} 集`,
      content: '',
      scenes: [],
      status: 'draft',
      extractedAssets: { characters: [], scenes: [], props: [] }
    };
    const updatedEpisodes = [...currentDraft.episodes, newEpisode];
    updateCurrentDraft({ episodes: updatedEpisodes });
    
    // Auto-enter the new episode
    setActiveEpisodeId(newEpisode.id);
    setEpisodeMode('segmentation');
    setView('episode_detail');
  };

  const handleEnterEpisode = (episodeId: string) => {
      setActiveEpisodeId(episodeId);
      setEpisodeMode('segmentation');
      setView('episode_detail');
  };

  // Logic to execute the AI split and extraction
  const executeAISplit = async () => {
      const sourceText = importText || currentDraft?.episodes[0]?.content || "";
      if (!sourceText) return toast.error("暂无剧本内容可供拆解");
      
      const toastId = toast.loading("AI 正在阅读、拆分剧本并提取资产...");
      try {
          // 1. Call Enhanced AI Service
          const result = await breakdownScriptToEpisodes(sourceText);
          
          // 2. Process Episodes and their Assets
          const newEpisodes: ScriptEpisode[] = result.episodes.map((ep, idx) => ({
              id: `ep_${Date.now()}_${idx}`,
              title: ep.title || `第 ${idx + 1} 集`,
              content: ep.content || '',
              scenes: [],
              status: 'draft',
              extractedAssets: ep.assets || { characters: [], scenes: [], props: [] }
          }));

          // 3. Global Asset Sync
          // We need to aggregate ALL extracted assets from ALL episodes to the Project's Asset Hub
          const newAssets = { ...project.assets };
          let assetCount = 0;

          const addAssetIfNew = (name: string, type: 'character' | 'scene' | 'prop', list: Asset[]) => {
              if (!list.find(a => a.name === name)) {
                  list.push({
                      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                      name,
                      type,
                      img: `https://picsum.photos/seed/${name}/150/150`, // Placeholder
                      description: 'AI Extracted'
                  });
                  assetCount++;
              }
          };

          newEpisodes.forEach(ep => {
              const { characters = [], scenes = [], props = [] } = ep.extractedAssets || {};
              characters.forEach(name => addAssetIfNew(name, 'character', newAssets.characters));
              scenes.forEach(name => addAssetIfNew(name, 'scene', newAssets.scenes));
              props.forEach(name => addAssetIfNew(name, 'prop', newAssets.props));
          });

          // 4. Update Everything
          const updatedScripts = project.scripts.map(s => 
            s.id === currentDraftId ? { ...s, episodes: newEpisodes, updatedAt: Date.now() } : s
          );
          onUpdateProject({ ...project, scripts: updatedScripts, assets: newAssets });

          toast.success(`拆解成功！已在资产中心 "${project.name}" 下同步 ${assetCount} 个新资产`, { id: toastId, duration: 5000 });
          setOverviewTab('episodes');
          setImportText('');
          // Auto-select first episode for preview
          if (newEpisodes.length > 0) setSelectedEpisodeIdForPreview(newEpisodes[0].id);

      } catch (e) {
          console.error(e);
          toast.error("拆解失败", { id: toastId });
      }
  };

  const handleSmartAnalyze = () => {
      const hasExistingContent = currentDraft && currentDraft.episodes.length > 0;
      
      if (hasExistingContent) {
          // Trigger confirmation dialog
          setPendingAction(() => executeAISplit);
          setShowOverwriteConfirm(true);
      } else {
          executeAISplit();
      }
  };

  const handleConfirmOverwrite = () => {
      // Archive current state
      if (currentDraft && currentDraft.episodes.length > 0) {
          setImportArchives(prev => [{
              timestamp: Date.now(),
              content: currentDraft.episodes.map(e => e.content).join('\n\n'),
              note: `AI 拆解前存档 (${currentDraft.episodes.length} 集)`
          }, ...prev]);
      }
      
      // Proceed
      if (pendingAction) pendingAction();
      setShowOverwriteConfirm(false);
      setPendingAction(null);
  };

  const handleRestoreArchive = (archive: ImportArchive) => {
      setImportText(archive.content);
      toast.success("已恢复旧版本内容至输入框");
  };

  // --- ACTIONS: SEGMENTATION & BREAKDOWN ---

  const handleSegmentationManualSplit = (ep: ScriptEpisode) => {
      const lines = ep.content.split(/\n\s*\n/).filter(line => line.trim().length > 0);
      const newScenes: Scene[] = lines.map((line, idx) => ({
          id: `sc_manual_${Date.now()}_${idx}`,
          title: `第 ${idx+1} 场`,
          content: line,
          tasks: [] // Empty tasks initially
      }));
      updateEpisode(ep.id, { scenes: newScenes });
      toast.success(`按段落拆分为 ${newScenes.length} 场`);
  };

  const handleSegmentationAISplit = async (ep: ScriptEpisode) => {
      if(!ep.content) return toast.error("请先输入分集内容");
      setLoading(true);
      const toastId = toast.loading("AI 正在分析场次...");
      try {
          const scenes = await analyzeScript(ep.content);
          updateEpisode(ep.id, { scenes, status: 'analyzed' });
          toast.success(`AI 成功识别 ${scenes.length} 个场次`, { id: toastId });
      } catch(e) {
          toast.error("分析失败", { id: toastId });
      } finally {
          setLoading(false);
      }
  };

  const handleGenerateShotsForScene = async (sceneId: string, content: string) => {
      if(!currentEpisode) return;
      if(!content) return toast.error("场景内容为空");
      
      const toastId = toast.loading("正在生成分镜...");
      try {
          const tasks = await analyzeScene(content);
          const updatedScenes = currentEpisode.scenes.map(s => 
              s.id === sceneId ? { ...s, tasks } : s
          );
          updateEpisode(currentEpisode.id, { scenes: updatedScenes, status: 'analyzed' });
          toast.success(`生成 ${tasks.length} 个镜头`, { id: toastId });
      } catch(e) {
          toast.error("生成失败", { id: toastId });
      }
  };

  const handleUpdateTask = (sceneId: string, taskId: string, updates: Partial<Task>) => {
      if(!currentEpisode) return;
      const updatedScenes = currentEpisode.scenes.map(s => {
          if (s.id !== sceneId) return s;
          return {
              ...s,
              tasks: s.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
          };
      });
      updateEpisode(currentEpisode.id, { scenes: updatedScenes });
  };
  
  const handlePolishTaskPrompt = async (sceneId: string, taskId: string, currentPrompt: string) => {
      if (!currentPrompt) return;
      setPolishingTasks(prev => ({ ...prev, [taskId]: true }));
      try {
          const polished = await polishPrompt(currentPrompt);
          handleUpdateTask(sceneId, taskId, { prompt: polished });
          toast.success('Prompt 已润色');
      } catch (e) {
          toast.error('润色失败');
      } finally {
          setPolishingTasks(prev => ({ ...prev, [taskId]: false }));
      }
  };

  const handleConfirmSegmentation = () => {
      setEpisodeMode('storyboard');
  };

  // Helper to Render Asset Preview Grid (Generic)
  // Used for both Info tab (Global Assets) and Episodes tab (Episode Specific Assets)
  const renderAssetPreviewSection = (title: string, colorClass: string, assets: Asset[] | string[]) => (
      <div className="mb-6">
          <div className={`flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pl-2 border-l-2 ${colorClass}`}>
              {title} <span className="ml-2 bg-gray-800 text-gray-500 px-1.5 rounded">{assets.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
             <div className="aspect-square bg-gray-800 border border-gray-700 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-500 hover:bg-gray-700/50 transition-all group">
                 <Plus size={20} className="text-gray-600 group-hover:text-white" />
             </div>
             {assets.map((asset, idx) => {
                 // If asset is string (name) from extracted list, try to find real asset object
                 const assetName = typeof asset === 'string' ? asset : asset.name;
                 const realAsset = typeof asset === 'object' ? asset : project.assets.characters.find(a => a.name === assetName) || project.assets.scenes.find(a => a.name === assetName) || project.assets.props.find(a => a.name === assetName);
                 
                 return (
                     <div key={idx} className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-all cursor-pointer">
                         <img 
                            src={realAsset?.img || `https://picsum.photos/seed/${assetName}/150/150`} 
                            alt={assetName} 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                         />
                         <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1.5 backdrop-blur-sm">
                             <div className="text-[10px] text-gray-200 truncate text-center font-medium">{assetName}</div>
                         </div>
                     </div>
                 );
             })}
          </div>
      </div>
  );

  // ---------------- RENDER ----------------

  // 1. PROJECT LIST VIEW
  if (!currentDraftId || !currentDraft) {
    return (
      <div className="p-8 h-full overflow-y-auto custom-scrollbar">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
           <Sparkles className="mr-3 text-blue-500" /> AI 创作中心
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
           <div 
             onClick={handleCreateDraft}
             className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center p-8 text-gray-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-gray-800/80 transition-all cursor-pointer min-h-[220px]"
           >
              <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <span className="font-bold text-lg">新建创作项目</span>
           </div>
           {project.scripts?.map(draft => (
             <div 
               key={draft.id} 
               onClick={() => handleOpenDraft(draft.id)}
               className="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-blue-500 hover:-translate-y-1 transition-all cursor-pointer shadow-lg relative"
             >
                <div className="h-28 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center p-6 relative">
                   <button onClick={(e) => handleDeleteDraft(e, draft.id)} className="absolute top-3 right-3 p-1.5 bg-red-900/80 text-red-200 rounded hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Trash2 size={14} />
                   </button>
                   <FileText size={48} className="text-gray-600 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="p-5 border-t border-gray-700">
                   <h3 className="font-bold text-gray-200 truncate">{draft.title}</h3>
                   <div className="flex items-center text-xs text-gray-500 mt-4 space-x-4">
                      <span className="flex items-center"><Layout size={12} className="mr-1"/> {draft.episodes.length} 集</span>
                      <span className="flex items-center"><Calendar size={12} className="mr-1"/> {new Date(draft.updatedAt).toLocaleDateString()}</span>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>
    );
  }

  // 2. OVERVIEW / DASHBOARD (Upload & Episode List)
  if (view === 'overview') {
      return (
        <div className="flex h-full w-full bg-gray-900 overflow-hidden relative">
          {/* Overwrite Confirmation Modal */}
          {showOverwriteConfirm && (
              <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
                  <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md shadow-2xl">
                      <div className="flex items-center text-yellow-500 mb-4">
                          <AlertTriangle size={24} className="mr-2" />
                          <h3 className="text-lg font-bold">内容覆盖警告</h3>
                      </div>
                      <p className="text-gray-300 text-sm mb-6">
                          当前剧本中已存在拆解后的分集内容。继续操作将覆盖现有结构。
                          <br/><br/>
                          系统将自动为您存档当前版本，是否继续？
                      </p>
                      <div className="flex justify-end space-x-3">
                          <button 
                             onClick={() => setShowOverwriteConfirm(false)}
                             className="px-4 py-2 text-gray-400 hover:text-white"
                          >
                              取消
                          </button>
                          <button 
                             onClick={handleConfirmOverwrite}
                             className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold"
                          >
                              确认并存档
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* Overview Sidebar */}
          <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col shrink-0">
             <div className="p-4 border-b border-gray-700 flex items-center">
                <button onClick={() => setCurrentDraftId(null)} className="mr-2 text-gray-400 hover:text-white">
                   <ArrowLeft size={18} />
                </button>
                <span className="font-bold text-gray-200 truncate">{currentDraft.title}</span>
             </div>
             <div className="flex-1 py-4 px-2 space-y-1">
                <button onClick={() => setOverviewTab('info')} className={`w-full flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors ${overviewTab === 'info' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                  <Layout size={16} className="mr-3" /> 基础信息与导入
                </button>
                <button onClick={() => setOverviewTab('episodes')} className={`w-full flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors ${overviewTab === 'episodes' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                  <List size={16} className="mr-3" /> 分集管理
                </button>
             </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col bg-gray-900">
             {/* Tab: Info & Import */}
             {overviewTab === 'info' && (
               <div className="flex h-full">
                  {/* Left Column: Input */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                      <h3 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-2">基础信息</h3>
                      <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-400 mb-2">项目名称 (同步至资产中心)</label>
                        <input 
                          type="text" 
                          value={project.name}
                          onChange={(e) => onUpdateProject({ ...project, name: e.target.value })}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-400 mb-3">剧本导入</label>
                        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                            <div className="flex space-x-4 mb-4">
                                <div className="flex-1 border border-dashed border-gray-600 rounded-lg h-24 flex flex-col items-center justify-center text-gray-500 hover:text-blue-400 cursor-pointer transition-all">
                                    <UploadCloud size={24} className="mb-2" />
                                    <span className="text-sm">上传剧本文件 (.txt)</span>
                                </div>
                            </div>
                            <textarea 
                                className="w-full h-48 bg-gray-900 border border-gray-700 rounded p-4 text-gray-300 focus:border-blue-500 focus:outline-none font-mono text-sm leading-relaxed"
                                placeholder="在此粘贴剧本正文..."
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                            />
                            <div className="mt-4 flex justify-between items-center">
                                <span className="text-xs text-gray-500">提示: AI 拆解将自动提取角色、场景并同步至资产中心</span>
                                <button 
                                    onClick={handleSmartAnalyze}
                                    disabled={!importText && (!currentDraft?.episodes[0]?.content)}
                                    className="flex items-center px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm rounded-lg shadow-lg transition-all"
                                >
                                    <Split size={16} className="mr-2" /> AI 智能拆解分集 & 资产提取
                                </button>
                            </div>
                        </div>
                      </div>

                      {/* Archive / History Section */}
                      <div className="mb-8 border-t border-gray-700 pt-6">
                          <h4 className="text-sm font-bold text-gray-400 mb-4 flex items-center">
                              <ArchiveRestore size={16} className="mr-2" /> 历史版本存档
                          </h4>
                          {importArchives.length === 0 ? (
                              <div className="text-gray-600 text-sm italic">暂无历史存档</div>
                          ) : (
                              <div className="space-y-3">
                                  {importArchives.map((archive, idx) => (
                                      <div key={idx} className="bg-gray-800 border border-gray-700 rounded p-3 flex justify-between items-center">
                                          <div>
                                              <div className="text-xs text-gray-300 font-bold mb-1">
                                                  {new Date(archive.timestamp).toLocaleString()}
                                              </div>
                                              <div className="text-[10px] text-gray-500">{archive.note}</div>
                                          </div>
                                          <button 
                                            onClick={() => handleRestoreArchive(archive)}
                                            className="text-xs text-blue-400 hover:text-white border border-blue-900 bg-blue-900/20 px-3 py-1 rounded"
                                          >
                                              恢复内容
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Right Column: Asset Preview Sidebar (Global) */}
                  <div className="w-96 bg-gray-850 border-l border-gray-700 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                      <h3 className="text-sm font-bold text-white mb-6 flex items-center">
                          <Sparkles size={16} className="text-purple-500 mr-2"/> 涉及资产预览
                      </h3>
                      
                      {renderAssetPreviewSection('角色', 'border-blue-500', project.assets.characters)}
                      {renderAssetPreviewSection('场景', 'border-green-500', project.assets.scenes)}
                      {renderAssetPreviewSection('道具', 'border-orange-500', project.assets.props)}
                      
                      <div className="mt-8 p-4 bg-gray-800/50 rounded-lg text-xs text-gray-500 leading-relaxed border border-gray-700/50">
                          <p className="mb-2 font-bold text-gray-400">💡 说明</p>
                          <p>此处展示当前项目从剧本中识别到的核心资产。</p>
                          <p className="mt-2">您可以在此处快速预览，详细管理请前往左侧菜单的「资产中心」。</p>
                      </div>
                  </div>
               </div>
             )}

             {/* Tab: Episode List */}
             {overviewTab === 'episodes' && (
               <div className="flex h-full">
                   {/* Left: Episode Grid */}
                   <div className="flex-1 p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in-up">
                      <div className="flex justify-between items-center mb-6">
                         <h3 className="text-xl font-bold text-white flex items-center"><List className="mr-2 text-blue-500" /> 分集列表</h3>
                         <button onClick={handleAddEpisode} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg">
                            <Plus size={16} className="mr-2" /> 新增分集
                         </button>
                      </div>
                      {currentDraft.episodes.length === 0 ? (
                         <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/30 text-gray-500">
                             <Split size={48} className="mb-4 opacity-30" />
                             <p>暂无分集，请在"基础信息"中使用AI智能拆解</p>
                         </div>
                      ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                            {currentDraft.episodes.map(ep => (
                               <div 
                                    key={ep.id} 
                                    onClick={() => setSelectedEpisodeIdForPreview(ep.id)}
                                    className={`bg-gray-800 border rounded-xl overflow-hidden hover:border-blue-500 transition-all group shadow-md flex flex-col cursor-pointer relative ${selectedEpisodeIdForPreview === ep.id ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-700'}`}
                               >
                                  <div className="p-4 bg-gray-850 border-b border-gray-700 flex justify-between items-start">
                                     <div>
                                         <h4 className="font-bold text-white text-lg truncate w-48">{ep.title}</h4>
                                         <div className="text-xs text-gray-400 mt-1 flex items-center">
                                            <Clock size={10} className="mr-1" /> {ep.content.length} 字
                                         </div>
                                     </div>
                                     <span className="text-[10px] px-2 py-0.5 rounded bg-gray-700 text-gray-400">
                                        {ep.status === 'analyzed' ? '已拆解' : '待处理'}
                                     </span>
                                  </div>
                                  <div className="p-4 flex-1 text-sm text-gray-400 leading-relaxed overflow-hidden relative h-32">
                                     {ep.content.slice(0, 150)}...
                                     <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-gray-800 to-transparent"></div>
                                  </div>
                                  <div className="p-3 bg-gray-900 border-t border-gray-700">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleEnterEpisode(ep.id); }}
                                        className="w-full text-xs text-gray-300 hover:text-blue-400 flex items-center justify-center py-2 bg-gray-800 hover:bg-gray-750 rounded transition-colors font-medium"
                                     >
                                        <Edit3 size={14} className="mr-2" /> 进入场次拆解
                                     </button>
                                  </div>
                               </div>
                            ))}
                         </div>
                      )}
                   </div>

                   {/* Right: Episode-Specific Asset Sidebar */}
                   <div className="w-96 bg-gray-850 border-l border-gray-700 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center">
                                <Box size={16} className="text-blue-500 mr-2"/> 分集资产
                            </h3>
                            {selectedEpisodeIdForPreview && (
                                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded truncate max-w-[150px]">
                                    {currentDraft.episodes.find(e => e.id === selectedEpisodeIdForPreview)?.title}
                                </span>
                            )}
                        </div>

                        {selectedEpisodeIdForPreview ? (
                            (() => {
                                const selectedEp = currentDraft.episodes.find(e => e.id === selectedEpisodeIdForPreview);
                                if (!selectedEp || !selectedEp.extractedAssets) {
                                    return <div className="text-gray-500 text-xs text-center py-10">该分集暂无资产数据</div>;
                                }
                                return (
                                    <>
                                        {renderAssetPreviewSection('角色', 'border-blue-500', selectedEp.extractedAssets.characters)}
                                        {renderAssetPreviewSection('场景', 'border-green-500', selectedEp.extractedAssets.scenes)}
                                        {renderAssetPreviewSection('道具', 'border-orange-500', selectedEp.extractedAssets.props)}
                                        
                                        {(selectedEp.extractedAssets.characters.length === 0 && selectedEp.extractedAssets.scenes.length === 0 && selectedEp.extractedAssets.props.length === 0) && (
                                            <div className="text-gray-500 text-xs text-center py-10 border border-dashed border-gray-700 rounded-lg">
                                                <p>该分集未检测到独立资产</p>
                                                <p className="mt-1 opacity-50">请尝试重新进行 AI 拆解</p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                <List size={32} className="mb-4 opacity-20" />
                                <p className="text-sm">请选择左侧分集</p>
                                <p className="text-xs opacity-50">查看该集关联资产</p>
                            </div>
                        )}
                   </div>
               </div>
             )}
          </div>
        </div>
      );
  }

  // 3. EPISODE DETAIL VIEW (Segmentation & Storyboard)
  if (view === 'episode_detail' && currentEpisode) {
      return (
        <div className="flex flex-col h-full bg-gray-900 animate-fade-in-up relative">
            {/* Header: Detail View Navigation */}
            <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 shrink-0 z-20">
                <div className="flex items-center space-x-2 text-sm">
                    {/* Breadcrumbs */}
                    <button 
                        onClick={() => setCurrentDraftId(null)}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        剧本列表
                    </button>
                    <span className="text-gray-600">/</span>
                    <button 
                         onClick={() => setView('overview')}
                         className="text-gray-400 hover:text-white transition-colors max-w-[150px] truncate"
                    >
                         {currentDraft.title}
                    </button>
                    <span className="text-gray-600">/</span>
                    <span className="font-bold text-white flex items-center bg-gray-700/50 px-2 py-1 rounded">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                        {currentEpisode.title}
                    </span>
                </div>
                
                {/* Mode Switcher */}
                <div className="flex bg-gray-700 rounded-lg p-1 border border-gray-600">
                    <button 
                        onClick={() => setEpisodeMode('segmentation')}
                        className={`px-4 py-1.5 text-xs font-bold rounded transition-colors flex items-center ${episodeMode === 'segmentation' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Split size={14} className="mr-2"/> 场次拆解
                    </button>
                    <button 
                        onClick={() => setEpisodeMode('storyboard')}
                        className={`px-4 py-1.5 text-xs font-bold rounded transition-colors flex items-center ${episodeMode === 'storyboard' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Film size={14} className="mr-2"/> 分镜制作表
                    </button>
                </div>

                <div className="flex items-center space-x-3 w-40 justify-end">
                     {/* Dynamic Action Button based on Mode */}
                     {episodeMode === 'segmentation' ? (
                         <button 
                            onClick={handleConfirmSegmentation}
                            className="text-blue-400 hover:text-white text-sm font-bold flex items-center transition-colors"
                         >
                            下一步: 分镜表 <ChevronRight size={16} />
                         </button>
                     ) : (
                        <button 
                            onClick={() => onEnterProduction(currentEpisode.id, 'workbench_i2v')}
                            className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold shadow flex items-center transition-all"
                        >
                            <PlayCircle size={14} className="mr-2" /> 进入视频制作
                        </button>
                     )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-1 overflow-hidden relative z-0">
                
                {/* MODE A: SEGMENTATION (Visual Module) */}
                {episodeMode === 'segmentation' && (
                    <div className="flex w-full h-full">
                        {/* Left: Content Editor */}
                        <div className="w-1/2 border-r border-gray-700 flex flex-col bg-gray-850">
                            <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                                <h4 className="text-sm font-bold text-gray-300 flex items-center">
                                    <FileText size={16} className="mr-2 text-blue-400"/> 分集内容
                                </h4>
                                <div className="flex space-x-2">
                                    <button 
                                        onClick={() => handleSegmentationManualSplit(currentEpisode)}
                                        className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded flex items-center transition-colors"
                                    >
                                        <AlignLeft size={12} className="mr-1"/> 手动按段落拆分
                                    </button>
                                    <button 
                                        onClick={() => handleSegmentationAISplit(currentEpisode)}
                                        disabled={loading}
                                        className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded flex items-center shadow transition-colors disabled:opacity-50"
                                    >
                                        <Sparkles size={12} className="mr-1"/> AI 智能拆解场次
                                    </button>
                                </div>
                            </div>
                            <textarea 
                                className="flex-1 w-full bg-gray-900 text-gray-300 p-6 focus:outline-none resize-none font-mono text-base leading-relaxed custom-scrollbar"
                                placeholder="请输入分集剧本内容..."
                                value={currentEpisode.content}
                                onChange={(e) => updateEpisode(currentEpisode.id, { content: e.target.value })}
                            />
                            <div className="p-2 bg-gray-800 border-t border-gray-700 text-right text-xs text-gray-500">
                                {currentEpisode.content.length} 字
                            </div>
                        </div>

                        {/* Right: Scene List */}
                        <div className="w-1/2 flex flex-col bg-gray-900">
                            <div className="p-3 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
                                <h4 className="text-sm font-bold text-gray-300 flex items-center">
                                    <Split size={16} className="mr-2 text-green-400"/> 
                                    切分后的列表 
                                    <span className="ml-2 bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full text-xs">{currentEpisode.scenes.length} 条</span>
                                </h4>
                                <button 
                                    onClick={() => {
                                        const newScene: Scene = {
                                            id: `sc_new_${Date.now()}`,
                                            title: `新场次 ${currentEpisode.scenes.length + 1}`,
                                            content: '',
                                            tasks: []
                                        };
                                        updateEpisode(currentEpisode.id, { scenes: [...currentEpisode.scenes, newScene] });
                                    }}
                                    className="text-xs text-blue-400 hover:text-white flex items-center"
                                >
                                    <Plus size={14} className="mr-1"/> 新增场次
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                                {currentEpisode.scenes.length > 0 ? (
                                    currentEpisode.scenes.map((scene, idx) => (
                                        <div key={scene.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 group hover:border-blue-500 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center">
                                                    <span className="text-gray-500 font-mono text-xs w-6">{idx + 1}</span>
                                                    <input 
                                                        className="bg-transparent font-bold text-gray-200 text-sm focus:outline-none focus:text-blue-400 border-b border-transparent focus:border-blue-500 transition-colors"
                                                        value={scene.title}
                                                        onChange={(e) => {
                                                            const updatedScenes = [...currentEpisode.scenes];
                                                            updatedScenes[idx] = { ...scene, title: e.target.value };
                                                            updateEpisode(currentEpisode.id, { scenes: updatedScenes });
                                                        }}
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const updatedScenes = currentEpisode.scenes.filter(s => s.id !== scene.id);
                                                        updateEpisode(currentEpisode.id, { scenes: updatedScenes });
                                                    }}
                                                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <textarea 
                                                className="w-full bg-gray-900/50 rounded p-2 text-xs text-gray-400 border border-transparent focus:border-gray-600 focus:outline-none resize-y min-h-[60px]"
                                                value={scene.content || ''}
                                                placeholder="场次内容..."
                                                onChange={(e) => {
                                                    const updatedScenes = [...currentEpisode.scenes];
                                                    updatedScenes[idx] = { ...scene, content: e.target.value };
                                                    updateEpisode(currentEpisode.id, { scenes: updatedScenes });
                                                }}
                                            />
                                            <div className="mt-2 flex items-center justify-between">
                                                 <span className="text-[10px] text-gray-600">包含 {scene.tasks.length} 个预设镜头</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                                        <AlignLeft size={48} className="mb-4" />
                                        <p>点击上方 "AI 智能拆解" 或 "手动拆分"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* MODE B: STORYBOARD (Redesigned 3-Area Layout) */}
                {episodeMode === 'storyboard' && (
                     <div className="flex w-full h-full bg-gray-950">
                         {/* Main Storyboard List */}
                         <div className="flex-1 overflow-auto p-8 custom-scrollbar w-full">
                             {currentEpisode.scenes.length > 0 ? (
                                 <div className="space-y-12 pb-20 max-w-[1400px] mx-auto">
                                     {currentEpisode.scenes.map((scene) => (
                                         <div key={scene.id} className="animate-fade-in-up">
                                             <div className="flex items-center justify-between mb-4 sticky top-0 bg-gray-950 z-10 py-3 border-b border-gray-800/50">
                                                 <div className="flex items-center">
                                                    <div className="bg-blue-600 w-1.5 h-6 mr-3 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                                                    <h3 className="text-xl font-bold text-white tracking-wide">{scene.title}</h3>
                                                    <span className="ml-4 text-xs bg-gray-900 text-gray-500 px-3 py-1 rounded-full border border-gray-800 font-mono">
                                                        {scene.tasks.length} 镜头 (SHOTS)
                                                    </span>
                                                 </div>
                                                 {/* Shot Generator Feature */}
                                                 {scene.tasks.length === 0 && (
                                                     <button 
                                                        onClick={() => handleGenerateShotsForScene(scene.id, scene.content)}
                                                        className="text-xs flex items-center bg-blue-900/20 hover:bg-blue-900/40 border border-blue-500/30 text-blue-400 px-4 py-1.5 rounded-full transition-all"
                                                     >
                                                        <Wand2 size={12} className="mr-2"/> AI 生成分镜列表
                                                     </button>
                                                 )}
                                             </div>
                                             
                                             <p className="text-gray-400 text-sm mb-6 pl-5 border-l-2 border-gray-800 italic max-w-5xl leading-relaxed">
                                                {scene.content}
                                             </p>
                                             
                                             {scene.tasks.length === 0 ? (
                                                 <div className="p-12 text-center text-gray-600 text-sm bg-gray-900/50 border-2 border-dashed border-gray-800 rounded-xl">
                                                     暂无镜头数据，请点击上方按钮生成。
                                                 </div>
                                             ) : (
                                                 <div className="grid grid-cols-1 gap-6">
                                                    {scene.tasks.map((task, idx) => (
                                                        <div 
                                                            key={task.id} 
                                                            onClick={() => setActiveStoryboardTaskId(task.id)}
                                                            className={`bg-gray-900 border rounded-xl p-0 flex flex-col lg:flex-row transition-all shadow-lg overflow-hidden group ${activeStoryboardTaskId === task.id ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-gray-800 hover:border-gray-700'}`}
                                                        >
                                                            {/* AREA A: Visual Thumbnail (Left) */}
                                                            <div className="w-full lg:w-72 bg-black flex-shrink-0 relative group/thumb border-b lg:border-b-0 lg:border-r border-gray-800">
                                                                <div className="aspect-video w-full h-full relative">
                                                                    {task.keyframeImage ? (
                                                                        <img src={task.keyframeImage} className="w-full h-full object-cover" alt="Keyframe" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-gray-900/50">
                                                                            <ImageIcon size={32} className="mb-2 opacity-30"/>
                                                                            <span className="text-xs font-mono">暂无画面</span>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* Overlay Actions */}
                                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); onEnterProduction(currentEpisode.id, 'workbench_t2i'); }}
                                                                            className="w-10 h-10 bg-green-600 rounded-full text-white hover:bg-green-500 shadow-lg flex items-center justify-center transform hover:scale-110 transition-all border border-white/20"
                                                                            title="重新生成"
                                                                        >
                                                                            <RefreshCcw size={18} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); setHistoryModalData({ sceneId: scene.id, task }); }}
                                                                            className="w-10 h-10 bg-gray-700 rounded-full text-white hover:bg-gray-600 shadow-lg flex items-center justify-center transform hover:scale-110 transition-all border border-white/20"
                                                                            title="查看历史"
                                                                        >
                                                                            <History size={18} />
                                                                        </button>
                                                                    </div>
                                                                    
                                                                    {/* Status Badge */}
                                                                    <div className="absolute top-2 left-2">
                                                                         {task.keyframeImage ? (
                                                                             <span className="bg-green-500/90 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm flex items-center">
                                                                                 <CheckCircle size={8} className="mr-1"/> 已完成
                                                                             </span>
                                                                         ) : (
                                                                             <span className="bg-gray-700/80 text-gray-300 text-[9px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm">待生成</span>
                                                                         )}
                                                                    </div>
                                                                    
                                                                    {/* Generate Video Button Overlay (Bottom Right) */}
                                                                    {task.keyframeImage && (
                                                                        <div className="absolute bottom-3 right-3 z-10">
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); onEnterProduction(currentEpisode.id, 'workbench_i2v'); }}
                                                                                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold shadow-lg flex items-center border border-green-400/30 transform hover:-translate-y-0.5 transition-all"
                                                                            >
                                                                                <Video size={12} className="mr-1.5"/> 生成视频
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* AREA B: Core Info & Plot (Middle) */}
                                                            <div className="flex-1 p-5 flex flex-col gap-4 border-r border-gray-800 bg-gray-900/50">
                                                                
                                                                {/* Row 1: Metadata Grid */}
                                                                <div className="grid grid-cols-5 gap-3">
                                                                    <div className="col-span-1">
                                                                        <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">镜号</label>
                                                                        <input 
                                                                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none font-mono text-center"
                                                                            value={task.shotNumber || `${idx + 1}A`}
                                                                            onChange={(e) => handleUpdateTask(scene.id, task.id, { shotNumber: e.target.value })}
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-1">
                                                                        <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">景别</label>
                                                                        <select
                                                                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none appearance-none truncate"
                                                                            value={task.breakdown?.composition || 'MS'}
                                                                            onChange={(e) => handleUpdateTask(scene.id, task.id, { breakdown: { ...task.breakdown, composition: e.target.value } })}
                                                                        >
                                                                            {SHOT_SIZES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                                        </select>
                                                                    </div>
                                                                    <div className="col-span-1">
                                                                        <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">视角</label>
                                                                        <select 
                                                                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none appearance-none truncate"
                                                                            value={task.cameraAngle || 'Eye-level'}
                                                                            onChange={(e) => handleUpdateTask(scene.id, task.id, { cameraAngle: e.target.value })}
                                                                        >
                                                                            {CAMERA_ANGLES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                                        </select>
                                                                    </div>
                                                                    <div className="col-span-1">
                                                                        <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">运镜</label>
                                                                        <select 
                                                                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none appearance-none truncate"
                                                                            value={task.cameraMovement || 'Static'}
                                                                            onChange={(e) => handleUpdateTask(scene.id, task.id, { cameraMovement: e.target.value })}
                                                                        >
                                                                            {CAMERA_MOVEMENTS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                                        </select>
                                                                    </div>
                                                                    <div className="col-span-1">
                                                                        <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">时长</label>
                                                                        <select 
                                                                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none appearance-none text-center"
                                                                            value={task.duration || '3s'}
                                                                            onChange={(e) => handleUpdateTask(scene.id, task.id, { duration: e.target.value })}
                                                                        >
                                                                            {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Row 2: Script Content */}
                                                                <div className="flex-1">
                                                                    <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">脚本内容</label>
                                                                    <div className="bg-gray-800/40 p-3 rounded border-l-4 border-blue-500/50 hover:border-blue-500 transition-colors">
                                                                        <textarea
                                                                            className="w-full bg-transparent border-none text-sm text-gray-200 resize-none focus:ring-0 p-0 leading-relaxed font-medium placeholder-gray-600"
                                                                            rows={2}
                                                                            value={task.script}
                                                                            onChange={(e) => handleUpdateTask(scene.id, task.id, { script: e.target.value })}
                                                                            placeholder="输入镜头画面描述..."
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Row 3: Sound */}
                                                                <div>
                                                                    <div className="flex items-center gap-2 bg-gray-800 rounded px-3 py-2 border border-gray-700/50 focus-within:border-gray-500 focus-within:bg-gray-800">
                                                                        <Volume2 size={14} className="text-gray-500 flex-shrink-0" />
                                                                        <span className="text-[10px] text-gray-500 font-bold uppercase mr-1">SFX:</span>
                                                                        <input 
                                                                            className="w-full bg-transparent border-none text-xs text-gray-300 placeholder-gray-600 focus:ring-0 p-0"
                                                                            placeholder="音效描述 (例如: 雨声, 远处警笛)..."
                                                                            value={task.sound || ''}
                                                                            onChange={(e) => handleUpdateTask(scene.id, task.id, { sound: e.target.value })}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* AREA C: AI Prompt Engineering (Right) */}
                                                            <div className="w-full lg:w-80 p-5 bg-gray-900 flex flex-col gap-3">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center">
                                                                        <Sparkles size={10} className="mr-1 text-purple-500"/> AI 提示词 (Prompt)
                                                                    </span>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handlePolishTaskPrompt(scene.id, task.id, task.prompt); }}
                                                                        disabled={polishingTasks[task.id]}
                                                                        className="text-[10px] bg-purple-900/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 hover:bg-purple-900/40 transition-colors flex items-center"
                                                                    >
                                                                        {polishingTasks[task.id] ? <RefreshCcw size={10} className="animate-spin mr-1"/> : <Wand2 size={10} className="mr-1"/>}
                                                                        AI 润色
                                                                    </button>
                                                                </div>
                                                                <div className="relative flex-1">
                                                                    <textarea 
                                                                        className="w-full h-full min-h-[140px] bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none resize-none leading-relaxed custom-scrollbar font-mono"
                                                                        value={task.prompt}
                                                                        placeholder="AI 生成的图像提示词将显示在这里..."
                                                                        onChange={(e) => handleUpdateTask(scene.id, task.id, { prompt: e.target.value })}
                                                                    />
                                                                    <div className="absolute bottom-2 right-2 text-[9px] text-gray-600 pointer-events-none">
                                                                        仅限英文输入 (模型要求)
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                 </div>
                                             )}
                                         </div>
                                     ))}
                                 </div>
                             ) : (
                                 <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                     <Split size={64} className="mb-6 opacity-20" />
                                     <p className="text-lg font-medium mb-2">未进行场次拆解</p>
                                     <button 
                                        onClick={() => setEpisodeMode('segmentation')}
                                        className="text-blue-500 hover:underline"
                                     >
                                        返回进行拆解
                                     </button>
                                 </div>
                             )}
                         </div>
                     </div>
                )}
            </div>

            {/* History Modal */}
            {historyModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setHistoryModalData(null)}>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-gray-700">
                            <h3 className="text-lg font-bold text-white flex items-center">
                                <History size={18} className="mr-2 text-blue-400"/>
                                版本历史: {historyModalData.task.title}
                            </h3>
                            <button onClick={() => setHistoryModalData(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-2 md:grid-cols-3 gap-4">
                            {historyModalData.task.versions.filter(v => v.type === 'image').length === 0 && (
                                <div className="col-span-3 text-center text-gray-500 py-10">
                                    暂无历史版本
                                </div>
                            )}
                            {[...historyModalData.task.versions].filter(v => v.type === 'image').reverse().map((version) => (
                                <div 
                                    key={version.id}
                                    onClick={() => {
                                        handleUpdateTask(historyModalData.sceneId, historyModalData.task.id, { keyframeImage: version.imgUrl });
                                        setHistoryModalData(null);
                                        toast.success('已恢复选定版本');
                                    }}
                                    className={`group relative aspect-video bg-black rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${historyModalData.task.keyframeImage === version.imgUrl ? 'border-green-500 ring-1 ring-green-500/50' : 'border-gray-700 hover:border-blue-500'}`}
                                >
                                    <img src={version.imgUrl} className="w-full h-full object-cover" alt="Version"/>
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-4 flex justify-between items-end">
                                        <span className="text-[10px] text-gray-300 font-mono">{new Date(version.timestamp).toLocaleTimeString()}</span>
                                        {historyModalData.task.keyframeImage === version.imgUrl && (
                                            <span className="text-[10px] bg-green-600 text-white px-1.5 rounded">当前应用</span>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded shadow">恢复此版本</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      );
  }

  return null;
};
