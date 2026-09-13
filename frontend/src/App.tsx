import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { KitCreateForm } from './components/KitCreateForm';
import { KitBuilder } from './components/KitBuilder';
import { getCurrentUser, getUserKits, getKitById } from './services/api';
import type { User, Kit } from './types/kit';
import { FolderKanban, Sparkles, Clock, ChevronRight, PlusCircle } from 'lucide-react';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  const [view, setView] = useState<'create' | 'builder' | 'my-kits'>('create');
  
  const [activeKit, setActiveKit] = useState<Kit | null>(null);
  const [activeKitId, setActiveKitId] = useState<string>('');
  
  const [myKits, setMyKits] = useState<any[]>([]);
  const [loadingKits, setLoadingKits] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('trao_token');
    if (token) {
      getCurrentUser()
        .then((userData) => {
          setUser(userData);
          fetchKits();
        })
        .catch(() => {
          localStorage.removeItem('trao_token');
          setUser(null);
        });
    }
  }, []);

  const fetchKits = async () => {
    setLoadingKits(true);
    try {
      const kitsList = await getUserKits();
      setMyKits(kitsList || []);
    } catch (e) {
      console.warn('Failed to fetch user kits:', e);
    } finally {
      setLoadingKits(false);
    }
  };

  const handleAuthSuccess = (userData: User, token: string) => {
    localStorage.setItem('trao_token', token);
    setUser(userData);
    fetchKits();
  };

  const handleLogout = () => {
    localStorage.removeItem('trao_token');
    setUser(null);
    setActiveKit(null);
    setActiveKitId('');
    setView('create');
  };

  const handleKitCreated = (newKit: Kit, kitId: string) => {
    setActiveKit(newKit);
    setActiveKitId(kitId);
    setView('builder');
    fetchKits();
  };

  const handleSelectKit = async (kitId: string) => {
    try {
      const data = await getKitById(kitId);
      setActiveKit(data.kit);
      setActiveKitId(kitId);
      setView('builder');
    } catch (err: any) {
      alert(`Could not load kit: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onNewKit={() => {
          setActiveKit(null);
          setActiveKitId('');
          setView('create');
        }}
        onOpenMyKits={() => {
          if (!user) {
            setAuthModalOpen(true);
          } else {
            fetchKits();
            setView('my-kits');
          }
        }}
        myKitsCount={myKits.length}
      />

      <main className="flex-1">
        {view === 'create' && (
          <KitCreateForm
            onKitCreated={handleKitCreated}
            onOpenAuth={() => setAuthModalOpen(true)}
            isAuthenticated={!!user}
          />
        )}

        {view === 'builder' && activeKit && activeKitId && (
          <KitBuilder
            kit={activeKit}
            kitId={activeKitId}
            onSave={(updated) => setActiveKit(updated)}
          />
        )}

        {view === 'my-kits' && (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                  <FolderKanban className="w-6 h-6 text-blue-400" />
                  <span>My Saved Prep Kits</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Reopen and continue practicing your generated interview kits</p>
              </div>

              <button
                onClick={() => setView('create')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Kit</span>
              </button>
            </div>

            {loadingKits ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                <p className="text-sm text-slate-400 animate-pulse">Loading your saved prep kits...</p>
              </div>
            ) : myKits.length === 0 ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                <Sparkles className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-300">No Prep Kits Saved Yet</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">Paste a job description to generate your first AI prep kit.</p>
                <button
                  onClick={() => setView('create')}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
                >
                  Create Prep Kit
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myKits.map((item) => {
                  const kitData = item.kitData || {};
                  return (
                    <div
                      key={item._id}
                      onClick={() => handleSelectKit(item._id)}
                      className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 cursor-pointer transition flex items-center justify-between group shadow-lg"
                    >
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition">
                            {kitData.role?.title || 'Software Engineering Role'}
                          </h4>
                          <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded font-semibold uppercase">
                            {kitData.source?.company || 'Company'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-slate-400">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          </span>
                          <span>{kitData.questions?.length || 0} Questions</span>
                          <span>{kitData.schedule?.days_available || 5} Days Schedule</span>
                        </div>
                      </div>

                      <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl group-hover:bg-blue-600 group-hover:text-white text-slate-400 transition">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>Trao Full-Stack Engineering Assessment (FS-AI-INTERVIEW-01)</p>
      </footer>
    </div>
  );
}
export default App;
