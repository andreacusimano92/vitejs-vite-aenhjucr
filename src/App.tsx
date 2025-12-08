import React, { useState, useEffect } from 'react';
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
  initializeFirestore
} from 'firebase/firestore';
import { 
  Briefcase, ClipboardList, HardHat, Image as ImageIcon, Plus, DollarSign, 
  Users, Calendar, Trash2, LogOut, ChevronRight, Package, Camera, TrendingUp, 
  AlertTriangle, Wind, UserCheck, KeyRound, Sparkles, Bot, Loader2, Share2, 
  QrCode, Info, History, Settings, Wifi, WifiOff
} from 'lucide-react';

// --- INCOLLA QUI LE TUE NUOVE CHIAVI DEL PROGETTO "ImpresaDaria-App" ---
const firebaseConfig = {
  apiKey: "AIzaSyDVve-jM2etXrONNy0qycABczE_d_s7l1s",
  authDomain: "impresadariapp.firebaseapp.com",
  projectId: "impresadariapp",
  storageBucket: "impresadariapp.firebasestorage.app",
  messagingSenderId: "974775191860",
  appId: "1:974775191860:web:e221d61cdd46eb3cd03d61",
  measurementId: "G-N8KSTTS8ET"
};

// Inizializzazione
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// FIX: Connessione standard (funziona con il database predefinito del nuovo progetto)
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}); 

// --- UTILS ---
const callGemini = async (prompt: string) => { return "Analisi AI non disponibile."; };

const logActivity = async (username: string, action: string, details: string) => {
  try { await addDoc(collection(db, 'logs'), { username, action, details, timestamp: serverTimestamp() }); } catch (e) { console.error(e); }
};

// --- TYPES ---
type UserRole = 'master' | 'employee';
interface UserProfile { uid: string; name: string; role: UserRole; username: string; }
interface Project { id: string; name: string; client: string; status: string; description: string; createdAt: any; aiAnalysis?: string; }
interface Material { id: string; projectId: string; name: string; supplier: string; cost: number; quantity: number; unit: string; }
interface Report { id: string; projectId: string; date: string; description: string; hours: number; personnel: string; author: string; }
interface MediaItem { id: string; projectId: string; url: string; type: string; description: string; author: string; }

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

const AuthScreen = ({ onLogin, connectionStatus }: { onLogin: (u: UserProfile) => void, connectionStatus: string }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const user = AUTHORIZED_USERS.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
    if (user && user.password === password) {
      logActivity(user.name, 'LOGIN', 'Accesso effettuato');
      onLogin({ uid: user.username, name: user.name, role: user.role as UserRole, username: user.username });
    } else {
      setError('Credenziali errate');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full border-t-4 border-sky-600">
        <div className="text-center mb-8">
          <div className="bg-sky-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wind className="text-white w-12 h-12" /></div>
          <h1 className="text-2xl font-bold text-slate-800 uppercase">Impresa D'Aria Srl</h1>
          <p className="text-sky-600 font-medium">Gestione Cantieri</p>
        </div>
        <div className={`p-3 rounded-lg text-sm mb-6 flex items-center gap-2 ${connectionStatus === 'connected' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {connectionStatus === 'connected' ? <Wifi size={16}/> : <Loader2 className="animate-spin" size={16}/>}
            {connectionStatus === 'connected' ? 'Sistema Online' : `Stato: ${connectionStatus}`}
        </div>
        <div className="space-y-4">
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Username" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Password" />
          {error && <div className="text-red-600 text-sm flex items-center gap-2"><AlertTriangle size={16}/>{error}</div>}
          <button onClick={handleLogin} className="w-full bg-slate-900 text-white p-4 rounded-lg font-bold">Accedi</button>
        </div>
      </div>
    </div>
  );
};

export default function ImpiantiApp() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('Connessione al database...');

  useEffect(() => {
    const init = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e: any) {
        console.error("Auth Error", e);
        setConnectionStatus(e.code === 'auth/operation-not-allowed' ? 'ERRORE: Abilita "Anonimo" su Firebase' : e.message);
      }
    };
    init();
    onAuthStateChanged(auth, (u) => {
      if (u) {
        const saved = localStorage.getItem('impianti_user_v2');
        if (saved) setUser(JSON.parse(saved));
      }
    });
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    // Usa la collezione 'projects' nel DB di default
    const unsub = onSnapshot(collection(db, 'projects'), 
      (snap) => {
        setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)).sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)));
        setConnectionStatus('connected');
      },
      (err) => {
        console.error(err);
        setConnectionStatus(`ERRORE DB: ${err.code}. Verifica le Regole su Firebase.`);
      }
    );
    return () => unsub();
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const client = (form.elements.namedItem('client') as HTMLInputElement).value;
    const desc = (form.elements.namedItem('description') as HTMLInputElement).value;

    try {
      await addDoc(collection(db, 'projects'), {
        name, client, description: desc, status: 'active', createdAt: serverTimestamp()
      });
      logActivity(user!.name, 'CREAZIONE', `Nuovo cantiere: ${name}`);
      form.reset();
    } catch (e: any) {
      alert(`ERRORE SALVATAGGIO: ${e.message}`);
    }
  };

  const handleLogin = (u: UserProfile) => {
    setUser(u);
    localStorage.setItem('impianti_user_v2', JSON.stringify(u));
  };

  if (!user) return <AuthScreen onLogin={handleLogin} connectionStatus={connectionStatus} />;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-10">
      <nav className="bg-slate-900 text-white p-4 sticky top-0 z-50 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2 font-bold text-lg cursor-pointer" onClick={() => setActiveProject(null)}>
          <Wind className="text-sky-400"/> IMPRESA D'ARIA SRL
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right text-xs hidden sm:block">
                <div className="text-sky-400 font-bold">{user.name}</div>
                <div className="opacity-70">{user.role}</div>
            </div>
            <button onClick={() => { setUser(null); localStorage.removeItem('impianti_user_v2'); }}><LogOut size={20}/></button>
        </div>
      </nav>

      {user.role === 'master' && connectionStatus !== 'connected' && (
          <div className="bg-red-600 text-white text-xs p-2 text-center font-bold">
              {connectionStatus}
          </div>
      )}

      <main className="max-w-6xl mx-auto p-4">
        {activeProject ? (
          <ProjectDetail project={activeProject} user={user} onBack={() => setActiveProject(null)} />
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Cantieri Attivi</h2>
                {user.role === 'master' && <div className="text-xs bg-slate-200 px-2 py-1 rounded">Modalità Master</div>}
            </div>

            {user.role === 'master' && (
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-sky-500">
                    <h3 className="font-bold mb-2">Nuovo Cantiere</h3>
                    <form onSubmit={handleCreateProject} className="flex flex-col gap-2">
                        <input name="name" placeholder="Nome Cantiere" required className="p-2 border rounded" />
                        <input name="client" placeholder="Cliente" required className="p-2 border rounded" />
                        <input name="description" placeholder="Descrizione" className="p-2 border rounded" />
                        <button className="bg-sky-600 text-white p-2 rounded font-bold">Crea Cantiere</button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(p => (
                    <div key={p.id} onClick={() => setActiveProject(p)} className="bg-white p-6 rounded-xl shadow hover:shadow-lg cursor-pointer transition-all border border-slate-100">
                        <h3 className="font-bold text-lg text-slate-800">{p.name}</h3>
                        <p className="text-slate-500 text-sm mb-2">{p.client}</p>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">IN CORSO</span>
                    </div>
                ))}
                {projects.length === 0 && <p className="text-center text-slate-400 col-span-full py-10">Nessun cantiere trovato.</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const ProjectDetail = ({ project, user, onBack }: any) => {
    const [tab, setTab] = useState('materials');
    return (
        <div className="space-y-4">
            <button onClick={onBack} className="text-slate-500 hover:text-slate-800 mb-2">← Indietro</button>
            <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <p className="text-slate-500">{project.description}</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['materials', 'reports', 'media'].map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg font-bold capitalize ${tab === t ? 'bg-sky-600 text-white' : 'bg-white text-slate-600'}`}>{t}</button>
                ))}
            </div>
            {tab === 'materials' && <MaterialsList projectId={project.id} user={user} />}
            {tab === 'reports' && <ReportsList projectId={project.id} user={user} />}
            {tab === 'media' && <MediaList projectId={project.id} user={user} />}
        </div>
    );
};

const MaterialsList = ({ projectId, user }: any) => {
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => onSnapshot(query(collection(db, 'materials'), orderBy('createdAt', 'desc')), s => setItems(s.docs.map(d => ({id:d.id, ...d.data()})).filter((x:any) => x.projectId === projectId))), [projectId]);
    
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
        <div className="p-4 bg-white rounded-xl shadow">
            <h3 className="font-bold mb-4">Materiali</h3>
            <form onSubmit={add} className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-4 rounded">
                <input name="name" placeholder="Materiale" required className="border p-2 rounded" />
                <input name="supplier" placeholder="Fornitore" required className="border p-2 rounded" />
                <input name="qty" type="number" placeholder="Qtà" required className="border p-2 rounded" />
                <select name="unit" className="border p-2 rounded"><option>pz</option><option>mt</option><option>kg</option></select>
                <input name="cost" type="number" placeholder="Costo Unit." className="border p-2 rounded" />
                <button className="bg-sky-600 text-white rounded font-bold">Aggiungi</button>
            </form>
            <div className="space-y-2">
                {items.map(i => (
                    <div key={i.id} className="flex justify-between border-b pb-2">
                        <span>{i.name} ({i.qty}{i.unit})</span>
                        {user.role === 'master' && <span className="font-bold">€ {(i.cost * i.quantity).toFixed(2)}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ReportsList = ({ projectId, user }: any) => {
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc')), s => setItems(s.docs.map(d => ({id:d.id, ...d.data()})).filter((x:any) => x.projectId === projectId))), [projectId]);
    
    const add = async (e:any) => {
        e.preventDefault();
        const d = new FormData(e.target);
        await addDoc(collection(db, 'reports'), {
            projectId, date: d.get('date'), hours: d.get('hours'), personnel: d.get('personnel'), description: d.get('desc'), author: user.name, createdAt: serverTimestamp()
        });
        e.target.reset();
    };

    return (
        <div className="p-4 bg-white rounded-xl shadow">
            <h3 className="font-bold mb-4">Rapportini</h3>
            <form onSubmit={add} className="flex flex-col gap-2 mb-4 bg-slate-50 p-4 rounded">
                <div className="flex gap-2">
                    <input name="date" type="date" required className="border p-2 rounded w-1/3" />
                    <input name="hours" type="number" placeholder="Ore" required className="border p-2 rounded w-1/3" />
                    <input name="personnel" placeholder="Personale" required className="border p-2 rounded w-1/3" />
                </div>
                <textarea name="desc" placeholder="Descrizione lavori..." required className="border p-2 rounded" />
                <button className="bg-sky-600 text-white p-2 rounded font-bold">Salva Rapportino</button>
            </form>
            <div className="space-y-2">
                {items.map(i => (
                    <div key={i.id} className="border p-3 rounded">
                        <div className="font-bold flex justify-between">
                            <span>{i.date} - {i.personnel}</span>
                            <span className="bg-blue-100 text-blue-800 px-2 rounded text-xs">{i.hours}h</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{i.description}</p>
                        <div className="text-xs text-slate-400 mt-2 text-right">Inserito da: {i.author}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MediaList = ({ projectId, user }: any) => {
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => onSnapshot(query(collection(db, 'media'), orderBy('createdAt', 'desc')), s => setItems(s.docs.map(d => ({id:d.id, ...d.data()})).filter((x:any) => x.projectId === projectId))), [projectId]);
    
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
        <div className="p-4 bg-white rounded-xl shadow">
            <div className="flex justify-between mb-4">
                <h3 className="font-bold">Foto</h3>
                <label className="bg-slate-900 text-white px-3 py-1 rounded cursor-pointer text-sm">
                    + Carica Foto <input type="file" onChange={upload} hidden accept="image/*" />
                </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {items.map(i => (
                    <div key={i.id} className="aspect-square bg-slate-100 rounded overflow-hidden relative">
                        <img src={i.url} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 bg-black/50 text-white text-[10px] w-full p-1">{i.author}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
