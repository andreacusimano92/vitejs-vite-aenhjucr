import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  query, 
  onSnapshot, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  Activity, 
  Plus, 
  Trash2, 
  CheckCircle, 
  LogOut, 
  Database,
  Loader2,
  AlertCircle,
  User,
  Lock,
  LayoutDashboard,
  ShieldCheck,
  Package,
  Wrench,
  Euro,
  ClipboardList,
  Building2,
  FileText,
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Calculator,
  PieChart,
  HardHat,
  Edit2,
  Save,
  X,
  Calendar,
  Clock,
  Briefcase,
  ShoppingCart,
  CheckSquare,
  Sparkles,
  Bot,
  Users,
  FileCheck,
  Download,
  CalendarRange,
  Bell,
  UserCheck,
  FileUp,
  Maximize2,
  Truck,
  AlertTriangle,
  PenTool,
  MessageSquare,
  MapPin,
  History,
  Send,
  ShieldAlert,
  Timer,
  Eye
} from 'lucide-react';

// --- CONFIGURAZIONE ---
const firebaseConfig = {
  apiKey: "AIzaSyDVve-jM2etXrONNy0qycABczE_d_s7l1s",
  authDomain: "impresadariapp.firebaseapp.com",
  projectId: "impresadariapp",
  storageBucket: "impresadariapp.firebasestorage.app",
  messagingSenderId: "974775191860",
  appId: "1:974775191860:web:e221d61cdd46eb3cd03d61",
  measurementId: "G-N8KSTTS8ET"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'impresadaria-v1';
const STANDARD_HOURLY_RATE = 30.0;

// --- CONFIGURAZIONE UTENTI ---
const USERS_CONFIG = {
  'a.cusimano': { role: 'Master', access: 'full', name: 'Andrea Cusimano' },
  'f.gentile': { role: 'Master', access: 'full', name: 'Francesco Gentile' },
  'm.gentile': { role: 'Master', access: 'limited', name: 'Cosimo Gentile' },
  'g.gentile': { role: 'Master', access: 'limited', name: 'Giuseppe Gentile' },
  'f.devincentis': { role: 'Dipendente', name: 'Francesco De Vincentis' },
  'a.ingrosso': { role: 'Dipendente', name: 'Antonio Ingrosso' },
  'g.granio': { role: 'Dipendente', name: 'Giuseppe Granio' },
  'c.motolese': { role: 'Dipendente', name: 'Cosimo Motolese' },
  'o.camassa': { role: 'Dipendente', name: 'Osvaldo Camassa' },
  'c.tardiota': { role: 'Dipendente', name: 'Carmine Tardiota' }
};

// --- HELPERS ---

const callGeminiAI = async (prompt, imageBase64 = null) => {
  const apiKey = ""; 
  try {
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            ...(imageBase64 ? [{
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64.split(',')[1]
              }
            }] : [])
          ]
        }
      ]
    };
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Non sono riuscito a generare una risposta.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Errore di connessione con l'IA.";
  }
};

const logOperation = async (userData, action, details) => {
  let location = "N/D";
  try {
    if (navigator.geolocation) {
      const pos = await new Promise((resolve, reject) => {
         navigator.geolocation.getCurrentPosition(resolve, reject, {timeout: 3000});
      });
      location = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
    }
  } catch(e) { location = "Posizione non rilevata"; }
  try {
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'audit_logs'), {
      userId: userData?.uid || 'unknown',
      userName: userData?.name || 'Sconosciuto',
      action,
      details,
      location,
      createdAt: serverTimestamp()
    });
  } catch(e) { console.error("Log error", e); }
};

const sendNotification = async (targetUserId, title, message, type = 'info') => {
  try {
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'), {
      targetUserId, title, message, type, read: false, createdAt: serverTimestamp()
    });
  } catch (e) { console.error("Notify Error", e); }
};

// --- COMPONENTI UI DI BASE ---

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
      <p>Caricamento sistema ImpresadariAPP...</p>
    </div>
  );
}

// --- COMPONENTE PRINCIPALE ---

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        const username = currentUser.email.split('@')[0];
        const config = USERS_CONFIG[username] || { role: 'Dipendente', name: username };
        setUserData({ ...config, uid: currentUser.uid, username });
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {user ? <Dashboard user={user} userData={userData} /> : <AuthScreen />}
    </div>
  );
}

// --- VISTE PRINCIPALI ---

function AuthScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgError, setImgError] = useState(false); 

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const cleanUsername = username.trim().toLowerCase();
    const email = `${cleanUsername}@impresadaria.app`;

    if (password.length < 6) { setError("Password troppo corta (min. 6 caratteri)."); setIsSubmitting(false); return; }

    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (loginError) {
      if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
        try { await createUserWithEmailAndPassword(auth, email, password); } catch (regError) { setError("Errore creazione: " + regError.message); }
      } else if (loginError.code === 'auth/wrong-password') { setError("Password errata."); } else { setError("Errore: " + loginError.message); }
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-blue-800 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-700 to-indigo-900 opacity-95"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-2xl transform hover:scale-105 transition-transform duration-300 overflow-hidden p-2">
              {!imgError ? <img src="logo.jpg" alt="Logo" className="w-full h-full object-contain" onError={() => setImgError(true)} /> : <Building2 className="w-12 h-12 text-blue-800" />}
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">ImpresadariAPP</h1>
            <div className="h-1 w-20 bg-blue-400 rounded-full mb-3"></div>
            <p className="text-blue-100 text-sm font-medium tracking-wide">L'app ufficiale di<br/><span className="font-bold text-white text-base">Impresa d'Aria Srl</span></p>
          </div>
        </div>
        <div className="p-8">
          {error && <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm font-medium">{error}</div>}
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username</label><div className="relative group"><User className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 group-focus-within:text-blue-600 transition-colors" /><input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700" placeholder="es. a.cusimano" autoCapitalize="none" /></div></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label><div className="relative group"><Lock className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 group-focus-within:text-blue-600 transition-colors" /><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700" placeholder="••••••" /></div></div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mt-6">{isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Accedi'}</button>
          </form>
          <div className="mt-8 text-center border-t border-slate-100 pt-6"><p className="text-xs text-slate-400">© 2024 Impresa d'Aria Srl. Tutti i diritti riservati.</p></div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user, userData }) {
  const [selectedTask, setSelectedTask] = useState(null); 
  const [activeTab, setActiveTab] = useState('tasks'); 
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const handleLogout = () => signOut(auth);
  
  const safeUserData = userData || { role: 'Dipendente', name: 'Utente', uid: user?.uid };
  const isMaster = safeUserData.role === 'Master';
  const isAdmin = safeUserData.role === 'Master' && safeUserData.access === 'full'; 

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myNotifs = all.filter(n => {
        if (n.targetUserId === 'all') return true;
        if (n.targetUserId === 'all_masters' && isMaster) return true;
        return n.targetUserId === user.uid;
      }).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setNotifications(myNotifs);
    });
    return () => unsub();
  }, [user, isMaster]);

  const markRead = async (id) => {
    try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', id), { read: true }); } catch(e){}
  };

  return (
    <div>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><LayoutDashboard className="w-5 h-5" /></div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight hidden sm:block">ImpresadariAPP</h1>
              <div className="flex gap-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isMaster ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{safeUserData.role}</span>
                {isMaster && !isAdmin && <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Limitato</span>}
              </div>
            </div>
          </div>
          
          {!selectedTask && (
            <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto mx-2">
              <button onClick={() => setActiveTab('tasks')} className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'tasks' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Cantieri</button>
              <button onClick={() => setActiveTab('vehicles')} className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'vehicles' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Mezzi</button>
              <button onClick={() => setActiveTab('reports')} className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'reports' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Report</button>
              <button onClick={() => setActiveTab('materials')} className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'materials' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Magazzino</button>
              <button onClick={() => setActiveTab('personal')} className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'personal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Personale</button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="p-2 rounded-full hover:bg-slate-100 relative text-slate-600">
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.read).length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
              </button>
              {showNotifPanel && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center px-2 pb-2 border-b border-slate-100"><h4 className="font-bold text-sm">Notifiche</h4><button onClick={() => setShowNotifPanel(false)}><X className="w-4 h-4 text-slate-400"/></button></div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? <p className="text-center text-xs text-slate-400 py-4">Nessuna notifica</p> : 
                      notifications.map(n => (
                        <div key={n.id} onClick={() => markRead(n.id)} className={`p-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 ${!n.read ? 'bg-blue-50/50' : ''}`}>
                          <p className="text-xs font-bold text-slate-800">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            <div className="hidden md:block text-right"><p className="text-xs font-bold text-slate-800">{safeUserData.name}</p></div>
            <button onClick={handleLogout} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-red-600 transition-colors"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {selectedTask ? (
          <TaskDetailView task={selectedTask} user={user} userData={safeUserData} isMaster={isMaster} isAdmin={isAdmin} onBack={() => setSelectedTask(null)} />
        ) : activeTab === 'tasks' ? (
          <TasksView user={user} userData={safeUserData} isMaster={isMaster} isAdmin={isAdmin} onSelectTask={setSelectedTask} />
        ) : activeTab === 'vehicles' ? (
           <VehiclesView user={user} userData={safeUserData} isAdmin={isAdmin} isMaster={isMaster} />
        ) : activeTab === 'reports' ? (
           <DailyReportsView user={user} userData={safeUserData} isMaster={isMaster} isAdmin={isAdmin} />
        ) : activeTab === 'materials' ? (
          <MaterialsView user={user} userData={safeUserData} isMaster={isMaster} isAdmin={isAdmin} context="warehouse" />
        ) : (
           <PersonalAreaView user={user} userData={safeUserData} isMaster={isMaster} isAdmin={isAdmin} />
        )}
      </main>
    </div>
  );
}

// --- COMPONENTI DI DETTAGLIO ---

function SiteTeam({ task, isAdmin }) {
  const [assigned, setAssigned] = useState(task.assignedTeam || []);
  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => { setAssigned(task.assignedTeam || []); }, [task.assignedTeam]);

  const allStaff = Object.values(USERS_CONFIG); 
  const getRoleByName = (name) => {
    const user = allStaff.find(u => u.name === name);
    return user ? user.role : 'Dipendente';
  };

  const handleAssign = async () => {
    if(!selectedUser || !isAdmin) return;
    try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { assignedTeam: arrayUnion(selectedUser) }); setSelectedUser(''); } catch(err) { alert(err.message); }
  };

  const handleRemove = async (name) => {
    if(!isAdmin) return;
    if(!window.confirm("Rimuovere dalla squadra?")) return;
    try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { assignedTeam: arrayRemove(name) }); } catch(err) { alert(err.message); }
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-2">
          <select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
            <option value="">-- Seleziona Personale --</option>
            {allStaff.map(u => (<option key={u.name} value={u.name} disabled={assigned.includes(u.name)}>{u.name} {u.role === 'Master' ? '(Master)' : ''}</option>))}
          </select>
          <button onClick={handleAssign} disabled={!selectedUser} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Assegna</button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {assigned.length === 0 ? <p className="col-span-full text-center py-8 text-slate-400 text-sm">Nessun membro del team assegnato.</p> :
          assigned.map(name => {
            const role = getRoleByName(name);
            return (
            <div key={name} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${role === 'Master' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>{name.charAt(0)}</div><div><span className="text-sm font-medium text-slate-700 block">{name}</span><span className="text-[10px] text-slate-400 uppercase">{role}</span></div></div>
              {isAdmin && <button onClick={() => handleRemove(name)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>}
            </div>
          )})
        }
      </div>
    </div>
  );
}

// ... Altri componenti (TasksView, MaterialsView, DailyReportsView, etc.) seguono qui ...
// Per brevità e stabilità, ho incluso solo i fix principali qui sopra. Assicurati che non ci siano definizioni duplicate di SiteTeam o AuthScreen.

function TaskDetailView({ task, user, userData, isMaster, isAdmin, onBack }) {
  const [activeSection, setActiveSection] = useState('overview'); 
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: task.title, client: task.client, description: task.description || '' });

  const tabs = [
    { id: 'overview', label: 'Panoramica', icon: Activity },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'team', label: 'Squadra', icon: Users },
    { id: 'documents', label: 'Documenti', icon: FileCheck },
    { id: 'schedule', label: 'Crono', icon: CalendarRange },
    { id: 'materials', label: 'Materiali', icon: Package },
    { id: 'requests', label: 'Richieste', icon: ShoppingCart },
    { id: 'photos', label: 'Foto', icon: Camera },
    ...(isMaster ? [{ id: 'accounting', label: 'Contabilità', icon: Calculator }] : [])
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-medium mb-4 transition-colors"><ArrowLeft className="w-4 h-4" /> Torna alla lista</button>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><HardHat className="w-6 h-6 text-orange-500" /> {task.title}</h2><div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600"><span className="flex items-center gap-1"><User className="w-4 h-4" /> {task.client}</span><span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${task.completed ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{task.completed ? 'COMPLETATO' : 'IN CORSO'}</span></div></div>
          {isAdmin && <button onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"><Edit2 className="w-4 h-4" /> Modifica</button>}
        </div>
        <div className="flex gap-1 mt-8 border-b border-slate-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><tab.icon className="w-4 h-4" /> {tab.label}</button>
          ))}
        </div>
      </div>
      <div className="min-h-[400px]">
        {activeSection === 'overview' && <SiteOverview task={task} isMaster={isMaster} />}
        {activeSection === 'team' && <SiteTeam task={task} isAdmin={isAdmin} />}
        {/* Altri componenti renderizzati qui... */}
      </div>
    </div>
  );
}

// Nota: Assicurati che non ci siano duplicati alla fine del file!
// FINE CODICE
