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
  X
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

// --- CONFIGURAZIONE UTENTI ---
const USERS_CONFIG = {
  'a.cusimano': { role: 'Master', name: 'Andrea Cusimano' },
  'f.gentile': { role: 'Master', name: 'Francesco Gentile' },
  'm.gentile': { role: 'Dipendente', name: 'Cosimo Gentile' },
  'g.gentile': { role: 'Dipendente', name: 'Giuseppe Gentile' },
  'f.devincentis': { role: 'Dipendente', name: 'Francesco De Vincentis' },
  'a.ingrosso': { role: 'Dipendente', name: 'Antonio Ingrosso' },
  'g.granio': { role: 'Dipendente', name: 'Giuseppe Granio' },
  'c.motolese': { role: 'Dipendente', name: 'Cosimo Motolese' },
  'o.camassa': { role: 'Dipendente', name: 'Osvaldo Camassa' }
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
        setUserData(config);
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
  const [selectedTask, setSelectedTask] = useState(null); // Se popolato, mostra i dettagli del cantiere
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'materials' (magazzino generale)
  const handleLogout = () => signOut(auth);
  const isMaster = userData?.role === 'Master';

  return (
    <div>
      {/* Header Comune */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><LayoutDashboard className="w-5 h-5" /></div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight hidden sm:block">ImpresadariAPP</h1>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isMaster ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{userData?.role}</span>
            </div>
          </div>
          
          {/* Navigazione Tab */}
          {!selectedTask && (
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'tasks' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Cantieri
              </button>
              <button 
                onClick={() => setActiveTab('materials')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'materials' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Magazzino
              </button>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-800">{userData?.name}</p>
              <p className="text-[10px] text-green-600 flex items-center justify-end gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Online</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-red-600 transition-colors"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      {/* Contenuto Principale */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {selectedTask ? (
          <TaskDetailView 
            task={selectedTask} 
            user={user} 
            userData={userData} 
            isMaster={isMaster}
            onBack={() => setSelectedTask(null)} 
          />
        ) : activeTab === 'tasks' ? (
          <TasksView 
            user={user} 
            userData={userData} 
            isMaster={isMaster} 
            onSelectTask={setSelectedTask} 
          />
        ) : (
          <MaterialsView 
            user={user} 
            userData={userData} 
            isMaster={isMaster} 
            context="warehouse" // Modalità magazzino generale
          />
        )}
      </main>
    </div>
  );
}

// --- VISTA DETTAGLIO CANTIERE (AGGIORNATA PER EDITING MASTER) ---
function TaskDetailView({ task, user, userData, isMaster, onBack }) {
  const [activeSection, setActiveSection] = useState('overview'); // overview, materials, photos, accounting
  
  // Stati per la modalità modifica (Master)
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: task.title, client: task.client, description: task.description || '' });

  const handleUpdateTask = async () => {
    try {
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), {
        title: editData.title,
        client: editData.client,
        description: editData.description
      });
      setIsEditing(false);
      // Aggiorniamo l'oggetto task locale per riflettere le modifiche senza ricaricare
      task.title = editData.title;
      task.client = editData.client;
      task.description = editData.description;
    } catch (err) {
      alert("Errore aggiornamento: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Testata Cantiere */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla lista cantieri
        </button>
        
        {/* Modalità Visualizzazione vs Modifica */}
        {!isEditing ? (
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <HardHat className="w-6 h-6 text-orange-500" />
                {task.title}
              </h2>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600">
                <span className="flex items-center gap-1"><User className="w-4 h-4" /> {task.client}</span>
                <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Resp: {task.authorName}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${task.completed ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                  {task.completed ? 'COMPLETATO' : 'IN CORSO'}
                </span>
              </div>
              {task.description && (
                <p className="mt-3 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm max-w-2xl">
                  {task.description}
                </p>
              )}
            </div>
            {isMaster && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Modifica Dati
              </button>
            )}
          </div>
        ) : (
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2"><Edit2 className="w-4 h-4" /> Modifica Cantiere</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome Cantiere</label>
                <input 
                  value={editData.title} 
                  onChange={e => setEditData({...editData, title: e.target.value})} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Committente</label>
                <input 
                  value={editData.client} 
                  onChange={e => setEditData({...editData, client: e.target.value})} 
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none" 
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase">Descrizione</label>
              <textarea 
                value={editData.description} 
                onChange={e => setEditData({...editData, description: e.target.value})} 
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none" 
                rows="2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Annulla</button>
              <button onClick={handleUpdateTask} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                <Save className="w-4 h-4" /> Salva Modifiche
              </button>
            </div>
          </div>
        )}

        {/* Menu Navigazione Cantiere */}
        <div className="flex gap-1 mt-8 border-b border-slate-100 overflow-x-auto">
          {[
            { id: 'overview', label: 'Panoramica', icon: Activity },
            { id: 'materials', label: 'Materiali', icon: Package },
            { id: 'photos', label: 'Foto', icon: Camera },
            { id: 'accounting', label: 'Contabilità', icon: Calculator },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeSection === tab.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenuto Sezioni */}
      <div className="min-h-[400px]">
        {activeSection === 'overview' && (
          <SiteOverview taskId={task.id} />
        )}
        {activeSection === 'materials' && (
          <MaterialsView 
            user={user} 
            userData={userData} 
            isMaster={isMaster} 
            context="site" 
            taskId={task.id} 
          />
        )}
        {activeSection === 'photos' && (
          <SitePhotos taskId={task.id} user={user} userData={userData} isMaster={isMaster} />
        )}
        {activeSection === 'accounting' && (
          <SiteAccounting taskId={task.id} user={user} isMaster={isMaster} />
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTI CANTIERE ---

// 1. Panoramica
function SiteOverview({ taskId }) {
  // Qui potremmo mettere statistiche rapide, per ora è un placeholder per futura espansione
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-blue-800">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Stato Lavori
        </h3>
        <p className="text-sm mt-2 opacity-80">Sezione pronta per visualizzare lo stato di avanzamento e le scadenze prossime.</p>
      </div>
      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 text-indigo-800">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <User className="w-5 h-5" />
          Squadra
        </h3>
        <p className="text-sm mt-2 opacity-80">Qui verranno visualizzati i dipendenti assegnati a questo cantiere.</p>
      </div>
    </div>
  );
}

// 2. Foto Cantiere (MODIFICATA: Upload per tutti, delete solo Master/Autore)
function SitePhotos({ taskId, user, userData, isMaster }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'photos'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allPhotos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtriamo lato client per semplicità
      setPhotos(allPhotos.filter(p => p.taskId === taskId).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });
    return () => unsubscribe();
  }, [taskId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2000000) { // Limit 2MB
      alert("Il file è troppo grande. Usa immagini sotto 2MB.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'photos'), {
          taskId,
          imageData: reader.result, // Base64 string
          createdAt: serverTimestamp(),
          userId: user.uid,
          uploaderName: userData?.name || 'Utente',
          fileName: file.name
        });
      } catch (err) {
        console.error("Upload error", err);
        alert("Errore caricamento foto.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const deletePhoto = async (photo) => {
    // Permetti cancellazione se è Master OPPURE se è l'utente che l'ha caricata
    const isOwner = photo.userId === user.uid;
    if(!isMaster && !isOwner) {
      alert("Puoi eliminare solo le foto caricate da te.");
      return;
    }
    
    if(!window.confirm("Sicuro di voler eliminare questa foto?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'photos', photo.id));
    } catch(err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800">Documentazione Fotografica</h3>
        <div className="relative">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            Aggiungi Foto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {photos.map(photo => (
          <div key={photo.id} className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <img src={photo.imageData} alt="Cantiere" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button 
                onClick={() => window.open(photo.imageData, '_blank')}
                className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              {(isMaster || photo.userId === user.uid) && (
                <button 
                  onClick={() => deletePhoto(photo)}
                  className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white">
               <p className="text-[10px] font-bold">{photo.uploaderName}</p>
               <p className="text-[9px] opacity-80">{photo.createdAt ? new Date(photo.createdAt.seconds * 1000).toLocaleDateString() : ''}</p>
            </div>
          </div>
        ))}
        {photos.length === 0 && (
          <div className="col-span-2 md:col-span-4 py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Nessuna foto caricata per questo cantiere.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 3. Contabilità Cantiere
function SiteAccounting({ taskId, user, isMaster }) {
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '', type: 'Manodopera' });

  // Fetch Materials Total
  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'));
    const unsub = onSnapshot(q, (snap) => {
      const taskMaterials = snap.docs
        .map(d => d.data())
        .filter(m => m.taskId === taskId);
      const total = taskMaterials.reduce((sum, item) => sum + (parseFloat(item.cost || 0) * parseFloat(item.quantity || 0)), 0);
      setMaterialsTotal(total);
    });
    return () => unsub();
  }, [taskId]);

  // Fetch Extra Expenses
  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'expenses'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setExpenses(all.filter(e => e.taskId === taskId));
    });
    return () => unsub();
  }, [taskId]);

  const addExpense = async (e) => {
    e.preventDefault();
    if(!newExpense.desc || !newExpense.amount) return;
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'expenses'), {
        taskId,
        description: newExpense.desc,
        amount: parseFloat(newExpense.amount),
        type: newExpense.type,
        createdAt: serverTimestamp()
      });
      setNewExpense({ desc: '', amount: '', type: 'Manodopera' });
    } catch(err) { console.error(err); }
  };

  const deleteExpense = async (id) => {
    if(!isMaster) return;
    try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'expenses', id)); } catch(err) {}
  };

  const expensesTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const grandTotal = materialsTotal + expensesTotal;

  return (
    <div className="space-y-6">
      {/* Cards Totali */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase mb-1">Costo Materiali</div>
          <div className="text-2xl font-bold text-slate-800">€ {materialsTotal.toFixed(2)}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase mb-1">Spese Extra / Manodopera</div>
          <div className="text-2xl font-bold text-orange-600">€ {expensesTotal.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm text-white">
          <div className="text-slate-400 text-xs font-bold uppercase mb-1">Totale Cantiere</div>
          <div className="text-3xl font-bold">€ {grandTotal.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lista Spese Extra */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Spese Extra & Manodopera</h3>
          </div>
          
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <form onSubmit={addExpense} className="flex flex-col sm:flex-row gap-2">
              <select 
                value={newExpense.type} 
                onChange={e => setNewExpense({...newExpense, type: e.target.value})}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none"
              >
                <option>Manodopera</option>
                <option>Permessi</option>
                <option>Noleggio</option>
                <option>Altro</option>
              </select>
              <input 
                type="text" 
                placeholder="Descrizione" 
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none"
                value={newExpense.desc}
                onChange={e => setNewExpense({...newExpense, desc: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="€ Costo" 
                className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none"
                value={newExpense.amount}
                onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
              />
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Aggiungi</button>
            </form>
          </div>

          <div className="divide-y divide-slate-100">
            {expenses.map(exp => (
              <div key={exp.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                <div>
                  <div className="font-medium text-slate-800">{exp.description}</div>
                  <div className="text-xs text-slate-500">{exp.type} • {exp.createdAt ? new Date(exp.createdAt.seconds * 1000).toLocaleDateString() : ''}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700">€ {exp.amount.toFixed(2)}</span>
                  {isMaster && (
                    <button onClick={() => deleteExpense(exp.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            ))}
            {expenses.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">Nessuna spesa extra registrata.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- VISTA LISTA ATTIVITÀ (MODIFICATA PER CLICK) ---
function TasksView({ user, userData, isMaster, onSelectTask }) {
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
    if (!title.trim() || !client.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'), {
        title, client, description, completed: false, createdAt: serverTimestamp(), userId: user.uid, authorName: userData?.name
      });
      setTitle(''); setClient(''); setDescription(''); setIsFormOpen(false);
    } catch (err) { alert(err.message); }
  };

  const toggleTask = async (task, e) => {
    e.stopPropagation();
    try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { completed: !task.completed }); } catch (err) {}
  };

  const deleteTask = async (taskId, e) => {
    e.stopPropagation();
    if (!isMaster) { alert("Solo i Master possono eliminare."); return; }
    if (!window.confirm("Eliminare definitivamente?")) return;
    try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', taskId)); } catch (err) {}
  };

  return (
    <div className="space-y-6">
      {!isFormOpen && (
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
            <div 
              key={task.id} 
              onClick={() => onSelectTask(task)} // CLICK PER APRIRE DETTAGLIO
              className={`group cursor-pointer relative bg-white rounded-xl border p-5 transition-all hover:ring-2 hover:ring-blue-500 hover:border-transparent hover:shadow-lg ${task.completed ? 'border-slate-100 bg-slate-50 opacity-75' : 'border-slate-200'}`}
            >
              <div className="flex items-start gap-4">
                <button onClick={(e) => toggleTask(task, e)} className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent hover:border-green-500'}`}><CheckCircle className="w-3.5 h-3.5" strokeWidth={3} /></button>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`text-lg font-bold ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mt-1 font-medium"><User className="w-3.5 h-3.5" /> Committente: {task.client}</div>
                    </div>
                    {isMaster && <button onClick={(e) => deleteTask(task.id, e)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
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

// --- VISTA MATERIALI ---
function MaterialsView({ user, userData, isMaster, context = 'warehouse', taskId = null }) {
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
      const filtered = context === 'site' 
        ? data.filter(item => item.taskId === taskId)
        : data;
      
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
        taskId: context === 'site' ? taskId : null, // Associa al cantiere se siamo nel contesto sito
        createdAt: serverTimestamp(),
        userId: user.uid,
        authorName: userData?.name
      });
      setFormData({ name: '', supplier: '', type: 'Elettrico', quantity: '', unit: 'pz', cost: '', code: '' });
      setIsFormOpen(false);
    } catch (err) { alert(err.message); }
  };

  const deleteMaterial = async (id) => {
    if (!isMaster) { alert("Solo i Master possono eliminare."); return; }
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Package className="w-5 h-5 text-blue-600" /> Scheda Materiale</h3>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">Annulla</button>
          </div>
          <form onSubmit={handleAddMaterial} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Descrizione Articolo</label>
                <input required name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg" placeholder="Es. Cavo FG16 3x2.5" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Codice</label>
                <input name="code" value={formData.code} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg" placeholder="Opzionale" />
              </div>
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
                {isMaster && <th className="px-4 py-3 text-right">Azioni</th>}
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
                    {isMaster && <td className="px-4 py-3 text-right"><button onClick={() => deleteMaterial(item.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>}
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

// --- LOGIN SCREEN (CON LOGO) ---
function AuthScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgError, setImgError] = useState(false); // Stato per gestire errore caricamento logo

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const cleanUsername = username.trim().toLowerCase();
    const email = `${cleanUsername}@impresadaria.app`;

    if (password.length < 6) {
      setError("Password troppo corta (min. 6 caratteri).");
      setIsSubmitting(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (loginError) {
      if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (regError) {
          setError("Errore creazione: " + regError.message);
        }
      } else if (loginError.code === 'auth/wrong-password') {
        setError("Password errata.");
      } else {
        setError("Errore: " + loginError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* HEADER BRANDIZZATO IMPRESA D'ARIA SRL */}
        <div className="bg-blue-800 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-700 to-indigo-900 opacity-95"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            
            {/* LOGO BOX */}
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-2xl transform hover:scale-105 transition-transform duration-300 overflow-hidden p-2">
              {!imgError ? (
                <img 
                  src="logo.jpg" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  onError={() => setImgError(true)} 
                />
              ) : (
                <Building2 className="w-12 h-12 text-blue-800" />
              )}
            </div>
            
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">ImpresadariAPP</h1>
            <div className="h-1 w-20 bg-blue-400 rounded-full mb-3"></div>
            <p className="text-blue-100 text-sm font-medium tracking-wide">
              L'app ufficiale di<br/>
              <span className="font-bold text-white text-base">Impresa d'Aria Srl</span>
            </p>
          </div>
        </div>

        <div className="p-8">
          {error && <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm font-medium">{error}</div>}
          
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username</label>
              <div className="relative group">
                <User className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="text" 
                  required 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400" 
                  placeholder="es. a.cusimano" 
                  autoCapitalize="none" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700" 
                  placeholder="••••••" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mt-6"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Accedi'}
            </button>
          </form>
          
          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-xs text-slate-400">© 2024 Impresa d'Aria Srl. Tutti i diritti riservati.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
