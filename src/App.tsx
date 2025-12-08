import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  initializeFirestore,
  where,
  limit
} from 'firebase/firestore';
import { 
  Briefcase, ClipboardList, HardHat, Image as ImageIcon, Plus, DollarSign, 
  Users, Calendar, Trash2, LogOut, ChevronRight, Package, Camera, TrendingUp, 
  AlertTriangle, Wind, UserCheck, KeyRound, Sparkles, Bot, Loader2, Share2, 
  QrCode, Info, History, Search, ArrowUpRight, CheckCircle2, Clock, MapPin,
  Menu, X, BarChart3, ShieldCheck
} from 'lucide-react';

// --- CONFIGURAZIONE FIREBASE (NON TOCCARE) ---
const firebaseConfig = {
  apiKey: "AIzaSyAatMz8gvKDAuDidBn08MPoCjTyufkeE50",
  authDomain: "impresa-d-aria-srl.firebaseapp.com",
  projectId: "impresa-d-aria-srl",
  storageBucket: "impresa-d-aria-srl.firebasestorage.app",
  messagingSenderId: "89553795640",
  appId: "1:89553795640:web:631d8a4a8173570630c4cd",
  measurementId: "G-P72C5LBDHH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

// --- UTILS & HELPERS ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
const formatDate = (seconds: number) => new Date(seconds * 1000).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

const logActivity = async (username: string, action: string, details: string) => {
  try { await addDoc(collection(db, 'logs'), { username, action, details, timestamp: serverTimestamp() }); } catch (e) { console.error(e); }
};

const callGemini = async (prompt: string) => {
  // Simuliamo una risposta intelligente per la demo grafica
  return `**Analisi preliminare Cantiere:**\n\n1. **DPI Consigliati:** Elmetto, scarpe antinfortunistiche S3, guanti da lavoro, protezione udito (in fase di taglio).\n2. **Materiali Stimati:**\n- Canali zincati rettangolari\n- Staffaggio e pendinatura\n- Bocchette di mandata/ripresa\n- Unità di trattamento aria (UTA)`;
};

// --- TYPES ---
type UserRole = 'master' | 'employee';
interface UserProfile { uid: string; name: string; role: UserRole; username: string; }
interface Project { id: string; name: string; client: string; address?: string; status: 'active' | 'completed' | 'hold'; progress: number; description: string; createdAt: any; aiAnalysis?: string; }
interface Material { id: string; projectId: string; name: string; supplier: string; cost: number; quantity: number; unit: string; }
interface Report { id: string; projectId: string; date: string; description: string; hours: number; personnel: string; author: string; createdAt: any; }
interface MediaItem { id: string; projectId: string; url: string; type: string; description: string; author: string; createdAt: any; }

const AUTHORIZED_USERS = [
  { username: 'andrea', password: 'password', name: 'Andrea Cusimano', role: 'master' },
  { username: 'francesco.g', password: '123', name: 'Francesco Gentile', role: 'employee' },
  { username: 'cosimo.g', password: '123', name: 'Cosimo Gentile', role: 'employee' },
  { username: 'giuseppe.g', password: '123', name: 'Giuseppe Gentile', role: 'employee' },
  { username: 'francesco.d', password: '123', name: 'Francesco De Vincentis', role: 'employee' },
  { username: 'antonio', password: '123', name: 'Antonio Ingrosso', role: 'employee' },
  { username: 'giuseppe.gr', password: '123', name: 'Giuseppe Granio', role: 'employee' },
  { username: 'cosimo.m', password: '123', name: 'Cosimo Motolese', role: 'employee' },
];

// --- COMPONENTS ---

// 1. Modern Auth Screen
const AuthScreen = ({ onLogin }: { onLogin: (u: UserProfile) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    // Fake delay for effect
    await new Promise(r => setTimeout(r, 800));
    
    const user = AUTHORIZED_USERS.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
    if (user && user.password === password) {
      logActivity(user.name, 'LOGIN', 'Accesso effettuato');
      onLogin({ uid: user.username, name: user.name, role: user.role as UserRole, username: user.username });
    } else {
      setError('Credenziali non valide');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl max-w-md w-full relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-tr from-sky-400 to-blue-600 p-4 rounded-2xl shadow-lg mb-4 transform hover:scale-105 transition-transform duration-300">
            <Wind className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">IMPRESA D'ARIA</h1>
          <p className="text-sky-200 mt-1 font-medium">Portale Operativo 2.0</p>
        </div>

        <div className="space-y-4">
          <div className="group">
            <label className="text-sky-100 text-xs font-bold uppercase tracking-wider ml-1 mb-1 block">Username</label>
            <div className="relative">
                <UserCheck className="absolute left-3 top-3.5 text-sky-300 w-5 h-5" />
                <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all placeholder-slate-500"
                    placeholder="es. mario.rossi"
                />
            </div>
          </div>
          
          <div className="group">
            <label className="text-sky-100 text-xs font-bold uppercase tracking-wider ml-1 mb-1 block">Password</label>
            <div className="relative">
                <KeyRound className="absolute left-3 top-3.5 text-sky-300 w-5 h-5" />
                <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    className="w-full bg-slate-800/50 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all placeholder-slate-500"
                    placeholder="••••••••"
                />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <button 
            onClick={handleLogin} 
            disabled={!username || !password || isLoading}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-sky-900/50 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2 flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <>Accedi al Sistema <ArrowUpRight size={18} /></>}
          </button>
        </div>
        
        <div className="mt-8 text-center text-xs text-slate-400">
            &copy; 2025 Impresa D'Aria Srl • Piattaforma Gestionale
        </div>
      </div>
    </div>
  );
};

// 2. Main Layout & Dashboard
export default function ImpiantiApp() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const u = localStorage.getItem('impianti_user_v3');
    if (u) setUser(JSON.parse(u));
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)).sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)));
      setIsLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleLogin = (u: UserProfile) => { setUser(u); localStorage.setItem('impianti_user_v3', JSON.stringify(u)); };
  
  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveProject(null)}>
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md">
            <Wind size={20} />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 leading-tight">IMPRESA D'ARIA</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Gestione Cantieri</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-700">{user.name}</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase font-bold tracking-wide">{user.role}</span>
            </div>
            <button 
                onClick={() => { logActivity(user.name, 'LOGOUT', 'Uscita'); setUser(null); localStorage.removeItem('impianti_user_v3'); }}
                className="bg-slate-100 hover:bg-red-50 hover:text-red-600 p-2.5 rounded-xl transition-colors text-slate-600"
            >
                <LogOut size={20} />
            </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeProject ? (
          <ProjectDetail project={activeProject} user={user} onBack={() => setActiveProject(null)} />
        ) : (
          <DashboardHome projects={projects} user={user} />
        )}
      </main>
    </div>
  );
}

// 3. Dashboard Component with Stats
const DashboardHome = ({ projects, user }: { projects: Project[], user: UserProfile }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Filter projects
    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.client.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeCount = projects.filter(p => p.status === 'active').length;
    const completedCount = projects.filter(p => p.status === 'completed').length;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const f = e.target as HTMLFormElement;
        const name = (f.elements.namedItem('name') as HTMLInputElement).value;
        const client = (f.elements.namedItem('client') as HTMLInputElement).value;
        const desc = (f.elements.namedItem('description') as HTMLInputElement).value;
        
        await addDoc(collection(db, 'projects'), {
            name, client, description: desc, status: 'active', progress: 0, createdAt: serverTimestamp()
        });
        logActivity(user.name, 'CREAZIONE', `Nuovo cantiere: ${name}`);
        setIsCreateOpen(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
                    <p className="text-slate-500 text-sm">Benvenuto, ecco la situazione aggiornata.</p>
                </div>
                {user.role === 'master' && (
                    <button 
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all font-medium"
                    >
                        <Plus size={20} /> Nuovo Cantiere
                    </button>
                )}
            </div>

            {/* KPI Cards (Master Only) */}
            {user.role === 'master' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div className="absolute right-[-10px] top-[-10px] bg-sky-50 w-20 h-20 rounded-full group-hover:scale-125 transition-transform" />
                        <div className="relative z-10 text-slate-500 text-xs font-bold uppercase tracking-wider">Cantieri Attivi</div>
                        <div className="relative z-10 text-3xl font-bold text-sky-600">{activeCount}</div>
                        <HardHat className="absolute bottom-4 right-4 text-sky-100 w-10 h-10" />
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div className="absolute right-[-10px] top-[-10px] bg-green-50 w-20 h-20 rounded-full group-hover:scale-125 transition-transform" />
                        <div className="relative z-10 text-slate-500 text-xs font-bold uppercase tracking-wider">Completati</div>
                        <div className="relative z-10 text-3xl font-bold text-green-600">{completedCount}</div>
                        <CheckCircle2 className="absolute bottom-4 right-4 text-green-100 w-10 h-10" />
                    </div>
                    {/* Placeholder Stats */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-28 hidden md:flex">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Personale Attivo</div>
                        <div className="text-3xl font-bold text-indigo-600">8</div>
                        <Users className="absolute bottom-4 right-4 text-indigo-50 w-10 h-10" />
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-28 hidden md:flex">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Materiali Tot.</div>
                        <div className="text-3xl font-bold text-orange-600">142</div>
                        <Package className="absolute bottom-4 right-4 text-orange-50 w-10 h-10" />
                    </div>
                </div>
            )}

            {/* Search & List */}
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Cerca cantiere o cliente..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white border-none shadow-sm ring-1 ring-slate-200 pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map(project => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                    {filteredProjects.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <Wind size={48} className="mx-auto mb-2 opacity-30" />
                            <p>Nessun cantiere trovato.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Nuovo Cantiere</h3>
                            <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Progetto</label>
                                <input name="name" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500" placeholder="Es. Polo Logistico A" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                                <input name="client" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500" placeholder="Es. Amazon Italia" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrizione Lavori</label>
                                <textarea name="description" rows={3} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500" placeholder="Breve descrizione..." />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-5 py-2.5 text-slate-500 font-medium hover:bg-slate-100 rounded-xl transition-colors">Annulla</button>
                                <button type="submit" className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-colors">Crea Cantiere</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// 4. Project Card Component
const ProjectCard = ({ project }: { project: Project }) => {
    // Determine status color
    const statusColor = {
        active: 'bg-green-100 text-green-700 border-green-200',
        completed: 'bg-slate-100 text-slate-600 border-slate-200',
        hold: 'bg-orange-100 text-orange-700 border-orange-200'
    }[project.status] || 'bg-slate-100 text-slate-600';

    const statusLabel = { active: 'IN CORSO', completed: 'COMPLETATO', hold: 'SOSPESO' }[project.status] || project.status;

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-sky-500" />
            <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusColor}`}>
                    {statusLabel}
                </span>
                {project.createdAt && (
                    <span className="text-xs text-slate-400">{formatDate(project.createdAt.seconds)}</span>
                )}
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-1 line-clamp-1 group-hover:text-sky-600 transition-colors">{project.name}</h3>
            <p className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                <Briefcase size={14} /> {project.client}
            </p>

            {/* Progress Bar Visual */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Avanzamento</span>
                    <span>{project.progress || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-sky-500 h-full rounded-full" style={{ width: `${project.progress || 5}%` }}></div>
                </div>
            </div>

            <div className="flex items-center text-sky-600 text-sm font-bold mt-2 group-hover:translate-x-1 transition-transform">
                Apri Cantiere <ChevronRight size={16} />
            </div>
        </div>
    );
};

// 5. Project Detail Page
const ProjectDetail = ({ project, user, onBack }: any) => {
    const [tab, setTab] = useState('materials');
    const [isEditing, setIsEditing] = useState(false);

    const updateStatus = async (newStatus: string) => {
        await updateDoc(doc(db, 'projects', project.id), { status: newStatus });
        project.status = newStatus; // Optimistic update
        setIsEditing(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Breadcrumb & Header */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <button onClick={onBack} className="hover:text-slate-800 transition-colors">Dashboard</button>
                <ChevronRight size={14} />
                <span className="text-slate-800 font-medium truncate">{project.name}</span>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                    <Wind size={120} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">{project.name}</h1>
                            <div className="flex items-center gap-4 text-slate-500">
                                <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-sm"><Briefcase size={14} /> {project.client}</span>
                                {project.createdAt && <span className="text-sm flex items-center gap-1"><Calendar size={14} /> {formatDate(project.createdAt.seconds)}</span>}
                            </div>
                        </div>
                        
                        {user.role === 'master' && (
                            <div className="flex gap-2">
                                <select 
                                    className="bg-white border border-slate-300 text-slate-700 text-sm font-bold py-2 px-3 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                                    value={project.status}
                                    onChange={(e) => updateStatus(e.target.value)}
                                >
                                    <option value="active">IN CORSO</option>
                                    <option value="completed">COMPLETATO</option>
                                    <option value="hold">SOSPESO</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <p className="text-slate-600 max-w-2xl leading-relaxed">{project.description}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
                {[
                    { id: 'overview', label: 'Riepilogo', icon: BarChart3 },
                    { id: 'materials', label: 'Materiali', icon: Package },
                    { id: 'reports', label: 'Rapportini', icon: ClipboardList },
                    { id: 'media', label: 'Foto & Video', icon: ImageIcon }
                ].map(t => (
                    <button 
                        key={t.id} 
                        onClick={() => setTab(t.id)} 
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all duration-300 ${
                            tab === t.id 
                            ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/30' 
                            : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                    >
                        <t.icon size={18} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {tab === 'overview' && <OverviewTab project={project} user={user} />}
                {tab === 'materials' && <MaterialsList projectId={project.id} user={user} />}
                {tab === 'reports' && <ReportsList projectId={project.id} user={user} />}
                {tab === 'media' && <MediaList projectId={project.id} user={user} />}
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS (Tabs) ---

const OverviewTab = ({ project, user }: any) => {
    const [analysis, setAnalysis] = useState<string | null>(project.aiAnalysis || null);
    const [loading, setLoading] = useState(false);

    const runAnalysis = async () => {
        setLoading(true);
        const res = await callGemini(project.description);
        await updateDoc(doc(db, 'projects', project.id), { aiAnalysis: res });
        setAnalysis(res);
        setLoading(false);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Bot size={24} /></div>
                    <h3 className="text-xl font-bold text-slate-800">Assistente IA</h3>
                </div>
                
                {analysis ? (
                    <div className="prose prose-sm prose-slate bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="whitespace-pre-line text-slate-600">{analysis}</div>
                    </div>
                ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Sparkles className="mx-auto text-slate-300 mb-2" size={32} />
                        <p className="text-slate-500 text-sm mb-4">Genera un piano di sicurezza e materiali.</p>
                        <button onClick={runAnalysis} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                            {loading ? 'Analisi in corso...' : '✨ Analizza con Gemini'}
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-3xl text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <ShieldCheck size={20} />
                        <span className="text-sm font-bold uppercase tracking-wider">Stato Sicurezza</span>
                    </div>
                    <h3 className="text-2xl font-bold">Regolare</h3>
                    <p className="text-sm opacity-80 mt-2">Nessuna criticità segnalata negli ultimi 7 giorni.</p>
                </div>
            </div>
        </div>
    );
};

const MaterialsList = ({ projectId, user }: any) => {
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => onSnapshot(query(collection(db, 'materials'), where('projectId', '==', projectId)), s => setItems(s.docs.map(d => ({id:d.id, ...d.data()})))), [projectId]);
    
    const add = async (e:any) => {
        e.preventDefault();
        const d = new FormData(e.target);
        await addDoc(collection(db, 'materials'), {
            projectId, name: d.get('name'), supplier: d.get('supplier'), 
            cost: Number(d.get('cost')), quantity: Number(d.get('qty')), unit: d.get('unit'), createdAt: serverTimestamp()
        });
        e.target.reset();
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Lista Materiali</h3>
                    <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-bold">{items.length} Articoli</span>
                </div>
                
                {/* Add Form */}
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <form onSubmit={add} className="flex flex-wrap gap-2 items-center">
                        <input name="name" placeholder="Nome Materiale" required className="flex-1 min-w-[150px] p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
                        <input name="supplier" placeholder="Fornitore" className="flex-1 min-w-[120px] p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
                        <input name="qty" type="number" placeholder="Qtà" required className="w-20 p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
                        <select name="unit" className="w-20 p-2.5 rounded-xl border border-slate-200 text-sm bg-white"><option>pz</option><option>mt</option><option>kg</option></select>
                        {user.role === 'master' && <input name="cost" type="number" placeholder="€" className="w-24 p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 outline-none" />}
                        <button className="bg-sky-600 hover:bg-sky-700 text-white p-2.5 rounded-xl shadow-md transition-colors"><Plus size={20} /></button>
                    </form>
                </div>

                {/* List */}
                <div className="divide-y divide-slate-50">
                    {items.length === 0 ? <p className="p-8 text-center text-slate-400 text-sm">Nessun materiale.</p> : items.map(i => (
                        <div key={i.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><Package size={18} /></div>
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{i.name}</div>
                                    <div className="text-xs text-slate-400">{i.supplier}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <div className="font-bold text-slate-700">{i.quantity} <span className="text-xs font-normal text-slate-400">{i.unit}</span></div>
                                    {user.role === 'master' && i.cost > 0 && <div className="text-xs font-bold text-sky-600">€ {(i.cost * i.quantity).toFixed(2)}</div>}
                                </div>
                                <button onClick={() => deleteDoc(doc(db, 'materials', i.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ReportsList = ({ projectId, user }: any) => {
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => onSnapshot(query(collection(db, 'reports'), where('projectId', '==', projectId), orderBy('createdAt', 'desc')), s => setItems(s.docs.map(d => ({id:d.id, ...d.data()})))), [projectId]);
    
    const add = async (e:any) => {
        e.preventDefault();
        const d = new FormData(e.target);
        await addDoc(collection(db, 'reports'), {
            projectId, date: d.get('date'), hours: d.get('hours'), personnel: d.get('personnel'), description: d.get('desc'), author: user.name, createdAt: serverTimestamp()
        });
        e.target.reset();
    };

    return (
        <div className="space-y-6">
            <form onSubmit={add} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ClipboardList className="text-sky-500" /> Nuovo Rapportino</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input name="date" type="date" required className="p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-sky-500" />
                    <input name="hours" type="number" placeholder="Ore Totali" required className="p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-sky-500" />
                    <input name="personnel" placeholder="Personale Presente" required className="p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <textarea name="desc" placeholder="Descrizione dettagliata delle attività svolte..." required className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-sky-500 min-h-[100px] mb-4" />
                <div className="flex justify-end">
                    <button className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all">Salva Rapportino</button>
                </div>
            </form>

            <div className="space-y-4">
                {items.map(i => (
                    <div key={i.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold font-mono">{i.date}</span>
                                <span className="text-sm font-bold text-slate-800">{i.personnel}</span>
                            </div>
                            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">{i.hours}h</span>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed pl-2">{i.description}</p>
                        <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Compilato da {i.author}</span>
                            <button onClick={() => deleteDoc(doc(db, 'reports', i.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MediaList = ({ projectId, user }: any) => {
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => onSnapshot(query(collection(db, 'media'), where('projectId', '==', projectId), orderBy('createdAt', 'desc')), s => setItems(s.docs.map(d => ({id:d.id, ...d.data()})))), [projectId]);
    
    const upload = (e:any) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            await addDoc(collection(db, 'media'), {
                projectId, url: reader.result, author: user.name, createdAt: serverTimestamp()
            });
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 text-lg">Galleria Cantiere</h3>
                <label className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl cursor-pointer text-sm font-bold flex items-center gap-2 shadow-lg transition-all">
                    <Camera size={18} /> Carica Foto
                    <input type="file" onChange={upload} hidden accept="image/*" />
                </label>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {items.length === 0 ? <p className="col-span-full py-10 text-center text-slate-400">Nessuna foto caricata.</p> : items.map(i => (
                    <div key={i.id} className="group aspect-square bg-slate-100 rounded-2xl overflow-hidden relative shadow-sm hover:shadow-lg transition-all">
                        <img src={i.url} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                            <span className="text-white text-xs font-bold">{i.author}</span>
                            <span className="text-slate-300 text-[10px]">{i.createdAt ? formatDate(i.createdAt.seconds) : 'Oggi'}</span>
                        </div>
                        <button onClick={() => deleteDoc(doc(db, 'media', i.id))} className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"><Trash2 size={14} /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};
