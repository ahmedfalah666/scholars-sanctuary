import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  ChevronRight,
  ChevronLeft, 
  X, 
  Check, 
  Copy, 
  Plus, 
  Trash2, 
  Home, 
  AlertCircle,
  Play,
  LogOut,
  RotateCcw,
  Eye,
  Keyboard,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  GraduationCap,
  Library,
  FileText,
  AlertTriangle,
  Lock,
  User,
  ShieldAlert,
  Folder,
  FolderPlus,
  Edit3,
  Undo
} from "lucide-react";

// Pull credentials from Netlify environment variables (using Vite syntax)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ""; 
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export default function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('academicTheme');
    return savedTheme ? savedTheme : 'light';
  });

  const [quizzes, setQuizzes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [quizStates, setQuizStates] = useState({});
  const [currentGroupId, setCurrentGroupId] = useState(null); 

  // Administrative Access state control
  const [isAdmin, setIsAdmin] = useState(() => {
    const adminActive = localStorage.getItem('isSanctuaryAdmin');
    return adminActive === 'true';
  });
  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Modals and inputs
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');

  const [currentView, setCurrentView] = useState('dashboard'); 
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [uncertainQuestions, setUncertainQuestions] = useState({});
  const [jsonInput, setJsonInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  
  const [correctUncertainOpen, setCorrectUncertainOpen] = useState(false);

  const [isSupabaseLoaded, setIsSupabaseLoaded] = useState(false);
  const supabaseRef = useRef(null);

  // Safe native-style confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: null
  });

  const [currentUser, setCurrentUser] = useState(() => {
    let savedUid = localStorage.getItem('sanctuaryUserId');
    if (!savedUid) {
      savedUid = 'student_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('sanctuaryUserId', savedUid);
    }
    return { uid: savedUid };
  });

  useEffect(() => {
    const loadSupabaseScript = () => {
      // Only attempt connection if environment variables exist
      if (SUPABASE_URL && SUPABASE_URL.trim() !== "") {
        if (window.supabase) {
          initializeClient();
        } else {
          console.log("Loading Supabase SDK via CDN...");
          const script = document.createElement('script');
          script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
          script.async = true;
          script.onload = initializeClient;
          script.onerror = () => {
            console.warn("Supabase CDN failed to load. Running in LocalStorage fallback mode.");
            setIsSupabaseLoaded(false);
          };
          document.head.appendChild(script);
        }
      } else {
        console.log("Supabase URL environment variable is missing. Running in local fallback mode.");
        setIsSupabaseLoaded(false);
      }
    };

    const initializeClient = () => {
      try {
        if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
          supabaseRef.current = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          setIsSupabaseLoaded(true);
          console.log("Supabase connection successfully established via Environment Variables!");
        }
      } catch (e) {
        console.warn("Supabase dynamic integration failed. Using LocalStorage instead.", e);
        setIsSupabaseLoaded(false);
      }
    };

    loadSupabaseScript();
  }, []);

  useEffect(() => {
    loadData();
  }, [isSupabaseLoaded]);

  const loadData = async () => {
    const isSupabaseReady = isSupabaseLoaded && !!supabaseRef.current;
    if (isSupabaseReady) {
      try {
        const { data: fetchedGroups, error: groupErr } = await supabaseRef.current
          .from('groups')
          .select('*')
          .order('name', { ascending: true });
        if (groupErr) throw groupErr;
        setGroups(fetchedGroups || []);

        const { data: fetchedQuizzes, error: quizErr } = await supabaseRef.current
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false });
        if (quizErr) throw quizErr;
        setQuizzes(fetchedQuizzes || []);

        const { data: progress, error: progErr } = await supabaseRef.current
          .from('user_progress')
          .select('*')
          .eq('user_id', currentUser.uid);
        if (progErr) throw progErr;

        const liveStates = {};
        progress.forEach(p => {
          liveStates[p.quiz_id] = {
            currentQuestionIndex: p.current_question_index,
            userAnswers: p.user_answers || {},
            uncertain_questions: p.uncertain_questions || {},
            status: p.status
          };
        });
        setQuizStates(liveStates);

      } catch (err) {
        console.error("Supabase load error, switching to local state:", err);
        fallbackToLocal();
      }
    } else {
      fallbackToLocal();
    }
  };

  const fallbackToLocal = () => {
    const localQuizzes = localStorage.getItem('sanctuaryQuizzes');
    const localGroups = localStorage.getItem('sanctuaryGroups');
    const localStates = localStorage.getItem('sanctuaryQuizStates');

    if (localQuizzes) setQuizzes(JSON.parse(localQuizzes));
    if (localGroups) setGroups(JSON.parse(localGroups));
    if (localStates) setQuizStates(JSON.parse(localStates));
  };

  const saveLocalFallback = (updatedQuizzes, updatedGroups, updatedStates) => {
    if (updatedQuizzes) localStorage.setItem('sanctuaryQuizzes', JSON.stringify(updatedQuizzes));
    if (updatedGroups) localStorage.setItem('sanctuaryGroups', JSON.stringify(updatedGroups));
    if (updatedStates) localStorage.setItem('sanctuaryQuizStates', JSON.stringify(updatedStates));
  };

  useEffect(() => {
    localStorage.setItem('academicTheme', theme);
  }, [theme]);

  useEffect(() => {
    if (currentView !== 'taking_quiz' || !activeQuiz) return;

    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      const currentQ = activeQuiz.questions[currentQuestionIndex];
      const selectedOptId = userAnswers[currentQuestionIndex];
      const isAnswered = selectedOptId !== undefined;

      // Selection hotkeys
      if (!isAnswered) {
        if (e.key === '1' && currentQ.options[0]) {
          handleOptionSelect(currentQ.options[0].id);
        } else if (e.key === '2' && currentQ.options[1]) {
          handleOptionSelect(currentQ.options[1].id);
        } else if (e.key === '3' && currentQ.options[2]) {
          handleOptionSelect(currentQ.options[2].id);
        } else if (e.key === '4' && currentQ.options[3]) {
          handleOptionSelect(currentQ.options[3].id);
        }
      }

      // Uncertainty hotkey mapped to C
      if (e.key === 'c' || e.key === 'C') {
        toggleUncertainty();
      }

      // Navigation hotkeys
      if (e.key === 'ArrowLeft') {
        handlePrevQuestion();
      } else if (e.key === 'ArrowRight') {
        if (currentQuestionIndex < activeQuiz.questions.length - 1) {
          handleNextQuestion();
        } else if (isAnswered) {
          finishQuiz();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentView, activeQuiz, currentQuestionIndex, userAnswers, uncertainQuestions]);

  const aiPrompt = `You are acting as an expert university professor and exam designer. 

I have uploaded two types of sources into this notebook:
1. My Lecture Notes (the specific material I have been taught)
2. Past Year Questions (PYQs)

Your task is to generate a 20-question Multiple Choice Question (MCQ) practice exam for me. To do this successfully, you must strictly follow these rules:

1. Strict Scope Constraint: Every single question you generate must be based ONLY on concepts explicitly explained in the uploaded Lecture Notes. If a topic appears in the PYQs but is NOT present in the Lecture Notes, you must completely ignore it. Do not test me on anything we haven't covered in these specific lectures.
2. Format & Style Match: Analyze the provided PYQs to understand the exact formatting, phrasing style, number of options (e.g., A, B, C, D), and difficulty level. The questions you create must perfectly mimic this style.
3. Mixing Past Questions: You can include or closely adapt actual questions from the PYQs, but again, ONLY if they align with the current Lecture Notes. 
4. Output Format: You MUST output the final quiz STRICTLY as a raw JSON object. Do not include markdown formatting (like \`\`\`json), introductory text, or explanatory text outside the JSON block. The program I am using requires pure JSON.

The JSON must exactly follow this schema:

{
  "quizTitle": "Title of the Quiz Based on Topic",
  "questions": [
    {
      "question": "The question text goes here...",
      "options": [
        {
          "id": "A",
          "text": "First option text",
          "isCorrect": false,
          "explanation": "Detailed explanation of why this specific choice is incorrect."
        },
        {
          "id": "B",
          "text": "Second option text",
          "isCorrect": true,
          "explanation": "Detailed explanation of why this choice is the correct answer."
        },
        {
          "id": "C",
          "text": "Third option text",
          "isCorrect": false,
          "explanation": "Detailed explanation of why this specific choice is incorrect."
        },
        {
          "id": "D",
          "text": "Fourth option text",
          "isCorrect": false,
          "explanation": "Detailed explanation of why this specific choice is incorrect."
        }
      ]
    }
  ]
}

Ensure there is a clear, concise explanation for EVERY option (both right and wrong), as these will be revealed to me when I select an answer. Generate the 20 questions now.`;

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const isSupabaseReady = isSupabaseLoaded && !!supabaseRef.current;
    
    const newGroupObj = {
      name: newGroupName.trim(),
      parent_id: currentGroupId
    };

    if (isSupabaseReady) {
      try {
        const { data, error } = await supabaseRef.current
          .from('groups')
          .insert([newGroupObj])
          .select();
        if (error) throw error;
        setGroups([...groups, ...data]);
      } catch (err) {
        console.error("Cloud group creation failed:", err);
      }
    } else {
      const localIdGroupObj = {
        ...newGroupObj,
        id: Date.now().toString()
      };
      const updated = [...groups, localIdGroupObj];
      setGroups(updated);
      saveLocalFallback(null, updated, null);
    }

    setNewGroupName('');
    setShowGroupModal(false);
  };

  const handleUpdateGroup = async () => {
    if (!editGroupName.trim() || !editingGroupId) return;
    const isSupabaseReady = isSupabaseLoaded && !!supabaseRef.current;

    if (isSupabaseReady) {
      try {
        const { error } = await supabaseRef.current
          .from('groups')
          .update({ name: editGroupName.trim() })
          .eq('id', editingGroupId);
        if (error) throw error;
        setGroups(groups.map(g => g.id === editingGroupId ? { ...g, name: editGroupName.trim() } : g));
      } catch (err) {
        console.error("Cloud group update failed:", err);
      }
    } else {
      const updated = groups.map(g => g.id === editingGroupId ? { ...g, name: editGroupName.trim() } : g);
      setGroups(updated);
      saveLocalFallback(null, updated, null);
    }

    setEditingGroupId(null);
    setEditGroupName('');
  };

  const handleDeleteGroup = async (gId) => {
    const isSupabaseReady = isSupabaseLoaded && !!supabaseRef.current;
    if (isSupabaseReady) {
      try {
        const { error } = await supabaseRef.current
          .from('groups')
          .delete()
          .eq('id', gId);
        if (error) throw error;
        setGroups(groups.filter(g => g.id !== gId));
        setQuizzes(quizzes.filter(q => q.group_id !== gId));
      } catch (err) {
        console.error("Cloud group deletion failed:", err);
      }
    } else {
      const updated = groups.filter(g => g.id !== gId);
      const updatedQuizzes = quizzes.filter(q => q.group_id !== gId);
      setGroups(updated);
      setQuizzes(updatedQuizzes);
      saveLocalFallback(updatedQuizzes, updated, null);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(aiPrompt);
      setCopySuccess('Prompt copied to clipboard!');
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (err) {
      const textAreax = document.createElement("textarea");
      textAreax.value = aiPrompt;
      document.body.appendChild(textAreax);
      textAreax.select();
      document.execCommand("copy");
      document.body.removeChild(textAreax);
      setCopySuccess('Prompt copied!');
      setTimeout(() => setCopySuccess(''), 3000);
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminUsernameInput === 'admin' && adminPasswordInput === 'ScholarAdmin2026!') {
      setIsAdmin(true);
      localStorage.setItem('isSanctuaryAdmin', 'true');
      setShowAdminLoginModal(false);
      setAdminUsernameInput('');
      setAdminPasswordInput('');
      setLoginError('');
    } else {
      setLoginError('Access denied. Incorrect credentials.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.setItem('isSanctuaryAdmin', 'false');
    setCurrentView('dashboard');
  };

  const handleAddQuiz = async () => {
    try {
      setErrorMsg('');
      let cleanedInput = jsonInput.trim();
      if (cleanedInput.startsWith('```json')) {
        cleanedInput = cleanedInput.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanedInput.startsWith('```')) {
        cleanedInput = cleanedInput.replace(/^```/, '').replace(/```$/, '').trim();
      }
      
      const parsed = JSON.parse(cleanedInput);
      
      if (!parsed.quizTitle || !parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("Invalid format. Ensure your payload matches the requested schema.");
      }
      
      const newQuiz = {
        quiz_title: parsed.quizTitle,
        questions: parsed.questions,
        group_id: currentGroupId
      };

      const isSupabaseReady = isSupabaseLoaded && !!supabaseRef.current;
      if (isSupabaseReady) {
        const { data, error } = await supabaseRef.current
          .from('quizzes')
          .insert([newQuiz])
          .select();
        if (error) throw error;
        setQuizzes([data[0], ...quizzes]);
      } else {
        const fallbackId = Date.now().toString();
        const updatedQuizzes = [{ ...newQuiz, id: fallbackId }, ...quizzes];
        setQuizzes(updatedQuizzes);
        saveLocalFallback(updatedQuizzes, null, null);
      }
      
      setJsonInput('');
      setCurrentView('dashboard');
    } catch (err) {
      setErrorMsg("Failed to parse JSON: " + err.message);
    }
  };

  const deleteQuiz = async (id) => {
    const isSupabaseReady = isSupabaseLoaded && !!supabaseRef.current;
    if (isSupabaseReady) {
      try {
        const { error } = await supabaseRef.current
          .from('quizzes')
          .delete()
          .eq('id', id);
        if (error) throw error;
        setQuizzes(quizzes.filter(q => q.id !== id));
      } catch (err) {
        console.error("Cloud quiz deletion failed:", err);
      }
    } else {
      const updatedQuizzes = quizzes.filter(q => q.id !== id);
      setQuizzes(updatedQuizzes);
      saveLocalFallback(updatedQuizzes, null, null);
      
      const newStates = { ...quizStates };
      delete newStates[id];
      setQuizStates(newStates);
      saveLocalFallback(null, null, newStates);
    }
  };

  const updatePersistentState = async (quizId, updatedProgress) => {
    const nextStates = {
      ...quizStates,
      [quizId]: {
        ...(quizStates[quizId] || {}),
        ...updatedProgress
      }
    };
    setQuizStates(nextStates);

    const completeRecord = nextStates[quizId];
    const isSupabaseReady = isSupabaseLoaded && !!supabaseRef.current;

    if (isSupabaseReady) {
      try {
        const payload = {
          user_id: currentUser.uid,
          quiz_id: quizId,
          current_question_index: completeRecord.currentQuestionIndex || 0,
          user_answers: completeRecord.userAnswers || {},
          uncertain_questions: completeRecord.uncertainQuestions || {},
          status: completeRecord.status || 'in_progress',
          updated_at: new Date().toISOString()
        };

        const { error } = await supabaseRef.current
          .from('user_progress')
          .upsert(payload, { onConflict: 'user_id, quiz_id' });
        if (error) throw error;
      } catch (err) {
        console.error("Cloud state synchronizer failed:", err);
      }
    } else {
      saveLocalFallback(null, null, nextStates);
    }
  };

  const startQuiz = (quiz) => {
    const freshState = {
      currentQuestionIndex: 0,
      userAnswers: {},
      uncertainQuestions: {},
      status: 'in_progress'
    };
    
    updatePersistentState(quiz.id, freshState);
    
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setUncertainQuestions({});
    setCurrentView('taking_quiz');
  };

  const continueQuiz = (quiz) => {
    const savedState = quizStates[quiz.id] || { 
      currentQuestionIndex: 0, 
      userAnswers: {}, 
      uncertainQuestions: {}, 
      status: 'in_progress' 
    };
    
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
    setUserAnswers(savedState.userAnswers || {});
    setUncertainQuestions(savedState.uncertainQuestions || {});
    setCurrentView('taking_quiz');
  };

  const resetProgress = (quizId) => {
    const freshState = {
      currentQuestionIndex: 0,
      userAnswers: {},
      uncertainQuestions: {},
      status: 'in_progress'
    };
    updatePersistentState(quizId, freshState);
  };

  const handleOptionSelect = (optionId) => {
    if (userAnswers[currentQuestionIndex] !== undefined) return;
    
    const updatedAnswers = { ...userAnswers, [currentQuestionIndex]: optionId };
    setUserAnswers(updatedAnswers);
    
    updatePersistentState(activeQuiz.id, {
      userAnswers: updatedAnswers,
      uncertainQuestions: uncertainQuestions,
      status: 'in_progress'
    });
  };

  const toggleUncertainty = () => {
    const updatedUncertain = {
      ...uncertainQuestions,
      [currentQuestionIndex]: !uncertainQuestions[currentQuestionIndex]
    };
    setUncertainQuestions(updatedUncertain);

    updatePersistentState(activeQuiz.id, {
      uncertainQuestions: updatedUncertain
    });
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < activeQuiz.questions.length) {
      setCurrentQuestionIndex(nextIndex);
      updatePersistentState(activeQuiz.id, {
        currentQuestionIndex: nextIndex
      });
    } else {
      finishQuiz();
    }
  };

  const handlePrevQuestion = () => {
    const prevIndex = currentQuestionIndex - 1;
    if (prevIndex >= 0) {
      setCurrentQuestionIndex(prevIndex);
      updatePersistentState(activeQuiz.id, {
        currentQuestionIndex: prevIndex
      });
    }
  };

  const handleJumpToQuestion = (idx) => {
    setCurrentQuestionIndex(idx);
    updatePersistentState(activeQuiz.id, {
      currentQuestionIndex: idx
    });
  };

  const finishQuiz = () => {
    updatePersistentState(activeQuiz.id, {
      status: 'completed'
    });
    setCorrectUncertainOpen(false);
    setCurrentView('review');
  };

  const reviewSavedQuiz = (quiz) => {
    const savedState = quizStates[quiz.id];
    if (!savedState) return;

    setActiveQuiz(quiz);
    setUserAnswers(savedState.userAnswers || {});
    setUncertainQuestions(savedState.uncertainQuestions || {});
    setCorrectUncertainOpen(false);
    setCurrentView('review');
  };

  const resetToDashboard = () => {
    setActiveQuiz(null);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setUncertainQuestions({});
    setCurrentView('dashboard');
  };

  const showConfirm = (title, message, callback) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      action: () => {
        callback();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const computeReviewData = () => {
    if (!activeQuiz) return { incorrect: [], correctButUncertain: [] };
    
    const incorrect = [];
    const correctButUncertain = [];

    activeQuiz.questions.forEach((q, idx) => {
      const ansId = userAnswers[idx];
      const isCorrect = ansId && q.options.find(o => o.id === ansId)?.isCorrect;
      const isUncertain = uncertainQuestions[idx] === true;

      if (!isCorrect) {
        incorrect.push({
          question: q,
          selectedOptionId: ansId || null,
          isUncertain,
          index: idx
        });
      } else if (isCorrect && isUncertain) {
        correctButUncertain.push({
          question: q,
          selectedOptionId: ansId,
          index: idx
        });
      }
    });

    return { incorrect, correctButUncertain };
  };

  const renderSignatureFooter = () => (
    <footer className="w-full text-center py-6 border-t dark:border-slate-800 border-slate-200 mt-16 text-xs text-slate-500 font-serif">
      <div className="flex flex-col items-center justify-center gap-2">
        <span className="italic text-slate-600 dark:text-slate-400 font-semibold text-[13px]">
          Thanks to Allah for His Blessings
        </span>
        <div className="flex flex-col items-center gap-0.5 text-slate-500">
          <span>Designed & Developed by</span>
          <span className="font-bold text-slate-700 dark:text-slate-300 tracking-wider">Ahmed Falah Hasan</span>
          <span>Inspiration by</span>
          <span className="font-bold text-slate-700 dark:text-slate-300 tracking-wider">Rawan Hussein</span>
        </div>
      </div>
    </footer>
  );

  const getBreadcrumbs = () => {
    const trail = [];
    let parent = currentGroupId;
    while (parent) {
      const parentGrp = groups.find(g => g.id === parent);
      if (parentGrp) {
        trail.unshift(parentGrp);
        parent = parentGrp.parent_id;
      } else {
        break;
      }
    }
    return trail;
  };

  const currentLevelGroups = groups.filter(g => g.parent_id === currentGroupId);
  const currentLevelQuizzes = quizzes.filter(q => q.group_id === currentGroupId);

  const renderDashboard = () => (
    <div className="w-full max-w-5xl mx-auto animate-fade-in px-4 flex flex-col min-h-[80vh] justify-between">
      <div>
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b dark:border-slate-800 border-slate-200 pb-6 gap-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-3xl md:text-4xl font-serif tracking-wide text-slate-900 dark:text-white font-bold">
              Scholar's Sanctuary
            </h1>
          </div>
          <div className="flex flex-row gap-3 items-center">
            {isAdmin ? (
              <>
                <button 
                  onClick={() => setCurrentView('prompt')}
                  className="flex items-center gap-2 px-4 py-2 border dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-600 dark:hover:bg-slate-800 hover:bg-slate-100 transition-all rounded-md text-sm font-medium"
                >
                  <FileText className="w-4 h-4" /> Exam Prompt
                </button>
                <button 
                  onClick={() => setCurrentView('add_quiz')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-all rounded-md shadow-sm whitespace-nowrap text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Import Quiz
                </button>
                <button 
                  onClick={handleAdminLogout}
                  className="flex items-center gap-1.5 px-3 py-2 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 dark:hover:bg-rose-950/20 hover:bg-rose-50 rounded-md text-xs font-semibold"
                >
                  Logout Admin
                </button>
              </>
            ) : (
              <button 
                onClick={() => setShowAdminLoginModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-sm font-medium border border-transparent dark:border-slate-700"
              >
                <Lock className="w-4 h-4" /> Admin Login
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 text-sm text-slate-500 flex-wrap">
          <button 
            onClick={() => setCurrentGroupId(null)}
            className="hover:text-indigo-600 font-medium transition-colors"
          >
            Home
          </button>
          {getBreadcrumbs().map((b, idx) => (
            <React.Fragment key={b.id}>
              <ChevronRight className="w-3 h-3" />
              <button 
                onClick={() => setCurrentGroupId(b.id)}
                className="hover:text-indigo-600 font-medium transition-colors"
              >
                {b.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-3 mb-8 bg-slate-100 dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 border-slate-200">
            <button 
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-xs font-semibold shadow-sm"
            >
              <FolderPlus className="w-4 h-4" /> Add Subgroup / Topic
            </button>
            {currentGroupId && (
              <button 
                onClick={() => {
                  const currentGroupObj = groups.find(g => g.id === currentGroupId);
                  if (currentGroupObj) {
                    setEditingGroupId(currentGroupId);
                    setEditGroupName(currentGroupObj.name);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 border dark:border-slate-700 border-slate-300 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-xs font-semibold"
              >
                <Edit3 className="w-4 h-4" /> Rename Current Group
              </button>
            )}
          </div>
        )}

        {editingGroupId && (
          <div className="mb-6 p-4 border dark:border-indigo-900/50 border-indigo-200 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium dark:text-slate-300">Rename Group:</span>
            <input 
              type="text"
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              className="px-3 py-1.5 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <button 
              onClick={handleUpdateGroup}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all"
            >
              Save
            </button>
            <button 
              onClick={() => setEditingGroupId(null)}
              className="px-3 py-1.5 border rounded-lg text-xs font-semibold dark:text-slate-400"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="space-y-8">
          {currentLevelGroups.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif dark:text-slate-300 text-slate-700 font-semibold flex items-center gap-2">
                <Folder className="w-5 h-5 text-indigo-500" /> Academic Subgroups
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {currentLevelGroups.map(grp => (
                  <div 
                    key={grp.id}
                    className="relative group bg-white dark:bg-slate-800 border dark:border-slate-700/60 border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => setCurrentGroupId(grp.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="w-8 h-8 text-indigo-500 fill-indigo-500/10" />
                      <span className="font-serif font-semibold dark:text-slate-100 text-slate-800 pr-6">
                        {grp.name}
                      </span>
                    </div>
                    
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          showConfirm(
                            "Delete Folder",
                            `Are you sure you want to delete the folder "${grp.name}"? This deletes all subfolders and quizzes inside.`,
                            () => handleDeleteGroup(grp.id)
                          );
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-rose-500 dark:hover:text-rose-400 text-slate-400 absolute top-4 right-4"
                        title="Delete group"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-serif dark:text-slate-300 text-slate-700 font-semibold flex items-center gap-2">
              <Library className="w-5 h-5 text-indigo-500" /> Assessments
            </h3>
            
            {currentLevelGroups.length === 0 && currentLevelQuizzes.length === 0 ? (
              <div className="text-center py-20 border border-dashed dark:border-slate-800 border-slate-300 rounded-xl dark:bg-slate-800/30 bg-slate-50 px-6">
                <BookOpen className="w-16 h-16 mx-auto dark:text-slate-700 text-slate-400 mb-4" />
                <p className="dark:text-slate-400 text-slate-600 font-serif text-lg">No subgroups or assessments have been published here yet.</p>
                {currentGroupId && (
                  <button 
                    onClick={() => {
                      const currentGroupObj = groups.find(g => g.id === currentGroupId);
                      if (currentGroupObj) {
                        setCurrentGroupId(currentGroupObj.parent_id);
                      }
                    }}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-semibold dark:border-slate-700"
                  >
                    <Undo className="w-3.5 h-3.5" /> Back Up
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentLevelQuizzes.map(quiz => {
                  const state = quizStates[quiz.id];
                  const isStarted = !!state;
                  const isCompleted = state?.status === 'completed';
                  const answeredCount = state?.userAnswers ? Object.keys(state.userAnswers).length : 0;
                  
                  return (
                    <div key={quiz.id} className="group relative dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-200 p-6 rounded-xl hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                      <div>
                        {isAdmin && (
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button onClick={() => {
                              showConfirm(
                                "Delete Assessment",
                                `Are you sure you want to permanently delete "${quiz.quiz_title}"?`,
                                () => deleteQuiz(quiz.id)
                              );
                            }} className="dark:text-slate-500 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        
                        <h3 className="text-xl font-serif dark:text-slate-100 text-slate-800 mb-2 pr-8 leading-snug">{quiz.quiz_title}</h3>
                        
                        <div className="flex flex-wrap gap-2 mb-4 items-center">
                          <span className="dark:text-slate-400 text-slate-500 text-sm font-medium bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md">
                            {quiz.questions ? quiz.questions.length : 0} Questions
                          </span>
                          {isStarted && (
                            <>
                              <span className="text-slate-400 text-xs">•</span>
                              <span className={`text-xs px-2 py-1 rounded-md font-medium ${isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                {isCompleted ? 'Completed' : `In Progress (${answeredCount}/${quiz.questions.length})`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        {!isStarted ? (
                          <button 
                            onClick={() => startQuiz(quiz)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 dark:bg-slate-700 bg-slate-100 dark:hover:bg-indigo-600 hover:bg-indigo-50 dark:text-slate-200 text-indigo-700 hover:text-indigo-800 dark:hover:text-white rounded-lg transition-all font-medium"
                          >
                            <Play className="w-4 h-4" /> Start Quiz
                          </button>
                        ) : isCompleted ? (
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => reviewSavedQuiz(quiz)}
                              className="flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-750 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg transition-all text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" /> Review
                            </button>
                            <button 
                              onClick={() => {
                                showConfirm(
                                  "Reset Progress",
                                  "This clears your current assessment metrics. Ready to start again?",
                                  () => {
                                    resetProgress(quiz.id);
                                    startQuiz(quiz);
                                  }
                                );
                              }}
                              className="flex items-center justify-center gap-2 py-2 dark:bg-slate-700 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 dark:text-slate-300 text-slate-700 rounded-lg transition-all text-sm font-medium"
                            >
                              <RotateCcw className="w-4 h-4" /> Reset
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => continueQuiz(quiz)}
                              className="flex items-center justify-center gap-2 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg transition-all text-sm font-medium"
                            >
                              <Play className="w-4 h-4" /> Resume
                            </button>
                            <button 
                              onClick={() => {
                                showConfirm(
                                  "Restart Assessment?",
                                  "This clears your current session and starts from the beginning. Proceed?",
                                  () => startQuiz(quiz)
                                );
                              }}
                              className="flex items-center justify-center gap-2 py-2 dark:bg-slate-700 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 dark:text-slate-300 text-slate-700 rounded-lg transition-all text-sm font-medium"
                            >
                              <RotateCcw className="w-4 h-4" /> Restart
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {renderSignatureFooter()}
    </div>
  );

  const renderAddQuiz = () => (
    <div className="w-full max-w-3xl mx-auto animate-fade-in px-4 flex flex-col min-h-[80vh] justify-between">
      <div>
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 dark:text-slate-400 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 transition-colors font-medium">
          <Home className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 rounded-xl p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-serif dark:text-white text-slate-900 mb-4 flex items-center gap-3">
            <FileText className="w-6 h-6 text-indigo-500" /> Import Academic Assessment
          </h2>
          <p className="dark:text-slate-400 text-slate-600 mb-6 text-sm">
            Paste the JSON generated by your AI tool. It will be added under the current folder pathway.
          </p>
          
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full h-96 dark:bg-slate-900 bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-lg p-4 dark:text-slate-300 text-slate-800 font-mono text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
            placeholder='{"quizTitle": "...", "questions": [...]}'
          />
          
          {errorMsg && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleAddQuiz}
              disabled={!jsonInput.trim()}
              className="w-full sm:w-auto px-8 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all font-medium shadow-sm"
            >
              Upload Quiz to Database
            </button>
          </div>
        </div>
      </div>
      {renderSignatureFooter()}
    </div>
  );

  const renderPrompt = () => (
    <div className="w-full max-w-4xl mx-auto animate-fade-in px-4 flex flex-col min-h-[80vh] justify-between">
      <div>
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 dark:text-slate-400 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 transition-colors font-medium">
          <Home className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 rounded-xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-serif dark:text-white text-slate-900 font-semibold">AI Exam Generator Prompt</h2>
            <button 
              onClick={copyToClipboard}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 dark:bg-slate-700 bg-slate-100 dark:text-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 border dark:border-slate-600 border-slate-300 transition-all rounded-lg text-sm font-medium"
            >
              <Copy className="w-4 h-4" /> {copySuccess || 'Copy Prompt'}
            </button>
          </div>
          <p className="dark:text-slate-400 text-slate-600 mb-6 border-b dark:border-slate-700 border-slate-200 pb-6 text-sm">
            Copy this instructional prompt and provide it to your preferred AI model along with your lecture notes. It enforces the strict academic rules and JSON data structure required for this application.
          </p>

          <div className="dark:bg-slate-900 bg-slate-50 border dark:border-slate-800 border-slate-200 p-6 rounded-lg overflow-y-auto max-h-[60vh] custom-scrollbar">
            <pre className="dark:text-slate-300 text-slate-700 font-mono text-xs md:text-sm whitespace-pre-wrap leading-relaxed">
              {aiPrompt}
            </pre>
          </div>
        </div>
      </div>
      {renderSignatureFooter()}
    </div>
  );

  const renderTakingQuiz = () => {
    if (!activeQuiz) return null;
    const currentQ = activeQuiz.questions[currentQuestionIndex];
    const selectedOptId = userAnswers[currentQuestionIndex];
    const isAnswered = selectedOptId !== undefined;
    const isUncertain = uncertainQuestions[currentQuestionIndex] === true;

    return (
      <div className="w-full max-w-4xl mx-auto animate-fade-in px-4 flex flex-col min-h-[80vh] justify-between">
        <div>
          <div className="flex flex-row justify-between items-center mb-6">
            <button 
              onClick={resetToDashboard} 
              className="flex items-center gap-2 dark:text-slate-400 text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm px-3 py-1.5 border dark:border-slate-700 border-slate-300 hover:border-indigo-500 dark:bg-slate-800 bg-white rounded-md font-medium"
            >
              <LogOut className="w-4 h-4" /> Save & Exit
            </button>
            
            <button 
              onClick={() => {
                showConfirm(
                  "Reset Progress",
                  "Are you sure you want to clear your current answers and restart this assessment?",
                  () => startQuiz(activeQuiz)
                );
              }}
              className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 transition-colors text-sm font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restart
            </button>
          </div>

          <div className="flex justify-between items-center mb-6 border-b dark:border-slate-700 border-slate-200 pb-4">
            <h2 className="text-xl font-serif dark:text-slate-200 text-slate-800 truncate pr-4">
              {activeQuiz.quiz_title}
            </h2>
            <div className="text-indigo-600 dark:text-indigo-400 font-medium whitespace-nowrap bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full text-sm">
              Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto mb-8 pb-3 custom-scrollbar">
            {activeQuiz.questions.map((q, idx) => {
              const ansId = userAnswers[idx];
              const hasAnswered = ansId !== undefined;
              const isCorrect = hasAnswered && q.options.find(o => o.id === ansId)?.isCorrect;
              const isCurrent = currentQuestionIndex === idx;
              const qUncertain = uncertainQuestions[idx] === true;

              let borderClass = "";
              let bgClass = "";
              let textClass = "";

              if (qUncertain) {
                borderClass = "border-amber-500 dark:border-amber-500 shadow-sm";
              } else if (isCurrent) {
                borderClass = "border-indigo-500 dark:border-indigo-400";
              } else if (!hasAnswered) {
                borderClass = "border-slate-300 dark:border-slate-700 hover:border-slate-400";
              } else if (isCorrect) {
                borderClass = "border-emerald-500/50 dark:border-emerald-700";
              } else {
                borderClass = "border-rose-500/50 dark:border-rose-700";
              }

              if (isCurrent && !qUncertain) {
                bgClass = "bg-indigo-50 dark:bg-indigo-900/40";
                textClass = "text-indigo-700 dark:text-indigo-300 font-bold";
              } else if (!hasAnswered) {
                bgClass = "bg-white dark:bg-slate-800";
                textClass = "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200";
              } else if (isCorrect) {
                bgClass = "bg-emerald-500/10 dark:bg-emerald-900/20";
                textClass = "text-emerald-700 dark:text-emerald-400";
              } else {
                bgClass = "bg-rose-50 dark:bg-rose-900/20";
                textClass = "text-rose-700 dark:text-rose-400";
              }

              const activeIndicator = isCurrent ? " ring-2 ring-indigo-500/30 ring-offset-1 dark:ring-offset-slate-900" : "";

              return (
                <button
                  key={idx}
                  onClick={() => handleJumpToQuestion(idx)}
                  className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border text-sm cursor-pointer transition-all ${borderClass} ${bgClass} ${textClass} ${activeIndicator}`}
                  title={`Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 rounded-xl p-6 md:p-10 shadow-sm relative">
            <h3 className="text-xl md:text-2xl dark:text-slate-100 text-slate-800 font-serif leading-relaxed mb-8">
              {currentQ.question}
            </h3>

            <div className="space-y-4">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOptId === option.id;
                const isCorrectOption = option.isCorrect;
                
                let btnClass = "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 relative group ";
                
                if (!isAnswered) {
                  btnClass += "border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 bg-white dark:text-slate-300 text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 cursor-pointer shadow-sm";
                } else {
                  if (isCorrectOption) {
                    btnClass += "border-emerald-550 dark:border-emerald-600 bg-emerald-500/10 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 shadow-sm"; 
                  } else if (isSelected && !isCorrectOption) {
                    btnClass += "border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300"; 
                  } else {
                    btnClass += "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 opacity-60"; 
                  }
                }

                return (
                  <div key={option.id} className="flex flex-col">
                    <button 
                      disabled={isAnswered}
                      onClick={() => handleOptionSelect(option.id)}
                      className={btnClass}
                    >
                      <span className="font-bold min-w-[24px] mt-0.5">{option.id}.</span>
                      <span className="flex-grow leading-relaxed">{option.text}</span>
                      
                      {!isAnswered && (
                        <span className="hidden sm:inline-block absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 transition-opacity">
                          Press {idx + 1}
                        </span>
                      )}

                      {isAnswered && isCorrectOption && <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
                      {isAnswered && isSelected && !isCorrectOption && <X className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                    </button>
                    
                    {isAnswered && (
                      <div className={`mt-3 p-4 text-sm rounded-lg border-l-4 ml-2 md:ml-4 animate-fade-in ${
                        isCorrectOption 
                          ? "bg-emerald-555/10 dark:bg-emerald-900/10 border-emerald-500 text-emerald-800 dark:text-emerald-200" 
                          : "bg-rose-50 dark:bg-rose-900/10 border-rose-500 text-rose-800 dark:text-rose-200"
                      }`}>
                        <span className="font-bold block mb-1">{isCorrectOption ? 'Correct:' : 'Incorrect:'}</span>
                        <span className="leading-relaxed">{option.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col-reverse sm:flex-row justify-between items-center border-t dark:border-slate-700 border-slate-200 pt-6 gap-4">
              <button 
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
                className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-2.5 border dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                <ChevronLeft className="w-4 h-4" /> <span>Previous</span>
              </button>

              <div className="w-full sm:w-auto flex justify-center items-center">
                <button
                  onClick={toggleUncertainty}
                  className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-all text-sm font-medium w-full sm:w-auto ${
                    isUncertain
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shadow-sm'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-400 hover:text-amber-600 dark:hover:border-amber-500 dark:hover:text-amber-400'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{isUncertain ? 'Marked as Uncertain' : 'Mark Uncertain'}</span>
                </button>
              </div>

              <button 
                onClick={currentQuestionIndex < activeQuiz.questions.length - 1 ? handleNextQuestion : finishQuiz}
                className="w-full sm:w-auto flex justify-center items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-all shadow-sm text-sm font-medium"
              >
                {currentQuestionIndex < activeQuiz.questions.length - 1 ? 'Next Question' : 'Finish Assessment'} 
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-8 flex flex-wrap justify-center items-center gap-y-2 gap-x-6 text-xs dark:text-slate-500 text-slate-400 pt-4 hidden md:flex font-medium">
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-4 h-4" />
                <span>Shortcuts:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 border-slate-200 px-1.5 py-0.5 rounded text-[10px] dark:text-slate-400 text-slate-600 font-mono">1 - 4</span>
                <span>Select Option</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 border-slate-200 px-1.5 py-0.5 rounded text-[10px] dark:text-slate-400 text-slate-600 font-mono">C</span>
                <span>Toggle Uncertain</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 border-slate-200 px-1.5 py-0.5 rounded text-[10px] dark:text-slate-400 text-slate-600 font-mono">← / →</span>
                <span>Navigate</span>
              </div>
            </div>
          </div>
        </div>
        {renderSignatureFooter()}
      </div>
    );
  };

  const renderReview = () => {
    const { incorrect, correctButUncertain } = computeReviewData();
    const totalQuestions = activeQuiz.questions.length;
    const score = totalQuestions - incorrect.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    return (
      <div className="w-full max-w-4xl mx-auto animate-fade-in px-4 flex flex-col min-h-[80vh] justify-between">
        <div>
          <div className="text-center mb-10 dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 rounded-xl p-8 shadow-sm">
            <GraduationCap className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
            <h2 className="text-3xl font-serif dark:text-white text-slate-900 mb-2">Assessment Completed</h2>
            <div className="flex items-center justify-center gap-4 text-lg">
              <span className="dark:text-slate-300 text-slate-600">Score: <strong className="text-indigo-600 dark:text-indigo-400">{score} / {totalQuestions}</strong></span>
              <span className="dark:text-slate-600 text-slate-300">|</span>
              <span className={`font-bold ${percentage >= 80 ? 'text-emerald-600 dark:text-emerald-400' : percentage >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {percentage}%
              </span>
            </div>
          </div>

          {incorrect.length === 0 ? (
            <div className="text-center dark:bg-emerald-900/10 bg-emerald-50 border border-emerald-200 dark:border-emerald-800/50 p-10 rounded-xl">
              <Check className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
              <h3 className="text-2xl text-emerald-700 dark:text-emerald-400 font-serif mb-2">Excellent Work</h3>
              <p className="text-emerald-600 dark:text-emerald-500/80">You answered every question correctly. Your understanding is solid.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-xl dark:text-slate-200 text-slate-800 font-serif border-b dark:border-slate-700 border-slate-200 pb-2">Review Your Mistakes</h3>
              {incorrect.map((item, idx) => {
                const q = item.question;
                const selectedOpt = q.options.find(o => o.id === item.selectedOptionId);
                const correctOpt = q.options.find(o => o.isCorrect);

                return (
                  <div key={idx} className="dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 p-6 rounded-xl relative overflow-hidden shadow-sm">
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${item.isUncertain ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5 pl-2">
                      <h4 className="text-lg dark:text-slate-100 text-slate-800 font-serif leading-relaxed flex-grow">{q.question}</h4>
                      
                      <div className="shrink-0 font-mono">
                        {item.isUncertain ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-sm">
                            <AlertTriangle className="w-3.5 h-3.5" /> Uncertain and Incorrect
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-sm">
                            <ShieldAlert className="w-3.5 h-3.5" /> Confident but Incorrect
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pl-2">
                      <div className="bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-4 rounded-lg">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-2 font-mono">Your Choice</span>
                        {selectedOpt ? (
                          <>
                            <p className="dark:text-slate-200 text-slate-800 mb-2 font-medium">{selectedOpt.id}. {selectedOpt.text}</p>
                            <p className="text-sm dark:text-rose-300 text-rose-700 leading-relaxed">{selectedOpt.explanation}</p>
                          </>
                        ) : (
                          <p className="dark:text-slate-500 text-slate-400 italic">Skipped Question</p>
                        )}
                      </div>
                      
                      <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-lg">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-2 font-mono">Correct Answer</span>
                        <p className="dark:text-slate-200 text-slate-800 mb-2 font-medium">{correctOpt.id}. {correctOpt.text}</p>
                        <p className="text-sm dark:text-emerald-300 text-emerald-700 leading-relaxed">{correctOpt.explanation}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t dark:border-slate-700 border-slate-100 pl-2">
                      <span className="text-xs font-bold uppercase tracking-wider dark:text-slate-500 text-slate-400 block mb-3 font-mono">Other Explanations</span>
                      <div className="space-y-2">
                        {q.options.filter(o => o.id !== correctOpt.id && o.id !== item.selectedOptionId).map(opt => (
                          <div key={opt.id} className="text-sm dark:text-slate-400 text-slate-600">
                            <span className="font-bold dark:text-slate-500 text-slate-400 mr-1 font-mono">{opt.id}.</span> {opt.explanation}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-10 dark:bg-slate-800 bg-white border border-amber-200 dark:border-amber-700/50 rounded-xl overflow-hidden shadow-sm">
            <button 
              onClick={() => setCorrectUncertainOpen(!correctUncertainOpen)}
              className="w-full flex justify-between items-center p-5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-serif dark:text-slate-200 text-slate-800 text-lg">Correct but Uncertain</h4>
                  <p className="text-sm dark:text-slate-400 text-slate-500 mt-0.5">
                    You answered <strong className="text-amber-600 dark:text-amber-400">{correctButUncertain.length}</strong> questions correctly but had marked them as uncertain.
                  </p>
                </div>
              </div>
              <div className="text-slate-400 dark:text-slate-500">
                {correctUncertainOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            {correctUncertainOpen && (
              <div className="p-6 border-t border-amber-100 dark:border-amber-900/30 space-y-6 dark:bg-slate-900/50 bg-slate-50 animate-fade-in">
                {correctButUncertain.length === 0 ? (
                  <p className="dark:text-slate-500 text-slate-500 text-sm italic text-center py-4">No uncertain correct responses recorded. You held confidence in all correct selections.</p>
                ) : (
                  <div className="space-y-6">
                    <p className="dark:text-slate-400 text-slate-600 text-sm mb-4">
                      Reviewing these concepts will help transform your educational guesses into confident, established knowledge.
                    </p>
                    
                    {correctButUncertain.map((item, idx) => {
                      const q = item.question;
                      const correctOpt = q.options.find(o => o.isCorrect);

                      return (
                        <div key={idx} className="border-l-4 border-amber-400 pl-4 py-1">
                          <div className="flex items-center gap-2 mb-2 text-xs font-bold dark:text-slate-500 text-slate-400 uppercase tracking-wider font-mono">
                            <span>Question {item.index + 1}</span>
                          </div>
                          <h5 className="font-serif dark:text-slate-200 text-slate-800 text-md mb-2">{q.question}</h5>
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-2 font-mono">
                            Your Correct Selection: {correctOpt.id}. {correctOpt.text}
                          </p>
                          <div className="text-sm dark:text-slate-300 text-slate-700 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mt-2">
                            <strong className="block text-indigo-600 dark:text-indigo-400 text-xs uppercase tracking-wider mb-1 font-mono">Explanation:</strong>
                            {correctOpt.explanation}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4 pt-8">
            <button 
              onClick={resetToDashboard}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 border border-slate-300 dark:border-slate-600 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all font-medium"
            >
              <Home className="w-5 h-5" /> Return to Sanctuary
            </button>
            
            <button 
              onClick={() => {
                showConfirm(
                  "Restart Assessment",
                  "Are you ready to clear all answers and begin this assessment again?",
                  () => startQuiz(activeQuiz)
                );
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-all font-medium shadow-sm"
            >
              <RotateCcw className="w-5 h-5" /> Retake Assessment
            </button>
          </div>
        </div>
        {renderSignatureFooter()}
      </div>
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans selection:bg-indigo-200 dark:selection:bg-indigo-900 ${theme === 'dark' ? 'dark bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'}`}>
      <style dangerouslySetInnerHTML={{__html: `
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1; 
          border-radius: 4px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; 
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569; 
        }
      `}} />

      <header className="w-full p-4 flex justify-end max-w-5xl mx-auto gap-2">
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-transparent dark:border-slate-800 text-slate-600 dark:text-slate-300"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </header>

      {showAdminLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
            <div className="flex items-center gap-3 dark:text-slate-200 text-slate-800 mb-4">
              <Lock className="w-5 h-5 text-indigo-500" />
              <h3 className="font-serif text-xl font-bold">Admin Portal</h3>
            </div>
            
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1 font-mono">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={adminUsernameInput}
                    onChange={(e) => setAdminUsernameInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    placeholder="Enter admin username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1 font-mono">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 text-sm font-medium pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setShowAdminLoginModal(false);
                    setLoginError('');
                    setAdminUsernameInput('');
                    setAdminPasswordInput('');
                  }}
                  className="px-4 py-2 border dark:border-slate-600 border-slate-300 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-sm"
                >
                  Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
            <div className="flex items-center gap-3 dark:text-slate-200 text-slate-800 mb-4">
              <FolderPlus className="w-6 h-6 text-indigo-500" />
              <h3 className="font-serif text-xl font-bold">New Subgroup / Category</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1 font-mono">
                  Group Name
                </label>
                <input 
                  type="text" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  placeholder="e.g. Hematology, SM Biology..."
                />
              </div>

              <div className="flex justify-end gap-3 text-sm font-medium pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setShowGroupModal(false);
                    setNewGroupName('');
                  }}
                  className="px-4 py-2 border dark:border-slate-600 border-slate-300 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-sm"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
            <div className="flex items-center gap-3 dark:text-slate-200 text-slate-800 mb-4">
              <AlertCircle className="w-6 h-6 text-indigo-500" />
              <h3 className="font-serif text-xl font-bold">{confirmModal.title}</h3>
            </div>
            <p className="dark:text-slate-400 text-slate-600 text-sm leading-relaxed mb-8">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3 text-sm font-medium">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border dark:border-slate-600 border-slate-300 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.action}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="pb-20 w-full flex justify-center">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'add_quiz' && renderAddQuiz()}
        {currentView === 'prompt' && renderPrompt()}
        {currentView === 'taking_quiz' && renderTakingQuiz()}
        {currentView === 'review' && renderReview()}
      </main>
    </div>
  );
}
