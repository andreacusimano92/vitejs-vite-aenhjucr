import React, { useState, useEffect } from 'react';
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
  FileText
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

// --- DASHBOARD ---
function Dashboard({ user, userData }) {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'materials'
  const handleLogout = () => signOut(auth);
  const isMaster = userData?.role === 'Master';

  return (
    <div>
      {/* Header */}
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
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'tasks' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Attività
            </button>
            <button 
              onClick={() => setActiveTab('materials')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'materials' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Materiali
            </button>
          </div>

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
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'tasks' ? (
          <TasksView user={user} userData={userData} isMaster={isMaster} />
        ) : (
          <MaterialsView user={user} userData={userData} isMaster={isMaster} />
        )}
      </main>
    </div>
  );
}

// --- VISTA ATTIVITÀ ---
function TasksView({ user, userData, isMaster }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Stati per il form
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
        title,
        client,
        description,
        completed: false,
        createdAt: serverTimestamp(),
        userId: user.uid,
        authorName: userData?.name,
        authorRole: userData?.role
      });
      // Reset form
      setTitle('');
      setClient('');
      setDescription('');
      setIsFormOpen(false);
    } catch (err) {
      alert("Errore salvataggio: " + err.message);
    }
  };

  const toggleTask = async (task) => {
    try {
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', task.id), { completed: !task.completed });
    } catch (err) { console.error(err); }
  };

  const deleteTask = async (taskId) => {
    if (!isMaster) { alert("Solo i Master possono eliminare."); return; }
    if (!window.confirm("Eliminare definitivamente?")) return;
    try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', taskId)); } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      {/* Bottone Nuovo Task Mobile/Desktop */}
      {!isFormOpen && (
        <button 
          onClick={() => setIsFormOpen(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          Registra Nuova Attività
        </button>
      )}

      {/* Form Attività */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              Dettagli Attività
            </h3>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">Annulla</button>
          </div>
          
          <form onSubmit={handleAddTask} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Attività / Cantiere</label>
                <div className="relative">
                  <Wrench className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Es. Rifacimento impianto elettrico" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Committente</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input required type="text" value={client} onChange={e => setClient(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Es. Mario Rossi o Condominio Via Roma" />
                </div>
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Descrizione Tecnica</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <textarea rows="3" value={description} onChange={e => setDescription(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Dettagli operativi, note specifiche..." />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-medium shadow-md transition-colors">Salva Attività</button>
            </div>
          </form>
        </div>
      )}

      {/* Lista Attività */}
      <div className="grid gap-4">
        {loading ? <div className="text-center py-10"><Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" /></div> : tasks.length === 0 ? 
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300"><ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" /><h3 className="text-slate-900 font-medium">Nessuna attività registrata</h3></div> : 
          tasks.map((task) => (
            <div key={task.id} className={`group relative bg-white rounded-xl border p-5 transition-all ${task.completed ? 'border-slate-100 bg-slate-50 opacity-75' : 'border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md'}`}>
              <div className="flex items-start gap-4">
                <button onClick={() => toggleTask(task)} className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent hover:border-green-500'}`}><CheckCircle className="w-3.5 h-3.5" strokeWidth={3} /></button>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`text-lg font-bold ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mt-1 font-medium">
                        <User className="w-3.5 h-3.5" />
                        Committente: {task.client}
                      </div>
                    </div>
                    {isMaster && (
                      <button onClick={() => deleteTask(task.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                  
                  {task.description && (
                    <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600">
                      {task.description}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-400 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Reg: {task.authorName}</span>
                    <span>•</span>
                    <span>{task.createdAt ? new Date(task.createdAt.seconds * 1000).toLocaleDateString('it-IT') : ''}</span>
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
function MaterialsView({ user, userData, isMaster }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    supplier: '',
    type: 'Elettrico', // Default
    quantity: '',
    unit: 'pz',
    cost: '',
    code: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMaterials(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'materials'), {
        ...formData,
        createdAt: serverTimestamp(),
        userId: user.uid,
        authorName: userData?.name
      });
      setFormData({
        name: '', supplier: '', type: 'Elettrico', quantity: '', unit: 'pz', cost: '', code: ''
      });
      setIsFormOpen(false);
    } catch (err) {
      alert("Errore: " + err.message);
    }
  };

  const deleteMaterial = async (id) => {
    if (!isMaster) { alert("Solo i Master possono eliminare."); return; }
    if (!window.confirm("Eliminare materiale?")) return;
    try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'materials', id)); } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      {!isFormOpen && (
        <button 
          onClick={() => setIsFormOpen(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          Carica Nuovo Materiale
        </button>
      )}

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Scheda Materiale
            </h3>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">Annulla</button>
          </div>

          <form onSubmit={handleAddMaterial} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Descrizione Articolo</label>
                <input required name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Es. Cavo FG16 3x2.5" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Codice Prodotto</label>
                <input name="code" value={formData.code} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Opzionale" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Fornitore</label>
                <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input required name="supplier" value={formData.supplier} onChange={handleChange} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Es. ElettroForniture" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Tipologia</label>
                <select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option>Elettrico</option>
                  <option>Idraulico</option>
                  <option>Edile</option>
                  <option>Ferramenta</option>
                  <option>Altro</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Quantità</label>
                <div className="flex">
                  <input required type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-r-0 border-slate-200 rounded-l-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" />
                  <select name="unit" value={formData.unit} onChange={handleChange} className="bg-slate-100 border border-slate-200 rounded-r-lg px-2 text-sm text-slate-600 outline-none">
                    <option value="pz">pz</option>
                    <option value="m">m</option>
                    <option value="kg">kg</option>
                    <option value="cf">cf</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Costo Unitario (€)</label>
                <div className="relative">
                  <Euro className="w-3 h-3 text-slate-400 absolute left-3 top-3.5" />
                  <input type="number" step="0.01" name="cost" value={formData.cost} onChange={handleChange} className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-medium shadow-md transition-colors">Carica Materiale</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabella Materiali */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs font-bold">
              <tr>
                <th className="px-4 py-3">Articolo</th>
                <th className="px-4 py-3">Fornitore</th>
                <th className="px-4 py-3">Tipologia</th>
                <th className="px-4 py-3 text-center">Q.tà</th>
                <th className="px-4 py-3 text-right">Costo</th>
                <th className="px-4 py-3 text-right">Totale</th>
                {isMaster && <th className="px-4 py-3 text-right">Azioni</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></td></tr>
              ) : materials.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">Nessun materiale in magazzino</td></tr>
              ) : (
                materials.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {item.name}
                      {item.code && <span className="block text-xs text-slate-400 font-mono">{item.code}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.supplier}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-full bg-slate-100 text-xs text-slate-600 border border-slate-200">{item.type}</span></td>
                    <td className="px-4 py-3 text-center font-medium">{item.quantity} <span className="text-slate-400 text-xs">{item.unit}</span></td>
                    <td className="px-4 py-3 text-right text-slate-600">€ {parseFloat(item.cost || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">€ {(parseFloat(item.quantity || 0) * parseFloat(item.cost || 0)).toFixed(2)}</td>
                    {isMaster && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteMaterial(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- LOGIN SCREEN (Resta invariato) ---
function AuthScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            {/* Logo Placeholder - Sostituibile con immagine reale se disponibile */}
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <Building2 className="w-10 h-10 text-blue-800" />
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
