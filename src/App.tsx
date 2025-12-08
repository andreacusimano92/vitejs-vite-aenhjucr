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
  ShieldCheck
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

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'impresadaria-v1';

// --- CONFIGURAZIONE UTENTI (RUOLI) ---
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p>Caricamento sistema...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {user ? <Dashboard user={user} userData={userData} /> : <AuthScreen />}
    </div>
  );
}

// --- SCHERMATA DI AUTENTICAZIONE ---
function AuthScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    const cleanUsername = username.trim().toLowerCase();
    const email = `${cleanUsername}@impresadaria.app`;

    // Check lunghezza password lato client
    if (password.length < 6) {
      setError("La password deve essere di almeno 6 caratteri (es. per Giuseppe: usa 'pino12')");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. TENTATIVO DI LOGIN
      await signInWithEmailAndPassword(auth, email, password);
      // Se passa, onAuthStateChanged gestirà il redirect
    } catch (loginError) {
      console.log("Errore login:", loginError.code);

      // 2. GESTIONE CASO "UTENTE NON TROVATO" -> REGISTRAZIONE
      if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
        try {
          // Proviamo a REGISTRARE l'utente (primo accesso)
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (regError) {
          console.error("Errore registrazione:", regError);
          
          if (regError.code === 'auth/email-already-in-use') {
            // Questo succede se 'auth/invalid-credential' era dovuto a PASSWORD SBAGLIATA e non a utente mancante
            setError("Password errata. Se hai dimenticato la password, contatta l'amministratore.");
          } else if (regError.code === 'auth/weak-password') {
            setError("Password troppo debole (min. 6 caratteri).");
          } else if (regError.code === 'auth/operation-not-allowed') {
            setError("ERRORE CONFIGURAZIONE: Abilita 'Email/Password' nella console Firebase.");
          } else {
            setError("Errore registrazione: " + regError.message);
          }
        }
      } 
      // 3. GESTIONE CASO "PASSWORD SBAGLIATA" (Account esiste)
      else if (loginError.code === 'auth/wrong-password') {
        setError("Password errata.");
      } 
      // 4. GESTIONE CASO "TROPPI TENTATIVI"
      else if (loginError.code === 'auth/too-many-requests') {
        setError("Troppi tentativi falliti. Riprova più tardi.");
      }
      // 5. GESTIONE CASO "PROVIDER DISABILITATO"
      else if (loginError.code === 'auth/operation-not-allowed') {
         setError("Devi abilitare il provider 'Email/Password' nella console di Firebase -> Authentication -> Sign-in method.");
      }
      else {
        setError("Errore imprevisto: " + loginError.code);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if(!username) {
      setError("Inserisci lo username per resettare la password.");
      return;
    }
    const cleanUsername = username.trim().toLowerCase();
    const email = `${cleanUsername}@impresadaria.app`;
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg("Email di reset inviata! Controlla la posta (anche spam) dell'indirizzo fittizio se esiste, o contatta l'admin.");
      // Nota: essendo email fittizie, il reset via email non arriverà mai a meno che non si usino email vere.
      // In questo caso demo, è meglio avvisare.
      setError("Nota: Con email fittizie (@impresadaria.app) non puoi ricevere il link di reset reale.");
    } catch(e) {
      setError("Errore reset: " + e.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-blue-700 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 opacity-90"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-4 backdrop-blur-md shadow-inner">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Impresadaria</h1>
            <p className="text-blue-100 text-sm mt-2 font-medium">Accesso Personale</p>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex gap-3 text-red-700 text-sm items-start">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Errore di Accesso</p>
                <p>{error}</p>
              </div>
            </div>
          )}
          
          {successMsg && (
             <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg text-green-700 text-sm">
               {successMsg}
             </div>
          )}

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
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
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
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                  placeholder="••••••"
                />
              </div>
              <p className="text-[10px] text-slate-400 text-right px-1">Minimo 6 caratteri</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mt-4 hover:translate-y-[-1px] active:translate-y-[1px]"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entra nel Sistema'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <p className="text-xs text-slate-400 leading-relaxed">
               Primo accesso? L'account verrà creato automaticamente.<br/>
               Se riscontri problemi, contatta il Master.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- DASHBOARD (GESTIONE ATTIVITÀ) ---
function Dashboard({ user, userData }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(true);
  const handleLogout = () => signOut(auth);
  const isMaster = userData?.role === 'Master';

  useEffect(() => {
    const tasksCollection = collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks');
    const q = query(tasksCollection);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      tasksData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTasks(tasksData);
      setLoadingTasks(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks'), {
        text: newTask,
        completed: false,
        createdAt: serverTimestamp(),
        userId: user.uid,
        authorName: userData?.name || user.email.split('@')[0],
        authorRole: userData?.role || 'Dipendente'
      });
      setNewTask('');
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
    <div>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><LayoutDashboard className="w-5 h-5" /></div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight hidden sm:block">Impresadaria</h1>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isMaster ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{userData?.role}</span>
            </div>
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

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600" />Nuova Attività</h2>
          <form onSubmit={handleAddTask} className="flex gap-3">
            <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Descrivi l'attività..." className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500 block w-full p-3.5 outline-none" />
            <button type="submit" disabled={!newTask.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 rounded-xl font-medium transition-colors">Salva</button>
          </form>
        </div>

        <div className="space-y-3">
          {loadingTasks ? <div className="text-center py-10"><Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" /></div> : tasks.length === 0 ? 
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300"><Database className="w-10 h-10 text-slate-300 mx-auto mb-3" /><h3 className="text-slate-900 font-medium">Nessuna attività</h3></div> : 
            tasks.map((task) => (
              <div key={task.id} className={`group flex items-start sm:items-center justify-between p-4 bg-white rounded-xl border transition-all ${task.completed ? 'border-slate-100 bg-slate-50/50' : 'border-slate-200 hover:border-blue-300 shadow-sm'}`}>
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <button onClick={() => toggleTask(task)} className={`shrink-0 mt-1 sm:mt-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 text-transparent hover:border-blue-500'}`}><CheckCircle className="w-3.5 h-3.5" strokeWidth={3} /></button>
                  <div className="flex flex-col min-w-0 gap-1">
                    <span className={`text-base font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.text}</span>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <div className="flex items-center gap-1">{task.authorRole === 'Master' ? <ShieldCheck className="w-3 h-3 text-purple-500" /> : <User className="w-3 h-3" />}<span className="font-medium text-slate-600">{task.authorName || 'Anonimo'}</span></div>
                      <span>{task.createdAt ? new Date(task.createdAt.seconds * 1000).toLocaleDateString('it-IT') : ''}</span>
                    </div>
                  </div>
                </div>
                {isMaster && <button onClick={() => deleteTask(task.id)} className="ml-3 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 className="w-5 h-5" /></button>}
              </div>
            ))
          }
        </div>
      </main>
    </div>
  );
}
