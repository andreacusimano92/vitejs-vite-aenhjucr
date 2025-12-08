import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut
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
  orderBy
} from 'firebase/firestore';
import { 
  Activity, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Circle, 
  LogOut, 
  Database,
  Loader2,
  AlertCircle
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

// Usa un ID app statico per la struttura del percorso o quello dell'ambiente
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'impresadaria-v1';

// --- COMPONENTI ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Prova ad accedere in modo anonimo per consentire l'accesso al DB
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Errore di Autenticazione:", err);
        setError(err.message);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-slate-500 text-sm">Connessione a Impresadaria App in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg text-slate-800">Gestore Impresadaria</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <div className={`w-2 h-2 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`} />
              {user ? 'Connesso' : 'Offline'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold">Errore di Connessione</h3>
              <p className="text-sm opacity-90">{error}</p>
              <p className="text-xs mt-2 text-red-500">
                Controlla se l'Autenticazione (Anonima) e Firestore sono abilitati nella Console Firebase.
              </p>
            </div>
          </div>
        )}

        {user ? (
          <TaskManager user={user} />
        ) : (
          <div className="text-center py-20 text-slate-400">
            In attesa di autenticazione...
          </div>
        )}
      </main>
    </div>
  );
}

function TaskManager({ user }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Logica Firestore
  useEffect(() => {
    if (!user) return;

    // Percorso: /artifacts/{appId}/public/data/tasks
    // Usiamo una collezione pubblica per questa demo così i dati sono condivisi
    const tasksCollection = collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks');
    
    // Nota: Filtriamo in memoria come da regole rigorose per evitare requisiti di indice per demo semplici
    const q = query(tasksCollection);

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const tasksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Ordinamento lato client per data di creazione (decrescente)
        tasksData.sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });

        setTasks(tasksData);
        setFetchError(null);
      },
      (error) => {
        console.error("Errore Firestore:", error);
        setFetchError("Impossibile recuperare le attività. Controlla le regole di Firestore.");
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setIsSubmitting(true);
    try {
      const tasksCollection = collection(db, 'artifacts', APP_ID, 'public', 'data', 'tasks');
      await addDoc(tasksCollection, {
        text: newTask,
        completed: false,
        createdAt: serverTimestamp(),
        userId: user.uid, // tracciamo chi l'ha creato
        author: 'Utente Anonimo'
      });
      setNewTask('');
    } catch (err) {
      console.error("Aggiunta fallita:", err);
      alert("Impossibile aggiungere l'attività: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTask = async (taskId, currentStatus) => {
    try {
      const taskRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', taskId);
      await updateDoc(taskRef, {
        completed: !currentStatus
      });
    } catch (err) {
      console.error("Modifica stato fallita:", err);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Eliminare questa attività?")) return;
    try {
      const taskRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'tasks', taskId);
      await deleteDoc(taskRef);
    } catch (err) {
      console.error("Eliminazione fallita:", err);
    }
  };

  return (
    <div className="space-y-6">
      {fetchError && (
         <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm border border-amber-100 mb-4">
           {fetchError}
         </div>
      )}

      {/* Area Input */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <form onSubmit={handleAddTask} className="flex gap-3">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Cosa bisogna fare?"
            className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full p-3 outline-none transition-all placeholder:text-slate-400"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newTask.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Aggiungi</span>
          </button>
        </form>
      </div>

      {/* Lista Attività */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Database className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-medium">Nessuna attività</h3>
            <p className="text-slate-500 text-sm mt-1">Aggiungi la tua prima attività qui sopra per iniziare.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div 
              key={task.id}
              className={`group flex items-center justify-between p-4 bg-white rounded-xl border transition-all duration-200 ${
                task.completed 
                  ? 'border-slate-100 bg-slate-50' 
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5'
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => toggleTask(task.id, task.completed)}
                  className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    task.completed
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-slate-300 text-transparent hover:border-blue-500'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
                <div className="flex flex-col">
                  <span className={`text-sm font-medium transition-all ${
                    task.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                  }`}>
                    {task.text}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {task.createdAt ? new Date(task.createdAt.seconds * 1000).toLocaleTimeString('it-IT') : 'Adesso'}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Elimina attività"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
