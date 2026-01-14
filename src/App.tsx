import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
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
  getDocs, 
  writeBatch,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  Activity, Plus, Trash2, CheckCircle, LogOut, Loader2, User, Lock, 
  LayoutDashboard, ShieldCheck, Package, Wrench, Euro, ClipboardList, 
  Building2, FileText, ArrowLeft, Camera, Image as ImageIcon, Calculator, HardHat, 
  Edit2, Save, X, Calendar, Clock, Briefcase, ShoppingCart, CheckSquare, 
  Users, FileCheck, Download, CalendarRange, Bell, UserCheck, FileUp, 
  Maximize2, Truck, AlertTriangle, PenTool, MessageSquare, MapPin, 
  Send, ShieldAlert, Timer, Eye, LockKeyhole, UnlockKeyhole, FileBarChart, Map,
  Fuel, Construction, Banknote, CalendarDays
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

// --- DATI STATICI ---
const STATIC_VEHICLES = [
  "Privato",
  "Ford Transit Custom",
  "Fiat Doblò",
  "Volvo XC60",
  "Ford Galaxy",
  "Iveco Daily 1",
  "Iveco Daily 2"
];

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
const formatTimestamp = (ts) => {
  if (!ts || !ts.seconds) return '-';
  return new Date(ts.seconds * 1000).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

async function logOperation(userData, action, details) {
  try {
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'audit_logs'), {
      userId: userData?.uid || 'anon', userName: userData?.name || 'Utente', action, details: String(details), createdAt: serverTimestamp()
    });
  } catch (e) {}
}

// --- COMPONENTI UI ---

function ReportModal({ report, onClose, isAdmin }) {
  if (!report) return null;
  const handleDelete = async () => {
    if (!window.confirm("Eliminare definitivamente questo rapporto?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports', report.id));
      onClose();
    } catch (e) { alert("Errore"); }
  };
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-8 space-y-5">
          <div className="flex justify-between items-start">
             <div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Dettaglio Rapportino</h3><p className="text-[10px] font-black text-slate-400 uppercase">{report.reportDate}</p></div>
             <div className="flex gap-2">{isAdmin && <button onClick={handleDelete} className="p-3 text-red-500 bg-red-50 rounded-2xl transition-colors"><Trash2 size={20}/></button>}<button onClick={onClose} className="p-3 text-slate-400 bg-slate-50 rounded-2xl"><X size={20}/></button></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-slate-50 rounded-3xl"><p className="text-[9px] font-black text-slate-400 uppercase">Operatore</p><p className="font-bold text-slate-700 text-sm">{report.userName}</p></div>
             <div className="p-4 bg-slate-50 rounded-3xl"><p className="text-[9px] font-black text-slate-400 uppercase">Durata</p><p className="font-bold text-blue-600 text-xl">{report.hours}h</p></div>
          </div>
          <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase mb-2">Attività</p><p className="text-sm text-slate-600 whitespace-pre-wrap">{report.desc}</p></div>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-slate-50 rounded-3xl border"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Mezzo</p><div className="flex items-center gap-2 text-slate-700 font-bold text-[10px] truncate"><Truck size={14}/> {report.vehicleName}</div></div>
             <div className="p-4 bg-slate-50 rounded-3xl border"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Carburante</p><div className="flex items-center gap-2 text-green-600 font-bold text-[10px]"><Fuel size={14}/> {report.fuelAmount ? `€ ${report.fuelAmount}` : 'No'}</div></div>
          </div>
          {report.equipmentUsed && <div className="p-4 bg-blue-50/50 rounded-3xl border border-blue-100"><p className="text-[9px] font-black text-blue-400 uppercase mb-1">Attrezzatura</p><div className="flex items-center gap-2 text-blue-700 font-bold text-[10px] uppercase"><Construction size={14}/> {report.equipmentUsed}</div></div>}
        </div>
      </div>
    </div>
  );
}

// --- SEZIONI CANTIERE ---

function SiteReportsList({ taskId, isMaster, userData, isAdmin }) {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({id: d.id, ...d.data()}))
        .filter(r => r.taskId === taskId)
        .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReports(isMaster ? all : all.filter(r => r.userName === userData.name));
    });
  }, [taskId, isMaster, userData?.name]);

  return (
    <div className="space-y-4 animate-in fade-in">
      {reports.length === 0 && <p className="text-center py-20 text-slate-300 font-black uppercase text-[10px]">Nessun rapporto trovato</p>}
      {reports.map(r => (
        <div key={r.id} onClick={()=>setSelected(r)} className="p-6 bg-white border rounded-[36px] flex justify-between items-center shadow-sm cursor-pointer hover:border-blue-300 transition-all border-slate-100 group">
          <div className="flex-1 min-w-0 pr-4">
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{r.reportDate}</span>
                {r.isTrasferta && <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[8px] font-black">TRASFERTA</span>}
             </div>
             <h4 className="font-bold text-slate-800 text-sm truncate uppercase mt-1 group-hover:text-blue-600 transition-colors">{r.userName}</h4>
             <p className="text-xs text-slate-500 line-clamp-1 mt-1">{r.desc}</p>
          </div>
          <div className="text-right ml-4"><p className="text-2xl font-black text-slate-800 leading-none">{r.hours}<span className="text-xs">h</span></p></div>
        </div>
      ))}
      {selected && <ReportModal report={selected} onClose={()=>setSelected(null)} isAdmin={isAdmin} />}
    </div>
  );
}

function SiteAccounting({ taskId, isMaster, isAdmin }) {
  const [totals, setTotals] = useState({ materials: 0, labor: 0, extra: 0 });
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '' });

  useEffect(() => {
    const unsubM = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials')), s => {
      const matDocs = s.docs.map(d=>d.data()).filter(m => m.taskId === taskId);
      setTotals(prev => ({...prev, materials: matDocs.reduce((sum, d) => sum + (parseFloat(d.quantity || 0) * parseFloat(d.cost || 0)), 0)}));
    });
    const unsubL = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports')), s => {
      const reports = s.docs.map(d=>d.data()).filter(r => r.taskId === taskId);
      setTotals(prev => ({ ...prev, labor: reports.reduce((sum, d) => sum + (parseFloat(d.hours || 0)), 0) * STANDARD_HOURLY_RATE }));
    });
    const unsubE = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'expenses')), s => {
      const exp = s.docs.map(d=>({id: d.id, ...d.data()})).filter(e => e.taskId === taskId);
      setExpenses(exp);
      setTotals(prev => ({...prev, extra: exp.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)}));
    });
    return () => { unsubM(); unsubL(); unsubE(); };
  }, [taskId]);

  const addExpense = async (e) => {
    e.preventDefault();
    if(!newExpense.desc || !newExpense.amount) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'expenses'), { taskId, description: newExpense.desc, amount: newExpense.amount, createdAt: serverTimestamp() });
    setNewExpense({ desc: '', amount: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border shadow-sm text-center"><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Materiali</p><p className="text-xl font-bold text-slate-800">€ {totals.materials.toFixed(0)}</p></div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm text-center"><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Manodopera</p><p className="text-xl font-bold text-slate-800">€ {totals.labor.toFixed(0)}</p></div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm text-center"><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Extra</p><p className="text-xl font-bold text-orange-600">€ {totals.extra.toFixed(0)}</p></div>
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-center text-white"><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Totale Costi</p><p className="text-2xl font-bold">€ {(totals.materials + totals.labor + totals.extra).toFixed(0)}</p></div>
      </div>
      
      <div className="bg-white p-6 rounded-[32px] border shadow-sm">
        <h3 className="font-black text-slate-800 uppercase tracking-tighter mb-4">Uscite Cassa / Extra</h3>
        {isMaster && (
          <form onSubmit={addExpense} className="flex gap-2 mb-4">
            <input placeholder="Descrizione (Noleggi, Permessi...)" className="flex-1 bg-slate-50 rounded-xl p-3 text-sm outline-none" value={newExpense.desc} onChange={e=>setNewExpense({...newExpense, desc: e.target.value})}/>
            <input type="number" placeholder="€" className="w-24 bg-slate-50 rounded-xl p-3 text-sm outline-none" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense, amount: e.target.value})}/>
            <button className="bg-blue-600 text-white px-4 rounded-xl font-bold text-xs"><Plus size={16}/></button>
          </form>
        )}
        <div className="divide-y">
          {expenses.map(e => (
            <div key={e.id} className="flex justify-between items-center py-3">
              <span className="text-sm font-bold text-slate-700">{e.description}</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900">€ {e.amount}</span>
                {isAdmin && <button onClick={async()=>await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'expenses', e.id))} className="text-red-400"><Trash2 size={14}/></button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- VISTE TAB ---

function MaterialsView({ context = 'warehouse', taskId = null }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', quantity: '', cost: '', supplier: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, s => {
      const all = s.docs.map(d=>({id:d.id, ...d.data()}));
      setItems(context === 'site' ? all.filter(m=>m.taskId === taskId) : all.filter(m=>!m.taskId));
    });
  }, [context, taskId]);

  const add = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'), {
      ...form, taskId: context === 'site' ? taskId : null, createdAt: serverTimestamp()
    });
    setForm({ name: '', quantity: '', cost: '', supplier: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{context === 'site' ? 'Materiali Cantiere' : 'Magazzino Centrale'}</h2>
        <button onClick={()=>setShowForm(!showForm)} className="bg-blue-600 text-white px-6 py-2 rounded-2xl font-black text-xs uppercase shadow-lg">
          {showForm ? 'Annulla' : 'Aggiungi'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="bg-white p-6 rounded-[32px] border shadow-lg space-y-4 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Articolo" className="bg-slate-50 border-none rounded-xl p-3 text-sm font-bold outline-none" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} required />
            <input placeholder="Fornitore" className="bg-slate-50 border-none rounded-xl p-3 text-sm font-bold outline-none" value={form.supplier} onChange={e=>setForm({...form, supplier: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="number" placeholder="Quantità" className="bg-slate-50 border-none rounded-xl p-3 text-sm font-bold outline-none" value={form.quantity} onChange={e=>setForm({...form, quantity: e.target.value})} required />
            <input type="number" placeholder="Costo Unitario €" className="bg-slate-50 border-none rounded-xl p-3 text-sm font-bold outline-none" value={form.cost} onChange={e=>setForm({...form, cost: e.target.value})} required />
          </div>
          <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase">Conferma Inserimento</button>
        </form>
      )}

      <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm">
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] border-b tracking-widest"><tr><th className="p-6">Nome</th><th className="p-6">Stock</th><th className="p-6">Costo</th><th className="p-6">Fornitore</th></tr></thead><tbody className="divide-y">{items.map(i=>(<tr key={i.id} className="hover:bg-slate-50 transition-colors"><td className="p-6 font-black text-slate-800 uppercase text-xs">{i.name}</td><td className="p-6 text-slate-600 font-bold">{i.quantity}</td><td className="p-6 text-slate-600 font-bold">€ {i.cost}</td><td className="p-6 text-slate-400 uppercase text-[9px] font-black">{i.supplier}</td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
}

function LeaveRequestsPanel({ currentUser, targetIdentifier, isAdmin, userData }) {
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({ start: '', end: '', type: 'Ferie' });

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'leaves'));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({id: d.id, ...d.data()}))
        .filter(l => (targetIdentifier === currentUser.uid ? l.userId === currentUser.uid : l.username === targetIdentifier))
        .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setLeaves(all);
    });
  }, [targetIdentifier, currentUser]);

  const submit = async (e) => {
    e.preventDefault(); if (!form.start || !form.end) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'leaves'), { ...form, userId: currentUser.uid, username: currentUser.email?.split('@')[0], fullName: userData?.name || 'Utente', status: 'pending', createdAt: serverTimestamp() });
    setForm({ start: '', end: '', type: 'Ferie' });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
      {targetIdentifier === currentUser.uid && (
        <div className="bg-white p-8 rounded-[40px] border shadow-sm h-fit space-y-4">
          <h3 className="font-black text-slate-700 uppercase text-[10px] tracking-widest">Richiesta Ferie</h3>
          <form onSubmit={submit} className="space-y-4">
            <select className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-sm outline-none" value={form.type} onChange={e=>setForm({...form, type: e.target.value})}><option>Ferie</option><option>Permesso</option><option>Malattia</option></select>
            <input type="date" className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-sm outline-none" value={form.start} onChange={e=>setForm({...form, start: e.target.value})}/>
            <input type="date" className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-sm outline-none" value={form.end} onChange={e=>setForm({...form, end: e.target.value})}/>
            <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">Invia</button>
          </form>
        </div>
      )}
      <div className={`col-span-1 ${targetIdentifier === currentUser.uid ? 'md:col-span-2' : 'md:col-span-3'} space-y-3`}>
        {leaves.map(req => {
            const colors = req.status === 'approved' ? 'bg-green-100 text-green-700' : (req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700');
            return (
              <div key={req.id} className="bg-white p-6 rounded-[32px] border shadow-sm flex justify-between items-center border-slate-100">
                <div><div className="flex items-center gap-3"><span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest ${colors}`}>{req.status.toUpperCase()}</span><h4 className="font-bold text-slate-800 uppercase tracking-tighter">{req.type}</h4></div><p className="text-sm text-slate-500 mt-2 font-bold">{req.start} — {req.end}</p></div>
                {isAdmin && targetIdentifier !== currentUser.uid && req.status === 'pending' && (
                  <div className="flex gap-2"><button onClick={async() => await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaves', req.id), {status:'approved'})} className="bg-green-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase">Sì</button><button onClick={async() => await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leaves', req.id), {status:'rejected'})} className="bg-red-50 text-red-600 px-5 py-2 rounded-xl text-xs font-black uppercase border">No</button></div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// --- CONTAINER PRINCIPALI ---

function TaskDetailContainer({ task, userData, isMaster, isAdmin, onBack }) {
  const [active, setActive] = useState('overview');
  const isClosed = task.completed;
  const tabs = [ 
    { id: 'overview', label: 'Info', icon: Activity }, 
    { id: 'chat', label: 'Chat', icon: MessageSquare }, 
    { id: 'reports', label: 'Rapportini', icon: ClipboardList }, 
    { id: 'team', label: 'Squadra', icon: Users }, 
    { id: 'documents', label: 'File', icon: FileCheck }, 
    { id: 'schedule', label: 'Cronoprogramma', icon: CalendarRange }, 
    { id: 'accounting', label: 'Costi', icon: Calculator }, 
    { id: 'requests', label: 'Ordini', icon: ShoppingCart }, 
    { id: 'photos', label: 'Foto', icon: Camera },
    { id: 'materials', label: 'Materiali', icon: Package }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest hover:text-blue-600 transition-colors"><ArrowLeft size={16}/> Indietro</button>
      <div className="bg-white p-6 rounded-[32px] border shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{task.title}</h2>
        <div className="flex gap-2 mt-8 border-b overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setActive(t.id)} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${active === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}><t.icon size={14}/>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {active === 'overview' && <SiteOverview task={task} isMaster={isMaster} isAdmin={isAdmin} userData={userData} />}
        {active === 'chat' && <SiteChat taskId={task.id} userData={userData} isClosed={isClosed} />}
        {active === 'reports' && <SiteReportsList taskId={task.id} isMaster={isMaster} userData={userData} isAdminFull={isAdmin} />}
        {active === 'team' && <SiteTeam task={task} isAdmin={isAdmin} isMaster={isMaster} />}
        {active === 'documents' && <SiteDocuments taskId={task.id} isAdminFull={isAdmin} userData={userData} isClosed={isClosed} />}
        {active === 'schedule' && <SiteSchedule task={task} isAdminFull={isAdmin} />}
        {active === 'accounting' && isMaster && <SiteAccounting taskId={task.id} isMaster={isMaster} isAdmin={isAdmin} />}
        {active === 'requests' && <MaterialRequestsView taskId={task.id} userData={userData} isClosed={isClosed} />}
        {active === 'photos' && <SitePhotos taskId={task.id} userData={userData} isAdminFull={isAdmin} isClosed={isClosed} />}
        {active === 'materials' && <MaterialsView context="site" taskId={task.id} />}
      </div>
    </div>
  );
}

function TasksView({ userData, isMaster, isAdmin, onSelectTask }) {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', client: '', address: '', startDate: '', manager: '', budget: '', isTrasfertaSite: false });

  useEffect(() => {
    return onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'), (snap) => {
      setTasks(snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if(!isMaster) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'), { ...form, completed: false, createdAt: serverTimestamp(), authorName: userData.name });
    setShowForm(false); setForm({title:'', client:'', address:'', startDate:'', manager:'', budget:'', isTrasfertaSite:false});
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Bacheca Cantieri</h2>
         {isMaster && !showForm && <button onClick={()=>setShowForm(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-xl font-black text-xs uppercase tracking-widest transition-transform hover:scale-105"><Plus size={18}/> Nuovo Cantiere</button>}
      </div>
      {showForm && (
        <form onSubmit={add} className="bg-white p-10 rounded-[40px] border shadow-2xl space-y-5 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Titolo Cantiere" className="bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold text-lg" onChange={e=>setForm({...form, title: e.target.value})} required />
            <input placeholder="Committente" className="bg-slate-50 border-none rounded-2xl p-5 outline-none font-bold text-lg" onChange={e=>setForm({...form, client: e.target.value})} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <input placeholder="Indirizzo" className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm outline-none shadow-sm" onChange={e=>setForm({...form, address: e.target.value})} />
             <input type="date" className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm outline-none shadow-sm" onChange={e=>setForm({...form, startDate: e.target.value})} required />
             <select className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm outline-none shadow-sm" onChange={e=>setForm({...form, manager: e.target.value})} required>
                <option value="">-- Responsabile --</option>
                {Object.values(USERS_CONFIG).filter(u => u.role === 'Master').map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
             </select>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
             <input type="checkbox" className="w-5 h-5 accent-blue-600" onChange={e=>setForm({...form, isTrasfertaSite: e.target.checked})} />
             <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Questo cantiere è in Trasferta?</label>
          </div>
          <div className="flex gap-4 pt-4"><button type="submit" className="bg-blue-600 text-white px-12 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl">Salva Cantiere</button><button type="button" onClick={()=>setShowForm(false)} className="text-slate-400 font-bold uppercase text-xs px-6">Annulla</button></div>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map(t => (
          <div key={t.id} onClick={()=>onSelectTask(t)} className="bg-white p-7 border rounded-[48px] hover:ring-4 hover:ring-blue-600/10 cursor-pointer transition-all shadow-sm h-48 flex flex-col justify-between relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full translate-x-1/2 -translate-y-1/2 ${t.completed ? 'bg-slate-900' : 'bg-blue-600'}`}></div>
            <div><h4 className="font-black text-2xl text-slate-800 truncate tracking-tighter uppercase leading-none">{t.title}</h4><p className="text-[10px] text-slate-400 uppercase font-black mt-2 tracking-widest">{t.client}</p></div>
            <div className="flex flex-wrap gap-2"><span className={`text-[10px] px-4 py-1.5 rounded-2xl font-black border ${t.completed ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{t.completed ? 'CHIUSO' : 'ATTIVO'}</span>{t.isTrasfertaSite && <span className="text-[10px] px-4 py-1.5 rounded-2xl font-black bg-orange-50 text-orange-600 border border-orange-100 uppercase">Trasferta</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyReportsView({ userData, tasks, isMaster, isAdminFull }) {
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ taskId: '', hours: '', desc: '', vehicleId: 'Privato', isTrasferta: false, reportDate: new Date().toISOString().split('T')[0], fuelAmount: '', equipmentUsed: '' });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'));
    return onSnapshot(q, s => {
      const all = s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReports(isMaster ? all.slice(0, 50) : all.filter(r => r.userName === userData.name).slice(0, 50));
    });
  }, [isMaster, userData?.name]);

  const submit = async (e) => {
    e.preventDefault();
    const currentTask = tasks.find(t=>t.id===form.taskId);
    if(!currentTask || currentTask.completed) { alert("Cantiere non disponibile"); return; }
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'daily_reports'), { 
      ...form, taskTitle: currentTask.title, userName: userData.name, vehicleName: form.vehicleId, createdAt: serverTimestamp() 
    });
    setForm({ taskId: '', hours: '', desc: '', vehicleId: 'Privato', isTrasferta: false, reportDate: new Date().toISOString().split('T')[0], fuelAmount: '', equipmentUsed: '' });
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <form onSubmit={submit} className="bg-white p-10 rounded-[48px] border shadow-xl space-y-6">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-4"><PenTool size={28} className="text-blue-600"/> Rapportino</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select value={form.taskId} onChange={e=>setForm({...form, taskId: e.target.value})} className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm shadow-inner" required><option value="">Scegli Cantiere...</option>{tasks.filter(t=>!t.completed).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select>
          <input type="date" value={form.reportDate} onChange={e=>setForm({...form, reportDate: e.target.value})} className="bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm shadow-inner" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
           <input type="number" step="0.5" placeholder="Ore" value={form.hours} onChange={e=>setForm({...form, hours: e.target.value})} className="flex-1 bg-slate-50 rounded-3xl p-5 font-bold text-sm border-none shadow-inner" required />
           <select value={form.vehicleId} onChange={e=>setForm({...form, vehicleId: e.target.value})} className="flex-1 bg-slate-50 border-none rounded-3xl p-5 outline-none font-bold text-sm shadow-inner" required>{STATIC_VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}</select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div className="bg-slate-50 rounded-2xl p-2 px-4 shadow-inner flex items-center gap-3"><Fuel size={18} className="text-slate-400"/><input type="number" placeholder="Carburante €" value={form.fuelAmount} onChange={e=>setForm({...form, fuelAmount: e.target.value})} className="bg-transparent border-none outline-none font-bold text-sm w-full" /></div>
           <div className="bg-slate-50 rounded-2xl p-2 px-4 shadow-inner flex items-center gap-3"><Construction size={18} className="text-slate-400"/><input type="text" placeholder="Attrezzatura" value={form.equipmentUsed} onChange={e=>setForm({...form, equipmentUsed: e.target.value})} className="bg-transparent border-none outline-none font-bold text-sm w-full" /></div>
        </div>
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-3xl border border-blue-100">
           <span className="text-[10px] font-black text-blue-900 uppercase flex items-center gap-2"><MapPin size={16}/> Trasferta?</span>
           <button type="button" onClick={()=>setForm({...form, isTrasferta: !form.isTrasferta})} className={`w-12 h-6 rounded-full transition-colors relative ${form.isTrasferta ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isTrasferta ? 'left-7' : 'left-1'}`}></div></button>
        </div>
        <textarea placeholder="Descrizione lavori..." value={form.desc} onChange={e=>setForm({...form, desc: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm shadow-inner outline-none" rows="4" required />
        <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[28px] font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95">Invia Report</button>
      </form>
      <div className="space-y-4">
        {reports.map(r => (
          <div key={r.id} onClick={()=>setSelected(r)} className="p-6 bg-white border rounded-[36px] flex justify-between items-center shadow-sm border-slate-100 cursor-pointer hover:bg-slate-50">
            <div className="flex-1 pr-4"><p className="font-bold text-slate-800 line-clamp-1 uppercase text-sm">{r.desc}</p><p className="text-[9px] text-slate-400 mt-2 uppercase font-black">{r.userName} • {r.taskTitle} • {r.reportDate} • {r.hours}h {r.isTrasferta ? '• TRASFERTA' : ''}</p></div>
          </div>
        ))}
        {selected && <ReportModal report={selected} onClose={()=>setSelected(null)} canDelete={isAdminFull} />}
      </div>
    </div>
  );
}

function PersonalAreaView({ user, userData, isMaster, isAdminFull }) {
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
         <div className="flex items-center gap-5 w-full sm:w-auto"><div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-xl uppercase">{userData?.name?.charAt(0)}</div><div className="flex-1 overflow-hidden"><h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase truncate leading-none">{userData?.name}</h2>{isMaster && <select className="mt-3 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border-none rounded-xl p-2 outline-none cursor-pointer w-full shadow-inner" value={targetUser} onChange={(e) => setTargetUser(e.target.value)}><option value={user.uid}>Mio Profilo</option>{usersList.map(u => (<option key={u.username} value={u.username}>Vedi: {u.name}</option>))}</select>}</div></div>
         <div className="flex gap-4 w-full sm:w-auto overflow-x-auto scrollbar-hide"><button onClick={()=>setSub('leaves')} className={`flex-1 sm:px-6 py-2 text-xs font-black uppercase tracking-widest transition-all ${sub === 'leaves' ? 'bg-blue-600 text-white rounded-2xl shadow-lg' : 'text-slate-400'}`}>Ferie</button>{isMaster && <button onClick={()=>setSub('logs')} className={`flex-1 sm:px-6 py-2 text-xs font-black uppercase tracking-widest transition-all ${sub === 'logs' ? 'bg-blue-600 text-white rounded-2xl shadow-lg' : 'text-slate-400'}`}>Log</button>}</div>
       </div>
       {sub === 'leaves' && <LeaveRequestsPanel currentUser={user} targetIdentifier={targetUser} isAdmin={isAdminFull} userData={userData} />}
       {sub === 'logs' && isMaster && (
          <div className="bg-white border rounded-[32px] overflow-hidden shadow-sm overflow-x-auto animate-in fade-in"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest border-b"><tr><th className="p-5">Membro</th><th className="p-5">Azione</th><th className="p-5">Data</th></tr></thead><tbody className="divide-y">{logs.map(l=>(<tr key={l.id} className="hover:bg-slate-50 transition-colors"><td className="p-5 font-bold uppercase text-[10px]">{l.userName}</td><td className="p-5 text-[10px]">{l.action}</td><td className="p-5 text-[9px] text-slate-400">{formatTimestamp(l.createdAt)}</td></tr>))}</tbody></table></div>
       )}
    </div>
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
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(all.filter(n => n.targetUserId === 'all' || (n.targetUserId === 'all_masters' && isMaster) || n.targetUserId === user.uid).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });
  }, [user, isMaster]);
  const clearNotifications = async () => {
    if (!isAdminFull || !window.confirm("Svuotare tutto?")) return;
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    setShowNotifPanel(false);
  };
  return (
    <div className="pb-24">
      <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-40 h-20 flex items-center justify-between px-6 shadow-sm"><div className="flex items-center gap-4"><div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-xl shadow-blue-200"><LayoutDashboard size={20} /></div><div className="hidden sm:block"><h1 className="font-black text-slate-800 uppercase tracking-tighter text-xl leading-none">Impresadaria</h1><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{safeUserData.role}</span></div></div><div className="flex items-center gap-5"><div className="relative"><button onClick={() => setShowNotifPanel(!showNotifPanel)} className="p-3 bg-slate-50 rounded-2xl relative text-slate-400 border border-slate-200 hover:bg-white hover:text-blue-600 transition-all"><Bell size={20} />{notifications.filter(n=>!n.read).length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}</button>{showNotifPanel && <div className="absolute right-0 top-14 w-80 bg-white rounded-[32px] shadow-2xl border-4 border-slate-50 p-2 z-50 animate-in zoom-in-95"><div className="p-4 border-b flex justify-between items-center font-black text-[11px] uppercase text-slate-400">Notifiche {isAdminFull && <button onClick={clearNotifications} className="text-red-500 hover:underline">Svuota</button>} <button onClick={()=>setShowNotifPanel(false)}><X size={14}/></button></div><div className="max-h-80 overflow-y-auto scrollbar-hide">{notifications.length === 0 ? <p className="text-center py-10 text-xs text-slate-300 font-bold uppercase tracking-widest">Nessun avviso</p> : notifications.map(n => (<div key={n.id} onClick={async () => await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', n.id), { read: true })} className={`p-5 border-b last:border-none cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}><p className="text-xs font-black text-slate-800 uppercase leading-tight">{n.title}</p><p className="text-[10px] text-slate-500 mt-2 font-medium leading-relaxed">{n.message}</p></div>)) }</div></div>}</div><button onClick={()=>signOut(auth)} className="p-3 bg-slate-50 rounded-2xl text-slate-300 hover:text-red-500 border border-slate-200 transition-all"><LogOut size={20} /></button></div></header>
      <main className="max-w-7xl mx-auto p-4 sm:p-10">{!selectedTask && <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-[32px] border border-slate-200 shadow-sm mb-10 overflow-x-auto scrollbar-hide">{[ {id:'tasks', label:'Cantieri'}, {id:'reports', label:'Report'}, {id:'materials', label:'Magazzino'}, {id:'personal', label:'Profilo'} ].map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-8 py-3.5 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-white'}`}>{tab.label}</button>))}</div>}{selectedTask ? <TaskDetailContainer task={selectedTask} userData={safeUserData} isMaster={isMaster} isAdminFull={isAdminFull} onBack={() => setSelectedTask(null)} /> : activeTab === 'tasks' ? <TasksView userData={safeUserData} isMaster={isMaster} isAdmin={isAdminFull} onSelectTask={setSelectedTask} /> : activeTab === 'reports' ? <DailyReportsView userData={safeUserData} tasks={allTasks} isMaster={isMaster} isAdminFull={isAdminFull} /> : activeTab === 'materials' ? <MaterialsView /> : <PersonalAreaView user={user} userData={safeUserData} isMaster={isMaster} isAdminFull={isAdminFull} />}</main>
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100"><div className="max-w-md w-full bg-white rounded-[48px] shadow-2xl overflow-hidden border"><div className="bg-blue-800 p-12 text-center text-white"><div className="w-24 h-24 bg-white mx-auto rounded-3xl mb-8 flex items-center justify-center shadow-xl font-black text-blue-800 text-3xl">IA</div><h1 className="text-3xl font-black uppercase tracking-tighter">Impresadaria</h1><p className="text-blue-200 text-[10px] font-black uppercase mt-1">Impresa d'Aria Srl</p></div><form onSubmit={handleAuth} className="p-10 space-y-5">{error && <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl">{error}</div>}<div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">User</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold" /></div><div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Pass</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full bg-slate-50 border-none rounded-2xl p-4 outline-none font-bold" /></div><button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase shadow-xl transition-all active:scale-95">{isSubmitting ? "..." : "Entra"}</button></form></div></div>
  );
}

export default function App() {
  const [user, setUser] = useState(null); const [userData, setUserData] = useState(null); const [loading, setLoading] = useState(true);
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
  return ( <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200"> {user ? <DashboardContainer user={user} userData={userData} /> : <AuthScreen />} </div> );
}
