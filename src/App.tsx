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
  limit,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { 
  Activity, Plus, Trash2, CheckCircle, LogOut, Loader2, User, Lock, 
  LayoutDashboard, ShieldCheck, Package, Wrench, Euro, ClipboardList, 
  Building2, FileText, ArrowLeft, Camera, Image, Calculator, HardHat, 
  Edit2, Save, X, Calendar, Clock, Briefcase, ShoppingCart, CheckSquare, 
  Users, FileCheck, Download, CalendarRange, Bell, UserCheck, FileUp, 
  Maximize2, Truck, AlertTriangle, PenTool, MessageSquare, MapPin, 
  Send, ShieldAlert, Timer, Eye, LockKeyhole, UnlockKeyhole, FileBarChart, Map,
  FileSpreadsheet, Fuel, Construction
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

// --- VEICOLI STATICI ---
const STATIC_VEHICLES = [
  "Privato",
  "Ford Transit Custom",
  "Fiat Doblò",
  "Volvo XC60",
  "Ford Galaxy",
  "Iveco Daily 1",
  "Iveco Daily 2"
];

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

// --- HELPERS DI SISTEMA ---

const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return '...';
  try {
    return new Date(timestamp.seconds * 1000).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
  } catch (e) { return '-'; }
};

async function logOperation(userData, action, details) {
  let location = "N/D";
  try {
    if (navigator.geolocation) {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 2000 }));
      location = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
    }
  } catch (e) {}
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

// --- COMPONENTI UI ATOMICI ---

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
      <p className="font-bold text-xs uppercase tracking-widest animate-pulse">Sincronizzazione...</p>
    </div>
  );
}

// --- COMPONENTI DI DETTAGLIO ---

function ReportModal({ report, onClose, isAdmin }) {
  if (!report) return null;

  const handleDelete = async () => {
    if (!window.confirm("Sei sicuro di voler eliminare definitivamente questo report?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports', report.id));
      onClose();
    } catch (e) { alert("Errore durante l'eliminazione"); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-50 p-6 border-b flex justify-between items-center">
          <div>
            <h3 className="font-black text-lg text-slate-800 uppercase tracking-tighter">Dettaglio Rapportino</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase">{report.reportDate || 'Data N/D'}</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={20}/></button>}
            <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-blue-500 shadow-sm"><X size={20}/></button>
          </div>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-2 gap-4">
             <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase">Operatore</p><p className="font-bold text-slate-700 text-sm">{report.userName}</p></div>
             <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase">Ore</p><p className="font-bold text-blue-600 text-xl">{report.hours} <span className="text-xs">h</span></p></div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Descrizione</p>
            <p className="text-sm text-slate-700 leading-relaxed">{report.desc}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Mezzo</p><div className="flex items-center gap-2 text-slate-700 font-bold text-xs"><Truck size={14}/> {report.vehicleName}</div></div>
             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Carburante</p><div className="flex items-center gap-2 text-slate-700 font-bold text-xs"><Fuel size={14}/> {report.fuelAmount ? `€ ${report.fuelAmount}` : 'No'}</div></div>
          </div>
          {report.equipmentUsed && (
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100"><p className="text-[9px] font-black text-blue-400 uppercase mb-1">Attrezzatura</p><div className="flex items-center gap-2 text-blue-700 font-bold text-xs"><Construction size={14}/> {report.equipmentUsed}</div></div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTI SEZIONI CANTIERE ---

function SiteOverview({ task, isMaster, isAdmin, userData }) {
  const [stats, setStats] = useState({ mat: 0, hrs: 0, travel: 0 });
  const next = task.schedule?.find(p => new Date(p.end) >= new Date());

  useEffect(() => {
    const unsubM = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'), where('taskId', '==', task.id)), s => {
      setStats(prev => ({...prev, mat: s.docs.reduce((sum, d) => sum + (parseFloat(d.data().quantity || 0) * parseFloat(d.data().cost || 0)), 0)}));
    });
    const unsubL = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), where('taskId', '==', task.id)), s => {
      const reps = s.docs.map(d=>d.data());
      setStats(prev => ({...prev, hrs: reps.reduce((sum, d) => sum + (parseFloat(d.hours || 0)), 0), travel: reps.filter(d=>d.isTrasferta).length}));
    });
    return () => { unsubM(); unsubL(); };
  }, [task.id]);

  const toggleStatus = async () => {
    const status = !task.completed;
    if (status && !window.confirm("Chiudere il cantiere?")) return;
    if (!status && !isAdmin) return;
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { completed: status });
    await logOperation(userData, status ? "Chiusura" : "Riapertura", task.title);
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-[32px] border flex justify-between items-center ${task.completed ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${task.completed ? 'bg-slate-800 text-green-400' : 'bg-blue-50 text-blue-600'}`}>{task.completed ? <LockKeyhole/> : <Activity/>}</div>
          <div><h4 className="font-black uppercase text-[10px] tracking-widest">Stato</h4><p className="text-sm font-bold">{task.completed ? 'CHIUSO' : 'OPERATIVO'}</p></div>
        </div>
        {isMaster && (
          <button onClick={toggleStatus} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg ${task.completed ? 'bg-blue-600' : 'bg-red-600'} text-white`}>
            {task.completed ? 'Riapri' : 'Chiudi'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ore Lavoro</p><p className="text-xl font-black">{stats.hrs} H</p></div>
        <div className="bg-white p-5 rounded-3xl border text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Materiali</p><p className="text-xl font-black">€ {stats.mat.toFixed(0)}</p></div>
        <div className="bg-white p-5 rounded-3xl border text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Trasferte</p><p className="text-xl font-black text-orange-500">{stats.travel}</p></div>
        <div className="bg-slate-50 p-5 rounded-3xl border text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status</p><p className="text-xs font-bold truncate uppercase">{task.isTrasfertaSite ? 'Fuori Sede' : 'Locale'}</p></div>
      </div>
    </div>
  );
}

function SiteReportsList({ taskId, isMaster, userData, isAdminFull }) {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), where('taskId', '==', taskId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setReports(isMaster ? all : all.filter(r => r.userName === userData.name));
    });
  }, [taskId, isMaster, userData?.name]);

  return (
    <div className="space-y-4 animate-in fade-in">
      {reports.length === 0 && <p className="text-center py-20 text-slate-300 font-black uppercase text-[10px] tracking-widest">Nessun rapporto</p>}
      {reports.map(r => (
        <div key={r.id} onClick={()=>setSelected(r)} className="p-5 bg-white border rounded-[32px] flex justify-between items-center shadow-sm hover:border-blue-300 transition-all cursor-pointer">
          <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.reportDate}</span>
                {r.fuelAmount && <Fuel size={12} className="text-green-500"/>}
             </div>
             <h4 className="font-bold text-slate-800 text-sm truncate uppercase mt-1">{r.userName}</h4>
             <p className="text-xs text-slate-500 line-clamp-1 mt-1">{r.desc}</p>
          </div>
          <div className="text-right ml-4">
             <p className="text-xl font-black text-slate-800 leading-none">{r.hours}<span className="text-xs">h</span></p>
             {r.isTrasferta && <p className="text-[9px] font-black text-orange-500 uppercase mt-1">Trasferta</p>}
          </div>
        </div>
      ))}
      {selected && <ReportModal report={selected} onClose={()=>setSelected(null)} isAdmin={isAdminFull} />}
    </div>
  );
}

// ... SITE CHAT, TEAM, DOCUMENTS, SCHEDULE, PHOTOS, MATERIAL REQUESTS ...
// (Mantengo le funzioni logicamente separate e stabili come richiesto)

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
    e.preventDefault(); if(isClosed || !newMessage.trim()) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'site_chats'), { taskId, userId: userData.uid, userName: userData.name, message: newMessage, createdAt: serverTimestamp() });
    setNewMessage('');
  };
  return (
    <div className="flex flex-col h-[450px] bg-white rounded-3xl border overflow-hidden shadow-sm">
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4" ref={scrollRef}>{messages.map(msg => (<div key={msg.id} className={`flex flex-col ${msg.userId === userData.uid ? 'items-end' : 'items-start'}`}><div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${msg.userId === userData.uid ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border text-slate-800 rounded-bl-none shadow-sm'}`}>{msg.userId !== userData.uid && <p className="text-[10px] font-black text-blue-600 mb-1 uppercase">{msg.userName}</p>}{msg.message}</div></div>))}</div>
      {!isClosed ? <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2"><input className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm outline-none" placeholder="Messaggio..." value={newMessage} onChange={e=>setNewMessage(e.target.value)} /><button type="submit" className="bg-blue-600 text-white p-2 rounded-xl active:scale-90 transition-transform"><Send size={18}/></button></form> : <div className="p-4 text-center text-[10px] font-black uppercase text-slate-400 border-t tracking-widest">Sola Lettura</div>}
    </div>
  );
}

function SiteTeam({ task, isAdmin }) {
  const [assigned, setAssigned] = useState(task.assignedTeam || []);
  const [selectedUser, setSelectedUser] = useState('');
  const allStaff = Object.values(USERS_CONFIG);
  useEffect(() => { setAssigned(task.assignedTeam || []); }, [task.assignedTeam]);
  const handleAssign = async () => { if(!selectedUser || !isAdmin || task.completed) return; await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { assignedTeam: arrayUnion(selectedUser) }); setSelectedUser(''); };
  return (
    <div className="space-y-4">
      {isAdmin && !task.completed && <div className="flex gap-2"><select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} className="flex-1 border rounded-xl p-3 text-sm font-bold bg-white outline-none"><option value="">-- Seleziona Operatore --</option>{allStaff.map(u => <option key={u.name} value={u.name} disabled={assigned.includes(u.name)}>{u.name} ({u.role})</option>)}</select><button onClick={handleAssign} className="bg-blue-600 text-white px-8 rounded-2xl font-black text-xs uppercase shadow-lg">Aggiungi</button></div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{assigned.map(name => { const staff = allStaff.find(u => u.name === name); return (<div key={name} className="p-4 bg-white border rounded-[28px] flex justify-between items-center shadow-sm relative group"><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${staff?.role === 'Master' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{name.charAt(0)}</div><span className="text-sm font-black text-slate-800 uppercase tracking-tighter">{name}</span></div>{isAdmin && !task.completed && <button onClick={async () => await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { assignedTeam: arrayRemove(name) })} className="text-red-400 hover:bg-red-50 p-2 rounded-xl transition-colors"><X size={18}/></button>}</div>); })}</div>
    </div>
  );
}

// ... ALTRE VISTE (DOCUMENTS, SCHEDULE, PHOTOS, MATERIALVIEW) ...

function MaterialsView({ context = 'warehouse', taskId = null }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, s => {
      const all = s.docs.map(d=>({id:d.id, ...d.data()}));
      setItems(context === 'site' ? all.filter(m=>m.taskId === taskId) : all);
    });
  }, [context, taskId]);
  return (
    <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm animate-in fade-in">
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] border-b tracking-widest"><tr><th className="p-6">Articolo</th><th className="p-6">Stock</th><th className="p-6">Fornitore</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(i=>(<tr key={i.id} className="hover:bg-slate-50 transition-colors"><td className="p-6 font-black text-slate-800 tracking-tight uppercase text-xs">{i.name}</td><td className="p-6 text-slate-600 font-bold">{i.quantity}</td><td className="p-6 text-slate-400 uppercase text-[9px] font-black">{i.supplier}</td></tr>))}</tbody></table></div>
    </div>
  );
}

// --- COMPONENTE AREA PERSONALE ---

function PersonalAreaView({ user, userData, isMaster, isAdminFull }) {
  const [sub, setSub] = useState('leaves');
  const [targetUser, setTargetUser] = useState(user.uid); 
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    if(isMaster) { 
      setUsersList(Object.entries(USERS_CONFIG).map(([k, v]) => ({ username: k, ...v }))); 
    }
  }, [isMaster]);

  return (
    <div className="space-y-6">
       <div className="bg-white p-8 rounded-[40px] border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-6">
         <div className="flex items-center gap-5 w-full sm:w-auto">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-xl uppercase">{userData?.name?.charAt(0)}</div>
            <div className="flex-1 overflow-hidden">
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase truncate leading-none">{userData?.name}</h2>
              {isMaster && (
                <select className="mt-3 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border-none rounded-xl p-2 outline-none cursor-pointer w-full" value={targetUser} onChange={(e) => setTargetUser(e.target.value)}>
                   <option value={user.uid}>Mio Profilo Personale</option>
                   {usersList.map(u => (<option key={u.username} value={u.username}>Vedi: {u.name}</option>))}
                </select>
              )}
            </div>
         </div>
         <div className="flex gap-4 w-full sm:w-auto overflow-x-auto scrollbar-hide">
           <button onClick={()=>setSub('leaves')} className={`flex-1 sm:px-6 py-2 text-xs font-black uppercase tracking-widest transition-all ${sub === 'leaves' ? 'bg-blue-600 text-white rounded-2xl shadow-lg' : 'text-slate-400'}`}>Ferie</button>
           {isMaster && <button onClick={()=>setSub('logs')} className={`flex-1 sm:px-6 py-2 text-xs font-black uppercase tracking-widest transition-all ${sub === 'logs' ? 'bg-blue-600 text-white rounded-2xl shadow-lg' : 'text-slate-400'}`}>Log</button>}
         </div>
       </div>
       {sub === 'leaves' && <LeaveRequestsPanel currentUser={user} targetIdentifier={targetUser} isMaster={isMaster} isAdmin={isAdminFull} userData={userData} />}
       {sub === 'logs' && isMaster && <AuditLogView />}
    </div>
  );
}

// --- CONTAINER DETTAGLIO CANTIERE ---

function TaskDetailContainer({ task, userData, isMaster, isAdminFull, onBack }) {
  const [active, setActive] = useState('overview');
  const isClosed = task.completed;
  const tabs = [ 
    { id: 'overview', label: 'Info', icon: Activity }, 
    { id: 'chat', label: 'Chat', icon: MessageSquare }, 
    { id: 'reports', label: 'Rapportini', icon: ClipboardList }, 
    { id: 'team', label: 'Squadra', icon: Users }, 
    { id: 'documents', label: 'File', icon: FileCheck }, 
    { id: 'schedule', label: 'Crono', icon: CalendarRange }, 
    { id: 'accounting', label: 'Costi', icon: Calculator }, 
    { id: 'requests', label: 'Ordini', icon: ShoppingCart }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest hover:text-blue-600 transition-colors"><ArrowLeft size={16}/> Indietro</button>
      <div className="bg-white p-6 rounded-[32px] border shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">{task.title}</h2>
        <div className="flex gap-2 mt-8 border-b overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setActive(t.id)} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${active === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}><t.icon size={14}/>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {active === 'overview' && <SiteOverview task={task} isMaster={isMaster} isAdmin={isAdminFull} userData={userData} />}
        {active === 'chat' && <SiteChat taskId={task.id} userData={userData} isClosed={isClosed} />}
        {active === 'reports' && <SiteReportsList taskId={task.id} isMaster={isMaster} userData={userData} isAdminFull={isAdminFull} />}
        {active === 'team' && <SiteTeam task={task} isAdmin={isAdminFull} />}
        {active === 'documents' && <SiteDocuments taskId={task.id} isAdmin={isAdminFull} userData={userData} isClosed={isClosed} />}
        {active === 'schedule' && <SiteSchedule task={task} isAdmin={isAdminFull} />}
        {active === 'accounting' && isMaster && <SiteAccounting taskId={task.id} />}
        {active === 'requests' && <MaterialRequestsView taskId={task.id} userData={userData} isClosed={isClosed} />}
      </div>
    </div>
  );
}

// --- VISTE GENERALI ---

function DailyReportsView({ userData, tasks, isMaster, isAdminFull }) {
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ taskId: '', hours: '', desc: '', vehicleId: 'Privato', isTrasferta: false, reportDate: new Date().toISOString().split('T')[0], fuelAmount: '', equipmentUsed: '' });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const q = isMaster 
      ? query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), orderBy('createdAt', 'desc'), limit(50))
      : query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), where('userName', '==', userData.name), orderBy('createdAt', 'desc'), limit(50));
      
    return onSnapshot(q, s => setReports(s.docs.map(d=>({id:d.id, ...d.data()}))));
  }, [isMaster, userData?.name]);

  const submit = async (e) => {
    e.preventDefault();
    const currentTask = tasks.find(t=>t.id===form.taskId);
    if(!currentTask || currentTask.completed) { alert("Seleziona un cantiere aperto"); return; }
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), { 
      ...form, taskTitle: currentTask.title, userName: userData.name, vehicleName: form.vehicleId, createdAt: serverTimestamp() 
    });
    await logOperation(userData, "Invio Rapportino", currentTask.title);
    setForm({ taskId: '', hours: '', desc: '', vehicleId: 'Privato', isTrasferta: false, reportDate: new Date().toISOString().split('T')[0], fuelAmount: '', equipmentUsed: '' });
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <form onSubmit={submit} className="bg-white p-10 rounded-[48px] border shadow-xl space-y-5 animate-in slide-in-from-bottom-4">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-4"><PenTool size={28} className="text-blue-600"/> Rapportino</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select value={form.taskId} onChange={e=>setForm({...form, taskId: e.target.value})} className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm shadow-inner" required><option value="">Scegli Cantiere...</option>{tasks.filter(t=>!t.completed).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select>
          <input type="date" value={form.reportDate} onChange={e=>setForm({...form, reportDate: e.target.value})} className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm shadow-inner" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
           <input type="number" step="0.5" placeholder="Ore" value={form.hours} onChange={e=>setForm({...form, hours: e.target.value})} className="bg-slate-50 rounded-2xl p-4 font-bold text-sm border-none shadow-inner" required />
           <select value={form.vehicleId} onChange={e=>setForm({...form, vehicleId: e.target.value})} className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm shadow-inner" required>{STATIC_VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}</select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div className="bg-slate-50 rounded-2xl p-2 px-4 shadow-inner flex items-center gap-3"><Fuel size={18} className="text-slate-400"/><input type="number" placeholder="Carburante €" value={form.fuelAmount} onChange={e=>setForm({...form, fuelAmount: e.target.value})} className="bg-transparent border-none outline-none font-bold text-sm w-full" /></div>
           <div className="bg-slate-50 rounded-2xl p-2 px-4 shadow-inner flex items-center gap-3"><Construction size={18} className="text-slate-400"/><input type="text" placeholder="Attrezzatura" value={form.equipmentUsed} onChange={e=>setForm({...form, equipmentUsed: e.target.value})} className="bg-transparent border-none outline-none font-bold text-sm w-full" /></div>
        </div>
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-3xl border border-blue-100">
           <span className="text-[10px] font-black text-blue-900 uppercase flex items-center gap-2"><MapPin size={16}/> Trasferta?</span>
           <button type="button" onClick={()=>setForm({...form, isTrasferta: !form.isTrasferta})} className={`w-12 h-6 rounded-full transition-colors relative ${form.isTrasferta ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isTrasferta ? 'left-7' : 'left-1'}`}></div></button>
        </div>
        <textarea placeholder="Cosa hai fatto oggi?" value={form.desc} onChange={e=>setForm({...form, desc: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm shadow-inner" rows="3" required />
        <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl">Invia</button>
      </form>
      <div className="space-y-4">
        {reports.map(r => (
          <div key={r.id} onClick={()=>setSelected(r)} className="p-6 bg-white border rounded-[36px] flex justify-between items-center shadow-sm border-slate-100 cursor-pointer hover:bg-slate-50">
            <div className="flex-1 pr-4">
              <p className="font-bold text-slate-800 line-clamp-1 uppercase text-sm">{r.desc}</p>
              <p className="text-[9px] text-slate-400 mt-2 uppercase font-black">{r.userName} • {r.taskTitle} • {r.reportDate} • {r.hours}h {r.isTrasferta ? '• TRASFERTA' : ''}</p>
            </div>
          </div>
        ))}
        {selected && <ReportModal report={selected} onClose={()=>setSelected(null)} isAdmin={isAdminFull} />}
      </div>
    </div>
  );
}

function AuthScreen() {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [isSubmitting, setIsSubmitting] = useState(false);
  const handleAuth = async (e) => {
    e.preventDefault(); setIsSubmitting(true); const email = `${username.trim().toLowerCase()}@impresadaria.app`;
    try { await signInWithEmailAndPassword(auth, email, password); } catch (err) { setError("Credenziali Errate"); } finally { setIsSubmitting(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100"><div className="max-w-md w-full bg-white rounded-[48px] shadow-2xl overflow-hidden border"><div className="bg-blue-800 p-12 text-center text-white"><div className="w-24 h-24 bg-white mx-auto rounded-3xl mb-8 flex items-center justify-center shadow-xl font-black text-blue-800 text-3xl">IA</div><h1 className="text-3xl font-black uppercase tracking-tighter">Impresadaria</h1><p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mt-1">Impresa d'Aria Srl</p></div><form onSubmit={handleAuth} className="p-10 space-y-5">{error && <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl">{error}</div>}<div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Username</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold focus:ring-2 focus:ring-blue-600 transition-all" /></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold focus:ring-2 focus:ring-blue-600 transition-all" /></div><button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase shadow-xl transition-all active:scale-95">{isSubmitting ? "..." : "Entra"}</button></form></div></div>
  );
}

function DashboardContainer({ user, userData }) {
  const [selectedTask, setSelectedTask] = useState(null); const [activeTab, setActiveTab] = useState('tasks'); const [notifications, setNotifications] = useState([]); const [showNotifPanel, setShowNotifPanel] = useState(false); const [allTasks, setAllTasks] = useState([]);
  const safeUserData = userData || { role: 'Dipendente', name: 'Utente', uid: user?.uid };
  const isMaster = safeUserData.role === 'Master'; const isAdminFull = safeUserData.role === 'Master' && safeUserData.access === 'full';

  useEffect(() => {
    onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'), s => setAllTasks(s.docs.map(d=>({id:d.id, ...d.data()}))));
    if (!user) return;
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'));
    return onSnapshot(q, (snap) => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(n => n.targetUserId === 'all' || (n.targetUserId === 'all_masters' && isMaster) || n.targetUserId === user.uid).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))));
  }, [user, isMaster]);

  const clearNotifications = async () => {
    if (!isAdminFull || !window.confirm("Svuotare tutta la cronologia notifiche?")) return;
    try {
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      setShowNotifPanel(false);
    } catch (e) { alert("Errore"); }
  };

  return (
    <div className="pb-24">
      <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-40 h-20 flex items-center justify-between px-6 shadow-sm"><div className="flex items-center gap-4"><div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-xl shadow-blue-200"><LayoutDashboard size={20} /></div><div className="hidden sm:block"><h1 className="font-black text-slate-800 uppercase tracking-tighter text-xl leading-none">Impresadaria</h1><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{safeUserData.role}</span></div></div><div className="flex items-center gap-5"><div className="relative"><button onClick={() => setShowNotifPanel(!showNotifPanel)} className="p-3 bg-slate-50 rounded-2xl relative text-slate-400 border border-slate-200 hover:bg-white hover:text-blue-600 transition-all"><Bell size={20} />{notifications.filter(n=>!n.read).length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}</button>{showNotifPanel && <div className="absolute right-0 top-14 w-80 bg-white rounded-[32px] shadow-2xl border-4 border-slate-50 p-2 z-50 animate-in zoom-in-95"><div className="p-4 border-b flex justify-between items-center font-black text-[11px] uppercase text-slate-400">Notifiche {isAdminFull && <button onClick={clearNotifications} className="text-red-500 hover:underline">Svuota</button>} <button onClick={()=>setShowNotifPanel(false)} className="bg-slate-100 p-1 rounded-lg"><X size={14}/></button></div><div className="max-h-80 overflow-y-auto scrollbar-hide">{notifications.length === 0 ? <p className="text-center py-10 text-xs text-slate-300 font-bold uppercase">Nessun avviso</p> : notifications.map(n => (<div key={n.id} onClick={async () => await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', n.id), { read: true })} className={`p-5 border-b last:border-none cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}><p className="text-xs font-black text-slate-800 uppercase leading-tight">{n.title}</p><p className="text-[10px] text-slate-500 mt-2 font-medium">{n.message}</p></div>)) }</div></div>}</div><button onClick={()=>signOut(auth)} className="p-3 bg-slate-50 rounded-2xl text-slate-300 hover:text-red-500 border border-slate-200 transition-all"><LogOut size={20} /></button></div></header>
      <main className="max-w-7xl mx-auto p-4 sm:p-10">{!selectedTask && <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-[32px] border border-slate-200 shadow-sm mb-10 overflow-x-auto scrollbar-hide">{[ {id:'tasks', label:'Cantieri'}, {id:'reports', label:'Report'}, {id:'materials', label:'Magazzino'}, {id:'personal', label:'Profilo'} ].map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-8 py-3.5 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-white'}`}>{tab.label}</button>))}</div>}{selectedTask ? <TaskDetailContainer task={selectedTask} userData={safeUserData} isMaster={isMaster} isAdminFull={isAdminFull} onBack={() => setSelectedTask(null)} /> : activeTab === 'tasks' ? <TasksView userData={safeUserData} isAdmin={isAdminFull} onSelectTask={setSelectedTask} /> : activeTab === 'reports' ? <DailyReportsView userData={safeUserData} tasks={allTasks} isMaster={isMaster} isAdminFull={isAdminFull} /> : activeTab === 'materials' ? <MaterialsView /> : <PersonalAreaView user={user} userData={safeUserData} isMaster={isMaster} isAdminFull={isAdminFull} />}</main>
    </div>
  );
}

// --- PUNTO DI INGRESSO (ROOT) ---

export default function App() {
  const [user, setUser] = useState(null); const [userData, setUserData] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        const username = currentUser.email.split('@')[0];
        const config = USERS_CONFIG[username] || { role: 'Dipendente', name: username };
        setUserData({ ...config, uid: currentUser.uid, username });
      } else setUserData(null);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  if (loading) return <LoadingScreen />;
  return ( <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200"> {user ? <DashboardContainer user={user} userData={userData} /> : <AuthScreen />} </div> );
}
