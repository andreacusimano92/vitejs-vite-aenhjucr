import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
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
  limit
} from 'firebase/firestore';
import { 
  Briefcase, 
  ClipboardList, 
  HardHat, 
  Image as ImageIcon, 
  Plus, 
  DollarSign, 
  Users, 
  Calendar, 
  Trash2, 
  LogOut, 
  ChevronRight, 
  Package, 
  Camera, 
  FileText,
  TrendingUp,
  AlertTriangle,
  Lock,
  Wind,
  UserCheck,
  KeyRound,
  Sparkles,
  Bot,
  ShieldCheck,
  Loader2,
  Share2,
  QrCode,
  Info,
  History,
  Clock,
  Settings,
  Download,
  Database
} from 'lucide-react';

// --- CONFIGURAZIONE FIREBASE REALE ---
const firebaseConfig = {
  apiKey: "AIzaSyAatMz8gvKDAuDidBn08MPoCjTyufkeE50",
  authDomain: "impresa-d-aria-srl.firebaseapp.com",
  projectId: "impresa-d-aria-srl",
  storageBucket: "impresa-d-aria-srl.firebasestorage.app",
  messagingSenderId: "89553795640",
  appId: "1:89553795640:web:631d8a4a8173570630c4cd",
  measurementId: "G-P72C5LBDHH"
};

// Logica di fallback per l'ambiente di anteprima (mantiene la compatibilità)
const activeConfig = (window as any).__firebase_config
  ? JSON.parse((window as any).__firebase_config)
  : firebaseConfig;

const app = initializeApp(activeConfig);
const auth = getAuth(app);

// FIX: Force Long Polling to solve connection issues in restrictive environments
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

const appId = typeof window !== 'undefined' && (window as any).__app_id 
  ? (window as any).__app_id 
  : 'impresa-daria-manager';

// --- Gemini API Helper ---
const callGemini = async (prompt: string) => {
  const apiKey = ""; // Lascia vuoto qui, l'ambiente inietterà la chiave se disponibile
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Nessuna risposta generata.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return null;
  }
};

// --- Logging Helper ---
const logActivity = async (username: string, action: string, details: string) => {
  try {
    // Nota: Se usi il tuo DB, assicurati che la collezione 'logs' esista o venga creata
    // Usiamo una struttura path sicura
    const collectionRef = activeConfig.projectId === "impresa-d-aria-srl" 
        ? collection(db, 'logs') // Path semplificato per il tuo DB personale
        : collection(db, 'artifacts', appId, 'public', 'data', 'logs'); // Path per la sandbox

    await addDoc(collectionRef, {
      username,
      action,
      details,
      timestamp: serverTimestamp(),
      deviceInfo: navigator.userAgent 
    });
  } catch (e) {
    console.error("Failed to log activity", e);
  }
};

// --- Types ---

type UserRole = 'master' | 'employee';

interface UserProfile {
  uid: string;
  name: string;
  role: UserRole;
  username: string;
}

interface LogEntry {
  id: string;
  username: string;
  action: string;
  details: string;
  timestamp: any;
  deviceInfo?: string;
}

interface Project {
  id: string;
  name: string;
  client: string;
  status: 'active' | 'completed' | 'hold';
  description: string;
  createdAt: any;
  aiAnalysis?: string;
}

interface Material {
  id: string;
  projectId: string;
  name: string;
  supplier: string;
  cost: number;
  quantity: number;
  unit: string;
  addedBy: string;
  createdAt: any;
}

interface Report {
  id: string;
  projectId: string;
  date: string;
  description: string;
  hours: number;
  personnel: string; // Comma separated names
  author: string;
  createdAt: any;
}

interface MediaItem {
  id: string;
  projectId: string;
  url: string; // Base64 for this demo
  type: 'image' | 'video';
  description: string;
  author: string;
  createdAt: any;
}

// --- Configuration: Authorized Users ---
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

// --- Components ---

// 1. Authentication Component
const AuthScreen = ({ onLogin }: { onLogin: (user: UserProfile) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginAttempt = () => {
    const user = AUTHORIZED_USERS.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
    
    if (!user) {
      setError('Utente non trovato.');
      return;
    }

    if (user.password !== password) {
      setError('Password errata.');
      return;
    }

    // Log the successful login with precise time
    logActivity(user.name, 'LOGIN', 'Accesso effettuato al portale');

    onLogin({
      uid: user.username,
      name: user.name,
      role: user.role as UserRole,
      username: user.username
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border-t-4 border-sky-600">
        <div className="text-center mb-8">
          <div className="bg-sky-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3 transform hover:rotate-6 transition-all">
            <Wind className="text-white w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Impresa D'Aria Srl</h1>
          <p className="text-sky-600 font-medium">Portale Operativo Mobile</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6 text-sm text-blue-800 border border-blue-100 flex items-start gap-2">
           <Info className="shrink-0 mt-0.5" size={16} />
           <p>Accesso riservato. Tutte le attività vengono registrate con data e ora per scopi amministrativi.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
              <UserCheck size={14} /> Username
            </label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-all"
              placeholder="Es. mario.rossi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
              <KeyRound size={14} /> Password
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLoginAttempt()}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 animate-in fade-in">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <button 
            onClick={handleLoginAttempt}
            disabled={!username || !password}
            className="w-full bg-slate-900 text-white p-4 rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg flex justify-center items-center gap-2"
          >
            Accedi al Portale <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Main Dashboard Component
export default function ImpiantiApp() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper per il path corretto in base all'ambiente
  const getCollectionPath = (collectionName: string) => {
      // Se stiamo usando la tua config reale, usiamo un path semplice alla root
      if (activeConfig.projectId === "impresa-d-aria-srl") {
          return collection(db, collectionName);
      }
      // Altrimenti usiamo la sandbox
      return collection(db, 'artifacts', appId, 'public', 'data', collectionName);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth Error", e);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const savedProfile = localStorage.getItem('impianti_user_profile_v2');
        if (savedProfile) {
          setUser(JSON.parse(savedProfile));
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = getCollectionPath('projects');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      projectsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]); 

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('impianti_user_profile_v2', JSON.stringify(profile));
  };

  const handleLogout = () => {
    if (user) {
      logActivity(user.name, 'LOGOUT', 'Uscita dal sistema');
    }
    setUser(null);
    localStorage.removeItem('impianti_user_profile_v2');
    setActiveProject(null);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'master') return;
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const client = (form.elements.namedItem('client') as HTMLInputElement).value;
    const description = (form.elements.namedItem('description') as HTMLInputElement).value;

    await addDoc(getCollectionPath('projects'), {
      name,
      client,
      description,
      status: 'active',
      createdAt: serverTimestamp()
    });
    
    logActivity(user.name, 'CREAZIONE CANTIERE', `Creato nuovo cantiere: ${name}`);
    form.reset();
  };

  const updateProject = async (project: Project, newData: Partial<Project>) => {
    const projectRef = activeConfig.projectId === "impresa-d-aria-srl" 
        ? doc(db, 'projects', project.id)
        : doc(db, 'artifacts', appId, 'public', 'data', 'projects', project.id);

    await updateDoc(projectRef, newData);
    setActiveProject({ ...project, ...newData });
    if (newData.aiAnalysis) {
        logActivity(user?.name || 'Sistema', 'AI ANALYSIS', `Generata analisi AI per cantiere: ${project.name}`);
    }
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <nav className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50 border-b-4 border-sky-500">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveProject(null)}>
            <Wind className="text-sky-400" />
            <span className="font-bold text-lg hidden sm:block uppercase tracking-wider">Impresa D'Aria Srl</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-sky-400">{user.name}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">{user.role === 'master' ? 'Amministratore' : 'Tecnico'}</div>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors" title="Esci">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 py-8">
        {activeProject ? (
          <ProjectDetail 
            project={activeProject} 
            user={user} 
            onBack={() => setActiveProject(null)} 
            onUpdate={updateProject}
            getCollectionPath={getCollectionPath}
          />
        ) : (
          <Dashboard 
            projects={projects} 
            user={user} 
            onSelectProject={setActiveProject} 
            onCreateProject={handleCreateProject}
            getCollectionPath={getCollectionPath}
          />
        )}
      </main>
    </div>
  );
}

// 3. Dashboard View
const Dashboard = ({ 
  projects, 
  user, 
  onSelectProject, 
  onCreateProject,
  getCollectionPath
}: { 
  projects: Project[], 
  user: UserProfile, 
  onSelectProject: (p: Project) => void,
  onCreateProject: (e: React.FormEvent) => void,
  getCollectionPath: (name: string) => any
}) => {
  const [showNewForm, setShowNewForm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Cantieri Attivi</h2>
        <div className="flex flex-wrap gap-2 justify-center">
            {user.role === 'master' && (
                <>
                <button 
                    onClick={() => setShowSetup(!showSetup)}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    <Settings size={20} />
                    <span className="hidden sm:inline">Configura & Installa</span>
                </button>
                <button 
                    onClick={() => setShowLogs(!showLogs)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all ${showLogs ? 'bg-slate-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                    <History size={20} />
                    <span className="hidden sm:inline">Attività</span>
                </button>
                <button 
                    onClick={() => setShowShare(!showShare)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all"
                >
                    <Share2 size={20} />
                    <span className="hidden sm:inline">Condividi</span>
                </button>
                <button 
                    onClick={() => setShowNewForm(!showNewForm)}
                    className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all"
                >
                    <Plus size={20} />
                    <span className="hidden sm:inline">Nuovo</span>
                </button>
                </>
            )}
        </div>
      </div>

      {showSetup && user.role === 'master' && (
          <SetupGuide onClose={() => setShowSetup(false)} />
      )}

      {showLogs && user.role === 'master' && (
          <ActivityLogs onClose={() => setShowLogs(false)} getCollectionPath={getCollectionPath} />
      )}

      {showShare && (
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-indigo-200 animate-in fade-in slide-in-from-top-4 mb-6 relative">
          <button onClick={() => setShowShare(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><Trash2 size={16} /></button>
          <div className="flex flex-col md:flex-row gap-6">
             <div className="flex-1">
                <h3 className="font-bold text-indigo-900 text-lg mb-2 flex items-center gap-2">
                    <QrCode /> Link di Accesso per i Dipendenti
                </h3>
                <div className="bg-yellow-50 p-3 rounded text-yellow-800 text-sm mb-3 border border-yellow-200 flex gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <p>Attenzione: Il link attuale ({window.location.href}) è temporaneo. Per condividere l'app realmente con i dipendenti, segui la guida "Configura & Installa".</p>
                </div>
                <div className="bg-slate-100 p-3 rounded font-mono text-sm break-all border border-slate-300 select-all cursor-pointer opacity-50">
                    {window.location.href}
                </div>
             </div>
             <div className="flex-1 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <h4 className="font-bold text-indigo-800 mb-2 text-sm">Credenziali da comunicare:</h4>
                <ul className="text-sm space-y-1 text-slate-700">
                    <li>👨‍🔧 <strong>francesco.g</strong> / pass: 123</li>
                    <li>👨‍🔧 <strong>cosimo.g</strong> / pass: 123</li>
                    <li>...e gli altri</li>
                </ul>
             </div>
          </div>
        </div>
      )}

      {showNewForm && (
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-sky-500 animate-in slide-in-from-top-4">
          <h3 className="font-bold mb-4">Aggiungi Nuovo Cantiere</h3>
          <form onSubmit={(e) => { onCreateProject(e); setShowNewForm(false); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="name" required placeholder="Nome Cantiere (es. Polo Logistico A)" className="p-2 border rounded" />
            <input name="client" required placeholder="Cliente" className="p-2 border rounded" />
            <input name="description" placeholder="Descrizione lavori..." className="p-2 border rounded md:col-span-2" />
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewForm(false)} className="px-4 py-2 text-slate-600">Annulla</button>
              <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded">Crea</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
            <Wind size={48} className="mx-auto mb-4 opacity-50 text-sky-200" />
            <p>Nessun cantiere attivo. {user.role === 'master' ? 'Creane uno nuovo.' : 'Il database è pronto per i nuovi dati.'}</p>
          </div>
        ) : (
          projects.map(project => (
            <div 
              key={project.id} 
              onClick={() => onSelectProject(project)}
              className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all border border-slate-100 cursor-pointer group overflow-hidden"
            >
              <div className="h-2 bg-slate-900 group-hover:bg-sky-500 transition-colors" />
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-slate-800">{project.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {project.status === 'active' ? 'IN CORSO' : project.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-500 text-sm mb-4">{project.client}</p>
                <div className="flex items-center text-sky-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                  Vai al cantiere <ChevronRight size={16} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- NEW COMPONENT: SETUP GUIDE ---
const SetupGuide = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-2xl border-2 border-emerald-500 animate-in fade-in mb-6 fixed inset-0 z-[100] m-4 md:m-10 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="text-emerald-600" /> Come installare l'App realmente
                    </h2>
                    <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 p-2 rounded-full"><Trash2 size={20} /></button>
                </div>

                <div className="space-y-8">
                    {/* Step 1 */}
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold shrink-0">1</div>
                        <div>
                            <h3 className="font-bold text-lg mb-2">Database Configurato! ✅</h3>
                            <p className="text-slate-600 mb-2">
                                L'app ora punta al progetto <strong>impresa-d-aria-srl</strong>. 
                                Assicurati solo di aver abilitato l'accesso <strong>Anonimo</strong> nella console Firebase (Authentication {'>'} Sign-in method).
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold shrink-0">2</div>
                        <div>
                            <h3 className="font-bold text-lg mb-2">Pubblica l'App (Hosting)</h3>
                            <p className="text-slate-600 mb-2">
                                Per dare l'app ai dipendenti, devi caricarla su internet. Ecco il metodo più veloce e gratuito:
                            </p>
                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                <h4 className="font-bold text-emerald-800 text-sm mb-2">Usa Vercel o Netlify (Gratis):</h4>
                                <ol className="list-decimal list-inside text-sm text-slate-700 space-y-1">
                                    <li>Salva questo codice in un file sul tuo computer (es. su GitHub).</li>
                                    <li>Vai su <strong>Vercel.com</strong>, fai login e importa il progetto.</li>
                                    <li>Ti darà un link sicuro (es. <code>https://impresadaria.vercel.app</code>).</li>
                                    <li>Manda quel link ai dipendenti.</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4">
                         <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold shrink-0">3</div>
                         <div>
                            <h3 className="font-bold text-lg mb-2">Installazione sui telefoni</h3>
                            <p className="text-slate-600 mb-2">
                                I dipendenti aprono il link che hai creato. Poi:
                            </p>
                            <ul className="list-disc list-inside text-sm text-slate-700 space-y-2 bg-slate-50 p-4 rounded border">
                                <li><strong>Android (Chrome):</strong> Menu (tre puntini) &rarr; "Aggiungi a schermata Home".</li>
                                <li><strong>iPhone (Safari):</strong> Tasto Condividi (quadrato con freccia) &rarr; "Aggiungi alla Home".</li>
                            </ul>
                         </div>
                    </div>
                </div>

                <div className="mt-8 text-center pt-6 border-t">
                    <button onClick={onClose} className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800">Ho capito, chiudi guida</button>
                </div>
            </div>
        </div>
    );
};

// --- NEW COMPONENT: ACTIVITY LOGS ---
const ActivityLogs = ({ onClose, getCollectionPath }: { onClose: () => void, getCollectionPath: (name: string) => any }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    
    useEffect(() => {
        // Query to get last 50 logs using the correct path helper
        const q = query(getCollectionPath('logs'), orderBy('timestamp', 'desc'), limit(50));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogEntry));
            setLogs(data);
        });
        return () => unsub();
    }, []);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 animate-in fade-in mb-6">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <History className="text-sky-600" /> Registro Attività Dipendenti
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">Chiudi</button>
            </div>
            <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
                {logs.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-4">Nessuna attività recente registrata.</p>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="text-sm flex gap-3 pb-3 border-b border-slate-50 last:border-0">
                            <div className="text-slate-400 whitespace-nowrap font-mono text-xs flex flex-col items-end">
                                <span>{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleDateString() : '-'}</span>
                                <span>{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span>
                            </div>
                            <div>
                                <div className="font-bold text-slate-800">{log.username} <span className="font-normal text-slate-500 text-xs">({log.action})</span></div>
                                <div className="text-slate-600">{log.details}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// 4. Project Detail View
const ProjectDetail = ({ 
  project, 
  user, 
  onBack, 
  onUpdate,
  getCollectionPath 
}: { 
  project: Project, 
  user: UserProfile, 
  onBack: () => void, 
  onUpdate: (p: Project, d: Partial<Project>) => void,
  getCollectionPath: (name: string) => any
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'reports' | 'media'>('overview');
  
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2">
        ← Torna alla Dashboard
      </button>

      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">{project.name}</h1>
            <p className="text-slate-500 flex items-center gap-2">
              <Briefcase size={16} /> {project.client} 
              <span className="mx-2">•</span> 
              {project.description}
            </p>
          </div>
          <div className="bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-xs font-bold border border-sky-200 flex items-center gap-1">
             <Bot size={14} /> AI Ready
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 border-b border-slate-200">
        {[
          { id: 'overview', label: 'Riepilogo', icon: TrendingUp },
          { id: 'materials', label: 'Materiali', icon: Package },
          { id: 'reports', label: 'Rapportini', icon: ClipboardList },
          { id: 'media', label: 'Foto & Video', icon: ImageIcon },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-sky-600 border-b-2 border-sky-500 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm min-h-[400px] border border-slate-100">
        {activeTab === 'overview' && <OverviewTab project={project} user={user} onUpdateProject={onUpdate} getCollectionPath={getCollectionPath} />}
        {activeTab === 'materials' && <MaterialsTab project={project} user={user} getCollectionPath={getCollectionPath} />}
        {activeTab === 'reports' && <ReportsTab project={project} user={user} getCollectionPath={getCollectionPath} />}
        {activeTab === 'media' && <MediaTab project={project} user={user} getCollectionPath={getCollectionPath} />}
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS FOR TABS ---

const OverviewTab = ({ project, user, onUpdateProject, getCollectionPath }: { project: Project, user: UserProfile, onUpdateProject: (p: Project, d: Partial<Project>) => void, getCollectionPath: (name: string) => any }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const unsubMat = onSnapshot(getCollectionPath('materials'), (snap) => {
      const all = snap.docs.map(d => d.data() as Material).filter(m => m.projectId === project.id);
      setMaterials(all);
    });
    
    const unsubRep = onSnapshot(getCollectionPath('reports'), (snap) => {
      const all = snap.docs.map(d => d.data() as Report).filter(r => r.projectId === project.id);
      setReports(all);
    });

    return () => { unsubMat(); unsubRep(); };
  }, [project.id]);

  const handleAIAnalysis = async () => {
    if (!project.description) return;
    setIsAnalyzing(true);
    
    const prompt = `Sei un esperto capocantiere italiano nel settore impiantistica aeraulica e industriale. 
    Analizza questa descrizione cantiere: "${project.description}".
    
    Fornisci una risposta concisa in formato Markdown con:
    1. **Sicurezza e DPI:** Elenco dei DPI obbligatori e rischi principali specifici per questo lavoro.
    2. **Materiali Stimati:** Un elenco puntato delle 5 macro-categorie di materiali probabilmente necessari.
    
    Usa un tono tecnico e professionale.`;

    const analysis = await callGemini(prompt);
    
    if (analysis) {
        onUpdateProject(project, { aiAnalysis: analysis });
    }
    setIsAnalyzing(false);
  };

  const totalCost = materials.reduce((acc, curr) => acc + (curr.cost * curr.quantity), 0);
  const totalHours = reports.reduce((acc, curr) => acc + curr.hours, 0);

  return (
    <div className="p-6 space-y-8">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {user.role === 'master' ? (
            <div className="bg-sky-50 p-6 rounded-xl border border-sky-100">
              <div className="flex items-center gap-3 mb-2 text-sky-700">
                <DollarSign />
                <h3 className="font-bold">Costo Materiali Totale</h3>
              </div>
              <p className="text-3xl font-bold text-slate-800">€ {totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-sky-600 mt-2">Aggiornato in tempo reale</p>
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 opacity-70">
              <div className="flex items-center gap-3 mb-2 text-slate-700">
                <DollarSign />
                <h3 className="font-bold">Dati Finanziari</h3>
              </div>
              <p className="text-slate-500 italic">Riservato all'Amministratore</p>
            </div>
          )}

          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3 mb-2 text-blue-700">
              <Calendar />
              <h3 className="font-bold">Giorni Lavorati</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800">{reports.length}</p>
            <p className="text-sm text-blue-600 mt-2">{totalHours} ore totali registrate</p>
          </div>

          <div className="bg-green-50 p-6 rounded-xl border border-green-100">
            <div className="flex items-center gap-3 mb-2 text-green-700">
              <Package />
              <h3 className="font-bold">Voci Materiale</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800">{materials.length}</p>
            <p className="text-sm text-green-600 mt-2">Articoli caricati a sistema</p>
          </div>
       </div>

       {/* AI Section */}
       <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6 shadow-sm">
         <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2 text-indigo-800">
                <Bot className="w-6 h-6" />
                <h3 className="text-xl font-bold">Assistente Cantiere (Gemini AI)</h3>
            </div>
            <button 
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow transition-all disabled:opacity-50"
            >
                {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {project.aiAnalysis ? 'Aggiorna Analisi' : 'Analizza Cantiere'}
            </button>
         </div>
         
         {project.aiAnalysis ? (
             <div className="bg-white/80 p-4 rounded-lg text-slate-700 text-sm whitespace-pre-line border border-indigo-100 leading-relaxed">
                 {project.aiAnalysis}
             </div>
         ) : (
             <p className="text-indigo-400 text-sm italic">
                 Clicca su "Analizza Cantiere" per generare un piano di sicurezza e una lista materiali basati sulla descrizione del progetto.
             </p>
         )}
       </div>

       {user.role === 'master' && (
         <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
           <AlertTriangle className="text-yellow-600 shrink-0 mt-1" />
           <div>
             <h4 className="font-bold text-yellow-800">Nota Amministratore</h4>
             <p className="text-sm text-yellow-700">Ricorda di verificare i rapportini giornalieri caricati dai dipendenti. I costi visualizzati sono basati sui materiali inseriti manualmente.</p>
           </div>
         </div>
       )}
    </div>
  );
};

const MaterialsTab = ({ project, user, getCollectionPath }: { project: Project, user: UserProfile, getCollectionPath: (name: string) => any }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const q = getCollectionPath('materials');
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Material))
        .filter(m => m.projectId === project.id)
        .sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds); // Newest first
      setMaterials(items);
    });
    return () => unsub();
  }, [project.id]);

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    // Extract values
    const data = {
      projectId: project.id,
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      supplier: (form.elements.namedItem('supplier') as HTMLInputElement).value,
      cost: parseFloat((form.elements.namedItem('cost') as HTMLInputElement).value) || 0,
      quantity: parseFloat((form.elements.namedItem('quantity') as HTMLInputElement).value) || 0,
      unit: (form.elements.namedItem('unit') as HTMLInputElement).value,
      addedBy: user.name,
      createdAt: serverTimestamp()
    };

    await addDoc(getCollectionPath('materials'), data);
    
    // Log Activity
    logActivity(user.name, 'AGGIUNTA MATERIALE', `Aggiunto materiale: ${data.name} (${data.quantity} ${data.unit})`);
    
    setIsAdding(false);
  };

  const deleteMaterial = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo materiale?')) {
      const projectRef = activeConfig.projectId === "impresa-d-aria-srl" 
        ? doc(db, 'materials', id)
        : doc(db, 'artifacts', appId, 'public', 'data', 'materials', id);
        
      await deleteDoc(projectRef);
      logActivity(user.name, 'RIMOZIONE MATERIALE', 'Materiale rimosso dal cantiere');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-700">Lista Materiali in Cantiere</h3>
        <button 
          onClick={() => setIsAdding(true)} 
          className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-slate-800"
        >
          <Plus size={16} /> Aggiungi Materiale
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddMaterial} className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3 animate-in fade-in">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Materiale</label>
            <input required name="name" placeholder="Es. Canale zincato" className="w-full p-2 border rounded" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Fornitore</label>
            <input required name="supplier" placeholder="Es. Aeraulica Spa" className="w-full p-2 border rounded" />
          </div>
          <div className="md:col-span-1">
             <label className="text-xs font-bold text-slate-500 uppercase">Prezzo Unit.</label>
             <input type="number" step="0.01" name="cost" placeholder="€" className="w-full p-2 border rounded" />
          </div>
          <div className="md:col-span-1 flex gap-2">
            <div className="w-1/2">
                <label className="text-xs font-bold text-slate-500 uppercase">Qtà</label>
                <input type="number" required name="quantity" placeholder="0" className="w-full p-2 border rounded" />
            </div>
            <div className="w-1/2">
                <label className="text-xs font-bold text-slate-500 uppercase">Unità</label>
                <select name="unit" className="w-full p-2 border rounded bg-white">
                  <option value="pz">pz</option>
                  <option value="mt">mt</option>
                  <option value="kg">kg</option>
                </select>
            </div>
          </div>
          <div className="md:col-span-6 flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1 text-slate-500">Annulla</button>
            <button type="submit" className="bg-sky-600 text-white px-4 py-1 rounded">Salva</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-sm">
              <th className="py-3 px-2 font-medium">Materiale</th>
              <th className="py-3 px-2 font-medium">Fornitore</th>
              <th className="py-3 px-2 font-medium text-right">Quantità</th>
              {user.role === 'master' && <th className="py-3 px-2 font-medium text-right">Costo Unit.</th>}
              {user.role === 'master' && <th className="py-3 px-2 font-medium text-right">Totale</th>}
              <th className="py-3 px-2 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {materials.map(m => (
              <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-2 font-medium text-slate-800">{m.name}</td>
                <td className="py-3 px-2 text-slate-600">{m.supplier}</td>
                <td className="py-3 px-2 text-right font-mono text-slate-700">{m.quantity} {m.unit}</td>
                {user.role === 'master' && (
                  <>
                    <td className="py-3 px-2 text-right text-slate-600">€ {m.cost.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right font-bold text-slate-800">€ {(m.cost * m.quantity).toFixed(2)}</td>
                  </>
                )}
                <td className="py-3 px-2 text-right">
                  <button onClick={() => deleteMaterial(m.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {materials.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">Nessun materiale inserito.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ReportsTab = ({ project, user, getCollectionPath }: { project: Project, user: UserProfile, getCollectionPath: (name: string) => any }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  // New state for AI Rewrite
  const [description, setDescription] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);

  useEffect(() => {
    const q = getCollectionPath('reports');
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Report))
        .filter(r => r.projectId === project.id)
        .sort((a,b) => b.date.localeCompare(a.date)); // Date desc
      setReports(items);
    });
    return () => unsub();
  }, [project.id]);

  const handleRewrite = async () => {
    if (!description.trim()) return;
    setIsRewriting(true);
    
    const prompt = `Sei un assistente per un'impresa edile/impiantistica. Riscrivi il seguente appunto di cantiere in modo professionale, tecnico e corretto grammaticalmente in italiano, mantenendo il senso originale ma rendendolo adatto a un report ufficiale: "${description}"`;
    
    const rewritten = await callGemini(prompt);
    if (rewritten) {
      setDescription(rewritten.replace(/"/g, '')); // Remove extra quotes often added by LLM
    }
    setIsRewriting(false);
  };

  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    await addDoc(getCollectionPath('reports'), {
      projectId: project.id,
      date: (form.elements.namedItem('date') as HTMLInputElement).value,
      description: description,
      hours: parseFloat((form.elements.namedItem('hours') as HTMLInputElement).value) || 0,
      personnel: (form.elements.namedItem('personnel') as HTMLInputElement).value,
      author: user.name,
      createdAt: serverTimestamp()
    });
    
    // Log Activity
    logActivity(user.name, 'NUOVO RAPPORTINO', 'Inserito report giornaliero');
    
    setIsAdding(false);
    setDescription('');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-700">Rapportini Giornalieri</h3>
        <button 
          onClick={() => setIsAdding(true)} 
          className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-slate-800"
        >
          <Plus size={16} /> Nuovo Rapportino
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddReport} className="bg-sky-50 p-4 rounded-lg mb-6 border border-sky-200 space-y-3">
           <div className="flex gap-4">
             <div className="w-1/3">
               <label className="block text-xs font-bold text-sky-800 mb-1">Data</label>
               <input type="date" required name="date" className="w-full p-2 rounded border border-sky-200" defaultValue={new Date().toISOString().split('T')[0]} />
             </div>
             <div className="w-1/3">
               <label className="block text-xs font-bold text-sky-800 mb-1">Ore Totali</label>
               <input type="number" required name="hours" className="w-full p-2 rounded border border-sky-200" placeholder="8" />
             </div>
             <div className="w-1/3">
               <label className="block text-xs font-bold text-sky-800 mb-1">Personale (Nomi)</label>
               <input type="text" required name="personnel" className="w-full p-2 rounded border border-sky-200" placeholder="Mario, Luigi..." />
             </div>
           </div>
           
           <div>
              <div className="flex justify-between items-end mb-1">
                  <label className="block text-xs font-bold text-sky-800">Descrizione Attività</label>
                  <button 
                    type="button" 
                    onClick={handleRewrite}
                    disabled={!description || isRewriting}
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-purple-200 transition-colors"
                  >
                    {isRewriting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {isRewriting ? 'Riscrivendo...' : 'Migliora con AI'}
                  </button>
              </div>
              <textarea 
                name="description" 
                required 
                rows={3} 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 rounded border border-sky-200" 
                placeholder="Scrivi qui i lavori svolti (es. montato canali p.terra)..."
              ></textarea>
           </div>

           <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setIsAdding(false); setDescription(''); }} className="px-3 py-1 text-sky-700">Annulla</button>
              <button type="submit" className="bg-sky-600 text-white px-4 py-1 rounded font-medium">Salva Rapportino</button>
           </div>
        </form>
      )}

      <div className="space-y-4">
        {reports.map(report => (
          <div key={report.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
            <div className="flex justify-between items-start mb-2">
               <div className="flex items-center gap-2">
                 <div className="bg-slate-100 p-2 rounded text-slate-700 font-mono text-sm font-bold">
                   {new Date(report.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                 </div>
                 <div>
                   <h4 className="font-bold text-slate-800">{report.personnel}</h4>
                   <p className="text-xs text-slate-500">Inserito da: {report.author}</p>
                 </div>
               </div>
               <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                 {report.hours}h
               </div>
            </div>
            <p className="text-slate-600 text-sm pl-14 border-l-2 border-slate-100 ml-4 py-1 whitespace-pre-line">
              {report.description}
            </p>
          </div>
        ))}
         {reports.length === 0 && (
            <div className="text-center py-12 text-slate-400">Nessun rapportino registrato.</div>
          )}
      </div>
    </div>
  );
};

const MediaTab = ({ project, user, getCollectionPath }: { project: Project, user: UserProfile, getCollectionPath: (name: string) => any }) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = getCollectionPath('media');
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as MediaItem))
        .filter(m => m.projectId === project.id)
        .sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setMedia(items);
    });
    return () => unsub();
  }, [project.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      const file = e.target.files[0];
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        if (base64String.length > 800000) {
          alert("Immagine troppo grande per la demo. Usa immagini più piccole.");
          setLoading(false);
          return;
        }

        await addDoc(getCollectionPath('media'), {
          projectId: project.id,
          url: base64String,
          type: file.type.startsWith('video') ? 'video' : 'image',
          description: 'Caricato da ' + user.name,
          author: user.name,
          createdAt: serverTimestamp()
        });
        
        // Log Activity
        logActivity(user.name, 'UPLOAD FOTO', 'Caricata nuova foto cantiere');
        
        setLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-700">Galleria Fotografica</h3>
        <label className={`bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-slate-800 cursor-pointer ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          <Camera size={16} /> 
          <span>{loading ? 'Caricamento...' : 'Scatta/Carica Foto'}</span>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            onChange={handleFileUpload} 
          />
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {media.map(item => (
          <div key={item.id} className="group relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
            <img src={item.url} alt="Cantiere" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
              <p className="text-white text-xs font-medium">{item.author}</p>
              <p className="text-slate-300 text-[10px]">{new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</p>
            </div>
            {(user.role === 'master' || user.name === item.author) && (
              <button 
                onClick={() => {
                    const mediaRef = activeConfig.projectId === "impresa-d-aria-srl" 
                        ? doc(db, 'media', item.id)
                        : doc(db, 'artifacts', appId, 'public', 'data', 'media', item.id);
                    deleteDoc(mediaRef);
                    logActivity(user.name, 'RIMOZIONE FOTO', 'Foto eliminata');
                }}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      
      {media.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <ImageIcon size={48} className="mb-2 opacity-50" />
          <p>Nessuna foto caricata per questo cantiere.</p>
        </div>
      )}
    </div>
  );
};