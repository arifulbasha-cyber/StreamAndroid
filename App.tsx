import React, { useState, useEffect, useMemo } from 'react';
import { ICONS, APP_CONFIG } from './constants';
import { FileSystemItem, FileType, User, WatchHistoryItem, getFileType, DriveConfig, StorageQuota } from './types';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import VideoPlayer from './components/VideoPlayer';
import { performSmartSearch } from './services/geminiService';
import { initGapi, nativeSignIn, nativeSignOut, initNativeAuth, listFiles, listSharedFiles, getStorageQuota, formatBytes, setGapiToken } from './services/driveService';

// --- Components ---

const SettingsModal: React.FC<{ 
    onClose: () => void, 
    onSave: (config: DriveConfig) => void,
    initialConfig: DriveConfig | null 
}> = ({ onClose, onSave, initialConfig }) => {
    const [clientId, setClientId] = useState(initialConfig?.clientId || '');
    const [apiKey, setApiKey] = useState(initialConfig?.apiKey || '');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (clientId && apiKey) onSave({ clientId, apiKey });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-[#37474F] rounded-lg p-6 shadow-2xl relative text-slate-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
                <h2 className="text-xl font-bold text-white mb-4">API Configuration</h2>
                <p className="text-xs text-slate-400 mb-4">
                    Please enter your Google Cloud Project credentials.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Client ID</label>
                        <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full px-4 py-2 rounded bg-[#263238] border border-slate-600 text-white focus:border-blue-500 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">API Key</label>
                        <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full px-4 py-2 rounded bg-[#263238] border border-slate-600 text-white focus:border-blue-500 outline-none" required />
                    </div>
                    <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-lg">Save</button>
                </form>
            </div>
        </div>
    );
}

const LoginScreen: React.FC<{ 
    onLogin: () => void, 
    isLoading: boolean, 
    onOpenSettings: () => void,
    isConfigured: boolean
}> = ({ onLogin, isLoading, onOpenSettings, isConfigured }) => {
  return (
    <div className="min-h-screen bg-[#263238] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden ring-4 ring-blue-500/20">
          <span className="text-3xl font-bold text-white">CX</span>
      </div>
      
      <h1 className="text-xl font-medium text-white mb-1">Welcome</h1>
      <p className="text-slate-400 mb-12 text-sm">Sign in to access your cloud storage</p>
      
      {isConfigured ? (
          <button
            onClick={onLogin}
            disabled={isLoading}
            className="w-full max-w-xs py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded shadow-lg active:scale-95 transition-all flex items-center justify-center"
          >
            {isLoading ? "Connecting..." : "Sign in with Google"}
          </button>
      ) : (
           <button
            onClick={onOpenSettings}
            className="w-full max-w-xs py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded shadow-lg active:scale-95 transition-all"
          >
            Configure Access
          </button>
      )}

      <button onClick={onOpenSettings} className="mt-8 text-slate-600 hover:text-slate-400 p-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.43.816 1.035.816 1.73 0 .695-.32 1.3-.816 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
          </svg>
      </button>
    </div>
  );
}

// --- Main App ---

const App: React.FC = () => {
  const [config, setConfig] = useState<DriveConfig | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDriveReady, setIsDriveReady] = useState(false);

  const [files, setFiles] = useState<FileSystemItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [folderNameMap, setFolderNameMap] = useState<Record<string, string>>({'root': 'Main Storage'});
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);
  const [currentView, setCurrentView] = useState<'files' | 'history' | 'favorites'>('files');
  const [playingFile, setPlayingFile] = useState<FileSystemItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[] | null>(null);

  // --- Init Logic ---
  useEffect(() => {
    const savedHistory = localStorage.getItem('watchHistory');
    if (savedHistory) try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
    
    const savedConfig = localStorage.getItem('driveConfig');
    let effectiveConfig = APP_CONFIG.CLIENT_ID ? { clientId: APP_CONFIG.CLIENT_ID, apiKey: APP_CONFIG.API_KEY } : (savedConfig ? JSON.parse(savedConfig) : null);

    // Initialize Native Auth with Client ID if available
    initNativeAuth(effectiveConfig?.clientId);

    if (effectiveConfig) {
        setConfig(effectiveConfig);
        const savedToken = localStorage.getItem('accessToken');
        const savedUser = localStorage.getItem('user');
        
        initGapi(effectiveConfig.apiKey).then(() => {
             if (savedToken && savedUser) {
                setAccessToken(savedToken);
                setGapiToken(savedToken);
                setUser(JSON.parse(savedUser));
                setIsDriveReady(true);
            }
        }).catch(err => console.error(err));
    }

    const handlePopState = (event: PopStateEvent) => {
        if (event.state && event.state.folderId) {
            setCurrentFolderId(event.state.folderId);
        } else {
            setCurrentFolderId('root');
        }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogin = async () => {
      if (!config) { setShowSettings(true); return; }
      
      try {
          // Re-init with explicit ID just in case
          initNativeAuth(config.clientId);
          
          const response = await nativeSignIn();
          
          if (response.authentication.accessToken) {
            const token = response.authentication.accessToken;
            const u: User = { 
                name: response.displayName || response.givenName || 'User',
                email: response.email,
                picture: response.imageUrl 
            };
            
            setAccessToken(token);
            setGapiToken(token);
            setUser(u);
            setIsDriveReady(true);
            
            localStorage.setItem('accessToken', token);
            localStorage.setItem('user', JSON.stringify(u));
          }
      } catch (e) {
          console.error("Login failed", e);
          alert("Login failed. Please check your Client ID configuration.");
      }
  };
  
  const handleSaveConfig = (newConfig: DriveConfig) => {
      localStorage.setItem('driveConfig', JSON.stringify(newConfig));
      setConfig(newConfig);
      setShowSettings(false);
      // Re-initialize services with new config
      initNativeAuth(newConfig.clientId);
      initGapi(newConfig.apiKey).catch(console.error);
  };

  const handleLogout = async () => {
    await nativeSignOut();
    setUser(null);
    setAccessToken(null);
    setGapiToken('');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
    setIsDriveReady(false);
  };

  useEffect(() => {
      if (accessToken && isDriveReady) {
          if (currentView === 'files') {
            loadFiles(currentFolderId);
            loadStorageQuota();
          } else if (currentView === 'favorites') {
              loadSharedFiles();
          }
      }
  }, [accessToken, currentFolderId, currentView, isDriveReady]);

  const loadStorageQuota = async () => {
      const quota = await getStorageQuota();
      if (quota) setStorageQuota(quota);
  }

  const loadFiles = async (folderId: string) => {
      setIsLoadingFiles(true);
      try {
          const driveFiles = await listFiles(folderId);
          setFiles(driveFiles);
      } catch (e) { console.error(e); } 
      finally { setIsLoadingFiles(false); }
  };

  const loadSharedFiles = async () => {
      setIsLoadingFiles(true);
      try {
          const shared = await listSharedFiles();
          setFiles(shared);
      } catch (e) { console.error(e); }
      finally { setIsLoadingFiles(false); }
  };

  const handleUpdateHistory = (fileId: string, progress: number, duration: number) => {
    const fileMeta = files.find(f => f.id === fileId) || playingFile;
    setHistory(prev => {
        const idx = prev.findIndex(h => h.fileId === fileId);
        const newItem: WatchHistoryItem = { 
            fileId, progress, duration, timestamp: Date.now(),
            name: fileMeta?.name || prev[idx]?.name || 'Unknown',
            thumbnail: fileMeta?.thumbnail || prev[idx]?.thumbnail,
            mimeType: fileMeta?.mimeType || prev[idx]?.mimeType,
            size: fileMeta?.size || prev[idx]?.size
        };
        const newHistory = idx >= 0 ? [...prev] : [newItem, ...prev];
        if (idx >= 0) newHistory[idx] = newItem;
        localStorage.setItem('watchHistory', JSON.stringify(newHistory));
        return newHistory;
    });
  };

  const navigateToFolder = (id: string, name: string) => {
      setFolderNameMap(prev => ({...prev, [id]: name}));
      window.history.pushState({ folderId: id }, '', `#folder/${id}`);
      setCurrentFolderId(id);
      setSearchQuery('');
      setSearchResults(null);
  };

  const handleBackNavigation = () => {
      if (currentFolderId !== 'root') {
          if (window.history.state && window.history.state.folderId) {
             window.history.back();
          } else {
             navigateToFolder('root', 'Main Storage');
          }
      }
  };

  const handleSmartSearch = async () => {
      if (!searchQuery.trim()) return;
      try {
          const response = await window.gapi.client.drive.files.list({
              q: `name contains '${searchQuery}' and trashed = false`,
              fields: 'files(id, name, mimeType, size, createdTime, thumbnailLink, parents, shortcutDetails)',
              supportsAllDrives: true, includeItemsFromAllDrives: true
          });
          const searchFiles = response.result.files.map((f: any) => ({
                id: f.id, 
                parentId: f.parents?.[0]||null, 
                name: f.name, 
                mimeType: f.mimeType, 
                thumbnail: f.thumbnailLink, 
                size: f.size,
                shortcutDetails: f.shortcutDetails
          }));
          setFiles(searchFiles);
          if (config?.apiKey) {
            const ids = await performSmartSearch(searchQuery, searchFiles, config.apiKey);
            setSearchResults(ids.length > 0 ? ids : null);
          }
      } catch (e) { console.error(e); } 
  };

  const displayItems = useMemo(() => {
    if (currentView === 'history') {
        return history.sort((a,b) => b.timestamp - a.timestamp).map(h => ({
            id: h.fileId, parentId: null, name: h.name||'Video', mimeType: h.mimeType||'video/mp4', thumbnail: h.thumbnail, size: h.size, description: 'Watched'
        } as FileSystemItem));
    }
    return searchResults ? files.filter(f => searchResults.includes(f.id)) : files;
  }, [files, searchResults, currentView, history]);

  const handleFileClick = (file: FileSystemItem) => {
    const isShortcut = file.mimeType === 'application/vnd.google-apps.shortcut';
    let effectiveId = file.id;
    let effectiveMimeType = file.mimeType;

    if (isShortcut && file.shortcutDetails?.targetId) {
        effectiveId = file.shortcutDetails.targetId;
        effectiveMimeType = file.shortcutDetails.targetMimeType;
    }
    
    const type = getFileType(effectiveMimeType);

    if (type === FileType.FOLDER) {
        navigateToFolder(effectiveId, file.name);
    } else if (type === FileType.VIDEO) {
        if (/Android/i.test(navigator.userAgent) && accessToken) {
             handleUpdateHistory(file.id, 0, 0);

             const videoItems = displayItems.filter(f => {
                 const rawType = (f.mimeType === 'application/vnd.google-apps.shortcut' && f.shortcutDetails) ? f.shortcutDetails.targetMimeType : f.mimeType;
                 return getFileType(rawType) === FileType.VIDEO;
             });

             let m3uContent = "#EXTM3U\n";
             videoItems.forEach(v => {
                 const vId = (v.mimeType === 'application/vnd.google-apps.shortcut' && v.shortcutDetails) ? v.shortcutDetails.targetId : v.id;
                 const vName = v.name.replace(/[\r\n]/g, '');
                 const vUrl = `https://www.googleapis.com/drive/v3/files/${vId}?alt=media&access_token=${accessToken}&acknowledgeAbuse=true`;
                 m3uContent += `#EXTINF:-1,${vName}\n${vUrl}\n`;
             });

             const currentIndex = videoItems.findIndex(v => {
                 const vId = (v.mimeType === 'application/vnd.google-apps.shortcut' && v.shortcutDetails) ? v.shortcutDetails.targetId : v.id;
                 return vId === effectiveId;
             });

             const base64M3u = btoa(unescape(encodeURIComponent(m3uContent)));
             const intentUrl = `intent:data:audio/x-mpegurl;base64,${base64M3u}#Intent;type=audio/x-mpegurl;i.position=${currentIndex};action=android.intent.action.VIEW;scheme=https;end`;
             
             window.location.href = intentUrl;
             return; 
        }

        const playableFile: FileSystemItem = { ...file, id: effectiveId, mimeType: effectiveMimeType, name: file.name };
        setPlayingFile(playableFile);
    }
  };

  const storageStats = useMemo(() => {
    if (!storageQuota) return { percent: 0, used: '0 GB', total: '15 GB' };
    const limit = parseInt(storageQuota.limit || '0');
    const usage = parseInt(storageQuota.usage || '0');
    return {
        percent: limit > 0 ? Math.min(Math.round((usage/limit)*100), 100) : 0,
        used: formatBytes(usage, 1),
        total: formatBytes(limit, 1)
    };
  }, [storageQuota]);

  if (!user || !accessToken) {
      return (
        <>
            <LoginScreen 
                onLogin={handleLogin} 
                isLoading={false} 
                onOpenSettings={() => setShowSettings(true)} 
                isConfigured={!!config} 
            />
            {showSettings && (
                <SettingsModal 
                    onClose={() => setShowSettings(false)} 
                    onSave={handleSaveConfig} 
                    initialConfig={config} 
                />
            )}
        </>
      );
  }

  return (
    <div className="flex h-screen bg-[#263238] text-slate-200 overflow-hidden font-sans">
        <Sidebar user={user} currentView={currentView} onChangeView={setCurrentView} onLogout={handleLogout} />
        <main className="flex-1 flex flex-col h-full w-full bg-[#263238] relative">
            <header className="h-14 flex items-center justify-between px-4 bg-[#263238] border-b border-slate-700/50 shadow-sm z-20 pt-safe">
                <div className="flex items-center space-x-3">
                    {currentFolderId !== 'root' && currentView === 'files' ? (
                        <button onClick={handleBackNavigation} className="text-white p-1 hover:bg-slate-700 rounded-full">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    ) : (
                         <div className="md:hidden w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white">CX</div>
                    )}
                    <h1 className="text-lg font-medium text-white truncate max-w-[200px]">
                        {currentView === 'history' ? 'Analyze (History)' : 
                         currentView === 'favorites' ? 'Network (Shared)' : 
                         folderNameMap[currentFolderId] || 'Folder'}
                    </h1>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <input 
                            type="text" 
                            className={`bg-transparent border-b border-transparent focus:border-blue-400 text-white w-24 focus:w-40 transition-all outline-none text-sm placeholder-transparent focus:placeholder-slate-500`} 
                            placeholder="Search"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSmartSearch()}
                        />
                        <button onClick={handleSmartSearch} className="absolute right-0 top-0 text-white">
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </button>
                    </div>
                    <button onClick={() => loadFiles(currentFolderId)} className="text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    
                    <button onClick={handleLogout} className="md:hidden text-slate-300 hover:text-white" title="Sign Out">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                        </svg>
                    </button>
                </div>
            </header>

            {currentView === 'files' && currentFolderId === 'root' && (
                <div className="bg-[#37474F] p-4 mx-2 mt-2 rounded-lg shadow-md mb-2">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <span className="text-xl font-bold text-white">{storageStats.percent}%</span>
                            <span className="text-xs text-slate-400 ml-2">{storageStats.used} / {storageStats.total}</span>
                        </div>
                        <span className="text-xs text-slate-400">Main Storage</span>
                    </div>
                    <div className="h-3 w-full bg-[#263238] rounded-full overflow-hidden flex">
                        <div style={{ width: `${storageStats.percent * 0.5}%` }} className="h-full bg-yellow-500"></div>
                        <div style={{ width: `${storageStats.percent * 0.3}%` }} className="h-full bg-blue-500"></div>
                        <div style={{ width: `${storageStats.percent * 0.1}%` }} className="h-full bg-green-500"></div>
                        <div style={{ width: `${storageStats.percent * 0.1}%` }} className="h-full bg-red-500"></div>
                    </div>
                    <div className="flex mt-2 space-x-4 text-[10px] text-slate-400">
                         <span className="flex items-center"><div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>Images</span>
                         <span className="flex items-center"><div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>Videos</span>
                         <span className="flex items-center"><div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>Audio</span>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 pb-20">
                {isLoadingFiles ? (
                    <div className="flex justify-center mt-10"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>
                ) : (
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-2 gap-y-4">
                        {displayItems.map((file) => {
                            const isShortcut = file.mimeType === 'application/vnd.google-apps.shortcut';
                            const effectiveMimeType = (isShortcut && file.shortcutDetails) ? file.shortcutDetails.targetMimeType : file.mimeType;
                            const type = getFileType(effectiveMimeType);
                            const watchedItem = history.find(h => h.fileId === file.id);

                            return (
                                <div key={file.id} onClick={() => handleFileClick(file)} className="flex flex-col items-center text-center group cursor-pointer relative">
                                    <div className="relative mb-1">
                                        {file.thumbnail ? (
                                             <div className="w-14 h-14 md:w-20 md:h-20 rounded overflow-hidden border border-slate-600 bg-black">
                                                 <img src={file.thumbnail} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={file.name} />
                                             </div>
                                        ) : (
                                            ICONS[type] || ICONS[FileType.DOCUMENT]
                                        )}
                                        {type === FileType.VIDEO && file.thumbnail && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            </div>
                                        )}
                                        {isShortcut && (
                                            <div className="absolute bottom-0 left-0 bg-white/80 rounded-tr p-0.5">
                                                 <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                            </div>
                                        )}
                                        {watchedItem && (
                                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] rounded-full px-1.5 py-0.5 shadow-sm z-10">
                                                ✓
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[11px] md:text-xs text-slate-300 line-clamp-2 px-1 leading-tight break-all w-full">
                                        {file.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <MobileNav currentView={currentView} onChangeView={(v) => { setCurrentView(v); if(v==='files') setCurrentFolderId('root'); }} />
        </main>

        {playingFile && accessToken && (
            <VideoPlayer
                file={playingFile}
                accessToken={accessToken}
                initialProgress={history.find(h => h.fileId === playingFile.id)?.progress || 0}
                onClose={() => setPlayingFile(null)}
                onUpdateHistory={handleUpdateHistory}
            />
        )}
    </div>
  );
};

export default App;