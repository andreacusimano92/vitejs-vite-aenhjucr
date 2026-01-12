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
  Timer
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
      <p className="font-medium">Sincronizzazione ImpresadariAPP...</p>
    </div>
  );
}

// --- SOTTO-COMPONENTI CANTIERE ---

function SiteOverview({ task }) {
  const nextPhase = task.schedule?.find(p => new Date(p.end) >= new Date());
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
        <h4 className="font-bold text-blue-800 text-sm flex items-center gap-2"><Activity size={16}/> Stato</h4>
        <p className="text-sm mt-2 text-blue-700 font-semibold uppercase">{task.completed ? 'Chiuso' : 'In Corso'}</p>
      </div>
      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
        <h4 className="font-bold text-indigo-800 text-sm flex items-center gap-2"><Users size={16}/> Team</h4>
        <p className="text-sm mt-2 text-indigo-700 font-semibold">{task.assignedTeam?.length || 0} Membri</p>
      </div>
      <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
        <h4 className="font-bold text-orange-800 text-sm flex items-center gap-2"><Timer size={16}/> Prossimo Step</h4>
        <p className="text-sm mt-2 text-orange-700 font-semibold truncate">{nextPhase ? String(nextPhase.name) : 'Nessuna pianificata'}</p>
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
            <div className={`max-w-[85%] px-4 py-2 rounded-xl text-sm ${msg.userId === userData.uid ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border text-slate-800 rounded-bl-none shadow-sm'}`}>
              {msg.userId !== userData.uid && <p className="text-[10px] font-bold text-blue-600 mb-1">{msg.userName}</p>}
              {msg.message}
            </div>
            <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '...'}</span>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
        <input className="flex-1 bg-slate-100 border-none rounded-lg px-4 py-2 text-sm outline-none" placeholder="Messaggio..." value={newMessage} onChange={e=>setNewMessage(e.target.value)} />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg"><Send size={20}/></button>
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
          <select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} className="flex-1 border rounded-xl p-3 text-sm outline-none">
            <option value="">-- Seleziona Personale (Master inclusi) --</option>
            {allStaff.map(u => <option key={u.name} value={u.name} disabled={assigned.includes(u.name)}>{u.name} ({u.role})</option>)}
          </select>
          <button onClick={handleAssign} className="bg-blue-600 text-white px-4 rounded-lg font-bold">Aggiungi</button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {assigned.map(name => {
          const staff = allStaff.find(u => u.name === name);
          return (
            <div key={name} className="p-3 bg-white border rounded-xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${staff?.role === 'Master' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
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
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Carica Documento</p>
          <input type="file" onChange={handleUpload} className="text-xs" />
          {uploading && <Loader2 className="animate-spin text-blue-600"/>}
        </div>
      )}
      <div className="grid gap-2">
        {docs.map(d => (
          <div key={d.id} className="flex items-center justify-between p-4 bg-white border rounded-xl">
            <div className="flex items-center gap-3"><FileText className="text-blue-500" size={18}/><span className="text-sm font-bold">{d.name}</span></div>
            <a href={d.data} download={d.name} className="p-2 text-slate-400 hover:text-blue-600"><Download size={20}/></a>
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
        <form onSubmit={addPhase} className="bg-white p-5 rounded-2xl border grid grid-cols-1 md:grid-cols-4 gap-3">
          <input placeholder="Fase" className="border rounded-xl p-2 text-sm" value={newPhase.name} onChange={e=>setNewPhase({...newPhase, name: e.target.value})} />
          <input type="date" className="border rounded-xl p-2 text-sm" value={newPhase.start} onChange={e=>setNewPhase({...newPhase, start: e.target.value})} />
          <input type="date" className="border rounded-xl p-2 text-sm" value={newPhase.end} onChange={e=>setNewPhase({...newPhase, end: e.target.value})} />
          <button type="submit" className="bg-blue-600 text-white rounded-xl font-bold text-xs uppercase">Aggiungi</button>
        </form>
      )}
      <div className="space-y-2">
        {schedule.map((p, i) => (
          <div key={i} className="p-4 bg-white border rounded-xl flex justify-between items-center shadow-sm">
            <div><p className="font-bold text-slate-800">{String(p.name)}</p><p className="text-xs text-slate-400 mt-1">{new Date(p.start).toLocaleDateString()} — {new Date(p.end).toLocaleDateString()}</p></div>
            {isAdmin && <button onClick={async () => {
              const updated = schedule.filter((_, idx) => idx !== i);
              await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { schedule: updated });
            }} className="text-red-300 hover:text-red-500"><Trash2 size={18}/></button>}
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
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border">
        <h3 className="font-bold text-slate-800">Album Foto</h3>
        <input type="file" onChange={handleUpload} className="text-xs" accept="image/*" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {photos.map(p => (
          <div key={p.id} onClick={() => setLightbox(p.imageData)} className="aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer border hover:scale-105 transition-transform relative group">
            <img src={p.imageData} className="w-full h-full object-cover" alt="Site" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 className="text-white"/></div>
          </div>
        ))}
      </div>
      {lightbox && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={()=>setLightbox(null)}>
           <button className="absolute top-6 right-6 text-white"><X size={40}/></button>
           <img src={lightbox} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" alt="Full" />
        </div>
      )}
    </div>
  );
}

function SiteAccounting({ taskId }) {
  const [totals, setTotals] = useState({ materials: 0, labor: 0, extra: 0 });

  useEffect(() => {
    const unsubM = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'), where('taskId', '==', taskId)), s => {
      setTotals(prev => ({...prev, materials: s.docs.reduce((sum, d) => sum + (parseFloat(d.data().quantity || 0) * parseFloat(d.data().cost || 0)), 0)}));
    });
    const unsubL = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), where('taskId', '==', taskId)), s => {
      setTotals(prev => ({...prev, labor: s.docs.reduce((sum, d) => sum + (parseFloat(d.data().hours || 0)), 0) * STANDARD_HOURLY_RATE}));
    });
    return () => { unsubM(); unsubL(); };
  }, [taskId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-6 rounded-3xl border text-center"><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Forniture</p><p className="text-2xl font-bold text-slate-800">€ {totals.materials.toFixed(2)}</p></div>
      <div className="bg-white p-6 rounded-3xl border text-center"><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Manodopera</p><p className="text-2xl font-bold text-slate-800">€ {totals.labor.toFixed(2)}</p></div>
      <div className="bg-slate-900 p-6 rounded-3xl text-center text-white"><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Costo Totale</p><p className="text-3xl font-bold">€ {(totals.materials + totals.labor).toFixed(2)}</p></div>
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
      <form onSubmit={add} className="flex gap-2"><input value={item} onChange={e=>setItem(e.target.value)} placeholder="Cosa serve?" className="flex-1 border rounded-lg p-2" /><button className="bg-blue-600 text-white px-4 rounded-lg">Invia</button></form>
      <div className="space-y-2">
        {requests.map(r => (
          <div key={r.id} className="p-3 bg-white border rounded-xl flex justify-between items-center shadow-sm">
            <div><p className="text-sm font-bold">{r.item}</p><p className="text-[10px] text-slate-400 uppercase tracking-widest">Dip: {r.userName}</p></div>
            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{r.status.toUpperCase()}</span>
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
         <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Cantieri</h2>
         {isAdmin && !isFormOpen && <button onClick={()=>setIsFormOpen(true)} className="bg-blue-600 text-white px-5 py-2 rounded-2xl flex gap-2 items-center shadow-lg font-bold"><Plus size={16}/> Nuovo</button>}
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
            <ArrowLeft className="rotate-180 text-slate-200 group-hover:text-blue-600" size={24}/>
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
        <textarea placeholder="Lavori svolti..." value={form.desc} onChange={e=>setForm({...form, desc: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold text-sm" rows="3" required></textarea>
        <div className="border border-dashed rounded-3xl p-5 bg-slate-50 text-center">
           <canvas ref={canvasRef} width={300} height={100} className="w-full h-24 bg-white rounded-2xl border shadow-inner" onMouseDown={(e) => {
             const ctx = e.target.getContext('2d'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
           }} onMouseMove={(e) => {
             if(e.buttons !== 1) return; const ctx = e.target.getContext('2d'); ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); ctx.stroke();
           }} />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-lg">Invia Report</button>
      </form>
      <div className="space-y-2">
        {reports.map(r => (
          <div key={r.id} className="p-4 bg-white border rounded-[28px] flex justify-between items-center shadow-sm">
            <div className="flex-1 overflow-hidden"><p className="font-bold text-sm text-slate-800 line-clamp-1">{r.desc}</p><p className="text-[10px] text-slate-400 uppercase font-black">{r.userName} • {r.taskTitle} • {r.hours} H</p></div>
            {r.sign && <img src={r.sign} className="h-10 opacity-30 grayscale" alt="Sign"/>}
          </div>
        ))}
      </div>
    </div>
  );
}

function VehiclesView({ userData, isAdmin, isMaster }) {
  const [vehicles, setVehicles] = useState([]);
  const [newVehicle, setNewVehicle] = useState({ name: '', plate: '', type: 'Furgone', insuranceDate: '', taxDate: '', inspectionDate: '' });
  const allStaff = Object.values(USERS_CONFIG);

  useEffect(() => {
    return onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles'), s => setVehicles(s.docs.map(d=>({id:d.id, ...d.data()}))));
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if(!isAdmin) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles'), { ...newVehicle, assignedTo: 'Libero', createdAt: serverTimestamp() });
    setNewVehicle({ name: '', plate: '', type: 'Furgone', insuranceDate: '', taxDate: '', inspectionDate: '' });
  };

  const getStatus = (date) => {
    if(!date) return { label: '-', class: 'text-slate-300' };
    const diff = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24);
    if(diff < 0) return { label: 'SCADUTO', class: 'text-red-600 font-black' };
    if(diff < 30) return { label: `${Math.ceil(diff)} gg`, class: 'text-orange-500 font-bold' };
    return { label: new Date(date).toLocaleDateString(), class: 'text-slate-600 font-medium' };
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <form onSubmit={add} className="bg-white p-8 rounded-[40px] border shadow-lg space-y-4">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3"><Truck size={24} className="text-blue-600"/> Censimento Mezzo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
             <input placeholder="Modello" className="bg-slate-50 rounded-2xl p-4 outline-none font-bold text-sm" value={newVehicle.name} onChange={e=>setNewVehicle({...newVehicle, name: e.target.value})} required />
             <input placeholder="Targa" className="bg-slate-50 rounded-2xl p-4 outline-none font-bold text-sm uppercase" value={newVehicle.plate} onChange={e=>setNewVehicle({...newVehicle, plate: e.target.value})} required />
             <select className="bg-slate-50 rounded-2xl p-4 outline-none font-bold text-sm" value={newVehicle.type} onChange={e=>setNewVehicle({...newVehicle, type: e.target.value})}><option>Furgone</option><option>Auto</option><option>Attrezzatura</option></select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
             <div className="flex flex-col"><label className="text-[9px] font-black text-slate-400 uppercase mb-1 px-4">Assicurazione</label><input type="date" className="bg-slate-50 rounded-2xl p-4 outline-none font-bold text-sm" value={newVehicle.insuranceDate} onChange={e=>setNewVehicle({...newVehicle, insuranceDate: e.target.value})} /></div>
             <div className="flex flex-col"><label className="text-[9px] font-black text-slate-400 uppercase mb-1 px-4">Bollo</label><input type="date" className="bg-slate-50 rounded-2xl p-4 outline-none font-bold text-sm" value={newVehicle.taxDate} onChange={e=>setNewVehicle({...newVehicle, taxDate: e.target.value})} /></div>
             <div className="flex flex-col"><label className="text-[9px] font-black text-slate-400 uppercase mb-1 px-4">Revisione</label><input type="date" className="bg-slate-50 rounded-2xl p-4 outline-none font-bold text-sm" value={newVehicle.inspectionDate} onChange={e=>setNewVehicle({...newVehicle, inspectionDate: e.target.value})} /></div>
          </div>
          <button type="submit" className="bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg">Registra</button>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map(v => {
          const ins = getStatus(v.insuranceDate); const bol = getStatus(v.taxDate); const rev = getStatus(v.inspectionDate);
          return (
            <div key={v.id} className="bg-white p-6 rounded-[32px] border shadow-sm relative group">
              <h4 className="font-black text-lg text-slate-800 leading-tight uppercase">{v.name}</h4>
              <p className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-black text-slate-500 uppercase mt-1 w-fit">{v.plate}</p>
              <div className="space-y-2 mt-4 border-t pt-4">
                 <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase">Assic:</span><span className={ins.class}>{ins.label}</span></div>
                 <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase">Bollo:</span><span className={bol.class}>{bol.label}</span></div>
                 <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase">Revis:</span><span className={rev.class}>{rev.label}</span></div>
              </div>
              <div className="mt-5 pt-4 border-t flex flex-col gap-1">
                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest uppercase">Assegnato a:</p>
                 {isAdmin ? (
                   <select className="bg-slate-50 border-none rounded-lg p-2 text-xs font-bold text-slate-600 outline-none" value={v.assignedTo} onChange={async (e)=>await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles', v.id), {assignedTo: e.target.value})}>
                     <option>Libero</option>{allStaff.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
                   </select>
                 ) : <p className="text-sm font-bold text-blue-600">{v.assignedTo}</p>}
              </div>
              {isAdmin && <button onClick={async()=>await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles', v.id))} className="absolute top-2 right-2 text-slate-100 hover:text-red-400"><Trash2 size={16}/></button>}
            </div>
          )
        })}
      </div>
    </div>
  );
}

function MaterialsView() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, s => setItems(s.docs.map(d=>({id:d.id, ...d.data()}))));
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
              <tr key={i.id} className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-800">{i.name}</td><td className="p-4 text-slate-600">{i.quantity}</td><td className="p-4 text-slate-400">{i.supplier}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- SEZIONE FERIE & PERMESSI (NUOVA LOGICA RIPRISTINATA) ---

function LeaveRequestsPanel({ currentUser, targetIdentifier, isMaster, isAdmin, userData }) {
  const [leaves, setLeaves] = useState([]);
  const [newRequest, setNewRequest] = useState({ start: '', end: '', type: 'Ferie', reason: '' });

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'leaves'));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setLeaves(all.filter(l => {
         if (targetIdentifier === currentUser.uid) return l.userId === currentUser.uid;
         return l.username === targetIdentifier; 
      }).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
  }, [targetIdentifier, currentUser]);

  const requestLeave = async (e) => {
    e.preventDefault();
    if (!newRequest.start || !newRequest.end) return;
    const cleanUsername = currentUser.email?.split('@')[0] || 'unknown';
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'leaves'), {
      ...newRequest,
      userId: currentUser.uid,
      username: cleanUsername, 
      fullName: userData?.name || 'Utente',
      status: 'pending',
      createdAt: serverTimestamp()
    });
    await logOperation(userData, "Richiesta Assenza", `${newRequest.type} dal ${newRequest.start}`);
    await sendNotification('all_masters', 'Richiesta Assenza', `${userData?.name} ha richiesto ${newRequest.type}.`);
    setNewRequest({ start: '', end: '', type: 'Ferie', reason: '' });
  };

  const handleStatus = async (id, status, reqUserUid) => {
    if (!isAdmin) return; 
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaves', id), { status });
    await sendNotification(reqUserUid, `Risposta Richiesta`, `La tua richiesta di assenza è stata ${status}.`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {targetIdentifier === currentUser.uid && (
        <div className="bg-white p-6 rounded-3xl border shadow-sm h-fit">
          <h3 className="font-bold text-slate-700 mb-4 uppercase text-xs tracking-widest">Nuova Richiesta</h3>
          <form onSubmit={requestLeave} className="space-y-4">
            <select className="w-full border rounded-xl p-3 text-sm font-bold bg-slate-50" value={newRequest.type} onChange={e=>setNewRequest({...newRequest, type: e.target.value})}><option>Ferie</option><option>Permesso (Ore)</option><option>Malattia</option></select>
            <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Dal</label><input type="date" className="w-full border rounded-xl p-3 text-sm font-bold bg-slate-50" value={newRequest.start} onChange={e=>setNewRequest({...newRequest, start: e.target.value})}/></div>
            <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2">Al</label><input type="date" className="w-full border rounded-xl p-3 text-sm font-bold bg-slate-50" value={newRequest.end} onChange={e=>setNewRequest({...newRequest, end: e.target.value})}/></div>
            <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold text-xs uppercase tracking-widest">Invia</button>
          </form>
        </div>
      )}
      <div className={`col-span-1 ${targetIdentifier === currentUser.uid ? 'md:col-span-2' : 'md:col-span-3'} space-y-3`}>
        {leaves.map(req => (
            <div key={req.id} className="bg-white p-5 rounded-[28px] border shadow-sm flex justify-between items-center">
              <div><div className="flex items-center gap-3"><span className={`px-3 py-1 rounded-lg text-[9px] font-black ${req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status.toUpperCase()}</span><h4 className="font-bold text-slate-800">{req.type}</h4></div><p className="text-sm text-slate-600 mt-2 font-medium">{new Date(req.start).toLocaleDateString()} — {new Date(req.end).toLocaleDateString()}</p></div>
              {isAdmin && targetIdentifier !== currentUser.uid && req.status === 'pending' && (
                <div className="flex gap-2"><button onClick={() => handleStatus(req.id, 'approved', req.userId)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-green-100">Accetta</button><button onClick={() => handleStatus(req.id, 'rejected', req.userId)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold border border-red-100">Rifiuta</button></div>
              )}
            </div>
          ))}
          {leaves.length === 0 && <p className="text-center py-20 text-slate-300 font-bold uppercase text-xs tracking-widest">Nessuna richiesta trovata</p>}
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
    <div className="bg-white border rounded-[32px] overflow-hidden shadow-sm">
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest"><tr><th className="p-5">Utente</th><th className="p-5">Azione</th><th className="p-5">Posizione</th><th className="p-5">Ora</th></tr></thead><tbody className="divide-y">{logs.map(l=>(<tr key={l.id} className="hover:bg-slate-50 transition-colors"><td className="p-5 font-bold">{l.userName}</td><td className="p-5">{l.action}</td><td className="p-5 font-mono text-blue-500 uppercase">{l.location}</td><td className="p-5 text-slate-400">{l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000).toLocaleTimeString() : '-'}</td></tr>))}</tbody></table></div>
    </div>
  );
}

function PersonalAreaView({ user, userData, isMaster, isAdmin }) {
  const [sub, setSub] = useState('leaves');
  const [targetUser, setTargetUser] = useState(user.uid); 
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    if(isMaster) { setUsersList(Object.entries(USERS_CONFIG).map(([k, v]) => ({ username: k, ...v }))); }
  }, [isMaster]);

  return (
    <div className="space-y-6">
       <div className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-6">
         <div className="flex items-center gap-5 w-full sm:w-auto">
            <div className="w-14 h-14 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-xl font-black shadow-xl uppercase">{userData?.name?.charAt(0)}</div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase leading-none">{userData?.name}</h2>
              {isMaster && (
                <select className="mt-2 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border-none rounded-lg p-1 outline-none" value={targetUser} onChange={(e) => setTargetUser(e.target.value)}>
                   <option value={user.uid}>Mio Profilo</option>
                   {usersList.map(u => (<option key={u.username} value={u.username}>{u.name}</option>))}
                </select>
              )}
            </div>
         </div>
         <div className="flex gap-4 border-b sm:border-none w-full sm:w-auto">
           <button onClick={()=>setSub('leaves')} className={`pb-2 px-4 text-xs font-black uppercase tracking-widest ${sub === 'leaves' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}>Ferie</button>
           <button onClick={()=>setSub('docs')} className={`pb-2 px-4 text-xs font-black uppercase tracking-widest ${sub === 'docs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}>Documenti</button>
           {isMaster && <button onClick={()=>setSub('logs')} className={`pb-2 px-4 text-xs font-black uppercase tracking-widest ${sub === 'logs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400'}`}>Log</button>}
         </div>
       </div>
       {sub === 'leaves' && <LeaveRequestsPanel currentUser={user} targetIdentifier={targetUser} isMaster={isMaster} isAdmin={isAdmin} userData={userData} />}
       {sub === 'logs' && isMaster && <AuditLogView />}
       {sub === 'docs' && <div className="bg-white p-12 rounded-[40px] border text-center text-slate-300 flex flex-col items-center gap-3"><FileCheck size={48} className="opacity-10"/><p className="text-xs font-black uppercase tracking-widest">Nessun documento caricato</p></div>}
    </div>
  );
}

// --- LAYOUT E ROUTING ---

function TaskDetailContainer({ task, userData, isMaster, isAdmin, onBack }) {
  const [active, setActive] = useState('overview');
  const tabs = [
    { id: 'overview', label: 'Info', icon: Activity },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'team', label: 'Squadra', icon: Users },
    { id: 'documents', label: 'Documenti', icon: FileCheck },
    { id: 'schedule', label: 'Crono', icon: CalendarRange },
    { id: 'materials', label: 'Magazzino', icon: Package },
    { id: 'requests', label: 'Richieste', icon: ShoppingCart },
    { id: 'photos', label: 'Foto', icon: Camera },
    ...(isMaster ? [{ id: 'accounting', label: 'Contabilità', icon: Calculator }] : [])
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest"><ArrowLeft size={16}/> Indietro</button>
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

function AuthScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgError, setImgError] = useState(false); 

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const email = `${username.trim().toLowerCase()}@impresadaria.app`;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try { await createUserWithEmailAndPassword(auth, email, password); } catch (regError) { setError("Errore creazione"); }
      } else setError("Errore accesso");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border">
        <div className="bg-blue-800 p-10 text-center text-white">
          <div className="w-24 h-24 bg-white mx-auto rounded-3xl mb-6 flex items-center justify-center p-4 shadow-xl">
             {!imgError ? <img src="logo.jpg" onError={()=>setImgError(true)} alt="Logo" className="object-contain" /> : <Building2 size={48} className="text-blue-800"/>}
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Impresadaria</h1>
          <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mt-1">Impresa d'Aria Srl</p>
        </div>
        <form onSubmit={handleAuth} className="p-10 space-y-5">
          {error && <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-100">{error}</div>}
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Username</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold focus:ring-2 focus:ring-blue-600" /></div>
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold focus:ring-2 focus:ring-blue-600" /></div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-200 flex items-center justify-center gap-3 mt-4">
             {isSubmitting ? <Loader2 className="animate-spin"/> : "Accedi"}
          </button>
        </form>
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
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 shadow-sm h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><LayoutDashboard size={18} /></div>
            <h1 className="font-black text-slate-800 uppercase tracking-tighter hidden sm:block">Impresadaria</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="p-2 rounded-xl hover:bg-slate-100 relative text-slate-400"><Bell size={20} />{notifications.filter(n=>!n.read).length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
              {showNotifPanel && (
                <div className="absolute right-0 top-12 w-72 bg-white rounded-3xl shadow-2xl border p-2 z-50">
                  <div className="p-3 border-b flex justify-between items-center font-black text-[10px] uppercase text-slate-400">Notifiche <button onClick={()=>setShowNotifPanel(false)}><X size={14}/></button></div>
                  <div className="max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? <p className="text-center py-6 text-xs text-slate-300">Nessun avviso</p> : 
                      notifications.map(n => (
                        <div key={n.id} onClick={async () => await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', n.id), { read: true })} className={`p-4 border-b last:border-none cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}><p className="text-xs font-bold text-slate-800">{n.title}</p><p className="text-[10px] text-slate-500 mt-1">{n.message}</p></div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            <button onClick={()=>signOut(auth)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
          </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        {!selectedTask && (
          <div className="flex bg-white p-1 rounded-2xl border shadow-sm mb-8 overflow-x-auto scrollbar-hide">
            {[ {id:'tasks', label:'Cantieri'}, {id:'vehicles', label:'Mezzi'}, {id:'reports', label:'Report'}, {id:'materials', label:'Magazzino'}, {id:'personal', label:'Profilo'} ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{tab.label}</button>
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
           <PersonalAreaView user={user} userData={safeUserData} isMaster={isMaster} isAdmin={isAdmin} />
        )}
      </main>
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
