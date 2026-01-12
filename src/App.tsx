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
  Activity, Plus, Trash2, CheckCircle, LogOut, Loader2, User, Lock, 
  LayoutDashboard, ShieldCheck, Package, Wrench, Euro, ClipboardList, 
  Building2, FileText, ArrowLeft, Camera, Image, Calculator, HardHat, 
  Edit2, Save, X, Calendar, Clock, Briefcase, ShoppingCart, CheckSquare, 
  Users, FileCheck, Download, CalendarRange, Bell, UserCheck, FileUp, 
  Maximize2, Truck, AlertTriangle, PenTool, MessageSquare, MapPin, 
  Send, ShieldAlert, Timer, Eye, LockKeyhole, UnlockKeyhole, FileBarChart, Map 
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

// --- HELPERS ---
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
      userId: userData?.uid || 'anon', userName: userData?.name || 'Utente', action, details: String(details), location, createdAt: serverTimestamp()
    });
  } catch (e) {}
}

// --- COMPONENTI UI ATOMICI ---
const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-400">
    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
    <p className="text-xs font-black uppercase tracking-widest">Caricamento...</p>
  </div>
);

// --- COMPONENTI AREA PERSONALE ---
function LeaveRequestsPanel({ currentUser, targetIdentifier, isAdmin, userData }) {
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({ start: '', end: '', type: 'Ferie' });

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'leaves'));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setLeaves(all.filter(l => (targetIdentifier === currentUser.uid ? l.userId === currentUser.uid : l.username === targetIdentifier)).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
  }, [targetIdentifier, currentUser]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.start || !form.end) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'leaves'), {
      ...form, userId: currentUser.uid, username: currentUser.email?.split('@')[0], fullName: userData?.name || 'Utente', status: 'pending', createdAt: serverTimestamp()
    });
    setForm({ start: '', end: '', type: 'Ferie' });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
      {targetIdentifier === currentUser.uid && (
        <div className="bg-white p-6 rounded-[32px] border shadow-sm h-fit space-y-4">
          <h3 className="font-black text-slate-700 uppercase text-[10px] tracking-widest">Richiesta Assenza</h3>
          <form onSubmit={submit} className="space-y-3">
            <select className="w-full bg-slate-50 rounded-xl p-3 text-sm font-bold border-none outline-none" value={form.type} onChange={e=>setForm({...form, type: e.target.value})}><option>Ferie</option><option>Permesso</option><option>Malattia</option></select>
            <input type="date" className="w-full bg-slate-50 rounded-xl p-3 text-sm font-bold border-none" value={form.start} onChange={e=>setForm({...form, start: e.target.value})} required/>
            <input type="date" className="w-full bg-slate-50 rounded-xl p-3 text-sm font-bold border-none" value={form.end} onChange={e=>setForm({...form, end: e.target.value})} required/>
            <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Invia</button>
          </form>
        </div>
      )}
      <div className={`col-span-1 ${targetIdentifier === currentUser.uid ? 'md:col-span-2' : 'md:col-span-3'} space-y-3`}>
        {leaves.map(req => (
          <div key={req.id} className="bg-white p-5 rounded-[28px] border shadow-sm flex justify-between items-center">
            <div>
              <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span>
              <h4 className="font-bold text-slate-800 mt-1 uppercase text-sm">{req.type}</h4>
              <p className="text-xs text-slate-500 font-medium">{new Date(req.start).toLocaleDateString()} - {new Date(req.end).toLocaleDateString()}</p>
            </div>
            {isAdmin && targetIdentifier !== currentUser.uid && req.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaves', req.id), {status:'approved'})} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md">Sì</button>
                <button onClick={() => updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaves', req.id), {status:'rejected'})} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-red-100">No</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- SEZIONI CANTIERE ---
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

  const toggle = async () => {
    const status = !task.completed;
    if (status && !window.confirm("Chiudere il cantiere definitivamente?")) return;
    if (!status && !isAdmin) return;
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { completed: status });
    await logOperation(userData, status ? "Chiusura" : "Riapertura", task.title);
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-[32px] border flex justify-between items-center gap-4 ${task.completed ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${task.completed ? 'bg-slate-800 text-green-400' : 'bg-blue-50 text-blue-600'}`}>{task.completed ? <LockKeyhole/> : <Activity/>}</div>
          <div><h4 className="font-black uppercase text-xs tracking-widest">Stato</h4><p className="text-sm font-bold">{task.completed ? 'CHIUSO' : 'ATTIVO'}</p></div>
        </div>
        {isMaster && (
          <button onClick={toggle} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg ${task.completed ? 'bg-blue-600' : 'bg-red-600'} text-white`}>
            {task.completed ? 'Riapri' : 'Chiudi Cantiere'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border text-center shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Ore Lavoro</p><p className="text-xl font-black">{stats.hrs} H</p></div>
        <div className="bg-white p-5 rounded-3xl border text-center shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Materiali</p><p className="text-xl font-black">€ {stats.mat.toFixed(0)}</p></div>
        <div className="bg-white p-5 rounded-3xl border text-center shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Trasferte</p><p className="text-xl font-black text-orange-500">{stats.travel}</p></div>
        <div className="bg-slate-50 p-5 rounded-3xl border text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Target</p><p className="text-xs font-bold truncate uppercase">{next ? next.name : 'Fine'}</p></div>
      </div>
    </div>
  );
}

// --- VISTE TAB ---
function TasksView({ userData, isAdmin, onSelectTask }) {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', client: '', isTrasfertaSite: false });

  useEffect(() => {
    return onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'), (snap) => {
      setTasks(snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
  }, []);

  const add = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'), { ...form, completed: false, createdAt: serverTimestamp(), authorName: userData.name });
    setShowForm(false); setForm({title:'', client:'', isTrasfertaSite:false});
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Bacheca Cantieri</h2>
         {isAdmin && !showForm && <button onClick={()=>setShowForm(true)} className="bg-blue-600 text-white px-5 py-2 rounded-2xl flex gap-2 items-center shadow-lg font-black text-xs uppercase tracking-widest"><Plus size={16}/> Nuovo</button>}
      </div>
      {showForm && (
        <form onSubmit={add} className="bg-white p-8 rounded-[40px] border shadow-xl space-y-4">
          <input placeholder="Nome Cantiere" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-600" onChange={e=>setForm({...form, title: e.target.value})} required />
          <input placeholder="Committente" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-600" onChange={e=>setForm({...form, client: e.target.value})} required />
          <div className="flex items-center gap-3 p-2 ml-2"><input type="checkbox" className="w-5 h-5 accent-blue-600" onChange={e=>setForm({...form, isTrasfertaSite: e.target.checked})} /><label className="text-[10px] font-black uppercase text-slate-400">Sito in Trasferta?</label></div>
          <div className="flex gap-4"><button type="submit" className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Crea</button><button type="button" onClick={()=>setShowForm(false)} className="text-slate-400 font-bold px-4">Annulla</button></div>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map(t => (
          <div key={t.id} onClick={()=>onSelectTask(t)} className="bg-white p-6 border rounded-[40px] hover:ring-2 hover:ring-blue-500 cursor-pointer shadow-sm relative overflow-hidden group h-48 flex flex-col justify-between">
            <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 rounded-full translate-x-1/2 -translate-y-1/2 ${t.completed ? 'bg-slate-900' : 'bg-blue-600'}`}></div>
            <div><h4 className="font-black text-lg text-slate-800 truncate uppercase leading-tight">{t.title}</h4><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">{t.client}</p></div>
            <div className="flex gap-2">
              <span className={`text-[9px] px-3 py-1 rounded-lg font-black border ${t.completed ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{t.completed ? 'CHIUSO' : 'ATTIVO'}</span>
              {t.isTrasfertaSite && <span className="text-[9px] px-3 py-1 rounded-lg font-black bg-orange-50 text-orange-600 border border-orange-100">TRASFERTA</span>}
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
    if(!currentTask || currentTask.completed) return;
    const sign = canvasRef.current?.toDataURL();
    const vehicle = vehicles.find(v=>v.id === form.vehicleId);
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), { 
      ...form, taskTitle: currentTask.title, userName: userData.name, vehicleName: vehicle ? `${vehicle.name} (${vehicle.plate})` : 'Privato', sign, createdAt: serverTimestamp() 
    });
    setForm({ taskId: '', hours: '', desc: '', vehicleId: '', isTrasferta: false });
    if(canvasRef.current) canvasRef.current.getContext('2d').clearRect(0,0,300,100);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <form onSubmit={submit} className="bg-white p-8 rounded-[40px] border shadow-xl space-y-5">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-4"><PenTool size={24} className="text-blue-600"/> Rapportino</h3>
        <select value={form.taskId} onChange={e=>setForm({...form, taskId: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm" required><option value="">Cantiere...</option>{tasks.filter(t=>!t.completed).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select>
        <div className="flex gap-4">
           <input type="number" step="0.5" placeholder="Ore" value={form.hours} onChange={e=>setForm({...form, hours: e.target.value})} className="flex-1 bg-slate-50 rounded-2xl p-4 font-bold text-sm border-none shadow-inner" required />
           <select value={form.vehicleId} onChange={e=>setForm({...form, vehicleId: e.target.value})} className="flex-1 bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm shadow-inner" required><option value="">Mezzo...</option><option value="none">Nessuno</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>)}</select>
        </div>
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
           <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2"><MapPin size={16}/> Trasferta?</span>
           <button type="button" onClick={()=>setForm({...form, isTrasferta: !form.isTrasferta})} className={`w-12 h-6 rounded-full transition-colors relative ${form.isTrasferta ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isTrasferta ? 'left-7' : 'left-1'}`}></div></button>
        </div>
        <textarea placeholder="Lavori svolti..." value={form.desc} onChange={e=>setForm({...form, desc: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm shadow-inner" rows="4" required />
        <div className="border border-dashed rounded-[32px] p-6 bg-slate-50 text-center"><canvas ref={canvasRef} width={300} height={100} className="w-full h-32 bg-white rounded-3xl border shadow-inner touch-none cursor-crosshair" onMouseDown={(e) => { const ctx = e.target.getContext('2d'); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); }} onMouseMove={(e) => { if(e.buttons !== 1) return; const ctx = e.target.getContext('2d'); ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); ctx.stroke(); }} /></div>
        <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl">Invia</button>
      </form>
      <div className="space-y-4">
        {reports.map(r => (
          <div key={r.id} className="p-5 bg-white border rounded-[32px] shadow-sm flex justify-between items-center transition-all border-slate-100">
            <div className="flex-1 pr-4"><p className="font-bold text-slate-800 line-clamp-1 uppercase text-sm">{r.desc}</p><p className="text-[9px] text-slate-400 mt-1 uppercase font-black">{r.userName} • {r.taskTitle} • {r.hours} H • {r.vehicleName} {r.isTrasferta ? '• TRASFERTA' : ''}</p></div>
            {r.sign && <img src={r.sign} className="h-12 opacity-30 grayscale rounded-xl" alt="Sign"/>}
          </div>
        ))}
      </div>
    </div>
  );
}

function VehiclesView({ isAdmin }) {
  const [vehicles, setVehicles] = useState([]);
  const allStaff = Object.values(USERS_CONFIG);
  useEffect(() => { return onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles'), s => setVehicles(s.docs.map(d=>({id:d.id, ...d.data()})))); }, []);
  const getStatus = (date) => {
    if(!date) return { label: '-', class: 'text-slate-300' };
    const diff = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24);
    if(diff < 0) return { label: 'SCADUTO', class: 'text-red-600 font-black' };
    if(diff < 30) return { label: `${Math.ceil(diff)} gg`, class: 'text-orange-500 font-bold' };
    return { label: new Date(date).toLocaleDateString(), class: 'text-slate-600 font-medium' };
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
      {vehicles.map(v => {
        const ins = getStatus(v.insuranceDate); const bol = getStatus(v.taxDate); const rev = getStatus(v.inspectionDate);
        return (
          <div key={v.id} className="bg-white p-7 border rounded-[40px] shadow-sm relative group border-slate-100">
            <div className="flex justify-between items-start mb-6"><div><h4 className="font-black text-xl text-slate-800 leading-tight uppercase tracking-tighter">{v.name}</h4><p className="text-[10px] bg-slate-100 px-3 py-1 rounded-xl font-black text-slate-500 uppercase mt-2 w-fit tracking-widest">{v.plate}</p></div><Truck className="text-blue-200" size={32}/></div>
            <div className="space-y-2 mt-6 border-t pt-6 border-slate-50">
               <div className="flex justify-between text-xs font-bold uppercase"><span className="text-slate-400">Assic:</span><span className={ins.class}>{ins.label}</span></div>
               <div className="flex justify-between text-xs font-bold uppercase"><span className="text-slate-400">Bollo:</span><span className={bol.class}>{bol.label}</span></div>
               <div className="flex justify-between text-xs font-bold uppercase"><span className="text-slate-400">Revis:</span><span className={rev.class}>{rev.label}</span></div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-50">
               {isAdmin ? (
                 <select className="bg-slate-50 border-none rounded-xl p-3 text-xs font-black text-blue-600 outline-none uppercase w-full shadow-inner" value={v.assignedTo} onChange={async (e)=>await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles', v.id), {assignedTo: e.target.value})}>
                   <option>Libero</option>{allStaff.map(u=><option key={u.name} value={u.name}>{u.name}</option>)}
                 </select>
               ) : <p className="text-sm font-black text-blue-600 uppercase tracking-tight">{v.assignedTo}</p>}
            </div>
            {isAdmin && <button onClick={async()=>await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'vehicles', v.id))} className="absolute top-4 right-4 text-slate-200 hover:text-red-400"><Trash2 size={16}/></button>}
          </div>
        )
      })}
      {vehicles.length === 0 && <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest">Nessun veicolo censito</div>}
    </div>
  );
}

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

function PersonalAreaView({ user, userData, isMaster, isAdmin }) {
  const [sub, setSub] = useState('leaves');
  const [targetUser, setTargetUser] = useState(user.uid); 
  const [usersList, setUsersList] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if(isMaster) { 
      setUsersList(Object.entries(USERS_CONFIG).map(([k, v]) => ({ username: k, ...v }))); 
      onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'audit_logs'), orderBy('createdAt', 'desc'), limit(30)), s => setLogs(s.docs.map(d=>({id:d.id, ...d.data()}))));
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
       {sub === 'leaves' && <LeaveRequestsPanel currentUser={user} targetIdentifier={targetUser} isMaster={isMaster} isAdmin={isAdmin} userData={userData} />}
       {sub === 'logs' && isMaster && (
          <div className="bg-white border rounded-[32px] overflow-hidden shadow-sm overflow-x-auto animate-in fade-in"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest border-b"><tr><th className="p-5">Membro</th><th className="p-5">Azione</th><th className="p-5">GPS</th></tr></thead><tbody className="divide-y">{logs.map(l=>(<tr key={l.id} className="hover:bg-slate-50 transition-colors"><td className="p-5 font-bold uppercase text-[10px]">{l.userName}</td><td className="p-5">{l.action}</td><td className="p-5 font-mono text-blue-500 uppercase text-[9px]">{l.location}</td></tr>))}</tbody></table></div>
       )}
    </div>
  );
}

// --- LAYOUT ---
function TaskDetailContainer({ task, userData, isMaster, isAdmin, onBack }) {
  const [active, setActive] = useState('overview');
  const isClosed = task.completed;
  const tabs = [ 
    { id: 'overview', label: 'Info', icon: Activity }, 
    { id: 'chat', label: 'Chat', icon: MessageSquare }, 
    { id: 'team', label: 'Squadra', icon: Users }, 
    { id: 'documents', label: 'Documenti', icon: FileCheck }, 
    { id: 'schedule', label: 'Crono', icon: CalendarRange }, 
    { id: 'materials', label: 'Logistica', icon: Package }, 
    { id: 'requests', label: 'Ordini', icon: ShoppingCart }, 
    { id: 'photos', label: 'Foto', icon: Camera },
    ...(isMaster ? [{ id: 'accounting', label: 'Costi', icon: Calculator }] : [])
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest hover:text-blue-600 transition-colors"><ArrowLeft size={16}/> Torna Indietro</button>
      <div className="bg-white p-6 rounded-[32px] border shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">{task.title}</h2>
        <div className="flex gap-2 mt-8 border-b overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setActive(t.id)} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${active === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}><t.icon size={14}/>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {active === 'overview' && <SiteOverview task={task} isMaster={isMaster} isAdmin={isAdmin} userData={userData} />}
        {active === 'chat' && <SiteChat taskId={task.id} userData={userData} isClosed={isClosed} />}
        {active === 'team' && <SiteTeam task={task} isAdmin={isAdmin} />}
        {active === 'documents' && <SiteDocuments taskId={task.id} isAdmin={isAdmin} userData={userData} isClosed={isClosed} />}
        {active === 'schedule' && <SiteSchedule task={task} isAdmin={isAdmin} />}
        {active === 'materials' && <MaterialsView context="site" taskId={task.id} />}
        {active === 'requests' && <MaterialRequestsView taskId={task.id} userData={userData} isClosed={isClosed} />}
        {active === 'photos' && <SitePhotos taskId={task.id} userData={userData} isAdmin={isAdmin} isClosed={isClosed} />}
        {active === 'accounting' && isMaster && <SiteAccounting taskId={task.id} />}
      </div>
    </div>
  );
}

function AuthScreen() {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [isSubmitting, setIsSubmitting] = useState(false);
  const handleAuth = async (e) => {
    e.preventDefault(); setIsSubmitting(true); const email = `${username.trim().toLowerCase()}@impresadaria.app`;
    try { await signInWithEmailAndPassword(auth, email, password); } catch (err) { setError("Credenziali non valide"); } finally { setIsSubmitting(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100"><div className="max-w-md w-full bg-white rounded-[48px] shadow-2xl overflow-hidden border"><div className="bg-blue-800 p-12 text-center text-white"><div className="w-24 h-24 bg-white mx-auto rounded-3xl mb-8 flex items-center justify-center shadow-xl font-black text-blue-800 text-3xl">IA</div><h1 className="text-3xl font-black uppercase tracking-tighter">Impresadaria</h1><p className="text-blue-200 text-[10px] font-black uppercase mt-1">Impresa d'Aria Srl</p></div><form onSubmit={handleAuth} className="p-10 space-y-5">{error && <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl">{error}</div>}<div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Username</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold" /></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold" /></div><button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase shadow-xl">{isSubmitting ? "..." : "Entra"}</button></form></div></div>
  );
}

function DashboardContainer({ user, userData }) {
  const [selectedTask, setSelectedTask] = useState(null); 
  const [activeTab, setActiveTab] = useState('tasks'); 
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [allTasks, setAllTasks] = useState([]);

  const safeUserData = userData || { role: 'Dipendente', name: 'Utente', uid: user?.uid };
  const isMaster = safeUserData.role === 'Master';
  const isAdmin = safeUserData.role === 'Master' && safeUserData.access === 'full'; 

  useEffect(() => {
    onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'), s => setAllTasks(s.docs.map(d=>({id:d.id, ...d.data()}))));
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
              <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="p-3 bg-slate-50 rounded-2xl relative text-slate-400 border border-slate-200 transition-all hover:bg-white hover:text-blue-600 shadow-inner"><Bell size={20} />{notifications.filter(n=>!n.read).length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}</button>
              {showNotifPanel && (
                <div className="absolute right-0 top-14 w-80 bg-white rounded-[32px] shadow-2xl border-4 border-slate-50 p-2 z-50 animate-in zoom-in-95">
                  <div className="p-4 border-b flex justify-between items-center font-black text-[11px] uppercase tracking-widest text-slate-400">Avvisi <button onClick={()=>setShowNotifPanel(false)}><X size={14}/></button></div>
                  <div className="max-h-80 overflow-y-auto scrollbar-hide">
                    {notifications.length === 0 ? <p className="text-center py-10 text-xs text-slate-300 font-bold uppercase tracking-widest tracking-widest">Nessun avviso</p> : 
                      notifications.map(n => (
                        <div key={n.id} onClick={async () => await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', n.id), { read: true })} className={`p-5 border-b last:border-none cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}><p className="text-xs font-black text-slate-800 uppercase tracking-tight">{n.title}</p><p className="text-[10px] text-slate-500 mt-2">{n.message}</p></div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            <button onClick={()=>signOut(auth)} className="p-3 bg-slate-50 rounded-2xl text-slate-300 hover:text-red-500 border border-slate-200 transition-all"><LogOut size={20} /></button>
          </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-10">
        {!selectedTask && (
          <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-[32px] border border-slate-200 shadow-sm mb-10 overflow-x-auto scrollbar-hide">
            {[ {id:'tasks', label:'Cantieri'}, {id:'vehicles', label:'Mezzi'}, {id:'reports', label:'Report'}, {id:'materials', label:'Magazzino'}, {id:'personal', label:'Profilo'} ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-8 py-3.5 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-white'}`}>{tab.label}</button>
            ))}
          </div>
        )}
        {selectedTask ? (
          <TaskDetailContainer task={selectedTask} userData={safeUserData} isMaster={isMaster} isAdmin={isAdmin} onBack={() => setSelectedTask(null)} />
        ) : activeTab === 'tasks' ? (
          <TasksView userData={safeUserData} isAdmin={isAdmin} onSelectTask={setSelectedTask} />
        ) : activeTab === 'vehicles' ? (
           <VehiclesView isAdmin={isAdmin} />
        ) : activeTab === 'reports' ? (
           <DailyReportsView userData={safeUserData} tasks={allTasks} />
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
