

import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { AssetHub } from './pages/AssetHub';
import { AssetHubDetail } from './pages/AssetHubDetail';
import { Workbench } from './pages/Workbench';
import { ScriptCenter, ScriptCenterState } from './pages/ScriptCenter';
import { Project, Role, PageType, WorkbenchMode, Asset } from './types';
import { INITIAL_PROJECTS } from './constants';
import { CreateAssetModal } from './components/modals/CreateAssetModal';
import { Toaster } from 'react-hot-toast';

const PAGE_TITLES: Record<string, string> = {
  dashboard: '项目看板',
  assets: '资产中心',
  assets_detail: '资产详情',
  creation_center: 'AI 创作中心',
};

const App: React.FC = () => {
  const [currentUserRole, setCurrentUserRole] = useState<Role>('production');
  const [currentPage, setCurrentPage] = useState<PageType>('creation_center');
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [currentProjectId, setCurrentProjectId] = useState<string>(INITIAL_PROJECTS[0].id);
  
  // 创作中心状态管理
  const [creationMode, setCreationMode] = useState<'management' | 'production'>('management');
  const [workbenchMode, setWorkbenchMode] = useState<WorkbenchMode>('workbench_t2i');
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  
  // Create Asset Modal State
  const [isCreateAssetModalOpen, setIsCreateAssetModalOpen] = useState(false);
  const [createAssetInitialData, setCreateAssetInitialData] = useState<Partial<Asset> | undefined>(undefined);

  // Script Center State Persistence
  const [scriptCenterState, setScriptCenterState] = useState<ScriptCenterState>({ 
      view: 'overview', 
      draftId: null, 
      overviewTab: 'info',
      activeEpisodeId: null,
      episodeMode: 'segmentation'
  });

  // Helper to get current project
  const currentProject = projects.find(p => p.id === currentProjectId) || projects[0];

  const updateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  // Helper to create a brand new project structure
  const createNewProject = (): Project => {
      const newProject: Project = {
          id: `p_${Date.now()}`,
          name: '新剧本项目',
          status: '草稿',
          type: '未分类',
          cover: 'https://picsum.photos/seed/new/400/250',
          assets: { characters: [], scenes: [], props: [] },
          scenes: [],
          scripts: [
              {
                  id: `sd_${Date.now()}`,
                  title: '初版草案',
                  updatedAt: Date.now(),
                  status: '草稿',
                  episodes: []
              }
          ]
      };
      setProjects(prev => [...prev, newProject]);
      setCurrentProjectId(newProject.id);
      
      // Reset Script Center State for the new project
      setScriptCenterState({
          view: 'overview',
          draftId: newProject.scripts[0].id,
          overviewTab: 'info',
          activeEpisodeId: null,
          episodeMode: 'segmentation'
      });
      
      return newProject;
  };

  // 进入制作流水线
  const handleEnterProduction = (episodeId: string, mode: WorkbenchMode = 'workbench_t2i') => {
    setActiveEpisodeId(episodeId);
    setWorkbenchMode(mode);
    setCreationMode('production');
  };

  // 返回剧本管理
  const handleBackToScript = () => {
    setCreationMode('management');
    // activeEpisodeId 可以保留，或者清空，视需求而定。保留可以让用户返回时高亮该分集。
  };

  const handleOpenCreateAsset = (initialData?: Partial<Asset>) => {
      setCreateAssetInitialData(initialData);
      setIsCreateAssetModalOpen(true);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard projects={projects} onSelectProject={(id) => { 
            setCurrentProjectId(id); 
            setCurrentPage('assets'); 
            // Reset state on project switch
            setScriptCenterState({ 
                view: 'overview', 
                draftId: null, 
                overviewTab: 'info',
                activeEpisodeId: null,
                episodeMode: 'segmentation'
            }); 
        }} />;
      case 'assets':
        return <AssetHub project={currentProject} onNavigate={(page) => setCurrentPage(page)} onCreateAsset={() => handleOpenCreateAsset()} />;
      case 'assets_detail':
        return <AssetHubDetail 
                  project={currentProject} 
                  onBack={() => setCurrentPage('assets')} 
                  onCreateAsset={(data) => handleOpenCreateAsset(data)}
                  onUpdateProject={updateProject} 
               />;
      case 'creation_center':
        if (creationMode === 'production') {
           return (
             <Workbench 
                mode={workbenchMode} 
                project={currentProject} 
                activeEpisodeId={activeEpisodeId} 
                onUpdateProject={updateProject} 
                onChangeEpisode={setActiveEpisodeId}
                onBack={handleBackToScript} // 新增返回回调
             />
           );
        }
        return (
            <ScriptCenter 
                project={currentProject} 
                onUpdateProject={updateProject} 
                onEnterProduction={handleEnterProduction}
                initialState={scriptCenterState}
                onStateChange={setScriptCenterState}
                onCreateProject={createNewProject}
            />
        );
      default:
        return <div className="flex items-center justify-center h-full text-gray-500">页面建设中...</div>;
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-900 text-white font-sans overflow-hidden">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1F2937', color: '#fff', border: '1px solid #374151' } }} />
      
      {/* Sidebar */}
      <Sidebar 
        role={currentUserRole} 
        currentPage={currentPage} 
        onNavigate={(page) => {
            setCurrentPage(page);
            // 切换一级菜单时，重置创作模式
            if (page === 'creation_center') setCreationMode('management');
        }} 
        onRoleChange={setCurrentUserRole} 
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
        {/* Header */}
        <header className="bg-gray-800 h-14 flex items-center justify-between px-6 border-b border-gray-700 shrink-0 z-20 shadow-sm">
          <div className="flex items-center text-sm font-medium text-gray-200">
             <span className="mr-2 text-xl opacity-75">
               {currentPage === 'creation_center' ? '✨' : currentPage === 'assets' ? '📂' : '📊'}
             </span>
             <span className="capitalize">{PAGE_TITLES[currentPage] || currentPage}</span>
             
             {/* 面包屑导航补充 */}
             {currentPage === 'creation_center' && creationMode === 'production' && activeEpisodeId && (
               <>
                 <span className="mx-2 text-gray-600">/</span>
                 <span className="text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded text-xs border border-blue-900/50 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
                    制作中: {currentProject.scripts.flatMap(s => s.episodes).find(e => e.id === activeEpisodeId)?.title || '未知分集'}
                 </span>
               </>
             )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-xs text-gray-400 bg-gray-750 px-3 py-1.5 rounded-full border border-gray-700 flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              当前项目: {currentProject.name}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden relative bg-gray-900">
          {renderContent()}
        </div>
      </main>

      {/* Modals */}
      {isCreateAssetModalOpen && (
        <CreateAssetModal 
          isOpen={isCreateAssetModalOpen} 
          initialData={createAssetInitialData}
          onClose={() => { setIsCreateAssetModalOpen(false); setCreateAssetInitialData(undefined); }}
          onSave={(asset) => {
             const updated = { ...currentProject };
             const collection = asset.type === 'character' ? 'characters' : asset.type === 'scene' ? 'scenes' : 'props';
             updated.assets[collection] = [...updated.assets[collection], asset];
             updateProject(updated);
             setIsCreateAssetModalOpen(false);
             setCreateAssetInitialData(undefined);
          }}
        />
      )}
    </div>
  );
};

export default App;
