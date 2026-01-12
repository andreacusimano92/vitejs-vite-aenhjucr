import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
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
  Loader2,
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
  ImageIcon,
  Calculator,
  HardHat,
  Edit2,
  Save,
  X,
  Calendar,
  Clock,
  Briefcase,
  ShoppingCart,
  CheckSquare,
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
  Send,
  ShieldAlert,
  Timer,
  Eye,
  LockKeyhole,
  UnlockKeyhole,
  FileBarChart,
  Map
} from 'lucide-react';

// --- CONFIGURAZIONE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDVve-jM2etXrONNy0qycABczE_d_s7l1s",
  authDomain: "impresadariapp.firebaseapp.com",
  projectId: "impresadariapp",
  storageBucket: "impresadariapp.firebasestorage.app",
  messagingSenderId: "974775191860",
  appId: "1:974775191860:web:e221d61cdd46eb3cd03d61",
  measurementId: "G-N8KSTTS8ET"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'impresadaria-v1';
const STANDARD_HOURLY_RATE = 30.00;

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

// --- HELPERS GLOBALI ---

async function logOperation(userData, action, details) {
  let location = "N/D";
  try {
    if (navigator.geolocation) {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }));
      location = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
    }
  } catch (e) { location = "Non rilevata"; }
  try {
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'audit_logs'), {
      userId: userData?.uid || 'anon', 
      userName: userData?.name || 'Utente', 
      action, 
      details: String(details), 
      location, 
      createdAt: serverTimestamp()
    });
  } catch (e) {}
}

async function sendNotification(targetUserId, title, message, type = 'info') {
  try {
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'), {
      targetUserId, title, message, type, read: false, createdAt: serverTimestamp()
    });
  } catch (e) {}
}

// --- COMPONENTI UI BASE ---

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
      <p className="font-bold text-xs uppercase tracking-[0.2em] animate-pulse">Sincronizzazione Sistema...</p>
    </div>
  );
}

// --- COMPONENTI SEZIONI CANTIERE ---

function SiteOverview({ task, isMaster, isAdmin, userData }) {
  const [totals, setTotals] = useState({ materials: 0, hours: 0, cost: 0, travel: 0 });
  const nextPhase = task.schedule?.find(p => new Date(p.end) >= new Date());

  useEffect(() => {
    const unsubM = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'), where('taskId', '==', task.id)), s => {
      const mat = s.docs.reduce((sum, d) => sum + (parseFloat(d.data().quantity || 0) * parseFloat(d.data().cost || 0)), 0);
      setTotals(prev => ({...prev, materials: mat}));
    });
    const unsubL = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), where('taskId', '==', task.id)), s => {
      const reports = s.docs.map(d=>d.data());
      const hrs = reports.reduce((sum, d) => sum + (parseFloat(d.hours || 0)), 0);
      const travelCount = reports.filter(d => d.isTrasferta).length;
      setTotals(prev => ({...prev, hours: hrs, cost: hrs * STANDARD_HOURLY_RATE, travel: travelCount}));
    });
    return () => { unsubM(); unsubL(); };
  }, [task.id]);

  const handleToggleStatus = async () => {
    const newStatus = !task.completed;
    if (newStatus && !window.confirm("Chiudere il cantiere? Tutte le attività saranno bloccate.")) return;
    if (!newStatus && !isAdmin) return;
    try {
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { completed: newStatus });
      await logOperation(userData, newStatus ? "Chiusura Cantiere" : "Riapertura Cantiere", task.title);
    } catch (e) { alert("Errore"); }
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-[32px] border flex flex-col sm:flex-row justify-between items-center gap-4 ${task.completed ? 'bg-slate-900 border-slate-800 text-white shadow-xl' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${task.completed ? 'bg-slate-800 text-green-400' : 'bg-blue-50 text-blue-600'}`}>
            {task.completed ? <LockKeyhole size={24}/> : <Activity size={24}/>}
          </div>
          <div>
            <h4 className="font-black uppercase tracking-tighter">Stato Operativo</h4>
            <p className={`text-xs font-bold ${task.completed ? 'text-slate-400' : 'text-blue-500'}`}>{task.completed ? 'CHIUSO / ARCHIVIATO' : 'CANTIERE IN CORSO'}</p>
          </div>
        </div>
        {isMaster && (
          <div className="flex gap-2 w-full sm:w-auto">
            {!task.completed ? (
              <button onClick={handleToggleStatus} className="w-full sm:w-auto bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Termina Cantiere</button>
            ) : isAdmin && (
              <button onClick={handleToggleStatus} className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Riapri</button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ore Lavorate</p><p className="text-xl font-black text-slate-800">{totals.hours} H</p></div>
        <div className="bg-white p-5 rounded-3xl border shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Costo Forniture</p><p className="text-xl font-black text-slate-800">€ {totals.materials.toFixed(0)}</p></div>
        <div className="bg-white p-5 rounded-3xl border shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Trasferte</p><p className="text-xl font-black text-orange-600">{totals.travel}</p></div>
        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status Location</p><p className="text-sm font-black text-slate-600 uppercase">{task.isTrasfertaSite ? 'Fuori Sede' : 'Locale'}</p></div>
      </div>
    </div>
  );
}

function SiteChat({ taskId, userData, isClosed }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'site_chats'), where('taskId', '==', taskId), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({id: d.id, ...d.data()})));
      if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, [taskId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if(isClosed || !newMessage.trim()) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'site_chats'), {
      taskId, userId: userData.uid, userName: userData.name, message: newMessage, createdAt: serverTimestamp()
    });
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-[400px] bg-white rounded-3xl border overflow-hidden shadow-sm">
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4" ref={scrollRef}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.userId === userData.uid ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${msg.userId === userData.uid ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border text-slate-800 rounded-bl-none'}`}>
              {msg.userId !== userData.uid && <p className="text-[10px] font-black text-blue-600 mb-1 uppercase">{msg.userName}</p>}
              {msg.message}
            </div>
          </div>
        ))}
      </div>
      {!isClosed ? (
        <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
          <input className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm outline-none" placeholder="Messaggio..." value={newMessage} onChange={e=>setNewMessage(e.target.value)} />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded-xl"><Send size={18}/></button>
        </form>
      ) : <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase border-t">Cantiere Chiuso</div>}
    </div>
  );
}

function SiteTeam({ task, isAdmin }) {
  const [assigned, setAssigned] = useState(task.assignedTeam || []);
  const [selectedUser, setSelectedUser] = useState('');
  const allStaff = Object.values(USERS_CONFIG);

  useEffect(() => { setAssigned(task.assignedTeam || []); }, [task.assignedTeam]);

  const handleAssign = async () => {
    if(!selectedUser || !isAdmin || task.completed) return;
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { assignedTeam: arrayUnion(selectedUser) });
    setSelectedUser('');
  };

  return (
    <div className="space-y-4">
      {isAdmin && !task.completed && (
        <div className="flex gap-2">
          <select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} className="flex-1 border rounded-xl p-3 text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-blue-600">
            <option value="">-- Seleziona Operatore --</option>
            {allStaff.map(u => <option key={u.name} value={u.name} disabled={assigned.includes(u.name)}>{u.name} ({u.role})</option>)}
          </select>
          <button onClick={handleAssign} className="bg-blue-600 text-white px-8 rounded-2xl font-black text-xs uppercase shadow-lg">Aggiungi</button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {assigned.map(name => {
          const staff = allStaff.find(u => u.name === name);
          return (
            <div key={name} className="p-4 bg-white border rounded-[28px] flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${staff?.role === 'Master' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {name.charAt(0)}
                </div>
                <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">{name}</span>
              </div>
              {isAdmin && !task.completed && <button onClick={async () => await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { assignedTeam: arrayRemove(name) })} className="text-red-400 hover:bg-red-50 p-2 rounded-xl transition-colors"><X size={18}/></button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SiteDocuments({ taskId, isAdmin, userData, isClosed }) {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'documents'), where('taskId', '==', taskId));
    return onSnapshot(q, (snap) => setDocs(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  }, [taskId]);
  const handleUpload = async (e) => {
    if(isClosed) return;
    const file = e.target.files[0]; if(!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'documents'), { taskId, name: file.name, data: reader.result, uploadedBy: userData.name, createdAt: serverTimestamp() });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-4">
      {isAdmin && !isClosed && <div className="bg-white p-5 rounded-[32px] border border-dashed border-slate-300 flex justify-between items-center"><p className="text-xs font-black text-slate-500 uppercase tracking-widest">Repository Documenti</p><input type="file" onChange={handleUpload} className="text-xs" /></div>}
      <div className="grid gap-3">
        {docs.map(d => (
          <div key={d.id} className="flex items-center justify-between p-5 bg-white border rounded-[28px] shadow-sm"><div className="flex items-center gap-4"><FileText className="text-blue-500" size={18}/><span className="text-sm font-black uppercase">{d.name}</span></div><a href={d.data} download={d.name} className="p-3 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all"><Download size={20}/></a></div>
        ))}
      </div>
    </div>
  );
}

function SiteSchedule({ task, isAdmin }) {
  const [schedule, setSchedule] = useState(task.schedule || []);
  const [newPhase, setNewPhase] = useState({ name: '', start: '', end: '' });
  useEffect(() => { setSchedule(task.schedule || []); }, [task.schedule]);
  const addPhase = async (e) => {
    e.preventDefault(); if(!isAdmin || !newPhase.name || !newPhase.start || !newPhase.end || task.completed) return;
    const updated = [...schedule, newPhase].sort((a,b) => new Date(a.start) - new Date(b.start));
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { schedule: updated });
    setNewPhase({ name: '', start: '', end: '' });
  };
  return (
    <div className="space-y-4">
      {isAdmin && !task.completed && (
        <form onSubmit={addPhase} className="bg-white p-5 rounded-[32px] border grid grid-cols-1 md:grid-cols-4 gap-3 shadow-sm">
          <input placeholder="Fase" className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm outline-none" value={newPhase.name} onChange={e=>setNewPhase({...newPhase, name: e.target.value})} />
          <input type="date" className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" value={newPhase.start} onChange={e=>setNewPhase({...newPhase, start: e.target.value})} />
          <input type="date" className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" value={newPhase.end} onChange={e=>setNewPhase({...newPhase, end: e.target.value})} />
          <button type="submit" className="bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Salva</button>
        </form>
      )}
      <div className="space-y-3">
        {schedule.map((p, i) => (
          <div key={i} className="p-5 bg-white border rounded-[32px] flex justify-between items-center shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
            <div><p className="font-black text-slate-800 uppercase tracking-tighter">{String(p.name)}</p><p className="text-[10px] font-black text-slate-400 mt-1 uppercase">{new Date(p.start).toLocaleDateString()} — {new Date(p.end).toLocaleDateString()}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SitePhotos({ taskId, userData, isAdmin, isClosed }) {
  const [photos, setPhotos] = useState([]); const [uploading, setUploading] = useState(false); const [lightbox, setLightbox] = useState(null);
  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'photos'), where('taskId', '==', taskId));
    return onSnapshot(q, (snap) => setPhotos(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  }, [taskId]);
  const handleUpload = async (e) => {
    if(isClosed) return; const file = e.target.files[0]; if(!file) return; setUploading(true);
    const reader = new FileReader(); reader.onloadend = async () => {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'photos'), { taskId, imageData: reader.result, uploaderName: userData.name, createdAt: serverTimestamp(), userId: userData.uid });
      setUploading(false);
    }; reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-[32px] border shadow-sm">
        <h3 className="font-black text-slate-800 uppercase tracking-tighter">Album Fotografico</h3>
        {!isClosed && <input type="file" onChange={handleUpload} className="text-xs font-bold" accept="image/*" />}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {photos.map(p => (
          <div key={p.id} onClick={() => setLightbox(p.imageData)} className="aspect-square bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-4 border-white shadow-sm hover:scale-105 transition-all relative group">
            <img src={p.imageData} className="w-full h-full object-cover" alt="Site" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 className="text-white"/></div>
          </div>
        ))}
      </div>
      {lightbox && <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={()=>setLightbox(null)}><img src={lightbox} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" alt="Fullscreen" /></div>}
    </div>
  );
}

function MaterialRequestsView({ taskId, userData, isClosed }) {
  const [requests, setRequests] = useState([]); const [item, setItem] = useState('');
  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'material_requests'), where('taskId', '==', taskId));
    return onSnapshot(q, (snap) => setRequests(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  }, [taskId]);
  const add = async (e) => {
    e.preventDefault(); if(isClosed || !item.trim()) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'material_requests'), { taskId, item, status: 'pending', userName: userData.name, createdAt: serverTimestamp() });
    setItem('');
  };
  return (
    <div className="space-y-4">
      {!isClosed && <form onSubmit={add} className="flex gap-2 bg-white p-3 rounded-[32px] border shadow-sm"><input value={item} onChange={e=>setItem(e.target.value)} placeholder="Di cosa hai bisogno?" className="flex-1 bg-transparent px-4 py-1 outline-none text-sm font-bold" /><button className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-lg">Invia</button></form>}
      <div className="space-y-3">
        {requests.map(r => (
          <div key={r.id} className="p-5 bg-white border rounded-[32px] flex justify-between items-center shadow-sm"><div><p className="text-sm font-black text-slate-800 uppercase tracking-tighter leading-none">{r.item}</p><p className="text-[10px] text-slate-400 mt-2 uppercase font-black tracking-widest">Richiesto da {r.userName}</p></div><span className={`text-[9px] font-black px-4 py-1 rounded-lg ${r.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>{r.status.toUpperCase()}</span></div>
        ))}
      </div>
    </div>
  );
}

function SiteAccounting({ taskId }) {
  const [totals, setTotals] = useState({ materials: 0, labor: 0, extra: 0, travel: 0 });
  useEffect(() => {
    const unsubM = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'), where('taskId', '==', taskId)), s => {
      setTotals(prev => ({...prev, materials: s.docs.reduce((sum, d) => sum + (parseFloat(d.data().quantity || 0) * parseFloat(d.data().cost || 0)), 0)}));
    });
    const unsubL = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), where('taskId', '==', taskId)), s => {
      const reports = s.docs.map(d=>d.data());
      setTotals(prev => ({
        ...prev, 
        labor: reports.reduce((sum, d) => sum + (parseFloat(d.hours || 0)), 0) * STANDARD_HOURLY_RATE,
        travel: reports.filter(d=>d.isTrasferta).length
      }));
    });
    return () => { unsubM(); unsubL(); };
  }, [taskId]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white p-6 rounded-3xl border shadow-sm text-center"><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Materiali</p><p className="text-xl font-bold text-slate-800">€ {totals.materials.toFixed(0)}</p></div>
      <div className="bg-white p-6 rounded-3xl border shadow-sm text-center"><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Manodopera</p><p className="text-xl font-bold text-slate-800">€ {totals.labor.toFixed(0)}</p></div>
      <div className="bg-white p-6 rounded-3xl border shadow-sm text-center"><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Trasferte</p><p className="text-xl font-bold text-orange-600">{totals.travel}</p></div>
      <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-center text-white"><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Totale</p><p className="text-2xl font-bold">€ {(totals.materials + totals.labor).toFixed(0)}</p></div>
    </div>
  );
}

// --- VISTE TAB PRINCIPALI ---

function TasksView({ userData, isAdmin, onSelectTask }) {
  const [tasks, setTasks] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', client: '', description: '', isTrasfertaSite: false });

  useEffect(() => {
    return onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'), (snap) => {
      setTasks(snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
  }, []);

  const addTask = async (e) => {
    e.preventDefault();
    if(!isAdmin) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'), { ...newTask, completed: false, createdAt: serverTimestamp(), authorName: userData.name });
    setIsFormOpen(false);
    setNewTask({title:'', client:'', description:'', isTrasfertaSite: false});
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Bacheca Cantieri</h2>
         {isAdmin && !isFormOpen && <button onClick={()=>setIsFormOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"><Plus size={18}/> Registra Nuovo</button>}
      </div>
      {isFormOpen && (
        <form onSubmit={addTask} className="bg-white p-10 rounded-[40px] border shadow-2xl space-y-5 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Titolo" className="bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold" onChange={e=>setNewTask({...newTask, title: e.target.value})} required />
            <input placeholder="Cliente" className="bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold" onChange={e=>setNewTask({...newTask, client: e.target.value})} required />
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
             <input type="checkbox" className="w-5 h-5 accent-blue-600" onChange={e=>setNewTask({...newTask, isTrasfertaSite: e.target.checked})} />
             <label className="text-sm font-bold uppercase text-slate-500">Questo cantiere è in trasferta?</label>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-12 py-4 rounded-3xl font-black text-xs uppercase shadow-xl">Salva</button>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map(t => (
          <div key={t.id} onClick={()=>onSelectTask(t)} className="bg-white p-7 border rounded-[48px] hover:ring-4 hover:ring-blue-600/10 cursor-pointer transition-all shadow-sm flex flex-col justify-between h-64 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full translate-x-1/2 -translate-y-1/2 ${t.completed ? 'bg-slate-900' : 'bg-blue-600'}`}></div>
            <div>
               <div className="flex justify-between items-start mb-2">
                  <h4 className="font-black text-2xl text-slate-800 truncate tracking-tighter uppercase">{t.title}</h4>
                  <ArrowLeft className="rotate-180 text-slate-200 group-hover:text-blue-600 transition-all group-hover:translate-x-2" size={28}/>
               </div>
               <p className="text-[10px] text-slate-400 uppercase font-black">{t.client}</p>
            </div>
            <div className="mt-8 flex items-center gap-3">
               <span className={`text-[10px] px-4 py-1.5 rounded-2xl font-black border ${t.completed ? 'bg-slate-900 text-white border-slate-800' : 'bg-blue-50 text-blue-600'}`}>{t.completed ? 'CHIUSO' : 'ATTIVO'}</span>
               {t.isTrasfertaSite && <span className="text-[10px] px-4 py-1.5 rounded-2xl font-black bg-orange-50 text-orange-600 border border-orange-100">TRASFERTA</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyReportsView({ userData, tasks }) {
  const [reports, setReports] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ taskId: '', hours: '', desc: '', vehicleId: '', isTrasferta: false });
  const canvasRef = useRef(null);

  useEffect(() => {
    onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles'), s => setVehicles(s.docs.map(d=>({id:d.id, ...d.data()}))));
    onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), orderBy('createdAt', 'desc'), limit(15)), s => setReports(s.docs.map(d=>({id:d.id, ...d.data()}))));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const currentTask = tasks.find(t=>t.id===form.taskId);
    if(currentTask?.completed) { alert("Cantiere chiuso."); return; }
    const sign = canvasRef.current?.toDataURL();
    const vehicle = vehicles.find(v=>v.id === form.vehicleId);
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), { 
      ...form, 
      taskTitle: currentTask?.title || 'Cantiere', 
      userName: userData.name, 
      vehicleName: vehicle ? `${vehicle.name} (${vehicle.plate})` : 'Privato/Nessuno',
      sign, 
      createdAt: serverTimestamp() 
    });
    setForm({ taskId: '', hours: '', desc: '', vehicleId: '', isTrasferta: false });
    if(canvasRef.current) canvasRef.current.getContext('2d').clearRect(0,0,300,100);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <form onSubmit={submit} className="bg-white p-10 rounded-[48px] border shadow-xl space-y-6">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-4"><PenTool size={28} className="text-blue-600"/> Rapportino</h3>
        <select value={form.taskId} onChange={e=>setForm({...form, taskId: e.target.value})} className="w-full bg-slate-50 border-none rounded-3xl p-5 outline-none font-bold text-sm" required>
          <option value="">Scegli Cantiere Operativo...</option>
          {tasks.filter(t=>!t.completed).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <div className="flex flex-col sm:flex-row gap-4">
           <input type="number" step="0.5" placeholder="Ore" value={form.hours} onChange={e=>setForm({...form, hours: e.target.value})} className="flex-1 bg-slate-50 rounded-3xl p-5 font-bold text-sm border-none shadow-inner" required />
           <select value={form.vehicleId} onChange={e=>setForm({...form, vehicleId: e.target.value})} className="flex-1 bg-slate-50 border-none rounded-3xl p-5 outline-none font-bold text-sm shadow-inner" required>
              <option value="">Scegli Mezzo...</option>
              <option value="none">Nessun mezzo aziendale</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>)}
           </select>
        </div>
        <div className="flex items-center justify-between p-5 bg-blue-50 rounded-3xl">
           <div className="flex items-center gap-3"><MapPin className="text-blue-600" size={20}/><span className="text-sm font-bold text-blue-900 uppercase">Trasferta?</span></div>
           <button type="button" onClick={()=>setForm({...form, isTrasferta: !form.isTrasferta})} className={`w-12 h-6 rounded-full transition-colors relative ${form.isTrasferta ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isTrasferta ? 'left-7' : 'left-1'}`}></div>
           </button>
        </div>
        <textarea placeholder="Lavori svolti..." value={form.desc} onChange={e=>setForm({...form, desc: e.target.value})} className="w-full bg-slate-50 border-none rounded-3xl p-5 font-bold text-sm shadow-inner" rows="4" required />
        <div className="border border-dashed rounded-[32px] p-6 bg-slate-50 text-center cursor-crosshair">
           <canvas ref={canvasRef} width={300} height={100} className="w-full h-32 bg-white rounded-3xl border shadow-inner touch-none" onMouseDown={(e) => {
             const ctx = e.target.getContext('2d'); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
           }} onMouseMove={(e) => {
             if(e.buttons !== 1) return; const ctx = e.target.getContext('2d'); ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); ctx.stroke();
           }} />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[28px] font-black uppercase shadow-xl">Invia Report</button>
      </form>
      <div className="space-y-4">
        {reports.map(r => (
          <div key={r.id} className="p-6 bg-white border rounded-[36px] flex justify-between items-center shadow-sm">
            <div className="flex-1 pr-4">
              <p className="font-bold text-slate-800 line-clamp-1 uppercase tracking-tight">{r.desc}</p>
              <p className="text-[10px] text-slate-400 mt-2 uppercase font-black">
                {r.userName} • {r.taskTitle} • {r.hours} H • MEZZO: {r.vehicleName || 'N/D'} {r.isTrasferta ? '• TRASFERTA' : ''}
              </p>
            </div>
            {r.sign && <img src={r.sign} className="h-12 opacity-30 grayscale rounded-xl" alt="Sign"/>}
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaveRequestsPanel({ currentUser, targetIdentifier, isMaster, isAdmin, userData }) {
  const [leaves, setLeaves] = useState([]);
  const [newRequest, setNewRequest] = useState({ start: '', end: '', type: 'Ferie', reason: '' });
  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'leaves'));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setLeaves(all.filter(l => (targetIdentifier === currentUser.uid ? l.userId === currentUser.uid : l.username === targetIdentifier)).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
  }, [targetIdentifier, currentUser]);
  const requestLeave = async (e) => {
    e.preventDefault(); if (!newRequest.start || !newRequest.end) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'leaves'), { ...newRequest, userId: currentUser.uid, username: currentUser.email?.split('@')[0], fullName: userData?.name || 'Utente', status: 'pending', createdAt: serverTimestamp() });
    setNewRequest({ start: '', end: '', type: 'Ferie', reason: '' });
  };
  const handleStatus = async (id, status, reqUserUid) => { if (!isAdmin) return; await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaves', id), { status }); };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {targetIdentifier === currentUser.uid && (
        <div className="bg-white p-8 rounded-[40px] border shadow-sm h-fit space-y-4">
          <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">Nuova Richiesta</h3>
          <form onSubmit={requestLeave} className="space-y-4">
            <select className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-sm outline-none" value={newRequest.type} onChange={e=>setNewRequest({...newRequest, type: e.target.value})}><option>Ferie</option><option>Permesso (Ore)</option><option>Malattia</option></select>
            <input type="date" className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-sm" value={newRequest.start} onChange={e=>setNewRequest({...newRequest, start: e.target.value})}/>
            <input type="date" className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-sm" value={newRequest.end} onChange={e=>setNewRequest({...newRequest, end: e.target.value})}/>
            <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase shadow-lg">Invia</button>
          </form>
        </div>
      )}
      <div className={`col-span-1 ${targetIdentifier === currentUser.uid ? 'md:col-span-2' : 'md:col-span-3'} space-y-3`}>
        {leaves.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-[32px] border shadow-sm flex justify-between items-center border-slate-100">
              <div><div className="flex items-center gap-3"><span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest ${req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status.toUpperCase()}</span><h4 className="font-bold text-slate-800 uppercase tracking-tighter">{req.type}</h4></div><p className="text-sm text-slate-500 mt-2 font-bold">{new Date(req.start).toLocaleDateString()} — {new Date(req.end).toLocaleDateString()}</p></div>
              {isAdmin && targetIdentifier !== currentUser.uid && req.status === 'pending' && (
                <div className="flex gap-2"><button onClick={() => handleStatus(req.id, 'approved', req.userId)} className="bg-green-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest">Accetta</button><button onClick={() => handleStatus(req.id, 'rejected', req.userId)} className="bg-red-50 text-red-600 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border">Rifiuta</button></div>
              )}
            </div>
          ))}
          {leaves.length === 0 && <p className="text-center py-20 text-slate-300 font-black uppercase text-[10px] tracking-widest">Nessuna voce</p>}
      </div>
    </div>
  );
}

function AuditLogView() {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'audit_logs'), orderBy('createdAt', 'desc'), limit(30));
    return onSnapshot(q, s => setLogs(s.docs.map(d=>({id:d.id, ...d.data()}))));
  }, []);
  return (
    <div className="bg-white border rounded-[32px] overflow-hidden shadow-sm overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest border-b"><tr><th className="p-5">Membro</th><th className="p-5">Azione</th><th className="p-5">GPS</th><th className="p-5">Ora</th></tr></thead><tbody className="divide-y">{logs.map(l=>(<tr key={l.id} className="hover:bg-slate-50"><td className="p-5 font-bold uppercase">{l.userName}</td><td className="p-5">{l.action}</td><td className="p-5 font-mono text-blue-500 uppercase">{l.location}</td><td className="p-5 text-slate-400">{l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000).toLocaleString() : '-'}</td></tr>))}</tbody></table></div>
  );
}

function PersonalAreaView({ user, userData, isMaster, isAdmin }) {
  const [sub, setSub] = useState('leaves');
  const [targetUser, setTargetUser] = useState(user.uid); 
  const [usersList, setUsersList] = useState([]);
  useEffect(() => { if(isMaster) { setUsersList(Object.entries(USERS_CONFIG).map(([k, v]) => ({ username: k, ...v }))); } }, [isMaster]);
  return (
    <div className="space-y-6">
       <div className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-6">
         <div className="flex items-center gap-5 w-full sm:w-auto"><div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-xl uppercase">{userData?.name?.charAt(0)}</div><div><h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">{userData?.name}</h2>{isMaster && <select className="mt-3 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border-none rounded-xl p-2 outline-none cursor-pointer" value={targetUser} onChange={(e) => setTargetUser(e.target.value)}><option value={user.uid}>Mio Profilo</option>{usersList.map(u => (<option key={u.username} value={u.username}>Vedi: {u.name}</option>))}</select>}</div></div>
         <div className="flex gap-4 w-full sm:w-auto"><button onClick={()=>setSub('leaves')} className={`flex-1 sm:px-6 py-2 text-xs font-black uppercase tracking-widest transition-all ${sub === 'leaves' ? 'bg-blue-600 text-white rounded-2xl shadow-lg' : 'text-slate-400'}`}>Ferie</button><button onClick={()=>setSub('logs')} className={`flex-1 sm:px-6 py-2 text-xs font-black uppercase tracking-widest transition-all ${sub === 'logs' ? 'bg-blue-600 text-white rounded-2xl shadow-lg' : 'text-slate-400'}`}>Log</button></div>
       </div>
       {sub === 'leaves' && <LeaveRequestsPanel currentUser={user} targetIdentifier={targetUser} isMaster={isMaster} isAdmin={isAdmin} userData={userData} />}
       {sub === 'logs' && isMaster && <AuditLogView />}
    </div>
  );
}

function TaskDetailContainer({ task, userData, isMaster, isAdmin, onBack }) {
  const [active, setActive] = useState('overview');
  const isClosed = task.completed;
  const tabs = [ { id: 'overview', label: 'Info', icon: Activity }, { id: 'chat', label: 'Chat', icon: MessageSquare }, { id: 'team', label: 'Squadra', icon: Users }, { id: 'documents', label: 'File', icon: FileCheck }, { id: 'schedule', label: 'Crono', icon: CalendarRange }, { id: 'accounting', label: 'Costi', icon: Calculator }, { id: 'requests', label: 'Richieste', icon: ShoppingCart }, { id: 'photos', label: 'Foto', icon: Camera } ];
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest hover:text-blue-600 transition-colors"><ArrowLeft size={16}/> Indietro</button>
      <div className="bg-white p-6 rounded-[32px] border shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{task.title}</h2>
        <div className="flex gap-2 mt-8 border-b overflow-x-auto scrollbar-hide">
          {tabs.map(t => ( <button key={t.id} onClick={()=>setActive(t.id)} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${active === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}><t.icon size={14}/>{t.label}</button> ))}
        </div>
      </div>
      <div className="mt-4">
        {active === 'overview' && <SiteOverview task={task} isMaster={isMaster} isAdmin={isAdmin} userData={userData} />}
        {active === 'chat' && <SiteChat taskId={task.id} userData={userData} isClosed={isClosed} />}
        {active === 'team' && <SiteTeam task={task} isAdmin={isAdmin} />}
        {active === 'documents' && <SiteDocuments taskId={task.id} isAdmin={isAdmin} userData={userData} isClosed={isClosed} />}
        {active === 'schedule' && <SiteSchedule task={task} isAdmin={isAdmin} />}
        {active === 'accounting' && isMaster && <SiteAccounting taskId={task.id} />}
        {active === 'requests' && <MaterialRequestsView taskId={task.id} userData={userData} isClosed={isClosed} />}
        {active === 'photos' && <SitePhotos taskId={task.id} userData={userData} isAdmin={isAdmin} isClosed={isClosed} />}
      </div>
    </div>
  );
}

function AuthScreen() {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [isSubmitting, setIsSubmitting] = useState(false); const [imgError, setImgError] = useState(false);
  const handleAuth = async (e) => {
    e.preventDefault(); setIsSubmitting(true); const email = `${username.trim().toLowerCase()}@impresadaria.app`;
    try { await signInWithEmailAndPassword(auth, email, password); } catch (err) { setError("Errore credenziali"); } finally { setIsSubmitting(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100"><div className="max-w-md w-full bg-white rounded-[48px] shadow-2xl overflow-hidden border"><div className="bg-blue-800 p-12 text-center text-white"><div className="w-24 h-24 bg-white mx-auto rounded-3xl mb-8 flex items-center justify-center shadow-xl">{!imgError ? <img src="logo.jpg" onError={()=>setImgError(true)} alt="Logo" className="object-contain" /> : <Building2 size={48} className="text-blue-800"/>}</div><h1 className="text-3xl font-black uppercase tracking-tighter">Impresadaria</h1></div><form onSubmit={handleAuth} className="p-10 space-y-5">{error && <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl">{error}</div>}<div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">User</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold" /></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Pass</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold" /></div><button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase shadow-xl">{isSubmitting ? <Loader2 className="animate-spin"/> : "Entra"}</button></form></div></div>
  );
}

function DashboardContainer({ user, userData }) {
  const [selectedTask, setSelectedTask] = useState(null); const [activeTab, setActiveTab] = useState('tasks'); const [notifications, setNotifications] = useState([]); const [showNotifPanel, setShowNotifPanel] = useState(false); const [allTasks, setAllTasks] = useState([]);
  const safeUserData = userData || { role: 'Dipendente', name: 'Utente', uid: user?.uid };
  const isMaster = safeUserData.role === 'Master'; const isAdmin = safeUserData.role === 'Master' && safeUserData.access === 'full';
  useEffect(() => {
    onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'), s => setAllTasks(s.docs.map(d=>({id:d.id, ...d.data()}))));
    if (!user) return;
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'));
    return onSnapshot(q, (snap) => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(n => n.targetUserId === 'all' || (n.targetUserId === 'all_masters' && isMaster) || n.targetUserId === user.uid).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))));
  }, [user, isMaster]);
  return (
    <div className="pb-24">
      <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-40 h-20 flex items-center justify-between px-6 shadow-sm"><div className="flex items-center gap-4"><div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-xl"><LayoutDashboard size={20} /></div><div className="hidden sm:block"><h1 className="font-black text-slate-800 uppercase tracking-tighter text-xl leading-none">Impresadaria</h1><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{safeUserData.role}</span></div></div><div className="flex items-center gap-5"><div className="relative"><button onClick={() => setShowNotifPanel(!showNotifPanel)} className="p-3 bg-slate-50 rounded-2xl relative text-slate-400 border border-slate-200"><Bell size={20} />{notifications.filter(n=>!n.read).length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full"></span>}</button>{showNotifPanel && <div className="absolute right-0 top-14 w-80 bg-white rounded-[32px] shadow-2xl border-4 border-slate-50 p-2 z-50 animate-in zoom-in-95"><div className="p-4 border-b flex justify-between items-center font-black text-[11px] uppercase text-slate-400">Notifiche <button onClick={()=>setShowNotifPanel(false)}><X size={14}/></button></div><div className="max-h-80 overflow-y-auto">{notifications.length === 0 ? <p className="text-center py-10 text-xs text-slate-300 font-bold uppercase">Nessun avviso</p> : notifications.map(n => (<div key={n.id} onClick={async () => await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', n.id), { read: true })} className={`p-5 border-b last:border-none cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}><p className="text-xs font-black text-slate-800 uppercase leading-tight">{n.title}</p><p className="text-[10px] text-slate-500 mt-2 font-medium">{n.message}</p></div>)) }</div></div>}</div><button onClick={()=>signOut(auth)} className="p-3 bg-slate-50 rounded-2xl text-slate-300 hover:text-red-500 border border-slate-200 transition-all"><LogOut size={20} /></button></div></header>
      <main className="max-w-7xl mx-auto p-4 sm:p-10">{!selectedTask && <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-[32px] border border-slate-200 shadow-sm mb-10 overflow-x-auto scrollbar-hide">{[ {id:'tasks', label:'Cantieri'}, {id:'vehicles', label:'Mezzi'}, {id:'reports', label:'Report'}, {id:'materials', label:'Magazzino'}, {id:'personal', label:'Profilo'} ].map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-8 py-3.5 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-white'}`}>{tab.label}</button>))}</div>}{selectedTask ? <TaskDetailContainer task={selectedTask} userData={safeUserData} isMaster={isMaster} isAdmin={isAdmin} onBack={() => setSelectedTask(null)} /> : activeTab === 'tasks' ? <TasksView userData={safeUserData} isAdmin={isAdmin} onSelectTask={setSelectedTask} /> : activeTab === 'vehicles' ? <VehiclesView userData={safeUserData} isAdmin={isAdmin} isMaster={isMaster} /> : activeTab === 'reports' ? <DailyReportsView userData={safeUserData} tasks={allTasks} /> : activeTab === 'materials' ? <MaterialsView /> : <PersonalAreaView user={user} userData={safeUserData} isMaster={isMaster} isAdmin={isAdmin} />}</main>
    </div>
  );
}

// --- ENTRY POINT ---

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        const username = currentUser.email.split('@')[0];
        const config = USERS_CONFIG[username] || { role: 'Dipendente', name: username };
        setUserData({ ...config, uid: currentUser.uid, username });
      } else setUserData(null);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200">
      {user ? <DashboardContainer user={user} userData={userData} /> : <AuthScreen />}
    </div>
  );
}
