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
  ShieldAlert
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
const STANDARD_HOURLY_RATE = 30.00; 

// --- INTEGRAZIONE AI (GEMINI) ---
const callGeminiAI = async (prompt) => {
  const apiKey = ""; 
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Non sono riuscito a generare una risposta.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Errore di connessione con l'IA.";
  }
};

// --- LOGGING HELPER (AUDIT TRAIL) ---
const logOperation = async (userData, action, details) => {
  let location = "N/D";
  try {
    if (navigator.geolocation) {
      const pos = await new Promise((resolve, reject) => {
         navigator.geolocation.getCurrentPosition(resolve, reject, {timeout: 5000});
      });
      location = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
    }
  } catch(e) { location = "Posizione non rilevata"; }

  try {
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'audit_logs'), {
      userId: userData.uid,
      userName: userData.name,
      action,
      details,
      location,
      createdAt: serverTimestamp()
    });
  } catch(e) { console.error("Log error", e); }
};

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
  'o.camassa': { role: 'Dipendente', name: 'Osvaldo Camassa' }
};

// --- HELPER NOTIFICHE ---
const sendNotification = async (targetUserId, title, message, type = 'info') => {
  try {
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'), {
      targetUserId, 
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (e) { console.error("Notify Error", e); }
};

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

// --- UTILITIES ---
const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500">
    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
    <p>Caricamento sistema...</p>
  </div>
);

// --- DASHBOARD & ROUTING ---
function Dashboard({ user, userData }) {
  const [selectedTask, setSelectedTask] = useState(null); 
  const [activeTab, setActiveTab] = useState('tasks'); 
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const handleLogout = () => signOut(auth);
  
  const isMaster = userData?.role === 'Master';
  const isAdmin = userData?.role === 'Master' && userData?.access === 'full'; 

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

  const unreadCount = notifications.filter(n => !n.read).length;

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
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isMaster ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{userData?.role}</span>
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
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
              </button>
              
              {showNotifPanel && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center px-2 pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-sm">Notifiche</h4>
                    <button onClick={() => setShowNotifPanel(false)}><X className="w-4 h-4 text-slate-400"/></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? <p className="text-center text-xs text-slate-400 py-4">Nessuna notifica</p> : 
                      notifications.map(n => (
                        <div key={n.id} onClick={() => markRead(n.id)} className={`p-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 ${!n.read ? 'bg-blue-50/50' : ''}`}>
                          <p className="text-xs font-bold text-slate-800">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                          <p className="text-[10px] text-slate-300 mt-2 text-right">{n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleTimeString() : ''}</p>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:block text-right">
              <p className="text-xs font-bold text-slate-800">{userData?.name}</p>
              <p className="text-[10px] text-green-600 flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Online</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-red-600 transition-colors"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {selectedTask ? (
          <TaskDetailView 
            task={selectedTask} 
            user={user} 
            userData={userData} 
            isMaster={isMaster}
            isAdmin={isAdmin}
            onBack={() => setSelectedTask(null)} 
          />
        ) : activeTab === 'tasks' ? (
          <TasksView 
            user={user} 
            userData={userData} 
            isMaster={isMaster}
            isAdmin={isAdmin}
            onSelectTask={setSelectedTask} 
          />
        ) : activeTab === 'vehicles' ? (
           <VehiclesView user={user} userData={userData} isAdmin={isAdmin} isMaster={isMaster} />
        ) : activeTab === 'reports' ? (
           <DailyReportsView user={user} userData={userData} isMaster={isMaster} isAdmin={isAdmin} />
        ) : activeTab === 'materials' ? (
          <MaterialsView 
            user={user} 
            userData={userData} 
            isMaster={isMaster}
            isAdmin={isAdmin}
            context="warehouse" 
          />
        ) : activeTab === 'personal' ? (
           <PersonalAreaView user={user} userData={userData} isMaster={isMaster} isAdmin={isAdmin} />
        ) : (
           <TasksView 
            user={user} 
            userData={userData} 
            isMaster={isMaster}
            isAdmin={isAdmin}
            onSelectTask={setSelectedTask} 
          />
        )}
      </main>
    </div>
  );
}

// --- VISTA PARCO MEZZI ---
function VehiclesView({ user, userData, isAdmin, isMaster }) {
  const [vehicles, setVehicles] = useState([]);
  const [newVehicle, setNewVehicle] = useState({ 
    name: '', plate: '', type: 'Furgone', 
    insuranceDate: '', taxDate: '', inspectionDate: '' 
  });
  const allEmployees = Object.values(USERS_CONFIG);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles'));
    const unsub = onSnapshot(q, (snap) => {
      setVehicles(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if(!isAdmin) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles'), { ...newVehicle, assignedTo: 'Libero' });
    await logOperation(userData, "Aggiunta Mezzo", `Creato ${newVehicle.name} - ${newVehicle.plate}`);
    setNewVehicle({ name: '', plate: '', type: 'Furgone', insuranceDate: '', taxDate: '', inspectionDate: '' });
  };

  const handleAssign = async (vehicleId, name) => {
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles', vehicleId), { assignedTo: name });
    await logOperation(userData, "Assegnazione Mezzo", `Assegnato mezzo ${vehicleId} a ${name}`);
  };

  const handleDelete = async (id) => {
    if(!isAdmin) return;
    if(window.confirm("Eliminare mezzo?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles', id));
  }

  const checkDeadlines = async () => {
    if (!isMaster) return;
    let count = 0;
    const today = new Date();
    
    for (let v of vehicles) {
      const dates = [
        { label: 'Assicurazione', date: v.insuranceDate },
        { label: 'Bollo', date: v.taxDate },
        { label: 'Revisione', date: v.inspectionDate }
      ];

      for (let d of dates) {
        if (d.date) {
          const expDate = new Date(d.date);
          const diffTime = expDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 30) {
             const msg = diffDays < 0 
               ? `SCADUTA: ${d.label} per ${v.name} (${v.plate})`
               : `In scadenza: ${d.label} per ${v.name} (${v.plate}) tra ${diffDays} giorni`;
             
             await sendNotification('all_masters', 'Avviso Scadenza Mezzo', msg, 'warning');
             count++;
          }
        }
      }
    }
    alert(`Controllo completato. Inviate ${count} notifiche per scadenze imminenti o passate.`);
  };

  const getDeadlineStatus = (dateString) => {
    if (!dateString) return { status: 'none', label: '-' };
    const today = new Date();
    const expDate = new Date(dateString);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: 'expired', label: 'SCADUTO', color: 'text-red-600 font-bold' };
    if (diffDays <= 30) return { status: 'warning', label: `${diffDays} gg`, color: 'text-orange-500 font-bold' };
    return { status: 'ok', label: new Date(dateString).toLocaleDateString(), color: 'text-slate-500' };
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-3 flex gap-2"><Truck className="w-5 h-5 text-blue-600"/> Aggiungi Mezzo / Attrezzatura</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="flex flex-col md:flex-row gap-2">
              <select className="px-3 py-2 border rounded-lg text-sm" value={newVehicle.type} onChange={e=>setNewVehicle({...newVehicle, type: e.target.value})}><option>Furgone</option><option>Auto</option><option>Attrezzatura</option></select>
              <input type="text" placeholder="Modello/Nome" className="flex-1 px-3 py-2 border rounded-lg text-sm" value={newVehicle.name} onChange={e=>setNewVehicle({...newVehicle, name: e.target.value})} required/>
              <input type="text" placeholder="Targa/Serial" className="w-32 px-3 py-2 border rounded-lg text-sm" value={newVehicle.plate} onChange={e=>setNewVehicle({...newVehicle, plate: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="flex flex-col"><label className="text-[10px] uppercase text-slate-500 font-bold">Assicurazione</label><input type="date" className="px-3 py-2 border rounded-lg text-sm" value={newVehicle.insuranceDate} onChange={e=>setNewVehicle({...newVehicle, insuranceDate: e.target.value})} /></div>
              <div className="flex flex-col"><label className="text-[10px] uppercase text-slate-500 font-bold">Bollo</label><input type="date" className="px-3 py-2 border rounded-lg text-sm" value={newVehicle.taxDate} onChange={e=>setNewVehicle({...newVehicle, taxDate: e.target.value})} /></div>
              <div className="flex flex-col"><label className="text-[10px] uppercase text-slate-500 font-bold">Revisione</label><input type="date" className="px-3 py-2 border rounded-lg text-sm" value={newVehicle.inspectionDate} onChange={e=>setNewVehicle({...newVehicle, inspectionDate: e.target.value})} /></div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Salva</button>
            </div>
          </form>
        </div>
      )}

      {isMaster && (
        <div className="flex justify-end">
          <button onClick={checkDeadlines} className="flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg transition-colors border border-slate-200">
            <ShieldAlert className="w-4 h-4"/> Verifica Scadenze & Notifica
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map(v => {
          const insStatus = getDeadlineStatus(v.insuranceDate);
          const taxStatus = getDeadlineStatus(v.taxDate);
          const inspStatus = getDeadlineStatus(v.inspectionDate);
          const hasIssues = insStatus.status !== 'ok' || taxStatus.status !== 'ok' || inspStatus.status !== 'ok';

          return (
            <div key={v.id} className={`bg-white p-4 rounded-xl border shadow-sm relative overflow-hidden ${hasIssues ? 'border-orange-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-slate-800">{v.name}</h4>
                  <p className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-1 rounded mt-1">{v.plate || 'No Targa'}</p>
                </div>
                {v.type === 'Attrezzatura' ? <Wrench className="w-8 h-8 text-orange-200"/> : <Truck className="w-8 h-8 text-blue-200"/>}
              </div>
              
              <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center"><span className="text-slate-500 text-xs">Assicurazione:</span> <span className={`text-xs ${insStatus.color}`}>{insStatus.label}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500 text-xs">Bollo:</span> <span className={`text-xs ${taxStatus.color}`}>{taxStatus.label}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500 text-xs">Revisione:</span> <span className={`text-xs ${inspStatus.color}`}>{inspStatus.label}</span></div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Assegnato a:</p>
                {isAdmin ? (
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-sm outline-none"
                    value={v.assignedTo}
                    onChange={(e) => handleAssign(v.id, e.target.value)}
                  >
                    <option>Libero</option>
                    {allEmployees.map(u => <option key={u.name}>{u.name}</option>)}
                  </select>
                ) : (
                  <p className="font-medium text-slate-700">{v.assignedTo}</p>
                )}
              </div>
              {isAdmin && <button onClick={()=>handleDelete(v.id)} className="absolute bottom-2 right-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- VISTA DETTAGLIO CANTIERE ---
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

  const handleUpdateTask = async () => {
    if(!isAdmin) return; 
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), {
      title: editData.title,
      client: editData.client,
      description: editData.description
    });
    setIsEditing(false);
    task.title = editData.title; task.client = editData.client; task.description = editData.description;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-medium mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Torna alla lista cantieri
        </button>
        
        {!isEditing ? (
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><HardHat className="w-6 h-6 text-orange-500" /> {task.title}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600">
                <span className="flex items-center gap-1"><User className="w-4 h-4" /> {task.client}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${task.completed ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{task.completed ? 'COMPLETATO' : 'IN CORSO'}</span>
              </div>
              {task.description && <p className="mt-3 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm max-w-2xl">{task.description}</p>}
            </div>
            {isAdmin && <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"><Edit2 className="w-4 h-4" /> Modifica Dati</button>}
          </div>
        ) : (
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div><label className="text-xs font-bold text-slate-500 uppercase">Nome</label><input value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase">Committente</label><input value={editData.client} onChange={e => setEditData({...editData, client: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none" /></div>
            </div>
            <div className="mb-4"><label className="text-xs font-bold text-slate-500 uppercase">Descrizione</label><textarea value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none" rows="2" /></div>
            <div className="flex justify-end gap-2"><button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Annulla</button><button onClick={handleUpdateTask} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4" /> Salva</button></div>
          </div>
        )}

        <div className="flex gap-1 mt-8 border-b border-slate-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeSection === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeSection === 'overview' && <SiteOverview task={task} isMaster={isMaster} />}
        {activeSection === 'chat' && <SiteChat taskId={task.id} user={user} userData={userData} />}
        {activeSection === 'team' && <SiteTeam task={task} isAdmin={isAdmin} />}
        {activeSection === 'documents' && <SiteDocuments task={task} user={user} isAdmin={isAdmin} userData={userData} />}
        {activeSection === 'schedule' && <SiteSchedule task={task} isAdmin={isAdmin} />}
        {activeSection === 'materials' && <MaterialsView user={user} userData={userData} isMaster={isMaster} isAdmin={isAdmin} context="site" taskId={task.id} />}
        {activeSection === 'requests' && <MaterialRequestsView user={user} userData={userData} isAdmin={isAdmin} task={task} taskId={task.id} />} 
        {activeSection === 'photos' && <SitePhotos taskId={task.id} user={user} userData={userData} isAdmin={isAdmin} />}
        {activeSection === 'accounting' && isMaster && <SiteAccounting taskId={task.id} user={user} isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

// --- NUOVA CHAT DI CANTIERE ---
function SiteChat({ taskId, user, userData }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'site_chats'), where('taskId', '==', taskId), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({id: d.id, ...d.data()})));
      if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
    return () => unsub();
  }, [taskId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if(!newMessage.trim()) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'site_chats'), {
      taskId,
      userId: user.uid,
      userName: userData.name,
      message: newMessage,
      createdAt: serverTimestamp()
    });
    setNewMessage('');
  }

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3" ref={scrollRef}>
        {messages.map(msg => {
          const isMe = msg.userId === user.uid;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                {!isMe && <p className="text-[10px] font-bold text-blue-600 mb-1">{msg.userName}</p>}
                {msg.message}
              </div>
              <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '...'}</span>
            </div>
          )
        })}
      </div>
      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
        <input className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" placeholder="Scrivi un messaggio..." value={newMessage} onChange={e=>setNewMessage(e.target.value)} />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Send className="w-5 h-5"/></button>
      </form>
    </div>
  )
}

// --- REPORT GIORNALIERI (CON FIRMA) ---
function DailyReportsView({ user, userData, isMaster }) {
  const [reports, setReports] = useState([]);
  const [tasks, setTasks] = useState([]); 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ taskId: '', date: new Date().toISOString().split('T')[0], hours: '', description: '' });
  
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const qTasks = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'));
    const unsubTasks = onSnapshot(qTasks, (snap) => setTasks(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const qReports = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'));
    const unsubReports = onSnapshot(qReports, (snap) => setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => new Date(b.date) - new Date(a.date))));
    return () => { unsubTasks(); unsubReports(); };
  }, []);

  const startDraw = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }
  const moveDraw = (e) => {
    if(!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  const endDraw = () => setIsDrawing(false);
  const clearSign = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0, canvas.width, canvas.height);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.taskId) return;
    
    let signature = null;
    if(canvasRef.current) {
        signature = canvasRef.current.toDataURL();
        if(signature.length < 1000) signature = null; 
    }

    const selectedTask = tasks.find(t => t.id === formData.taskId);
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), {
      ...formData,
      taskTitle: selectedTask?.title || 'Unknown',
      hours: parseFloat(formData.hours),
      userId: user.uid,
      userName: userData?.name,
      signature,
      createdAt: serverTimestamp()
    });
    await logOperation(userData, "Invio Report", `Report inviato per cantiere ${selectedTask?.title}`);
    await sendNotification('all_masters', 'Nuovo Report', `${userData?.name} ha caricato un report.`);
    setFormData({ taskId: '', date: new Date().toISOString().split('T')[0], hours: '', description: '' });
    clearSign();
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      {!isFormOpen && (
        <button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 transition-all">
          <Plus className="w-5 h-5" /> Compila Report Giornaliero
        </button>
      )}

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4"><h3 className="font-semibold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Nuovo Report Attività</h3><button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">Annulla</button></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Seleziona Cantiere</label><select required value={formData.taskId} onChange={e => setFormData({...formData, taskId: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg"><option value="">-- Seleziona --</option>{tasks.map(t => (<option key={t.id} value={t.id}>{t.title} - {t.client}</option>))}</select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase">Data</label><input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg"/></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase">Ore</label><input type="number" step="0.5" required value={formData.hours} onChange={e => setFormData({...formData, hours: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg"/></div>
            </div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Descrizione</label><textarea required rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-lg" /></div>
            
            <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
               <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><PenTool className="w-3 h-3"/> Firma per accettazione (Cliente/Resp)</label><button type="button" onClick={clearSign} className="text-xs text-red-500 underline">Pulisci</button></div>
               <canvas 
                 ref={canvasRef} 
                 width={300} 
                 height={150} 
                 className="w-full h-32 bg-white border border-slate-200 rounded-lg touch-none"
                 onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
                 onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}
               />
            </div>

            <div className="flex justify-end pt-2"><button type="submit" className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-medium shadow-md hover:bg-blue-700 transition-colors">Invia Report</button></div>
          </form>
        </div>
      )}

      {/* Lista Storico Report */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-bold text-slate-700">Storico Attività Recenti</h3></div>
        <div className="divide-y divide-slate-100">
          {reports.map(report => (
              <div key={report.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1"><span className="font-bold text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{report.taskTitle}</span><span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(report.date).toLocaleDateString('it-IT')}</span></div>
                  <p className="text-slate-800 text-sm mb-2">{report.description}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500"><span className="flex items-center gap-1 font-medium text-slate-700"><User className="w-3 h-3" /> {report.userName}</span><span className="flex items-center gap-1 font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded"><Clock className="w-3 h-3" /> {report.hours} ore</span></div>
                  {report.signature && <div className="mt-2 text-xs text-slate-400 border-t border-slate-100 pt-1">Firmato digitalmente</div>}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// 1. Panoramica
function SiteOverview({ task, isMaster }) {
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const prompt = `Analizza questo cantiere edile. Nome: ${task.title}. Committente: ${task.client}. Descrizione: ${task.description}. Stato: ${task.completed ? 'Completato' : 'In Corso'}. Scrivi un breve riassunto professionale sullo stato e suggerisci 2 priorità tipiche.`;
    const result = await callGeminiAI(prompt);
    setAiAnalysis(result);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-4">
       {isMaster && (
         <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 p-4 rounded-xl border border-violet-100">
            <div className="flex justify-between items-start mb-2">
               <h3 className="font-bold text-violet-800 flex items-center gap-2"><Bot className="w-5 h-5"/> Assistente Cantiere AI</h3>
               {!aiAnalysis && <button onClick={handleAiAnalysis} disabled={loadingAi} className="text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-violet-700">{loadingAi ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} Analizza</button>}
            </div>
            {aiAnalysis ? <div className="text-sm text-slate-700 bg-white/50 p-3 rounded-lg border border-violet-100 animate-in fade-in">{aiAnalysis}</div> : <p className="text-xs text-violet-600">Clicca analizza per generare un riepilogo intelligente del cantiere.</p>}
         </div>
       )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-blue-800"><h3 className="font-semibold text-lg flex items-center gap-2"><Wrench className="w-5 h-5" /> Stato Lavori</h3><p className="text-sm mt-2 opacity-80">Sezione pronta per visualizzare lo stato di avanzamento e le scadenze prossime.</p></div>
        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 text-indigo-800"><h3 className="font-semibold text-lg flex items-center gap-2"><User className="w-5 h-5" /> Squadra</h3><p className="text-sm mt-2 opacity-80">{task.assignedTeam ? `${task.assignedTeam.length} dipendenti assegnati` : 'Nessun dipendente assegnato'}</p></div>
      </div>
    </div>
  );
}

// 2. Foto Cantiere (MODIFICATA: Lightbox + Permessi + Logging)
function SitePhotos({ taskId, user, userData, isAdmin }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null); 
  const fileInputRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'photos'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allPhotos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPhotos(allPhotos.filter(p => p.taskId === taskId).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });
    return () => unsubscribe();
  }, [taskId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2000000) { alert("Il file è troppo grande. Usa immagini sotto 2MB."); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'photos'), {
          taskId, imageData: reader.result, createdAt: serverTimestamp(), userId: user.uid, uploaderName: userData?.name || 'Utente', fileName: file.name
        });
        await logOperation(userData, "Upload Foto", `Caricata foto ${file.name}`);
        await sendNotification('all_masters', 'Nuova Foto', `${userData?.name} ha caricato una foto nel cantiere.`);
      } catch (err) { alert("Errore caricamento foto."); } finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const deletePhoto = async (photo) => {
    const isOwner = photo.userId === user.uid;
    if(!isAdmin && !isOwner) { alert("Puoi eliminare solo le foto caricate da te."); return; }
    if(!window.confirm("Sicuro di voler eliminare questa foto?")) return;
    try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'photos', photo.id)); } catch(err) {}
  };

  return (
    <div className="space-y-6">
      {lightboxImg && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setLightboxImg(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-slate-300"><X className="w-8 h-8"/></button>
          <img src={lightboxImg} className="max-w-full max-h-full rounded shadow-2xl object-contain" alt="Fullscreen" />
        </div>
      )}

      <div className="flex justify-between items-center"><h3 className="text-lg font-semibold text-slate-800">Documentazione Fotografica</h3><div className="relative"><input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" /><button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Aggiungi Foto</button></div></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {photos.map(photo => (
          <div key={photo.id} className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer" onClick={() => setLightboxImg(photo.imageData)}>
            <img src={photo.imageData} alt="Cantiere" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <div className="p-2 bg-white/20 text-white rounded-full backdrop-blur-sm"><Maximize2 className="w-5 h-5" /></div>
              {(isAdmin || photo.userId === user.uid) && <button onClick={(e) => { e.stopPropagation(); deletePhoto(photo); }} className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm"><Trash2 className="w-5 h-5" /></button>}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white">
               <p className="text-[10px] font-bold">{photo.uploaderName}</p>
               <p className="text-[9px] opacity-80">{photo.createdAt ? new Date(photo.createdAt.seconds * 1000).toLocaleDateString() : ''}</p>
            </div>
          </div>
        ))}
        {photos.length === 0 && <div className="col-span-2 md:col-span-4 py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400"><ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>Nessuna foto caricata per questo cantiere.</p></div>}
      </div>
    </div>
  );
}

// 3. Contabilità Cantiere (Solo Master)
function SiteAccounting({ taskId, user, isAdmin }) {
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [reportsTotal, setReportsTotal] = useState(0); 
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '', type: 'Manodopera' });

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'));
    const unsub = onSnapshot(q, (snap) => {
      const taskMaterials = snap.docs.map(d => d.data()).filter(m => m.taskId === taskId);
      setMaterialsTotal(taskMaterials.reduce((sum, item) => sum + (parseFloat(item.cost || 0) * parseFloat(item.quantity || 0)), 0));
    });
    return () => unsub();
  }, [taskId]);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'expenses'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setExpenses(all.filter(e => e.taskId === taskId));
    });
    return () => unsub();
  }, [taskId]);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'));
    const unsub = onSnapshot(q, (snap) => {
      const taskReports = snap.docs.map(d => d.data()).filter(r => r.taskId === taskId);
      setReportsTotal(taskReports.reduce((sum, r) => sum + (parseFloat(r.hours || 0)), 0) * STANDARD_HOURLY_RATE);
    });
    return () => unsub();
  }, [taskId]);

  const addExpense = async (e) => {
    e.preventDefault();
    if(!isAdmin) { alert("Solo Master Full possono aggiungere spese manuali."); return; } // Limitazione per Master Limitati
    if(!newExpense.desc || !newExpense.amount) return;
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'expenses'), {
        taskId, description: newExpense.desc, amount: parseFloat(newExpense.amount), type: newExpense.type, createdAt: serverTimestamp()
      });
      setNewExpense({ desc: '', amount: '', type: 'Manodopera' });
    } catch(err) { console.error(err); }
  };

  const deleteExpense = async (id) => {
    if(!isAdmin) return;
    try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'expenses', id)); } catch(err) {}
  };

  const expensesTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const grandTotal = materialsTotal + expensesTotal + reportsTotal;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Costo Materiali</div><div className="text-2xl font-bold text-slate-800">€ {materialsTotal.toFixed(2)}</div></div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Manodopera & Extra</div><div className="flex items-baseline gap-2"><div className="text-2xl font-bold text-orange-600">€ {(expensesTotal + reportsTotal).toFixed(2)}</div><span className="text-xs text-orange-400 font-medium">(di cui €{reportsTotal.toFixed(2)} dai report)</span></div></div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm text-white"><div className="text-slate-400 text-xs font-bold uppercase mb-1">Totale Cantiere</div><div className="text-3xl font-bold">€ {grandTotal.toFixed(2)}</div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center"><h3 className="font-semibold text-slate-800">Spese Extra Manuali</h3></div>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            {isAdmin ? (
              <form onSubmit={addExpense} className="flex flex-col sm:flex-row gap-2">
                <select value={newExpense.type} onChange={e => setNewExpense({...newExpense, type: e.target.value})} className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none"><option>Manodopera Extra</option><option>Permessi</option><option>Noleggio</option><option>Pasti/Trasferte</option><option>Altro</option></select>
                <input type="text" placeholder="Descrizione" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none" value={newExpense.desc} onChange={e => setNewExpense({...newExpense, desc: e.target.value})} />
                <input type="number" placeholder="€ Costo" className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Aggiungi</button>
              </form>
            ) : <p className="text-xs text-center text-slate-400">Modalità sola lettura</p>}
          </div>
          <div className="divide-y divide-slate-100">
            {expenses.map(exp => (
              <div key={exp.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                <div><div className="font-medium text-slate-800">{exp.description}</div><div className="text-xs text-slate-500">{exp.type} • {exp.createdAt ? new Date(exp.createdAt.seconds * 1000).toLocaleDateString() : ''}</div></div>
                <div className="flex items-center gap-3"><span className="font-bold text-slate-700">€ {exp.amount.toFixed(2)}</span>{isAdmin && <button onClick={() => deleteExpense(exp.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-100 p-6">
            <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2"><Clock className="w-5 h-5"/> Manodopera da Report</h3>
            <p className="text-sm text-orange-700 mb-4">Il costo della manodopera viene calcolato automaticamente.</p>
            <div className="flex justify-between items-center border-t border-orange-200 pt-3"><span className="text-orange-800 font-medium">Tasso Orario:</span><span className="font-bold text-orange-900">€ {STANDARD_HOURLY_RATE.toFixed(2)} / ora</span></div>
             <div className="flex justify-between items-center mt-2"><span className="text-orange-800 font-medium">Totale:</span><span className="font-bold text-orange-900">€ {reportsTotal.toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  );
}

// --- ALTRI COMPONENTI (SiteTeam, SiteDocuments, SiteSchedule) ---
// Aggiornati per usare isAdmin invece di isMaster dove serve limitare l'azione

function SiteDocuments({ task, user, isAdmin, userData }) {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const [docType, setDocType] = useState('Tecnico');

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'documents'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setDocs(all.filter(d => d.taskId === task.id).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });
    return () => unsub();
  }, [task.id]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'documents'), {
          taskId: task.id, name: file.name, type: docType, data: reader.result, uploadedBy: user.email.split('@')[0], createdAt: serverTimestamp()
        });
        await logOperation(userData, "Upload Documento Cantiere", `Caricato ${docType} in ${task.title}`);
        await sendNotification('all', 'Nuovo Documento', `Caricato documento ${docType} per ${task.title}.`);
      } catch(err) { alert("Errore caricamento"); }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const deleteDocFile = async (id) => {
    if(!isAdmin) return;
    if(!window.confirm("Eliminare documento?")) return;
    try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'documents', id)); } catch(err) {}
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <select value={docType} onChange={e=>setDocType(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"><option>Tecnico</option><option>POS / Sicurezza</option><option>Grafico</option><option>Contratto</option></select>
            <input type="file" ref={fileRef} className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.png,.doc,.docx" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 w-full sm:w-auto justify-center">{uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} Carica Documento</button>
          </div>
          <p className="text-xs text-slate-400">PDF, Immagini (Max 1MB)</p>
        </div>
      )}
      <div className="grid gap-3">
        {docs.length === 0 ? <p className="text-center py-8 text-slate-400 text-sm">Nessun documento presente.</p> : 
          docs.map(d => (
            <div key={d.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-4"><div className={`p-3 rounded-lg ${d.type === 'POS / Sicurezza' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}><FileText className="w-5 h-5" /></div><div><h4 className="font-medium text-slate-800 text-sm">{d.name}</h4><p className="text-xs text-slate-500">{d.type} • Caricato da {d.uploadedBy}</p></div></div>
              <div className="flex items-center gap-2"><a href={d.data} download={d.name} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Download className="w-4 h-4" /></a>{isAdmin && <button onClick={() => deleteDocFile(d.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

function SiteTeam({ task, isAdmin }) {
  const [assigned, setAssigned] = useState(task.assignedTeam || []);
  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => { setAssigned(task.assignedTeam || []); }, [task.assignedTeam]);

  const handleAssign = async () => {
    if(!selectedUser || !isAdmin) return;
    try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { assignedTeam: arrayUnion(selectedUser) }); setSelectedUser(''); } catch(err) { alert(err.message); }
  };

  const handleRemove = async (name) => {
    if(!isAdmin) return;
    if(!window.confirm("Rimuovere dalla squadra?")) return;
    try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { assignedTeam: arrayRemove(name) }); } catch(err) { alert(err.message); }
  };

  const allEmployees = Object.values(USERS_CONFIG).filter(u => u.role === 'Dipendente');

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-2">
          <select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"><option value="">-- Seleziona Dipendente --</option>{allEmployees.map(u => (<option key={u.name} value={u.name} disabled={assigned.includes(u.name)}>{u.name}</option>))}</select>
          <button onClick={handleAssign} disabled={!selectedUser} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Assegna</button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {assigned.length === 0 ? <p className="col-span-full text-center py-8 text-slate-400 text-sm">Nessun dipendente assegnato a questo cantiere.</p> :
          assigned.map(name => (
            <div key={name} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">{name.charAt(0)}</div><span className="text-sm font-medium text-slate-700">{name}</span></div>
              {isAdmin && <button onClick={() => handleRemove(name)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>}
            </div>
          ))
        }
      </div>
    </div>
  );
}

function SiteSchedule({ task, isAdmin }) {
  const [schedule, setSchedule] = useState(task.schedule || []);
  const [newPhase, setNewPhase] = useState({ name: '', start: '', end: '' });
  const [generating, setGenerating] = useState(false);

  useEffect(() => { setSchedule(task.schedule || []); }, [task.schedule]);

  const addPhase = async (e) => {
    e.preventDefault();
    if(!isAdmin) return;
    if(!newPhase.name || !newPhase.start || !newPhase.end) return;
    const updatedSchedule = [...schedule, newPhase].sort((a,b) => new Date(a.start) - new Date(b.start));
    try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { schedule: updatedSchedule }); setNewPhase({ name: '', start: '', end: '' }); } catch(err) { alert(err.message); }
  };

  const removePhase = async (index) => {
    if(!isAdmin) return;
    const updated = schedule.filter((_, i) => i !== index);
    try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { schedule: updated }); } catch(err) {}
  };

  const generateWithAI = async () => {
    if(!isAdmin) return;
    setGenerating(true);
    const prompt = `Crea un cronoprogramma realistico (JSON array di oggetti con campi: name, start (YYYY-MM-DD), end (YYYY-MM-DD)) per questo cantiere: "${task.title}". Descrizione: "${task.description}". Oggi è ${new Date().toISOString().split('T')[0]}. Genera 4-5 fasi sequenziali logiche. Restituisci SOLO il JSON array puro senza markdown.`;
    try {
      const res = await callGeminiAI(prompt);
      const cleanJson = res.replace(/```json|```/g, '').trim();
      const aiPhases = JSON.parse(cleanJson);
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { schedule: aiPhases });
    } catch(err) { alert("Errore AI: Riprova"); }
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><h4 className="text-sm font-bold text-slate-700 mb-3">Aggiungi Fase Manuale</h4><form onSubmit={addPhase} className="flex flex-col md:flex-row gap-2"><input type="text" placeholder="Fase (es. Demolizioni)" className="flex-1 border rounded-lg px-3 py-2 text-sm" value={newPhase.name} onChange={e=>setNewPhase({...newPhase, name: e.target.value})} /><input type="date" className="border rounded-lg px-3 py-2 text-sm" value={newPhase.start} onChange={e=>setNewPhase({...newPhase, start: e.target.value})} /><input type="date" className="border rounded-lg px-3 py-2 text-sm" value={newPhase.end} onChange={e=>setNewPhase({...newPhase, end: e.target.value})} /><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Aggiungi</button></form></div>
          <button onClick={generateWithAI} disabled={generating} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all">{generating ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>} Genera Cronoprogramma con AI</button>
        </div>
      )}
      <div className="space-y-2">
        {schedule.length === 0 ? <p className="text-center py-8 text-slate-400 text-sm">Nessuna fase pianificata.</p> : 
          schedule.map((phase, idx) => {
            const today = new Date(); const start = new Date(phase.start); const end = new Date(phase.end); const isLate = today > end && !task.completed; const isActive = today >= start && today <= end;
            return (
              <div key={idx} className="relative bg-white border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isLate ? 'bg-red-500' : isActive ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                <div className="pl-2"><h4 className="font-bold text-slate-800 text-sm">{phase.name}</h4><div className="flex items-center gap-3 mt-1 text-xs text-slate-500"><span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {start.toLocaleDateString()}</span><span className="text-slate-300">→</span><span className={`flex items-center gap-1 ${isLate ? 'text-red-600 font-bold' : ''}`}><Calendar className="w-3 h-3"/> {end.toLocaleDateString()}</span></div></div>
                {isAdmin && <button onClick={() => removePhase(idx)} className="text-slate-300 hover:text-red-500 self-end sm:self-center"><Trash2 className="w-4 h-4"/></button>}
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

// Material Requests View (Aggiornata per notifiche)
function MaterialRequestsView({ taskId, user, userData, isAdmin, task }) {
  const [requests, setRequests] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'material_requests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(all.filter(r => r.taskId === taskId).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [taskId]);

  const handleAddRequest = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'material_requests'), {
        taskId, item: newItem, quantity: quantity, userId: user.uid, userName: userData?.name || 'Dipendente', status: 'pending', createdAt: serverTimestamp()
      });
      await logOperation(userData, "Richiesta Materiale", `${newItem} per cantiere ${task.title}`);
      await sendNotification('all_masters', 'Richiesta Materiale', `${userData?.name} ha richiesto ${newItem} per ${task.title}.`);
      setNewItem(''); setQuantity('');
    } catch (err) { alert(err.message); }
  };

  const handleAiSuggest = async () => {
    setLoadingAi(true);
    const prompt = `Sono in un cantiere edile per: "${task?.title}". Descrizione: "${task?.description || ''}". Suggerisci 5 materiali o attrezzature essenziali che potrei aver dimenticato di ordinare. Rispondi solo con una lista separata da virgole.`;
    const result = await callGeminiAI(prompt);
    setAiSuggestions(result.split(','));
    setLoadingAi(false);
  };

  const toggleStatus = async (req) => {
    if (!isAdmin) return; // Solo Admin cambia stato
    const newStatus = req.status === 'ordered' ? 'pending' : 'ordered';
    try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'material_requests', req.id), { status: newStatus }); } catch(err) { console.error(err); }
  };

  const deleteRequest = async (id) => {
    if (!isAdmin && !window.confirm("Cancellare richiesta?")) return;
    try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'material_requests', id)); } catch(err) {}
  };

  return (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl mb-4 flex justify-between items-center">
        <div><h3 className="font-bold text-orange-800 text-sm mb-1 flex items-center gap-2"><ShoppingCart className="w-4 h-4"/> Richieste Fornitura</h3><p className="text-xs text-orange-700">Richiedi materiale mancante per il cantiere.</p></div>
        {!aiSuggestions && (<button onClick={handleAiSuggest} disabled={loadingAi} className="text-xs bg-white text-orange-600 border border-orange-200 px-3 py-2 rounded-lg font-medium hover:bg-orange-100 flex items-center gap-1 shadow-sm">{loadingAi ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3 text-yellow-500"/>} Suggerisci Materiali AI</button>)}
      </div>
      {aiSuggestions && (
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-4 animate-in slide-in-from-top-2">
           <div className="flex justify-between items-center mb-2"><h4 className="text-xs font-bold text-yellow-800 flex items-center gap-1"><Bot className="w-3 h-3"/> Suggerimenti AI:</h4><button onClick={() => setAiSuggestions(null)} className="text-yellow-600 hover:text-yellow-800"><X className="w-3 h-3"/></button></div>
           <div className="flex flex-wrap gap-2">{aiSuggestions.map((sugg, idx) => (<button key={idx} onClick={() => setNewItem(sugg.trim())} className="text-xs bg-white border border-yellow-300 text-yellow-800 px-2 py-1 rounded-md hover:bg-yellow-100 transition-colors">+ {sugg.trim()}</button>))}</div>
        </div>
      )}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <form onSubmit={handleAddRequest} className="flex gap-2"><input type="text" placeholder="Cosa serve?" className="flex-1 px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newItem} onChange={e => setNewItem(e.target.value)} /><input type="text" placeholder="Q.tà" className="w-20 px-3 py-2 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={quantity} onChange={e => setQuantity(e.target.value)} /><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700">Richiedi</button></form>
      </div>
      <div className="space-y-2">
        {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 my-4" /> : requests.length === 0 ? <p className="text-center text-slate-400 text-sm py-8">Nessuna richiesta di materiale attiva.</p> :
          requests.map(req => (
            <div key={req.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${req.status === 'ordered' ? 'bg-green-50 border-green-100 opacity-70' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-3"><button onClick={() => toggleStatus(req)} disabled={!isAdmin} className={`w-5 h-5 rounded border flex items-center justify-center ${req.status === 'ordered' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent'} ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}><CheckSquare className="w-3.5 h-3.5" /></button><div><p className={`font-medium text-sm ${req.status === 'ordered' ? 'line-through text-slate-500' : 'text-slate-800'}`}>{req.item} <span className="text-slate-500 font-normal">({req.quantity})</span></p><p className="text-[10px] text-slate-400">Richiesto da: {req.userName} • {req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleDateString() : ''}</p></div></div>
              {(isAdmin || req.userId === user.uid) && <button onClick={() => deleteRequest(req.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>}
            </div>
          ))
        }
      </div>
    </div>
  );
}

function TasksView({ user, userData, isMaster, isAdmin, onSelectTask }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTasks(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!isAdmin) { alert("Solo gli Admin possono creare cantieri."); return; }
    if (!title.trim() || !client.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'), {
        title, client, description, completed: false, createdAt: serverTimestamp(), userId: user.uid, authorName: userData?.name
      });
      await logOperation(userData, "Creazione Cantiere", `Nuovo cantiere: ${title}`);
      setTitle(''); setClient(''); setDescription(''); setIsFormOpen(false);
    } catch (err) { alert(err.message); }
  };

  const toggleTask = async (task, e) => {
    e.stopPropagation();
    try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { completed: !task.completed }); } catch (err) {}
  };

  const deleteTask = async (taskId, e) => {
    e.stopPropagation();
    if (!isAdmin) { alert("Solo gli Admin possono eliminare."); return; }
    if (!window.confirm("Eliminare definitivamente?")) return;
    try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', taskId)); } catch (err) {}
  };

  return (
    <div className="space-y-6">
      {isAdmin && !isFormOpen && (
        <button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 transition-all">
          <Plus className="w-5 h-5" /> Registra Nuova Attività
        </button>
      )}

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-blue-600" /> Dettagli Attività</h3>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">Annulla</button>
          </div>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg" placeholder="Cantiere / Attività" />
              <input required type="text" value={client} onChange={e => setClient(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg" placeholder="Committente" />
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg" placeholder="Descrizione..." />
            <div className="flex justify-end"><button type="submit" className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-medium">Salva</button></div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {loading ? <div className="text-center py-10"><Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" /></div> : tasks.length === 0 ? 
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300"><ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" /><h3 className="text-slate-900 font-medium">Nessuna attività registrata</h3></div> : 
          tasks.map((task) => (
            <div key={task.id} onClick={() => onSelectTask(task)} className={`group cursor-pointer relative bg-white rounded-xl border p-5 transition-all hover:ring-2 hover:ring-blue-500 hover:border-transparent hover:shadow-lg ${task.completed ? 'border-slate-100 bg-slate-50 opacity-75' : 'border-slate-200'}`}>
              <div className="flex items-start gap-4">
                <button onClick={(e) => toggleTask(task, e)} className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent hover:border-green-500'}`}><CheckCircle className="w-3.5 h-3.5" strokeWidth={3} /></button>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`text-lg font-bold ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mt-1 font-medium"><User className="w-3.5 h-3.5" /> Committente: {task.client}</div>
                    </div>
                    {isAdmin && <button onClick={(e) => deleteTask(task.id, e)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-400 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1">Clicca per gestire materiali e foto</span>
                    <span className="ml-auto text-blue-600 font-semibold group-hover:underline">Apri Cantiere →</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

function MaterialsView({ user, userData, isMaster, isAdmin, context = 'warehouse', taskId = null }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', supplier: '', type: 'Elettrico', quantity: '', unit: 'pz', cost: '', code: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = context === 'site' ? data.filter(item => item.taskId === taskId) : data;
      filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMaterials(filtered);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [context, taskId]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'), {
        ...formData,
        taskId: context === 'site' ? taskId : null,
        createdAt: serverTimestamp(),
        userId: user.uid,
        authorName: userData?.name
      });
      setFormData({ name: '', supplier: '', type: 'Elettrico', quantity: '', unit: 'pz', cost: '', code: '' });
      setIsFormOpen(false);
    } catch (err) { alert(err.message); }
  };

  const deleteMaterial = async (id) => {
    if (!isAdmin) { alert("Solo i Master possono eliminare."); return; }
    if (!window.confirm("Eliminare materiale?")) return;
    try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'materials', id)); } catch (err) {}
  };

  return (
    <div className="space-y-6">
      {!isFormOpen && (
        <button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 transition-all">
          <Plus className="w-5 h-5" /> 
          {context === 'site' ? 'Carica Materiale per Cantiere' : 'Carica Nuovo Materiale'}
        </button>
      )}

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4"><h3 className="font-semibold text-slate-800 flex items-center gap-2"><Package className="w-5 h-5 text-blue-600" /> Scheda Materiale</h3><button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">Annulla</button></div>
          <form onSubmit={handleAddMaterial} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1 md:col-span-2 space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Descrizione Articolo</label><input required name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Codice</label><input name="code" value={formData.code} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg" /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Fornitore</label><input required name="supplier" value={formData.supplier} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg" /></div>
               <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Tipo</label><select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg"><option>Elettrico</option><option>Idraulico</option><option>Edile</option><option>Ferramenta</option><option>Altro</option></select></div>
               <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Q.tà</label><div className="flex"><input required type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border rounded-l-lg" /><select name="unit" value={formData.unit} onChange={handleChange} className="bg-slate-100 border rounded-r-lg px-2"><option value="pz">pz</option><option value="m">m</option><option value="kg">kg</option><option value="cf">cf</option></select></div></div>
               <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Costo (€)</label><input type="number" step="0.01" name="cost" value={formData.cost} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg" /></div>
            </div>
            <div className="pt-2 flex justify-end"><button type="submit" className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-medium">Salva</button></div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs font-bold">
              <tr>
                <th className="px-4 py-3">Articolo</th>
                <th className="px-4 py-3">Fornitore</th>
                <th className="px-4 py-3 text-center">Q.tà</th>
                <th className="px-4 py-3 text-right">Totale</th>
                {isAdmin && <th className="px-4 py-3 text-right">Azioni</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan="5" className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></td></tr> : materials.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-slate-400">Nessun materiale registrato</td></tr> : 
                materials.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{item.name} {item.code && <span className="text-xs text-slate-400 block">{item.code}</span>}</td>
                    <td className="px-4 py-3 text-slate-600">{item.supplier}</td>
                    <td className="px-4 py-3 text-center">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">€ {(parseFloat(item.quantity||0)*parseFloat(item.cost||0)).toFixed(2)}</td>
                    {isAdmin && <td className="px-4 py-3 text-right"><button onClick={() => deleteMaterial(item.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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
