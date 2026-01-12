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
  Eye,
  LockKeyhole,
  UnlockKeyhole,
  FileBarChart
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

// --- SEZIONI DETTAGLIO CANTIERE ---

function SiteOverview({ task, isMaster, isAdmin, userData }) {
  const [totals, setTotals] = useState({ materials: 0, hours: 0, cost: 0 });
  const nextPhase = task.schedule?.find(p => new Date(p.end) >= new Date());

  useEffect(() => {
    if (task.completed) {
      // Carica dati per il resoconto finale
      const unsubM = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'), where('taskId', '==', task.id)), s => {
        const mat = s.docs.reduce((sum, d) => sum + (parseFloat(d.data().quantity || 0) * parseFloat(d.data().cost || 0)), 0);
        setTotals(prev => ({...prev, materials: mat}));
      });
      const unsubL = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), where('taskId', '==', task.id)), s => {
        const hrs = s.docs.reduce((sum, d) => sum + (parseFloat(d.data().hours || 0)), 0);
        setTotals(prev => ({...prev, hours: hrs, cost: hrs * STANDARD_HOURLY_RATE}));
      });
      return () => { unsubM(); unsubL(); };
    }
  }, [task.id, task.completed]);

  const handleToggleStatus = async () => {
    const newStatus = !task.completed;
    if (newStatus && !window.confirm("Sei sicuro di voler chiudere il cantiere? Tutte le attività di squadra verranno bloccate.")) return;
    if (!newStatus && !isAdmin) return; // Solo master full riaprono

    try {
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { completed: newStatus });
      await logOperation(userData, newStatus ? "Chiusura Cantiere" : "Riapertura Cantiere", task.title);
      await sendNotification('all_masters', newStatus ? 'Cantiere Chiuso' : 'Cantiere Riaperto', `Il cantiere ${task.title} è stato ${newStatus ? 'chiuso' : 'riaperto'} da ${userData.name}.`);
    } catch (e) { alert("Errore durante l'operazione"); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Box Stato e Azioni Master */}
      <div className={`p-6 rounded-[32px] border flex flex-col sm:flex-row justify-between items-center gap-4 ${task.completed ? 'bg-slate-900 border-slate-800 text-white shadow-xl' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${task.completed ? 'bg-slate-800 text-green-400' : 'bg-blue-50 text-blue-600'}`}>
            {task.completed ? <LockKeyhole size={24}/> : <Activity size={24}/>}
          </div>
          <div>
            <h4 className={`font-black uppercase tracking-tighter ${task.completed ? 'text-white' : 'text-slate-800'}`}>Stato Attuale</h4>
            <p className={`text-xs font-bold ${task.completed ? 'text-slate-400' : 'text-blue-500'}`}>{task.completed ? 'CANTIERE TERMINATO' : 'CANTIERE IN CORSO'}</p>
          </div>
        </div>
        
        {isMaster && (
          <div className="flex gap-2 w-full sm:w-auto">
            {!task.completed ? (
              <button onClick={handleToggleStatus} className="w-full sm:w-auto bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-700 shadow-lg shadow-red-200 transition-all">
                <CheckCircle size={16}/> Chiudi Cantiere
              </button>
            ) : isAdmin ? (
              <button onClick={handleToggleStatus} className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-900 transition-all">
                <UnlockKeyhole size={16}/> Riapri Cantiere
              </button>
            ) : (
              <div className="text-[10px] font-black text-slate-500 uppercase bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">Solo Master Full può riaprire</div>
            )}
          </div>
        )}
      </div>

      {/* Resoconto Finale se Chiuso */}
      {task.completed && (
        <div className="bg-white p-8 rounded-[40px] border border-blue-100 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b pb-4">
             <FileBarChart className="text-blue-600" size={28}/>
             <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Resoconto Finale Cantiere</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ore Totali</p>
                <p className="text-2xl font-black text-slate-800">{totals.hours} H</p>
             </div>
             <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo Materiali</p>
                <p className="text-2xl font-black text-slate-800">€ {totals.materials.toFixed(2)}</p>
             </div>
             <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-lg shadow-blue-100">
                <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Spesa Manodopera</p>
                <p className="text-2xl font-black">€ {totals.cost.toFixed(2)}</p>
             </div>
          </div>

          <div className="pt-4">
             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Squadra Operativa</h4>
             <div className="flex flex-wrap gap-2">
                {task.assignedTeam?.map(name => (
                  <span key={name} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold">{name}</span>
                )) || <p className="text-xs text-slate-400 italic">Nessun membro assegnato registrato.</p>}
             </div>
          </div>
        </div>
      )}

      {/* Grid Info Standard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border shadow-sm">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Building2 size={16} className="text-blue-500"/> Committente</h4>
          <p className="text-sm mt-2 text-slate-600 font-medium">{task.client}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border shadow-sm">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><ShieldCheck size={16} className="text-indigo-500"/> Responsabile</h4>
          <p className="text-sm mt-2 text-slate-600 font-medium">{task.authorName}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border shadow-sm">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Timer size={16} className="text-orange-500"/> Prossimo Step</h4>
          <p className="text-sm mt-2 text-slate-600 font-medium truncate">{nextPhase ? String(nextPhase.name) : 'Non pianificato'}</p>
        </div>
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
            <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${msg.userId === userData.uid ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border text-slate-800 rounded-bl-none shadow-sm'}`}>
              {msg.userId !== userData.uid && <p className="text-[10px] font-black text-blue-600 mb-1 uppercase tracking-tighter">{msg.userName}</p>}
              {msg.message}
            </div>
            <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '...'}</span>
          </div>
        ))}
      </div>
      {!isClosed ? (
        <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
          <input className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm outline-none font-medium" placeholder="Invia un messaggio alla squadra..." value={newMessage} onChange={e=>setNewMessage(e.target.value)} />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-transform active:scale-95"><Send size={20}/></button>
        </form>
      ) : (
        <div className="p-4 bg-slate-100 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest border-t flex items-center justify-center gap-2">
          <LockKeyhole size={14}/> Chat in sola lettura (Cantiere Chiuso)
        </div>
      )}
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
          <select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} className="flex-1 border rounded-2xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-600 font-bold bg-white shadow-sm">
            <option value="">-- Seleziona Personale --</option>
            {allStaff.map(u => <option key={u.name} value={u.name} disabled={assigned.includes(u.name)}>{u.name} ({u.role})</option>)}
          </select>
          <button onClick={handleAssign} className="bg-blue-600 text-white px-8 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Aggiungi</button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {assigned.map(name => {
          const staffMember = allStaff.find(u => u.name === name);
          const isMasterRole = staffMember?.role === 'Master';
          return (
            <div key={name} className="p-4 bg-white border rounded-[28px] flex justify-between items-center shadow-sm relative group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${isMasterRole ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                  {name.charAt(0)}
                </div>
                <div><span className="text-sm font-black text-slate-800 tracking-tighter uppercase leading-none">{name}</span><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{staffMember?.role || 'Operaio'}</p></div>
              </div>
              {isAdmin && !task.completed && <button onClick={async () => await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { assignedTeam: arrayRemove(name) })} className="text-red-400 hover:bg-red-50 p-2 rounded-xl transition-colors"><X size={18}/></button>}
            </div>
          );
        })}
        {assigned.length === 0 && <div className="col-span-full py-12 text-center text-slate-300 font-black text-xs uppercase tracking-[0.2em]">Nessun membro assegnato</div>}
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
      {isAdmin && !isClosed && (
        <div className="bg-white p-5 rounded-[32px] border border-dashed border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Repository Documentale</p>
          <div className="flex items-center gap-3">
             <input type="file" onChange={handleUpload} className="text-xs" />
             {uploading && <Loader2 className="animate-spin text-blue-600"/>}
          </div>
        </div>
      )}
      <div className="grid gap-3">
        {docs.map(d => (
          <div key={d.id} className="flex items-center justify-between p-5 bg-white border rounded-[28px] shadow-sm">
            <div className="flex items-center gap-4"><div className="p-3 bg-blue-50 rounded-2xl text-blue-500"><FileText size={20}/></div><span className="text-sm font-black text-slate-800 tracking-tighter uppercase">{d.name}</span></div>
            <a href={d.data} download={d.name} className="p-3 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all"><Download size={20}/></a>
          </div>
        ))}
        {docs.length === 0 && <p className="text-center py-10 text-slate-300 font-black text-xs uppercase tracking-widest">Nessun file presente</p>}
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
    if(!isAdmin || !newPhase.name || !newPhase.start || !newPhase.end || task.completed) return;
    const updated = [...schedule, newPhase].sort((a,b) => new Date(a.start) - new Date(b.start));
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { schedule: updated });
    setNewPhase({ name: '', start: '', end: '' });
  };

  return (
    <div className="space-y-4">
      {isAdmin && !task.completed && (
        <form onSubmit={addPhase} className="bg-white p-6 rounded-[32px] border grid grid-cols-1 md:grid-cols-4 gap-4 shadow-sm">
          <input placeholder="Fase di lavoro" className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm outline-none" value={newPhase.name} onChange={e=>setNewPhase({...newPhase, name: e.target.value})} />
          <input type="date" className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm outline-none" value={newPhase.start} onChange={e=>setNewPhase({...newPhase, start: e.target.value})} />
          <input type="date" className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm outline-none" value={newPhase.end} onChange={e=>setNewPhase({...newPhase, end: e.target.value})} />
          <button type="submit" className="bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Programma</button>
        </form>
      )}
      <div className="space-y-3">
        {schedule.map((p, i) => (
          <div key={i} className="p-5 bg-white border rounded-[32px] flex justify-between items-center shadow-sm relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
            <div><p className="font-black text-slate-800 uppercase tracking-tighter">{String(p.name)}</p><p className="text-[10px] font-black text-slate-400 mt-1 tracking-widest">{new Date(p.start).toLocaleDateString()} — {new Date(p.end).toLocaleDateString()}</p></div>
            {isAdmin && !task.completed && <button onClick={async () => {
              const updated = schedule.filter((_, idx) => idx !== i);
              await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { schedule: updated });
            }} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>}
          </div>
        ))}
        {schedule.length === 0 && <p className="text-center py-10 text-slate-300 font-black text-xs uppercase tracking-widest">Nessun cronoprogramma</p>}
      </div>
    </div>
  );
}

function SitePhotos({ taskId, userData, isAdmin, isClosed }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'photos'), where('taskId', '==', taskId));
    return onSnapshot(q, (snap) => setPhotos(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  }, [taskId]);

  const handleUpload = async (e) => {
    if(isClosed) return;
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
      <div className="flex justify-between items-center bg-white p-5 rounded-[32px] border shadow-sm">
        <h3 className="font-black text-slate-800 uppercase tracking-tighter">Album Fotografico</h3>
        {!isClosed && (
          <div className="flex items-center gap-3">
             {uploading && <Loader2 className="animate-spin text-blue-600"/>}
             <input type="file" onChange={handleUpload} className="text-xs font-bold" accept="image/*" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {photos.map(p => (
          <div key={p.id} onClick={() => setLightbox(p.imageData)} className="aspect-square bg-slate-100 rounded-[32px] overflow-hidden cursor-pointer border-4 border-white shadow-sm hover:scale-105 transition-all relative group">
            <img src={p.imageData} className="w-full h-full object-cover" alt="Site" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 className="text-white"/></div>
          </div>
        ))}
        {photos.length === 0 && <div className="col-span-full py-16 text-center text-slate-300 font-black text-xs uppercase tracking-widest">Nessuna immagine caricata</div>}
      </div>
      {lightbox && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={()=>setLightbox(null)}>
           <button className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full"><X size={32}/></button>
           <img src={lightbox} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" alt="Fullscreen" />
        </div>
      )}
    </div>
  );
}

function MaterialRequestsView({ taskId, userData, isClosed }) {
  const [requests, setRequests] = useState([]);
  const [item, setItem] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'material_requests'), where('taskId', '==', taskId));
    return onSnapshot(q, (snap) => setRequests(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  }, [taskId]);

  const add = async (e) => {
    e.preventDefault();
    if(isClosed || !item.trim()) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'material_requests'), {
      taskId, item, status: 'pending', userName: userData.name, createdAt: serverTimestamp()
    });
    setItem('');
  };

  return (
    <div className="space-y-4">
      {!isClosed ? (
        <form onSubmit={add} className="flex gap-2 bg-white p-4 rounded-[32px] border shadow-sm">
          <input value={item} onChange={e=>setItem(e.target.value)} placeholder="Di cosa hai bisogno?" className="flex-1 bg-transparent px-4 py-1 outline-none text-sm font-bold" />
          <button className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Invia</button>
        </form>
      ) : (
        <div className="p-4 bg-slate-100 rounded-2xl text-center text-xs font-black text-slate-400 uppercase tracking-widest border">
          Sezione chiusa con il cantiere
        </div>
      )}
      <div className="space-y-3">
        {requests.map(r => (
          <div key={r.id} className="p-5 bg-white border rounded-[32px] flex justify-between items-center shadow-sm">
            <div><p className="text-sm font-black text-slate-800 uppercase tracking-tighter leading-none">{r.item}</p><p className="text-[10px] text-slate-400 mt-2 uppercase font-black tracking-widest">Dip: {r.userName}</p></div>
            <span className={`text-[9px] font-black px-4 py-1 rounded-lg ${r.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>{r.status.toUpperCase()}</span>
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Bacheca Cantieri</h2>
         {isAdmin && !isFormOpen && <button onClick={()=>setIsFormOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex gap-2 items-center shadow-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"><Plus size={18}/> Registra Nuovo</button>}
      </div>
      {isFormOpen && (
        <form onSubmit={addTask} className="bg-white p-10 rounded-[40px] border shadow-2xl space-y-5 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Titolo Cantiere" className="bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold text-lg" onChange={e=>setNewTask({...newTask, title: e.target.value})} required />
            <input placeholder="Committente" className="bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold text-lg" onChange={e=>setNewTask({...newTask, client: e.target.value})} required />
          </div>
          <textarea placeholder="Descrizione sommaria dei lavori..." className="w-full bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold text-sm" onChange={e=>setNewTask({...newTask, description: e.target.value})} rows="4" />
          <div className="flex gap-4 pt-4"><button type="submit" className="bg-blue-600 text-white px-12 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl">Salva Dati</button><button type="button" onClick={()=>setIsFormOpen(false)} className="text-slate-400 font-black text-xs uppercase tracking-widest px-6">Annulla</button></div>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map(t => (
          <div key={t.id} onClick={()=>onSelectTask(t)} className="bg-white p-7 border rounded-[48px] hover:ring-4 hover:ring-blue-600/10 cursor-pointer transition-all shadow-sm flex flex-col justify-between group h-64 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full translate-x-1/2 -translate-y-1/2 ${t.completed ? 'bg-slate-900' : 'bg-blue-600'}`}></div>
            <div className="relative z-10 flex-1 overflow-hidden">
               <div className="flex justify-between items-start mb-2">
                  <h4 className="font-black text-2xl text-slate-800 truncate tracking-tighter uppercase leading-none">{t.title}</h4>
                  <ArrowLeft className="rotate-180 text-slate-200 group-hover:text-blue-600 transition-all group-hover:translate-x-2" size={28}/>
               </div>
               <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{t.client}</p>
            </div>
            <div className="mt-8 flex items-center gap-3 relative z-10">
               <span className={`text-[10px] px-4 py-1.5 rounded-2xl font-black tracking-widest border ${t.completed ? 'bg-slate-900 text-white border-slate-800' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{t.completed ? 'CHIUSO' : 'ATTIVO'}</span>
               {t.assignedTeam?.length > 0 && <span className="text-[10px] bg-slate-50 text-slate-400 px-4 py-1.5 rounded-2xl font-black tracking-widest border border-slate-100">{t.assignedTeam.length} OPERATORI</span>}
            </div>
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
    const currentTask = tasks.find(t=>t.id===form.taskId);
    if(currentTask?.completed) { alert("Cantiere chiuso, non puoi inviare report."); return; }
    
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), { 
      ...form, 
      taskTitle: currentTask?.title || 'Cantiere', 
      userName: userData.name, 
      sign, 
      createdAt: serverTimestamp() 
    });
    await logOperation(userData, "Invia Rapportino", currentTask?.title);
    setForm({ taskId: '', hours: '', desc: '' });
    if(canvasRef.current) canvasRef.current.getContext('2d').clearRect(0,0,300,100);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <form onSubmit={submit} className="bg-white p-10 rounded-[48px] border shadow-2xl space-y-6">
        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-4"><PenTool size={28} className="text-blue-600"/> Registro Attività</h3>
        <select value={form.taskId} onChange={e=>setForm({...form, taskId: e.target.value})} className="w-full bg-slate-50 border-none rounded-3xl p-5 outline-none font-bold text-sm shadow-inner" required>
          <option value="">Scegli Cantiere Operativo...</option>
          {tasks.filter(t=>!t.completed).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <div className="flex flex-col sm:flex-row gap-4">
           <input type="number" step="0.5" placeholder="Ore" value={form.hours} onChange={e=>setForm({...form, hours: e.target.value})} className="flex-1 bg-slate-50 rounded-3xl p-5 font-bold text-sm border-none outline-none shadow-inner" required />
           <input type="date" className="flex-1 bg-slate-50 rounded-3xl p-5 font-bold text-sm border-none outline-none shadow-inner" defaultValue={new Date().toISOString().split('T')[0]} />
        </div>
        <textarea placeholder="Descrizione analitica dei lavori..." value={form.desc} onChange={e=>setForm({...form, desc: e.target.value})} className="w-full bg-slate-50 border-none rounded-3xl p-5 font-bold text-sm shadow-inner outline-none" rows="4" required></textarea>
        <div className="border border-dashed rounded-[32px] p-6 bg-slate-50 text-center">
           <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Firma Responsabile</p>
           <canvas ref={canvasRef} width={300} height={100} className="w-full h-32 bg-white rounded-3xl border shadow-inner touch-none cursor-crosshair" onMouseDown={(e) => {
             const ctx = e.target.getContext('2d'); ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
           }} onMouseMove={(e) => {
             if(e.buttons !== 1) return; const ctx = e.target.getContext('2d'); ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); ctx.stroke();
           }} />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[28px] font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all">Salva Rapporto</button>
      </form>
      <div className="space-y-4">
        {reports.map(r => (
          <div key={r.id} className="p-6 bg-white border rounded-[36px] flex justify-between items-center shadow-sm border-slate-100">
            <div className="flex-1 overflow-hidden pr-4"><p className="font-bold text-slate-800 line-clamp-1 uppercase tracking-tight">{r.desc}</p><p className="text-[10px] text-slate-400 mt-2 uppercase font-black tracking-widest">{r.userName} • {r.taskTitle} • {r.hours} H</p></div>
            {r.sign && <img src={r.sign} className="h-12 opacity-30 grayscale rounded-xl border border-slate-100" alt="Sign"/>}
          </div>
        ))}
      </div>
    </div>
  );
}

function VehiclesView({ isAdmin, isMaster }) {
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
    <div className="space-y-8">
      {isAdmin && (
        <form onSubmit={add} className="bg-white p-10 rounded-[48px] border shadow-xl space-y-6">
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-4"><Truck size={28} className="text-blue-600"/> Parco Mezzi</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <input placeholder="Modello" className="bg-slate-50 rounded-3xl p-5 outline-none font-bold text-sm shadow-inner" value={newVehicle.name} onChange={e=>setNewVehicle({...newVehicle, name: e.target.value})} required />
             <input placeholder="Targa" className="bg-slate-50 rounded-3xl p-5 outline-none font-bold text-sm uppercase shadow-inner" value={newVehicle.plate} onChange={e=>setNewVehicle({...newVehicle, plate: e.target.value})} required />
             <select className="bg-slate-50 rounded-3xl p-5 outline-none font-bold text-sm shadow-inner" value={newVehicle.type} onChange={e=>setNewVehicle({...newVehicle, type: e.target.value})}><option>Furgone</option><option>Auto</option><option>Attrezzatura</option></select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="flex flex-col"><label className="text-[10px] font-black text-slate-400 uppercase mb-2 px-4 tracking-widest">Assicurazione</label><input type="date" className="bg-slate-50 rounded-3xl p-5 outline-none font-bold text-sm shadow-inner" value={newVehicle.insuranceDate} onChange={e=>setNewVehicle({...newVehicle, insuranceDate: e.target.value})} /></div>
             <div className="flex flex-col"><label className="text-[10px] font-black text-slate-400 uppercase mb-2 px-4 tracking-widest">Bollo</label><input type="date" className="bg-slate-50 rounded-3xl p-5 outline-none font-bold text-sm shadow-inner" value={newVehicle.taxDate} onChange={e=>setNewVehicle({...newVehicle, taxDate: e.target.value})} /></div>
             <div className="flex flex-col"><label className="text-[10px] font-black text-slate-400 uppercase mb-2 px-4 tracking-widest">Revisione</label><input type="date" className="bg-slate-50 rounded-3xl p-5 outline-none font-bold text-sm shadow-inner" value={newVehicle.inspectionDate} onChange={e=>setNewVehicle({...newVehicle, inspectionDate: e.target.value})} /></div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-lg shadow-blue-100">Registra Mezzo</button>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map(v => {
          const ins = getStatus(v.insuranceDate); const bol = getStatus(v.taxDate); const rev = getStatus(v.inspectionDate);
          return (
            <div key={v.id} className="bg-white p-8 rounded-[40px] border shadow-sm relative group hover:shadow-lg transition-all border-slate-100">
              <div className="flex justify-between items-start mb-6">
                <div><h4 className="font-black text-xl text-slate-800 leading-tight uppercase tracking-tighter">{v.name}</h4><p className="text-[10px] bg-slate-100 px-3 py-1 rounded-xl font-black text-slate-500 uppercase mt-2 w-fit tracking-[0.2em] border">{v.plate}</p></div>
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shadow-sm"><Truck size={24}/></div>
              </div>
              <div className="space-y-3 mt-6 border-t pt-6 border-slate-50">
                 <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase tracking-widest">Assicurazione:</span><span className={ins.class}>{ins.label}</span></div>
                 <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase tracking-widest">Bollo:</span><span className={bol.class}>{bol.label}</span></div>
                 <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase tracking-widest">Revisione:</span><span className={rev.class}>{rev.label}</span></div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col gap-2">
                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Assegnazione:</p>
                 {isAdmin ? (
                   <select className="bg-slate-50 border-none rounded-xl p-3 text-xs font-black text-blue-600 outline-none uppercase shadow-inner" value={v.assignedTo} onChange={async (e)=>await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles', v.id), {assignedTo: e.target.value})}>
                     <option>Libero</option>{allStaff.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
                   </select>
                 ) : <p className="text-sm font-black text-blue-600 uppercase tracking-tight">{v.assignedTo}</p>}
              </div>
              {isAdmin && <button onClick={async()=>await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles', v.id))} className="absolute top-4 right-4 text-slate-200 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>}
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
    <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b">
            <tr><th className="p-6">Materiale</th><th className="p-6">Giacenza</th><th className="p-6">Fornitore</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(i=>(
              <tr key={i.id} className="hover:bg-slate-50 transition-colors"><td className="p-6 font-black text-slate-800 tracking-tight">{i.name}</td><td className="p-6 text-slate-600 font-bold">{i.quantity}</td><td className="p-6 text-slate-400 font-medium tracking-tight uppercase text-xs">{i.supplier}</td></tr>
            ))}
            {items.length === 0 && <tr><td colSpan="3" className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest">Magazzino Vuoto</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- DASHBOARD E ENTRY POINT ---

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
    <div className="pb-24">
      <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-40 h-20 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-xl shadow-blue-200"><LayoutDashboard size={20} /></div>
            <div className="hidden sm:block"><h1 className="font-black text-slate-800 uppercase tracking-tighter text-xl leading-none">Impresadaria</h1><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{safeUserData.role}</span></div>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative">
              <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="p-3 bg-slate-50 rounded-2xl relative text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 border border-slate-200"><Bell size={20} />{notifications.filter(n=>!n.read).length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}</button>
              {showNotifPanel && (
                <div className="absolute right-0 top-14 w-80 bg-white rounded-[32px] shadow-2xl border-4 border-slate-50 p-2 z-50 animate-in zoom-in-95">
                  <div className="p-4 border-b flex justify-between items-center font-black text-[11px] uppercase tracking-widest text-slate-400">Ultimi Avvisi <button onClick={()=>setShowNotifPanel(false)} className="bg-slate-100 p-1 rounded-lg"><X size={14}/></button></div>
                  <div className="max-h-80 overflow-y-auto scrollbar-hide">
                    {notifications.length === 0 ? <p className="text-center py-10 text-xs text-slate-300 font-bold uppercase tracking-widest">Nessun avviso</p> : 
                      notifications.map(n => (
                        <div key={n.id} onClick={async () => await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', n.id), { read: true })} className={`p-5 border-b last:border-none cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}><p className="text-xs font-black text-slate-800 uppercase tracking-tight leading-tight">{n.title}</p><p className="text-[10px] text-slate-500 mt-2 font-medium leading-relaxed">{n.message}</p></div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            <div className="hidden md:flex flex-col items-end">
               <p className="text-sm font-black text-slate-800 uppercase tracking-tighter leading-none">{safeUserData.name}</p>
               <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mt-1">Online</p>
            </div>
            <button onClick={()=>signOut(auth)} className="p-3 bg-slate-50 rounded-2xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-200"><LogOut size={20} /></button>
          </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-10">
        {!selectedTask && (
          <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-[32px] border border-slate-200 shadow-sm mb-10 overflow-x-auto scrollbar-hide">
            {[ {id:'tasks', label:'Cantieri'}, {id:'vehicles', label:'Mezzi'}, {id:'reports', label:'Report'}, {id:'materials', label:'Magazzino'}, {id:'personal', label:'Profilo'} ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-8 py-3.5 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}>{tab.label}</button>
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
    const unsub = onAuthStateChanged(auth, (currentUser) => {
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
    return () => unsub();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200">
      {user ? <DashboardContainer user={user} userData={userData} /> : <AuthScreen />}
    </div>
  );
}
