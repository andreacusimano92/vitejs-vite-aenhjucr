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
  Image as ImageIcon,
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
  Eye
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
      <p className="font-medium">Caricamento ImpresadariAPP...</p>
    </div>
  );
}

// --- COMPONENTI SEZIONI CANTIERE ---

function SiteOverview({ task }) {
  const nextPhase = task.schedule?.find(p => new Date(p.end) >= new Date());
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
        <h4 className="font-bold text-blue-800 text-sm flex items-center gap-2"><Activity size={16}/> Stato</h4>
        <p className="text-sm mt-2 text-blue-700 font-semibold uppercase">{task.completed ? 'Chiuso' : 'In Corso'}</p>
      </div>
      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
        <h4 className="font-bold text-indigo-800 text-sm flex items-center gap-2"><Users size={16}/> Team</h4>
        <p className="text-sm mt-2 text-indigo-700 font-semibold">{task.assignedTeam?.length || 0} Membri</p>
      </div>
      <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 shadow-sm">
        <h4 className="font-bold text-orange-800 text-sm flex items-center gap-2"><Timer size={16}/> Prossimo Step</h4>
        <p className="text-sm mt-2 text-orange-700 font-semibold truncate">{nextPhase ? String(nextPhase.name) : 'Nessuna pianificazione'}</p>
      </div>
    </div>
  );
}

function SiteChat({ taskId, userData }) {
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
    if(!newMessage.trim()) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'site_chats'), {
      taskId, userId: userData.uid, userName: userData.name, message: newMessage, createdAt: serverTimestamp()
    });
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-[400px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4" ref={scrollRef}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.userId === userData.uid ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${msg.userId === userData.uid ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border text-slate-800 rounded-bl-none shadow-sm'}`}>
              {msg.userId !== userData.uid && <p className="text-[10px] font-black text-blue-600 mb-1 uppercase tracking-tighter">{msg.userName}</p>}
              {msg.message}
            </div>
            <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '...'}</span>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
        <input className="flex-1 bg-slate-100 border-none rounded-lg px-4 py-2 text-sm outline-none" placeholder="Scrivi alla squadra..." value={newMessage} onChange={e=>setNewMessage(e.target.value)} />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg transition-transform active:scale-95"><Send size={20}/></button>
      </form>
    </div>
  );
}

function SiteTeam({ task, isAdmin }) {
  const [assigned, setAssigned] = useState(task.assignedTeam || []);
  const [selectedUser, setSelectedUser] = useState('');
  const allStaff = Object.values(USERS_CONFIG);

  useEffect(() => { setAssigned(task.assignedTeam || []); }, [task.assignedTeam]);

  const handleAssign = async () => {
    if(!selectedUser || !isAdmin) return;
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { assignedTeam: arrayUnion(selectedUser) });
    setSelectedUser('');
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex gap-2">
          <select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} className="flex-1 border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-600">
            <option value="">-- Seleziona Personale (Master inclusi) --</option>
            {allStaff.map(u => <option key={u.name} value={u.name} disabled={assigned.includes(u.name)}>{u.name} ({u.role})</option>)}
          </select>
          <button onClick={handleAssign} className="bg-blue-600 text-white px-6 rounded-xl font-bold text-sm shadow-md">Aggiungi</button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {assigned.map(name => {
          const staffMember = allStaff.find(u => u.name === name);
          const isMasterRole = staffMember?.role === 'Master';
          return (
            <div key={name} className="p-3 bg-white border rounded-xl flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isMasterRole ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {name.charAt(0)}
                </div>
                <span className="text-sm font-medium">{name}</span>
              </div>
              {isAdmin && <button onClick={async () => await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { assignedTeam: arrayRemove(name) })} className="text-red-400"><X size={16}/></button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SiteDocuments({ taskId, isAdmin, userData }) {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'documents'), where('taskId', '==', taskId));
    return onSnapshot(q, (snap) => setDocs(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  }, [taskId]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'documents'), {
        taskId, name: file.name, data: reader.result, uploadedBy: userData.name, createdAt: serverTimestamp()
      });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 flex justify-between items-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center sm:text-left">Documenti Tecnici / POS</p>
          <input type="file" onChange={handleUpload} className="text-xs w-full sm:w-auto" />
          {uploading && <Loader2 className="animate-spin text-blue-600"/>}
        </div>
      )}
      <div className="grid gap-2">
        {docs.map(d => (
          <div key={d.id} className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm">
            <div className="flex items-center gap-3"><FileText className="text-blue-500" size={18}/><span className="text-sm font-bold text-slate-800">{d.name}</span></div>
            <a href={d.data} download={d.name} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Download size={20}/></a>
          </div>
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
    e.preventDefault();
    if(!isAdmin || !newPhase.name || !newPhase.start || !newPhase.end) return;
    const updated = [...schedule, newPhase].sort((a,b) => new Date(a.start) - new Date(b.start));
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { schedule: updated });
    setNewPhase({ name: '', start: '', end: '' });
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <form onSubmit={addPhase} className="bg-white p-5 rounded-2xl border grid grid-cols-1 md:grid-cols-4 gap-3 shadow-sm">
          <input placeholder="Fase" className="border rounded-xl p-2 text-sm" value={newPhase.name} onChange={e=>setNewPhase({...newPhase, name: e.target.value})} />
          <input type="date" className="border rounded-xl p-2 text-sm" value={newPhase.start} onChange={e=>setNewPhase({...newPhase, start: e.target.value})} />
          <input type="date" className="border rounded-xl p-2 text-sm" value={newPhase.end} onChange={e=>setNewPhase({...newPhase, end: e.target.value})} />
          <button type="submit" className="bg-blue-600 text-white rounded-xl font-bold text-xs uppercase shadow-md">Pianifica</button>
        </form>
      )}
      <div className="space-y-2">
        {schedule.map((p, i) => (
          <div key={i} className="p-4 bg-white border rounded-xl flex justify-between items-center shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
            <div><p className="font-bold text-slate-800">{String(p.name)}</p><p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-tighter">{new Date(p.start).toLocaleDateString()} — {new Date(p.end).toLocaleDateString()}</p></div>
            {isAdmin && <button onClick={async () => {
              const updated = schedule.filter((_, idx) => idx !== i);
              await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { schedule: updated });
            }} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SitePhotos({ taskId, userData, isAdmin }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'photos'), where('taskId', '==', taskId));
    return onSnapshot(q, (snap) => setPhotos(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  }, [taskId]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'photos'), {
        taskId, imageData: reader.result, uploaderName: userData.name, createdAt: serverTimestamp(), userId: userData.uid
      });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <h3 className="font-bold text-slate-800">Album Foto</h3>
        <input type="file" onChange={handleUpload} className="text-xs" accept="image/*" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {photos.map(p => (
          <div key={p.id} onClick={() => setLightbox(p.imageData)} className="aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer border-2 border-white shadow-sm hover:scale-105 transition-transform relative group">
            <img src={p.imageData} className="w-full h-full object-cover" alt="Site" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 className="text-white"/></div>
          </div>
        ))}
      </div>
      {lightbox && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={()=>setLightbox(null)}>
           <button className="absolute top-6 right-6 text-white"><X size={40}/></button>
           <img src={lightbox} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" alt="Fullscreen" />
        </div>
      )}
    </div>
  );
}

function SiteAccounting({ taskId }) {
  const [totals, setTotals] = useState({ materials: 0, labor: 0, extra: 0 });
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const unsubM = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'), where('taskId', '==', taskId)), s => {
      const mat = s.docs.reduce((sum, d) => sum + (parseFloat(d.data().quantity || 0) * parseFloat(d.data().cost || 0)), 0);
      setTotals(prev => ({...prev, materials: mat}));
    });
    const unsubL = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), where('taskId', '==', taskId)), s => {
      const lab = s.docs.reduce((sum, d) => sum + (parseFloat(d.data().hours || 0)), 0) * STANDARD_HOURLY_RATE;
      setTotals(prev => ({...prev, labor: lab}));
    });
    const unsubE = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'expenses'), where('taskId', '==', taskId)), s => {
      const exp = s.docs.map(d=>({id: d.id, ...d.data()}));
      setExpenses(exp);
      setTotals(prev => ({...prev, extra: exp.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)}));
    });
    return () => { unsubM(); unsubL(); unsubE(); };
  }, [taskId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border shadow-sm text-center"><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Forniture</p><p className="text-2xl font-bold text-slate-800">€ {totals.materials.toFixed(2)}</p></div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm text-center"><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Manodopera</p><p className="text-2xl font-bold text-slate-800">€ {totals.labor.toFixed(2)}</p></div>
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-center text-white"><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Costo Totale</p><p className="text-3xl font-bold">€ {(totals.materials + totals.labor + totals.extra).toFixed(2)}</p></div>
      </div>
    </div>
  );
}

function MaterialRequestsView({ taskId, userData }) {
  const [requests, setRequests] = useState([]);
  const [item, setItem] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'material_requests'), where('taskId', '==', taskId));
    return onSnapshot(q, (snap) => setRequests(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  }, [taskId]);

  const add = async (e) => {
    e.preventDefault();
    if(!item.trim()) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'material_requests'), {
      taskId, item, status: 'pending', userName: userData.name, createdAt: serverTimestamp()
    });
    setItem('');
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex gap-2 bg-white p-3 rounded-2xl border shadow-sm">
        <input value={item} onChange={e=>setItem(e.target.value)} placeholder="Cosa serve in cantiere?" className="flex-1 bg-transparent px-3 py-1 outline-none text-sm font-bold" />
        <button className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm">Invia</button>
      </form>
      <div className="space-y-2">
        {requests.map(r => (
          <div key={r.id} className="p-4 bg-white border rounded-2xl flex justify-between items-center shadow-sm">
            <div><p className="text-sm font-bold text-slate-800">{r.item}</p><p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">Richiesto da {r.userName}</p></div>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{r.status.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- VISTE TAB PRINCIPALI ---

function TasksView({ userData, isAdmin, onSelectTask }) {
  const [tasks, setTasks] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', client: '', description: '' });

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
    setNewTask({title:'', client:'', description:''});
    await logOperation(userData, "Crea Cantiere", newTask.title);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Cantieri Attivi</h2>
         {isAdmin && !isFormOpen && <button onClick={()=>setIsFormOpen(true)} className="bg-blue-600 text-white px-5 py-2 rounded-2xl flex gap-2 items-center shadow-lg font-black text-xs uppercase tracking-widest"><Plus size={16}/> Nuovo</button>}
      </div>
      {isFormOpen && (
        <form onSubmit={addTask} className="bg-white p-8 rounded-3xl border space-y-4 shadow-xl animate-in slide-in-from-top-4">
          <input placeholder="Titolo Cantiere" className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold" onChange={e=>setNewTask({...newTask, title: e.target.value})} required />
          <input placeholder="Committente" className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold" onChange={e=>setNewTask({...newTask, client: e.target.value})} required />
          <textarea placeholder="Descrizione lavori..." className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold" onChange={e=>setNewTask({...newTask, description: e.target.value})} rows="3" />
          <div className="flex gap-4 pt-2"><button type="submit" className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Salva</button><button type="button" onClick={()=>setIsFormOpen(false)} className="text-slate-400 font-black text-xs uppercase tracking-widest">Annulla</button></div>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map(t => (
          <div key={t.id} onClick={()=>onSelectTask(t)} className="bg-white p-6 border rounded-[32px] hover:ring-2 hover:ring-blue-500 cursor-pointer transition-all shadow-sm flex justify-between items-start group">
            <div className="flex-1 overflow-hidden">
               <h4 className="font-black text-lg text-slate-800 truncate tracking-tighter uppercase">{t.title}</h4>
               <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">{t.client}</p>
            </div>
            <ArrowLeft className="rotate-180 text-slate-200 group-hover:text-blue-600 transition-colors" size={24}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyReportsView({ userData }) {
  const [reports, setReports] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ taskId: '', hours: '', desc: '' });
  const canvasRef = useRef(null);

  useEffect(() => {
    onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'), s => setTasks(s.docs.map(d=>({id:d.id, ...d.data()}))));
    onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), orderBy('createdAt', 'desc'), limit(15)), s => setReports(s.docs.map(d=>({id:d.id, ...d.data()}))));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const sign = canvasRef.current?.toDataURL();
    const taskName = tasks.find(t=>t.id===form.taskId)?.title || 'Cantiere';
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), { ...form, taskTitle: taskName, userName: userData.name, sign, createdAt: serverTimestamp() });
    await logOperation(userData, "Invia Rapportino", taskName);
    setForm({ taskId: '', hours: '', desc: '' });
    if(canvasRef.current) canvasRef.current.getContext('2d').clearRect(0,0,300,100);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <form onSubmit={submit} className="bg-white p-8 rounded-[40px] border shadow-xl space-y-5">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3"><PenTool size={24} className="text-blue-600"/> Rapportino</h3>
        <select value={form.taskId} onChange={e=>setForm({...form, taskId: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold text-sm" required><option value="">Scegli Cantiere...</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select>
        <div className="flex gap-4"><input type="number" step="0.5" placeholder="Ore" value={form.hours} onChange={e=>setForm({...form, hours: e.target.value})} className="flex-1 bg-slate-50 rounded-2xl p-4 font-bold text-sm border-none outline-none" required /><input type="date" className="flex-1 bg-slate-50 rounded-2xl p-4 font-bold text-sm border-none outline-none" defaultValue={new Date().toISOString().split('T')[0]} /></div>
        <textarea placeholder="Descrizione lavori..." value={form.desc} onChange={e=>setForm({...form, desc: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold text-sm" rows="3" required></textarea>
        <div className="border border-dashed rounded-3xl p-5 bg-slate-50 text-center">
           <canvas ref={canvasRef} width={300} height={100} className="w-full h-24 bg-white rounded-2xl border shadow-inner" onMouseDown={(e) => {
             const ctx = e.target.getContext('2d'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
           }} onMouseMove={(e) => {
             if(e.buttons !== 1) return; const ctx = e.target.getContext('2d'); ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); ctx.stroke();
           }} />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-lg shadow-blue-200">Salva Report</button>
      </form>
      <div className="space-y-3">
        {reports.map(r => (
          <div key={r.id} className="p-5 bg-white border rounded-[28px] flex justify-between items-center shadow-sm">
            <div className="flex-1 overflow-hidden"><p className="font-bold text-sm text-slate-800 line-clamp-1">{r.desc}</p><p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">{r.userName} • {r.taskTitle} • {r.hours} H</p></div>
            {r.sign && <img src={r.sign} className="h-10 opacity-30 grayscale" alt="Sign"/>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MaterialsView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, s => {
      setItems(s.docs.map(d=>({id:d.id, ...d.data()})));
      setLoading(false);
    });
  }, []);

  return (
    <div className="bg-white rounded-3xl border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
            <tr><th className="p-4">Materiale</th><th className="p-4">Q.tà</th><th className="p-4">Fornitore</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(i=>(
              <tr key={i.id} className="hover:bg-slate-50 transition-colors"><td className="p-4 font-bold text-slate-800">{i.name}</td><td className="p-4 text-slate-600 font-medium">{i.quantity}</td><td className="p-4 text-slate-400">{i.supplier}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PersonalAreaView({ userData, isMaster }) {
  const [sub, setSub] = useState('docs');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if(isMaster) {
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'audit_logs'), orderBy('createdAt', 'desc'), limit(20));
      return onSnapshot(q, s => setLogs(s.docs.map(d=>({id:d.id, ...d.data()}))));
    }
  }, [isMaster]);

  return (
    <div className="space-y-6">
       <div className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-6">
         <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-xl uppercase">{userData?.name?.charAt(0)}</div>
            <div><h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{userData?.name}</h2><p className="text-xs font-black text-slate-400 uppercase tracking-widest">{userData?.role}</p></div>
         </div>
         <div className="flex gap-4 border-b sm:border-none w-full sm:w-auto">
           <button onClick={()=>setSub('docs')} className={`pb-2 px-4 text-xs font-black uppercase tracking-widest ${sub === 'docs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}>Documenti</button>
           {isMaster && <button onClick={()=>setSub('logs')} className={`pb-2 px-4 text-xs font-black uppercase tracking-widest ${sub === 'logs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}>Log</button>}
         </div>
       </div>
       {sub === 'logs' && isMaster && (
          <div className="bg-white border rounded-[32px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b"><tr><th className="p-5">Utente</th><th className="p-5">Operazione</th><th className="p-5">Posizione</th><th className="p-5">Data</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(l=>(<tr key={l.id} className="hover:bg-slate-50">
                    <td className="p-5 text-xs font-bold text-slate-700">{l.userName}</td>
                    <td className="p-5 text-xs text-slate-600">{l.action}</td>
                    <td className="p-5 font-mono text-[9px] text-blue-500 uppercase">{l.location}</td>
                    <td className="p-5 text-xs text-slate-400">{l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000).toLocaleString() : '-'}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          </div>
       )}
       {sub === 'docs' && <div className="bg-white p-12 rounded-[40px] border text-center text-slate-300 flex flex-col items-center gap-3"><FileCheck size={48} className="opacity-20"/><p className="text-xs font-black uppercase tracking-widest">Archivio Digitale Protetto</p></div>}
    </div>
  );
}

// --- COMPONENTI UI AVANZATI (AUTH, DETAIL, DASHBOARD) ---

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
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border">
        <div className="bg-blue-800 p-10 text-center text-white relative">
          <div className="w-24 h-24 bg-white mx-auto rounded-3xl mb-6 flex items-center justify-center p-4 shadow-xl">
             {!imgError ? <img src="logo.jpg" onError={()=>setImgError(true)} alt="Logo" className="object-contain" /> : <Building2 size={48} className="text-blue-800"/>}
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Impresadaria</h1>
          <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mt-1">Gestione Cantieri & Team</p>
        </div>
        <form onSubmit={handleAuth} className="p-10 space-y-5">
          {error && <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-100">{error}</div>}
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Username</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold focus:ring-2 focus:ring-blue-600 transition-all" placeholder="es: a.cusimano" /></div>
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold focus:ring-2 focus:ring-blue-600 transition-all" placeholder="••••••" /></div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4">
             {isSubmitting ? <Loader2 className="animate-spin"/> : "Accedi al Portale"}
          </button>
        </form>
      </div>
    </div>
  );
}

function TaskDetailContainer({ task, userData, isMaster, isAdmin, onBack }) {
  const [active, setActive] = useState('overview');
  const tabs = [
    { id: 'overview', label: 'Info', icon: Activity },
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 text-sm hover:text-blue-600 transition-colors font-bold uppercase tracking-widest"><ArrowLeft size={16}/> Indietro</button>
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{task.title}</h2>
        <div className="flex gap-2 mt-6 border-b overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setActive(t.id)} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${active === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}><t.icon size={14}/>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="mt-6">
        {active === 'overview' && <SiteOverview task={task} isMaster={isMaster} />}
        {active === 'chat' && <SiteChat taskId={task.id} userData={userData} />}
        {active === 'team' && <SiteTeam task={task} isAdmin={isAdmin} />}
        {active === 'documents' && <SiteDocuments taskId={task.id} isAdmin={isAdmin} userData={userData} />}
        {active === 'schedule' && <SiteSchedule task={task} isAdmin={isAdmin} />}
        {active === 'materials' && <MaterialsView context="site" taskId={task.id} />}
        {active === 'requests' && <MaterialRequestsView taskId={task.id} userData={userData} />}
        {active === 'photos' && <SitePhotos taskId={task.id} userData={userData} isAdmin={isAdmin} />}
        {active === 'accounting' && isMaster && <SiteAccounting taskId={task.id} />}
      </div>
    </div>
  );
}

function DashboardContainer({ user, userData }) {
  const [selectedTask, setSelectedTask] = useState(null); 
  const [activeTab, setActiveTab] = useState('tasks'); 
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const safeUserData = userData || { role: 'Dipendente', name: 'Utente', uid: user?.uid };
  const isMaster = safeUserData.role === 'Master';
  const isAdmin = safeUserData.role === 'Master' && safeUserData.access === 'full'; 

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(all.filter(n => n.targetUserId === 'all' || (n.targetUserId === 'all_masters' && isMaster) || n.targetUserId === user.uid).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
  }, [user, isMaster]);

  return (
    <div className="pb-20">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200"><LayoutDashboard size={18} /></div>
            <div className="hidden sm:block"><h1 className="font-black text-slate-800 uppercase tracking-tighter text-lg leading-none">Impresadaria</h1><span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{safeUserData.role}</span></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="p-2 rounded-xl hover:bg-slate-100 relative text-slate-400"><Bell size={20} />{notifications.filter(n=>!n.read).length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
              {showNotifPanel && (
                <div className="absolute right-0 top-12 w-72 bg-white rounded-3xl shadow-2xl border p-2 z-50 animate-in zoom-in-95">
                  <div className="p-3 border-b flex justify-between items-center font-black text-[10px] uppercase tracking-widest text-slate-400">Avvisi Recenti <button onClick={()=>setShowNotifPanel(false)}><X size={14}/></button></div>
                  <div className="max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? <p className="text-center py-6 text-xs text-slate-300">Nessuna notifica</p> : 
                      notifications.map(n => (
                        <div key={n.id} onClick={async () => await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', n.id), { read: true })} className={`p-4 border-b last:border-none cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}><p className="text-xs font-bold text-slate-800">{n.title}</p><p className="text-[10px] text-slate-500 mt-1">{n.message}</p></div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            <div className="text-right hidden sm:block"><p className="text-xs font-black text-slate-800 uppercase tracking-tighter leading-none">{safeUserData.name}</p></div>
            <button onClick={()=>signOut(auth)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        {!selectedTask && (
          <div className="flex bg-white p-1 rounded-2xl border shadow-sm mb-8 overflow-x-auto scrollbar-hide">
            {['tasks', 'vehicles', 'reports', 'materials', 'personal'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{tab === 'tasks' ? 'Cantieri' : tab === 'vehicles' ? 'Mezzi' : tab === 'reports' ? 'Report' : tab === 'materials' ? 'Magazzino' : 'Profilo'}</button>
            ))}
          </div>
        )}
        {selectedTask ? (
          <TaskDetailContainer task={selectedTask} userData={safeUserData} isMaster={isMaster} isAdmin={isAdmin} onBack={() => setSelectedTask(null)} />
        ) : activeTab === 'tasks' ? (
          <TasksView userData={safeUserData} isAdmin={isAdmin} onSelectTask={setSelectedTask} />
        ) : activeTab === 'vehicles' ? (
           <VehiclesView userData={safeUserData} isAdmin={isAdmin} isMaster={isMaster} />
        ) : activeTab === 'reports' ? (
           <DailyReportsView userData={safeUserData} />
        ) : activeTab === 'materials' ? (
          <MaterialsView />
        ) : (
           <PersonalAreaView user={user} userData={safeUserData} isMaster={isMaster} />
        )}
      </main>
    </div>
  );
}

// --- ENTRY POINT PRINCIPALE ---

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
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {user ? <DashboardContainer user={user} userData={userData} /> : <AuthScreen />}
    </div>
  );
}
