/* STREAMING_CHUNK: Importing core dependencies... */
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
  Undo,
  Sparkles,
  Award,
  BookMarked,
  Settings,
  Save
} from "lucide-react";

// Pull credentials from Netlify environment variables (using Vite syntax)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ""; 
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export default function App() {
  /* STREAMING_CHUNK: Initializing state variables... */
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

  // View state tracking
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [uncertainQuestions, setUncertainQuestions] = useState({});
  const [jsonInput, setJsonInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  
  const [correctUncertainOpen, setCorrectUncertainOpen] = useState(false);

  // Admin Question Editing State
  const [showEditQuestionModal, setShowEditQuestionModal] = useState(false);
  const [editQuestionIndex, setEditQuestionIndex] = useState(null);
  const [editQuestionText, setEditQuestionText] = useState('');
  const [editQuestionOptions, setEditQuestionOptions] = useState([]);

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

  /* STREAMING_CHUNK: Dynamically loading database script... */
  useEffect(() => {
    const loadSupabaseScript = () => {
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

  /* STREAMING_CHUNK: Synchronizing remote and local data ... */
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
            uncertainQuestions: p.uncertain_questions || {},
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

  /* STREAMING_CHUNK: Configuring physical key interactions ... */
  useEffect(() => {
    if (currentView !== 'taking_quiz' || !activeQuiz || showEditQuestionModal) return;

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
  }, [currentView, activeQuiz, currentQuestionIndex, userAnswers, uncertainQuestions, showEditQuestionModal]);

  /* STREAMING_CHUNK: Formatting AI exam prompt templates ... */
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

  /* STREAMING_CHUNK: Managing category and group additions ... */
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

  /* STREAMING_CHUNK: Managing database quiz operations ... */
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

  /* STREAMING_CHUNK: Setting up Question Editing functionality ... */
  const openEditQuestionModal = (idx) => {
    const q = activeQuiz.questions[idx];
    setEditQuestionIndex(idx);
    setEditQuestionText(q.question);
    // Deep clone options
    setEditQuestionOptions(JSON.parse(JSON.stringify(q.options)));
    setShowEditQuestionModal(true);
  };

  const handleSaveEditedQuestion = async () => {
    if (!activeQuiz || editQuestionIndex === null) return;

    // Build updated questions array
    const updatedQuestions = [...activeQuiz.questions];
    updatedQuestions[editQuestionIndex] = {
      ...updatedQuestions[editQuestionIndex],
      question: editQuestionText,
      options: editQuestionOptions
    };

    const updatedQuiz = {
      ...activeQuiz,
      questions: updatedQuestions
    };

    // Update state immediately
    setActiveQuiz(updatedQuiz);
    setQuizzes(quizzes.map(q => q.id === activeQuiz.id ? updatedQuiz : q));

    const isSupabaseReady = isSupabaseLoaded && !!supabaseRef.current;
    if (isSupabaseReady) {
      try {
        const { error } = await supabaseRef.current
          .from('quizzes')
          .update({ questions: updatedQuestions })
          .eq('id', activeQuiz.id);
        if (error) throw error;
      } catch (err) {
        console.error("Cloud question update failed:", err);
      }
    } else {
      const localQuizzes = quizzes.map(q => q.id === activeQuiz.id ? updatedQuiz : q);
      saveLocalFallback(localQuizzes, null, null);
    }

    setShowEditQuestionModal(false);
    setEditQuestionIndex(null);
  };

  const handleEditOptionText = (optIdx, val) => {
    const nextOpts = [...editQuestionOptions];
    nextOpts[optIdx].text = val;
    setEditQuestionOptions(nextOpts);
  };

  const handleEditOptionExplanation = (optIdx, val) => {
    const nextOpts = [...editQuestionOptions];
    nextOpts[optIdx].explanation = val;
    setEditQuestionOptions(nextOpts);
  };

  const handleSelectCorrectOption = (optId) => {
    const nextOpts = editQuestionOptions.map(o => ({
      ...o,
      isCorrect: o.id === optId
    }));
    setEditQuestionOptions(nextOpts);
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

  /* STREAMING_CHUNK: Managing persistent assessment states ... */
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

  /* STREAMING_CHUNK: Setting up elegant footer component with royal gold themes... */
  const renderSignatureFooter = () => (
    <footer className="w-full text-center py-8 border-t dark:border-slate-800/80 border-slate-200/80 mt-20 text-xs text-slate-500 font-serif">
      <div className="flex flex-col items-center justify-center gap-3">
        <span className="italic text-amber-700 dark:text-[#d4af37] font-semibold text-[13px] tracking-wide relative">
          <Sparkles className="w-4 h-4 text-[#c5a059] dark:text-[#d4af37] inline-block mr-1.5 -mt-0.5" />
          Thanks to Allah for His Blessings
        </span>
        <div className="flex flex-col items-center gap-0.5 text-slate-500">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-sans">Designed & Developed by</span>
          <span className="font-bold text-slate-700 dark:text-slate-300 tracking-wider text-sm">
            Ahmed Falah Hasan
          </span>
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

  /* STREAMING_CHUNK: Formatting dashboard views with royal colors... */
  const renderDashboard = () => (
    <div className="w-full max-w-5xl mx-auto animate-fade-in px-4 flex flex-col min-h-[85vh] justify-between">
      <div>
        {/* Navigation & Admin Panel bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b dark:border-slate-800/60 border-slate-200/80 pb-6 gap-6">
          <div className="flex items-center gap-3.5 group">
            <div className="p-2.5 bg-gradient-to-tr from-[#9a7b3c] to-[#c5a059] rounded-xl shadow-lg shadow-amber-500/10">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-serif tracking-wide text-slate-900 dark:text-white font-black leading-tight">
                Scholar's Sanctuary
              </h1>
              <p className="text-xs text-[#c5a059] dark:text-[#d4af37] tracking-wider uppercase font-sans font-bold mt-0.5">Academic Assessment Hub</p>
            </div>
          </div>
          <div className="flex flex-row gap-2.5 items-center">
            {isAdmin ? (
              <div className="flex flex-wrap gap-2 items-center">
                <button 
                  onClick={() => setCurrentView('prompt')}
                  className="flex items-center gap-2 px-4 py-2 border dark:border-[#d4af37]/30 border-[#c5a059]/30 dark:bg-slate-800/40 bg-white dark:text-[#d4af37] text-amber-800 hover:bg-[#c5a059]/10 transition-all rounded-lg text-sm font-bold shadow-sm"
                >
                  <FileText className="w-4 h-4 text-[#c5a059] dark:text-[#d4af37]" /> Exam Prompt
                </button>
                <button 
                  onClick={() => setCurrentView('add_quiz')}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#9a7b3c] to-[#c5a059] text-white hover:opacity-95 transition-all rounded-lg shadow-md text-sm font-bold"
                >
                  <Plus className="w-4 h-4" /> Import Quiz
                </button>
                <button 
                  onClick={handleAdminLogout}
                  className="flex items-center gap-1.5 px-3 py-2 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 dark:hover:bg-rose-950/20 hover:bg-rose-50 rounded-lg text-xs font-bold transition-all"
                >
                  Logout Admin
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAdminLoginModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold border border-slate-200 dark:border-[#d4af37]/20 shadow-sm transition-all"
              >
                <Lock className="w-4 h-4 text-[#c5a059]" /> Admin Login
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Glowing Banner Section - ONLY visible on Home (currentGroupId is null) */}
        {currentGroupId === null && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-8 md:p-10 mb-8 shadow-xl border border-[#d4af37]/20">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#d4af37]/10 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full text-xs font-bold text-[#d4af37] mb-4 font-mono uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> Portal Operational
              </span>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-3 tracking-wide">
                Welcome to Your Personal Exam Suite
              </h2>
              {/* FIXED CONTRAST: High readability for dark-on-dark welcome banner */}
              <p className="text-slate-300 dark:text-slate-300 text-sm leading-relaxed mb-6 font-medium">
                A high-precision testing environment configured for academic excellence. Upload past questions or notes, generate quizzes, and monitor your concept confidence.
              </p>
            </div>
          </div>
        )}

        {/* Breadcrumb Navigation Trail */}
        <div className="flex items-center gap-2 mb-8 text-xs text-slate-500 dark:text-slate-300 font-bold tracking-wider uppercase bg-slate-100 dark:bg-slate-900/40 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-[#d4af37]/10 flex-wrap">
          <button 
            onClick={() => setCurrentGroupId(null)}
            className="hover:text-[#c5a059] dark:hover:text-[#d4af37] transition-colors flex items-center gap-1"
          >
            <Home className="w-3.5 h-3.5" /> HOME
          </button>
          {getBreadcrumbs().map((b, idx) => (
            <React.Fragment key={b.id}>
              <ChevronRight className="w-3.5 h-3.5 text-[#c5a059]" />
              <button 
                onClick={() => setCurrentGroupId(b.id)}
                className="hover:text-[#c5a059] dark:hover:text-[#d4af37] transition-colors"
              >
                {b.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Admin controls and Folder Modification */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2.5 mb-8 bg-slate-100 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-[#d4af37]/20 backdrop-blur-md">
            <button 
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#9a7b3c] to-[#c5a059] hover:opacity-95 text-white rounded-lg transition-all text-xs font-bold shadow-md shadow-amber-500/10"
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
                className="flex items-center gap-1.5 px-4 py-2 border dark:border-[#d4af37]/30 border-[#c5a059]/30 text-slate-700 dark:text-[#d4af37] rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-xs font-bold"
              >
                <Edit3 className="w-4 h-4 text-[#c5a059]" /> Rename Current Group
              </button>
            )}
          </div>
        )}

        {editingGroupId && (
          <div className="mb-6 p-4 border dark:border-[#d4af37]/30 border-[#c5a059]/30 bg-[#c5a059]/5 rounded-xl flex flex-wrap items-center gap-4">
            <span className="text-sm font-bold dark:text-[#d4af37]">Rename Group:</span>
            <input 
              type="text"
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              className="px-3 py-1.5 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-1 focus:ring-[#c5a059] focus:outline-none focus:border-[#c5a059]"
            />
            <button 
              onClick={handleUpdateGroup}
              className="px-4 py-1.5 bg-[#c5a059] text-white rounded-lg text-xs font-bold hover:bg-[#a98442] transition-all"
            >
              Save
            </button>
            <button 
              onClick={() => setEditingGroupId(null)}
              className="px-3 py-1.5 border rounded-lg text-xs font-bold dark:text-slate-400"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="space-y-10">
          {/* Subgroups (Folders) Cards Section */}
          {currentLevelGroups.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif dark:text-slate-200 text-slate-800 font-bold flex items-center gap-2">
                <Folder className="w-5 h-5 text-[#c5a059] dark:text-[#d4af37] fill-[#c5a059]/10" /> Academic Subgroups
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {currentLevelGroups.map(grp => (
                  <div 
                    key={grp.id}
                    className="relative group bg-white dark:bg-slate-900 border dark:border-[#d4af37]/20 border-slate-200 rounded-xl p-5 flex items-center justify-between hover:shadow-md hover:border-[#c5a059] dark:hover:border-[#d4af37] transition-all cursor-pointer"
                    onClick={() => setCurrentGroupId(grp.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-[#c5a059]/10 text-[#c5a059] dark:text-[#d4af37]">
                        <Folder className="w-6 h-6 fill-amber-500/10" />
                      </div>
                      <span className="font-serif font-bold text-md dark:text-slate-100 text-slate-800 pr-6 group-hover:text-[#c5a059] dark:group-hover:text-[#d4af37] transition-colors">
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
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:text-rose-500 dark:hover:text-rose-400 text-slate-400 absolute top-4 right-4 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20"
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

          {/* Assessments / Exams Grid Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-serif dark:text-slate-200 text-slate-800 font-bold flex items-center gap-2">
              <Library className="w-5 h-5 text-[#c5a059] dark:text-[#d4af37]" /> Assessments
            </h3>
            
            {currentLevelGroups.length === 0 && currentLevelQuizzes.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed dark:border-[#d4af37]/30 border-slate-350 rounded-2xl dark:bg-slate-900/10 bg-slate-50/50 px-6 max-w-xl mx-auto">
                <BookMarked className="w-12 h-12 mx-auto dark:text-[#d4af37] text-[#c5a059] mb-4" />
                <p className="dark:text-slate-300 text-slate-600 font-serif text-lg font-bold">This classroom section is empty.</p>
                <p className="text-slate-400 text-xs mt-1">No folders or assessments have been published inside this hierarchy.</p>
                {currentGroupId && (
                  <button 
                    onClick={() => {
                      const currentGroupObj = groups.find(g => g.id === currentGroupId);
                      if (currentGroupObj) {
                        setCurrentGroupId(currentGroupObj.parent_id);
                      }
                    }}
                    className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 border rounded-lg text-xs font-bold dark:border-slate-700 dark:hover:bg-slate-850 hover:bg-slate-100 transition-all"
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
                    <div key={quiz.id} className="group relative dark:bg-slate-900 bg-white border dark:border-[#d4af37]/20 border-slate-200/80 p-6 rounded-2xl hover:shadow-xl hover:border-[#c5a059]/40 dark:hover:border-[#d4af37]/40 transition-all duration-350 flex flex-col justify-between overflow-hidden shadow-sm">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#c5a059]/20 dark:bg-[#d4af37]/10 group-hover:bg-[#c5a059] dark:group-hover:bg-[#d4af37] transition-colors duration-300"></div>
                      
                      <div className="pl-2">
                        {isAdmin && (
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button onClick={() => {
                              showConfirm(
                                "Delete Assessment",
                                `Are you sure you want to permanently delete "${quiz.quiz_title}"?`,
                                () => deleteQuiz(quiz.id)
                              );
                            }} className="p-1.5 rounded-lg dark:text-slate-550 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        
                        <h3 className="text-xl font-serif dark:text-slate-100 text-slate-800 mb-2 pr-8 leading-snug font-bold group-hover:text-[#c5a059] dark:group-hover:text-[#d4af37] transition-colors">
                          {quiz.quiz_title}
                        </h3>
                        
                        <div className="flex flex-wrap gap-2.5 mb-6 items-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 dark:bg-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                            <BookOpen className="w-3.5 h-3.5 text-[#c5a059] dark:text-[#d4af37]" />
                            {quiz.questions ? quiz.questions.length : 0} Questions
                          </span>
                          {isStarted && (
                            <>
                              <span className="text-slate-400 text-xs">•</span>
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${isCompleted ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-[#c5a059] dark:text-[#d4af37]'}`}>
                                {isCompleted ? <Award className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                {isCompleted ? 'Completed' : `In Progress (${answeredCount}/${quiz.questions.length})`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mt-4 pl-2">
                        {!isStarted ? (
                          <button 
                            onClick={() => startQuiz(quiz)}
                            className="w-full flex items-center justify-center gap-2 py-3 dark:bg-slate-850 bg-slate-50 dark:hover:bg-[#d4af37] hover:bg-[#c5a059]/10 dark:text-slate-200 text-[#c5a059] hover:text-[#a98442] dark:hover:text-slate-950 rounded-xl transition-all font-bold text-sm shadow-inner"
                          >
                            <Play className="w-4 h-4 fill-[#c5a059] dark:fill-slate-200 inline" /> Start Assessment
                          </button>
                        ) : isCompleted ? (
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => reviewSavedQuiz(quiz)}
                              className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white rounded-xl transition-all text-sm font-bold shadow-md shadow-emerald-500/10"
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
                              className="flex items-center justify-center gap-2 py-2.5 dark:bg-slate-800 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-300 text-slate-700 rounded-xl transition-all text-sm font-bold"
                            >
                              <RotateCcw className="w-4 h-4" /> Reset
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {/* FIXED CONTRAST: High class golden resume button without dark on dark or low contrast colors */}
                            <button 
                              onClick={() => continueQuiz(quiz)}
                              className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#9a7b3c] to-[#c5a059] hover:opacity-95 text-white rounded-xl transition-all text-sm font-bold shadow-md shadow-amber-500/10"
                            >
                              <Play className="w-4 h-4" /> Resume
                            </button>
                            {/* QUIETER ANIMATION: Gentle, non-jumping action buttons */}
                            <button 
                              onClick={() => {
                                showConfirm(
                                  "Restart Assessment?",
                                  "This clears your current session and starts from the beginning. Proceed?",
                                  () => startQuiz(quiz)
                                );
                              }}
                              className="flex items-center justify-center gap-2 py-2.5 dark:bg-slate-800 bg-slate-100 hover:bg-slate-250 dark:hover:bg-slate-700 dark:text-slate-300 text-slate-750 rounded-xl transition-all text-sm font-bold"
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

  /* STREAMING_CHUNK: Formatting import and create quiz screens... */
  const renderAddQuiz = () => (
    <div className="w-full max-w-3xl mx-auto animate-fade-in px-4 flex flex-col min-h-[85vh] justify-between">
      <div>
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 dark:text-slate-400 text-slate-500 hover:text-[#c5a059] dark:hover:text-[#d4af37] mb-8 transition-colors font-bold text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#9a7b3c] to-[#c5a059]"></div>
          <h2 className="text-2xl font-serif dark:text-white text-slate-900 mb-3 flex items-center gap-3 font-bold">
            <FileText className="w-6 h-6 text-[#c5a059]" /> Import Academic Assessment
          </h2>
          <p className="dark:text-slate-400 text-slate-600 mb-6 text-sm">
            Paste the JSON generated by your AI tool. It will be cataloged under the current folder pathway.
          </p>
          
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full h-96 dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-300 rounded-xl p-4 dark:text-slate-300 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] transition-all resize-none shadow-inner"
            placeholder='{"quizTitle": "...", "questions": [...]}'
          />
          
          {errorMsg && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold">{errorMsg}</p>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleAddQuiz}
              disabled={!jsonInput.trim()}
              className="w-full sm:w-auto px-8 py-3 bg-[#c5a059] text-white hover:bg-[#a98442] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all font-bold shadow-md"
            >
              Upload Quiz to Database
            </button>
          </div>
        </div>
      </div>
      {renderSignatureFooter()}
    </div>
  );

  /* STREAMING_CHUNK: Formatting admin prompt guide ... */
  const renderPrompt = () => (
    <div className="w-full max-w-4xl mx-auto animate-fade-in px-4 flex flex-col min-h-[85vh] justify-between">
      <div>
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 dark:text-slate-400 text-slate-500 hover:text-[#c5a059] dark:hover:text-[#d4af37] mb-8 transition-colors font-bold text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#9a7b3c] to-[#c5a059]"></div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-serif dark:text-white text-slate-900 font-bold">AI Exam Generator Prompt</h2>
            <button 
              onClick={copyToClipboard}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 dark:bg-slate-800 bg-slate-100 dark:text-slate-200 text-slate-700 hover:bg-[#c5a059]/10 hover:text-[#c5a059] dark:hover:bg-slate-850 dark:hover:text-[#d4af37] border dark:border-slate-700 border-slate-300 transition-all rounded-xl text-xs font-bold shadow-sm"
            >
              <Copy className="w-4 h-4" /> {copySuccess || 'Copy Prompt'}
            </button>
          </div>
          <p className="dark:text-slate-400 text-slate-600 mb-6 border-b dark:border-slate-800/80 border-slate-200/80 pb-6 text-sm">
            Copy this instructional prompt and provide it to your preferred AI model along with your lecture notes. It enforces the strict academic rules and JSON data structure required for this application.
          </p>

          <div className="dark:bg-slate-950 bg-slate-50 border dark:border-slate-850 border-slate-200 p-6 rounded-xl overflow-y-auto max-h-[50vh] custom-scrollbar shadow-inner">
            <pre className="dark:text-slate-300 text-slate-700 font-mono text-xs md:text-sm whitespace-pre-wrap leading-relaxed select-all">
              {aiPrompt}
            </pre>
          </div>
        </div>
      </div>
      {renderSignatureFooter()}
    </div>
  );

  /* STREAMING_CHUNK: Formatting active quiz engine view... */
  const renderTakingQuiz = () => {
    if (!activeQuiz) return null;
    const currentQ = activeQuiz.questions[currentQuestionIndex];
    const selectedOptId = userAnswers[currentQuestionIndex];
    const isAnswered = selectedOptId !== undefined;
    const isUncertain = uncertainQuestions[currentQuestionIndex] === true;

    // Calculate interactive progress percentage
    const progressPercent = Math.round(((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100);

    return (
      <div className="w-full max-w-4xl mx-auto animate-fade-in px-4 flex flex-col min-h-[85vh] justify-between">
        <div>
          {/* Dashboard utility controllers */}
          <div className="flex flex-row justify-between items-center mb-6">
            <button 
              onClick={resetToDashboard} 
              className="flex items-center gap-2 dark:text-slate-400 text-slate-600 hover:text-[#c5a059] dark:hover:text-[#d4af37] transition-all duration-300 text-xs px-3.5 py-2 border dark:border-slate-850 border-slate-350 hover:border-[#c5a059]/50 dark:bg-slate-900 bg-white rounded-lg font-bold shadow-sm"
            >
              <LogOut className="w-4 h-4" /> Save & Exit
            </button>

            {isAdmin && (
              <button 
                onClick={() => openEditQuestionModal(currentQuestionIndex)}
                className="flex items-center gap-1.5 px-3 py-2 border border-[#c5a059]/40 bg-[#c5a059]/5 dark:text-[#d4af37] text-amber-800 hover:bg-[#c5a059]/10 rounded-lg text-xs font-bold transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit This Question
              </button>
            )}
            
            <button 
              onClick={() => {
                showConfirm(
                  "Reset Progress",
                  "Are you sure you want to clear your current answers and restart this assessment?",
                  () => startQuiz(activeQuiz)
                );
              }}
              className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 hover:text-[#c5a059] dark:hover:text-[#d4af37] transition-colors duration-300 text-xs font-bold"
            >
              <RotateCcw className="w-4 h-4" /> Restart Exam
            </button>
          </div>

          <div className="flex justify-between items-center mb-4 border-b dark:border-slate-800/80 border-slate-200/80 pb-4">
            <h2 className="text-xl md:text-2xl font-serif dark:text-slate-100 text-slate-800 font-bold truncate pr-4 leading-tight">
              {activeQuiz.quiz_title}
            </h2>
            <div className="text-amber-800 dark:text-[#d4af37] font-bold tracking-wider uppercase whitespace-nowrap bg-[#c5a059]/10 px-3.5 py-1.5 rounded-lg text-xs border border-[#c5a059]/25">
              Q{currentQuestionIndex + 1} OF {activeQuiz.questions.length}
            </div>
          </div>

          {/* Micro-animated dynamic progress bar */}
          <div className="w-full h-1.5 dark:bg-slate-850 bg-slate-200 rounded-full overflow-hidden mb-8 shadow-inner flex">
            <div 
              className="h-full bg-gradient-to-r from-[#9a7b3c] to-[#c5a059] transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Quick assessment question nodes selector */}
          <div className="flex gap-2 overflow-x-auto mb-8 pb-3.5 custom-scrollbar">
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
                borderClass = "border-amber-500 dark:border-amber-500 shadow-amber-500/10 shadow-md";
              } else if (isCurrent) {
                borderClass = "border-[#c5a059] dark:border-[#d4af37] shadow-[#c5a059]/10 shadow-md";
              } else if (!hasAnswered) {
                borderClass = "border-slate-200/80 dark:border-slate-800/80 hover:border-slate-350 dark:hover:border-slate-700";
              } else if (isCorrect) {
                borderClass = "border-emerald-500/30 dark:border-emerald-500/20";
              } else {
                borderClass = "border-rose-500/30 dark:border-rose-500/20";
              }

              if (isCurrent && !qUncertain) {
                bgClass = "bg-[#c5a059]/15 dark:bg-[#d4af37]/10";
                textClass = "text-[#c5a059] dark:text-[#d4af37] font-extrabold";
              } else if (!hasAnswered) {
                bgClass = "bg-white dark:bg-slate-900";
                textClass = "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100";
              } else if (isCorrect) {
                bgClass = "bg-emerald-500/10 dark:bg-emerald-950/25";
                textClass = "text-emerald-600 dark:text-emerald-400 font-bold";
              } else {
                bgClass = "bg-rose-500/10 dark:bg-rose-950/25";
                textClass = "text-rose-600 dark:text-rose-400 font-bold";
              }

              const activeIndicator = isCurrent ? " ring-1 ring-[#c5a059]/50 dark:ring-[#d4af37]/50" : "";

              return (
                <button
                  key={idx}
                  onClick={() => handleJumpToQuestion(idx)}
                  className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border text-sm cursor-pointer transition-all duration-300 ${borderClass} ${bgClass} ${textClass} ${activeIndicator}`}
                  title={`Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Interactive Card containing questions and options */}
          <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-6 md:p-10 shadow-lg relative overflow-hidden">
            <h3 className="text-xl md:text-2xl dark:text-slate-100 text-slate-800 font-serif leading-relaxed mb-8 font-bold">
              {currentQ.question}
            </h3>

            <div className="space-y-4">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOptId === option.id;
                const isCorrectOption = option.isCorrect;
                
                let btnClass = "w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-start gap-4 relative group ";
                
                if (!isAnswered) {
                  btnClass += "border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900 dark:text-slate-200 text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-[#c5a059] dark:hover:border-[#d4af37] cursor-pointer hover:shadow-md";
                } else {
                  if (isCorrectOption) {
                    btnClass += "border-emerald-500 dark:border-emerald-600/80 bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 shadow-md"; 
                  } else if (isSelected && !isCorrectOption) {
                    btnClass += "border-rose-500 dark:border-rose-600/80 bg-rose-500/10 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 shadow-md"; 
                  } else {
                    btnClass += "border-slate-200 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-955/30 text-slate-450 dark:text-slate-600 opacity-50"; 
                  }
                }

                return (
                  <div key={option.id} className="flex flex-col">
                    <button 
                      disabled={isAnswered}
                      onClick={() => handleOptionSelect(option.id)}
                      className={btnClass}
                    >
                      <span className={`font-mono font-bold min-w-[24px] mt-0.5 text-xs px-2 py-0.5 rounded ${
                        isAnswered && isCorrectOption 
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                          : isAnswered && isSelected && !isCorrectOption 
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300' 
                          : 'bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {option.id}
                      </span>
                      <span className="flex-grow leading-relaxed font-sans">{option.text}</span>
                      
                      {!isAnswered && (
                        <span className="hidden sm:inline-block absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-750 text-slate-500 dark:text-slate-400 tracking-wider">
                          PRESS {idx + 1}
                        </span>
                      )}

                      {isAnswered && isCorrectOption && <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
                      {isAnswered && isSelected && !isCorrectOption && <X className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                    </button>
                    
                    {isAnswered && (
                      <div className={`mt-3 p-4 text-sm rounded-xl border-l-4 ml-2 md:ml-4 shadow-sm ${
                        isCorrectOption 
                          ? "bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-550 text-emerald-800 dark:text-emerald-200" 
                          : "bg-rose-500/5 dark:bg-rose-950/10 border-rose-550 text-rose-800 dark:text-rose-200"
                      }`}>
                        <span className="font-bold uppercase tracking-wider text-xs block mb-1 font-mono">{isCorrectOption ? 'Correct Insights:' : 'Conceptual Error Explained:'}</span>
                        <span className="leading-relaxed font-sans font-medium">{option.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination / navigation controllers */}
            <div className="mt-10 flex flex-col-reverse sm:flex-row justify-between items-center border-t dark:border-slate-800 border-slate-200 pt-6 gap-4">
              <button 
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
                className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-2.5 border dark:border-slate-800 border-slate-300 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
              >
                <ChevronLeft className="w-4 h-4" /> <span>Previous</span>
              </button>

              <div className="w-full sm:w-auto flex justify-center items-center">
                <button
                  onClick={toggleUncertainty}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 border rounded-xl transition-all duration-300 text-xs font-bold w-full sm:w-auto ${
                    isUncertain
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:border-amber-500 hover:text-amber-600 dark:hover:border-amber-500 dark:hover:text-[#d4af37]'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{isUncertain ? 'Marked as Uncertain' : 'Mark Uncertain'}</span>
                </button>
              </div>

              <button 
                onClick={currentQuestionIndex < activeQuiz.questions.length - 1 ? handleNextQuestion : finishQuiz}
                className="w-full sm:w-auto flex justify-center items-center gap-2 px-6 py-2.5 bg-[#c5a059] hover:bg-[#a98442] text-white rounded-xl transition-all duration-300 shadow-md text-xs font-bold"
              >
                {currentQuestionIndex < activeQuiz.questions.length - 1 ? 'Next Question' : 'Finish Assessment'} 
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Visual hotkey controller panel (Desktop Only) */}
            <div className="mt-8 flex flex-wrap justify-center items-center gap-y-2 gap-x-6 text-[10px] uppercase tracking-wider dark:text-slate-500 text-slate-400 pt-4 border-t border-dashed dark:border-slate-850 border-slate-250 hidden md:flex font-bold">
              <div className="flex items-center gap-1.5 font-sans">
                <Keyboard className="w-4 h-4 text-[#c5a059] dark:text-[#d4af37]" />
                <span>HOTKEYS ACTIVE:</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="bg-slate-100 dark:bg-slate-850 border dark:border-slate-800 border-slate-250 px-1.5 py-0.5 rounded text-[9px]">1 - 4</span>
                <span>Select Response</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="bg-slate-100 dark:bg-slate-850 border dark:border-slate-800 border-slate-250 px-1.5 py-0.5 rounded text-[9px]">C</span>
                <span>Uncertainty Toggler</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="bg-slate-100 dark:bg-slate-850 border dark:border-slate-800 border-slate-250 px-1.5 py-0.5 rounded text-[9px]">← / →</span>
                <span>Slide Navigate</span>
              </div>
            </div>
          </div>
        </div>
        {renderSignatureFooter()}
      </div>
    );
  };

  /* STREAMING_CHUNK: Formatting review analysis screen... */
  const renderReview = () => {
    const { incorrect, correctButUncertain } = computeReviewData();
    const totalQuestions = activeQuiz.questions.length;
    const score = totalQuestions - incorrect.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    return (
      <div className="w-full max-w-4xl mx-auto animate-fade-in px-4 flex flex-col min-h-[85vh] justify-between">
        <div>
          {/* Completion Metrics Score Card */}
          <div className="text-center mb-10 dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-8 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-[#c5a059] to-amber-500"></div>
            <Award className="w-16 h-16 mx-auto text-[#c5a059] dark:text-[#d4af37] mb-4" />
            <h2 className="text-3xl font-serif dark:text-white text-slate-900 mb-2 font-bold tracking-wide">Assessment Completed</h2>
            <div className="flex items-center justify-center gap-4 text-lg">
              <span className="dark:text-slate-300 text-slate-600 font-serif">Score: <strong className="text-[#c5a059] dark:text-[#d4af37] font-bold">{score} / {totalQuestions}</strong></span>
              <span className="dark:text-slate-700 text-slate-350">|</span>
              <span className={`font-black ${percentage >= 80 ? 'text-emerald-600 dark:text-emerald-400' : percentage >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {percentage}%
              </span>
            </div>
          </div>

          {incorrect.length === 0 ? (
            <div className="text-center dark:bg-emerald-950/10 bg-emerald-50/50 border border-emerald-500/20 p-10 rounded-2xl shadow-sm">
              <Check className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
              <h3 className="text-2xl text-emerald-700 dark:text-emerald-400 font-serif mb-2 font-bold">Excellent understanding!</h3>
              <p className="text-emerald-600 dark:text-emerald-500/80 text-sm font-medium">You completed every question correctly without errors. Your concept grasp is established.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-xl dark:text-slate-200 text-slate-800 font-serif font-bold border-b dark:border-slate-800 border-slate-200 pb-2 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" /> Review Your Mistakes
              </h3>
              {incorrect.map((item, idx) => {
                const q = item.question;
                const selectedOpt = q.options.find(o => o.id === item.selectedOptionId);
                const correctOpt = q.options.find(o => o.isCorrect);

                return (
                  <div key={idx} className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 p-6 rounded-2xl relative overflow-hidden shadow-sm">
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${item.isUncertain ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5 pl-2">
                      <h4 className="text-lg dark:text-slate-100 text-slate-800 font-serif leading-relaxed flex-grow font-bold">{q.question}</h4>
                      
                      <div className="flex items-center gap-2 shrink-0 font-mono">
                        {isAdmin && (
                          <button 
                            onClick={() => openEditQuestionModal(item.index)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs border border-[#c5a059]/40 bg-[#c5a059]/10 text-amber-800 dark:text-[#d4af37] rounded-md font-bold transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
                        {item.isUncertain ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shadow-sm">
                            <AlertTriangle className="w-3.5 h-3.5" /> Uncertain / Incorrect
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 shadow-sm">
                            <ShieldAlert className="w-3.5 h-3.5" /> Confident / Incorrect
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pl-2">
                      <div className="bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/10 p-4 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 block mb-2 font-mono">Your Choice</span>
                        {selectedOpt ? (
                          <>
                            <p className="dark:text-slate-200 text-slate-800 mb-2 font-bold text-sm">{selectedOpt.id}. {selectedOpt.text}</p>
                            <p className="text-xs dark:text-rose-350 text-rose-700 leading-relaxed font-medium">{selectedOpt.explanation}</p>
                          </>
                        ) : (
                          <p className="dark:text-slate-500 text-slate-450 italic text-xs font-semibold">Skipped Response Node</p>
                        )}
                      </div>
                      
                      <div className="bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/10 p-4 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block mb-2 font-mono">Correct Answer</span>
                        <p className="dark:text-slate-200 text-slate-800 mb-2 font-bold text-sm">{correctOpt.id}. {correctOpt.text}</p>
                        <p className="text-xs dark:text-emerald-350 text-emerald-700 leading-relaxed font-medium">{correctOpt.explanation}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t dark:border-slate-800 border-slate-100 pl-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest dark:text-slate-500 text-slate-450 block mb-3 font-mono">Other Options Analysis</span>
                      <div className="space-y-2">
                        {q.options.filter(o => o.id !== correctOpt.id && o.id !== item.selectedOptionId).map(opt => (
                          <div key={opt.id} className="text-xs dark:text-slate-400 text-slate-600 font-medium">
                            <span className="font-bold dark:text-slate-500 text-slate-400 mr-1.5 font-mono">{opt.id}.</span> {opt.explanation}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Correct but uncertain answers toggler */}
          <div className="mt-10 dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => setCorrectUncertainOpen(!correctUncertainOpen)}
              className="w-full flex justify-between items-center p-5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-serif dark:text-slate-200 text-slate-800 text-lg font-bold">Correct but Uncertain Responses</h4>
                  <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5 font-semibold">
                    You answered <strong className="text-amber-600 dark:text-amber-400">{correctButUncertain.length}</strong> questions correctly but had marked them as uncertain.
                  </p>
                </div>
              </div>
              <div className="text-slate-400 dark:text-slate-500">
                {correctUncertainOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            {correctUncertainOpen && (
              <div className="p-6 border-t dark:border-slate-800 border-amber-150 space-y-6 dark:bg-slate-950/30 bg-slate-50/50 animate-fade-in">
                {correctButUncertain.length === 0 ? (
                  <p className="dark:text-slate-555 text-slate-400 text-xs italic text-center py-4 font-bold">No uncertain correct responses recorded. Complete confidence held.</p>
                ) : (
                  <div className="space-y-6">
                    <p className="dark:text-slate-400 text-slate-650 text-xs mb-4 font-semibold leading-relaxed">
                      Reviewing these concepts helps bridge educated or intuitive guesses into robust, structured retention.
                    </p>
                    
                    {correctButUncertain.map((item, idx) => {
                      const q = item.question;
                      const correctOpt = q.options.find(o => o.isCorrect);

                      return (
                        <div key={idx} className="border-l-4 border-[#c5a059] pl-4 py-1">
                          <div className="flex items-center justify-between gap-2 mb-2 text-[10px] font-bold dark:text-slate-500 text-slate-400 uppercase tracking-widest font-mono">
                            <span>Question {item.index + 1}</span>
                            {isAdmin && (
                              <button 
                                onClick={() => openEditQuestionModal(item.index)}
                                className="flex items-center gap-1 px-2.5 py-1 text-[10px] border border-[#c5a059]/40 bg-[#c5a059]/10 text-amber-800 dark:text-[#d4af37] rounded-md font-bold transition-all"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit Question
                              </button>
                            )}
                          </div>
                          <h5 className="font-serif dark:text-slate-200 text-slate-800 text-md mb-2 font-bold">{q.question}</h5>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-2 font-mono uppercase tracking-wider">
                            Correct Response Node: {correctOpt.id}. {correctOpt.text}
                          </p>
                          <div className="text-xs dark:text-slate-300 text-slate-700 bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 border-slate-200 mt-2 font-medium">
                            <strong className="block text-indigo-600 dark:text-indigo-400 text-[10px] uppercase tracking-widest mb-1.5 font-mono">Explanation:</strong>
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

          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4 pt-8 border-t dark:border-slate-850 border-slate-200/60">
            <button 
              onClick={resetToDashboard}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 border border-slate-300 dark:border-slate-700 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-300 font-bold text-sm shadow-sm"
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
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-[#c5a059] hover:bg-[#a98442] text-white rounded-xl transition-all duration-300 font-bold text-sm shadow-md"
            >
              <RotateCcw className="w-5 h-5" /> Retake Assessment
            </button>
          </div>
        </div>
        {renderSignatureFooter()}
      </div>
    );
  };

  /* STREAMING_CHUNK: Setting up main system shell container and royal overlays ... */
  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans selection:bg-[#c5a059]/30 dark:selection:bg-[#d4af37]/20 ${theme === 'dark' ? 'dark bg-[#0b0f19] text-slate-55' : 'bg-[#fdfbf7] text-slate-900'}`}>
      
      {/* Header theme utilities controller */}
      <header className="w-full p-4 flex justify-end max-w-5xl mx-auto gap-2">
        <button 
          onClick={toggleTheme}
          className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-transparent dark:border-[#d4af37]/20 text-slate-600 dark:text-[#d4af37] shadow-sm dark:bg-slate-900 bg-white"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-5 h-5 text-[#c5a059]" /> : <Sun className="w-5 h-5 text-[#d4af37]" />}
        </button>
      </header>

      {/* STREAMING_CHUNK: Managing administrative settings overlay components ... */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="dark:bg-slate-900 bg-white border dark:border-[#d4af37]/30 border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#9a7b3c] to-[#c5a059]"></div>
            <div className="flex items-center gap-3 dark:text-slate-200 text-slate-800 mb-6">
              <div className="p-2 rounded-lg bg-amber-500/10 text-[#c5a059]">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-bold">Admin Portal Login</h3>
            </div>
            
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 font-mono">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={adminUsernameInput}
                    onChange={(e) => setAdminUsernameInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-[#c5a059] text-sm font-medium"
                    placeholder="Enter admin username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 font-mono">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-[#c5a059] text-sm font-medium"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-500/10">
                  <AlertCircle className="w-4 h-4" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 text-sm font-bold pt-4 border-t dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => {
                    setShowAdminLoginModal(false);
                    setLoginError('');
                    setAdminUsernameInput('');
                    setAdminPasswordInput('');
                  }}
                  className="px-4 py-2 border dark:border-slate-700/80 border-slate-300 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#c5a059] hover:bg-[#a98442] text-white rounded-xl transition-all shadow-md text-xs font-bold"
                >
                  Authorize Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STREAMING_CHUNK: Managing admin question edit modal controller ... */}
      {showEditQuestionModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="dark:bg-slate-900 bg-white border dark:border-[#d4af37]/30 border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#9a7b3c] to-[#c5a059]"></div>
            
            <div className="flex items-center justify-between mb-4 pb-2 border-b dark:border-slate-800 border-slate-100">
              <div className="flex items-center gap-2 text-[#c5a059] dark:text-[#d4af37]">
                <Edit3 className="w-5 h-5" />
                <h3 className="font-serif text-xl font-bold">Edit Question {editQuestionIndex + 1}</h3>
              </div>
              <button 
                onClick={() => setShowEditQuestionModal(false)}
                className="p-1 text-slate-400 hover:text-[#c5a059] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-grow">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 font-mono">
                  Question Text
                </label>
                <textarea 
                  value={editQuestionText}
                  onChange={(e) => setEditQuestionText(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-[#c5a059] text-sm font-semibold h-20 resize-none"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono">
                  Options and Explanations
                </label>
                {editQuestionOptions.map((opt, idx) => (
                  <div key={opt.id} className="p-4 border dark:border-slate-800 border-slate-200 rounded-xl space-y-3 dark:bg-slate-950/40 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#c5a059] dark:text-[#d4af37]">
                        Option {opt.id}
                      </span>
                      <label className="flex items-center gap-2 text-xs font-bold font-mono cursor-pointer">
                        <input 
                          type="radio" 
                          name="correctOptionRadio"
                          checked={opt.isCorrect}
                          onChange={() => handleSelectCorrectOption(opt.id)}
                          className="accent-[#c5a059] dark:accent-[#d4af37]"
                        />
                        <span className={opt.isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
                          Is Correct Answer
                        </span>
                      </label>
                    </div>

                    <input 
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleEditOptionText(idx, e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:border-[#c5a059]"
                      placeholder="Option Text"
                    />

                    <textarea
                      value={opt.explanation}
                      onChange={(e) => handleEditOptionExplanation(idx, e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:border-[#c5a059] h-14 resize-none"
                      placeholder="Why is this option correct or incorrect?"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 text-sm font-bold pt-4 mt-4 border-t dark:border-slate-800 border-slate-100">
              <button 
                type="button"
                onClick={() => setShowEditQuestionModal(false)}
                className="px-4 py-2 border dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-xs font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEditedQuestion}
                className="px-5 py-2 bg-[#c5a059] hover:bg-[#a98442] text-white rounded-xl transition-all shadow-md text-xs font-bold flex items-center gap-1"
              >
                <Save className="w-4 h-4" /> Save Question Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="fixed inset-0 bg-slate-955/65 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
            <div className="flex items-center gap-3 dark:text-slate-200 text-slate-800 mb-6">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                <FolderPlus className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-bold">New Category / Topic Folder</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 font-mono">
                  Group Folder Name
                </label>
                <input 
                  type="text" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl dark:bg-slate-955 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-semibold"
                  placeholder="e.g. Cardiology, Hematology, CVS..."
                />
              </div>

              <div className="flex justify-end gap-3 text-sm font-bold pt-4 border-t dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => {
                    setShowGroupModal(false);
                    setNewGroupName('');
                  }}
                  className="px-4 py-2 border dark:border-slate-700/80 border-slate-300 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md shadow-indigo-500/15 text-xs font-bold"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-955/65 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="dark:bg-slate-900 bg-white border dark:border-[#d4af37]/20 border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#9a7b3c] to-[#c5a059]"></div>
            <div className="flex items-center gap-3 dark:text-slate-200 text-slate-800 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10 text-[#c5a059]">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-bold">{confirmModal.title}</h3>
            </div>
            <p className="dark:text-slate-400 text-slate-600 text-sm leading-relaxed mb-8 font-medium">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3 text-sm font-bold border-t dark:border-slate-800 pt-4">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-xs font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.action}
                className="px-5 py-2 bg-[#c5a059] hover:bg-[#a98442] text-white rounded-xl transition-all shadow-md text-xs font-bold"
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