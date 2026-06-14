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
  Save,
  CheckCircle2,
  Share2
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ""; 
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export default function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('academicTheme');
    return savedTheme ? savedTheme : 'dark'; // Luxury dark default
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

  // Edit Question Modal State
  const [showEditQuestionModal, setShowEditQuestionModal] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [editedQuestionData, setEditedQuestionData] = useState(null);

  // Move Quiz Modal State
  const [showMoveQuizModal, setShowMoveQuizModal] = useState(false);
  const [quizToMove, setQuizToMove] = useState(null);
  const [targetGroupId, setTargetGroupId] = useState('root');

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

  // Anti-flooding state control variables
  const [requestTimestamps, setRequestTimestamps] = useState([]);
  const [isFloodingBlocked, setIsFloodingBlocked] = useState(false);
  const [floodingCooldown, setFloodingCooldown] = useState(0);

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
    if (floodingCooldown <= 0) {
      if (isFloodingBlocked) setIsFloodingBlocked(false);
      return;
    }
    const timer = setTimeout(() => {
      setFloodingCooldown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [floodingCooldown, isFloodingBlocked]);

  const verifyRateLimit = () => {
    const now = Date.now();
    const tenSecondsAgo = now - 10000;
    const activeRequests = requestTimestamps.filter(t => t > tenSecondsAgo);
    
    if (activeRequests.length >= 6) {
      setIsFloodingBlocked(true);
      setFloodingCooldown(15); // Lock mutations for 15 seconds
      return false;
    }
    
    setRequestTimestamps([...activeRequests, now]);
    return true;
  };

  useEffect(() => {
    const loadSupabaseScript = () => {
      if (SUPABASE_URL && SUPABASE_URL.trim() !== "") {
        if (window.supabase) {
          initializeClient();
        } else {
          const script = document.createElement('script');
          script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
          script.async = true;
          script.onload = initializeClient;
          script.onerror = () => {
            console.warn("Supabase SDK CDN load failed. Operating in LocalStorage mode.");
            setIsSupabaseLoaded(false);
          };
          document.head.appendChild(script);
        }
      } else {
        setIsSupabaseLoaded(false);
      }
    };

    const initializeClient = () => {
      try {
        if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
          const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          supabaseRef.current = client;
          setIsSupabaseLoaded(true);

          // Track Auth State for Admin status
          client.auth.onAuthStateChange((event, session) => {
            if (session?.user?.email === 'ahmedfalahoffical@gmail.com') {
              setIsAdmin(true);
              localStorage.setItem('isSanctuaryAdmin', 'true');
            } else {
              setIsAdmin(false);
              localStorage.setItem('isSanctuaryAdmin', 'false');
            }
          });
        }
      } catch (e) {
        console.warn("Supabase integration failed. Falling back to local state.", e);
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
            uncertainQuestions: p.uncertain_questions || {},
            status: p.status
          };
        });
        setQuizStates(liveStates);

      } catch (err) {
        console.error("Supabase load failed, falling back to local storage:", err);
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
    if (currentView !== 'taking_quiz' || !activeQuiz || showEditQuestionModal) return;

    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      const currentQ = activeQuiz.questions[currentQuestionIndex];
      const selectedOptId = userAnswers[currentQuestionIndex];
      const isAnswered = selectedOptId !== undefined;

      if (!isAnswered) {
        if (e.key === '1' && currentQ.options[0]) handleOptionSelect(currentQ.options[0].id);
        else if (e.key === '2' && currentQ.options[1]) handleOptionSelect(currentQ.options[1].id);
        else if (e.key === '3' && currentQ.options[2]) handleOptionSelect(currentQ.options[2].id);
        else if (e.key === '4' && currentQ.options[3]) handleOptionSelect(currentQ.options[3].id);
      }

      if (e.key === 'c' || e.key === 'C') {
        toggleUncertainty();
      }

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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, activeQuiz, currentQuestionIndex, userAnswers, uncertainQuestions, showEditQuestionModal]);

  const aiPrompt = `You are acting as an expert university professor and exam designer. 

I have uploaded two types of sources into this notebook:
1. My Lecture Notes (the specific material I have been taught)
2. Past Year Questions (PYQs)

Your task is to generate a 20-question Multiple Choice Question (MCQ) practice exam for me. To do this successfully, you must strictly follow these rules:

1. Strict Scope Constraint: Every single question you generate must be based ONLY on concepts explicitly explained in the uploaded Lecture Notes. If a topic appears in the PYQs but is NOT present in the Lecture Notes, you must completely ignore it.
2. Format & Style Match: Analyze the provided PYQs to understand the exact formatting, phrasing style, number of options (e.g., A, B, C, D), and difficulty level.
3. Mixing Past Questions: You can include or closely adapt actual questions from the PYQs, but ONLY if they align with the current Lecture Notes. 
4. Output Format: You MUST output the final quiz STRICTLY as a raw JSON object. Do not include markdown formatting (like \`\`\`json).

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
          "explanation": "Detailed explanation of why this choice is correct or incorrect."
        }
      ]
    }
  ]
}`;

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    if (!verifyRateLimit()) return;
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
        console.error("Cloud category creation failed:", err);
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
    if (!verifyRateLimit()) return;
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
        console.error("Cloud category update failed:", err);
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
    if (!verifyRateLimit()) return;
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
        console.error("Cloud folder deletion failed:", err);
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

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!supabaseRef.current) {
      setLoginError("Authentication server not ready.");
      return;
    }

    const email = adminUsernameInput.trim();
    const { error } = await supabaseRef.current.auth.signInWithPassword({
      email: email,
      password: adminPasswordInput,
    });

    if (error) {
      console.error("Supabase Auth Error:", error.message, error.status);
      setLoginError(error.message);
    } else {
      setShowAdminLoginModal(false);
      setAdminUsernameInput('');
      setAdminPasswordInput('');
      setLoginError('');
    }
  };

  const handleAdminLogout = async () => {
    if (supabaseRef.current) {
      await supabaseRef.current.auth.signOut();
    }
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
      const isSupabaseReady = isSupabaseLoaded && !!supabaseRef.current;
      const quizzesToInsert = [];

      // Auto-detection logic for bulk import vs single quiz structure (image_85b257.png)
      if (parsed.quizzes && typeof parsed.quizzes === 'object' && !Array.isArray(parsed.quizzes)) {
        // Bulk import detection
        for (const key of Object.keys(parsed.quizzes)) {
          const item = parsed.quizzes[key];
          if (!item.quizTitle || !item.questions || !Array.isArray(item.questions)) {
            throw new Error(`Bulk item [${key}] is missing the proper 'quizTitle' or 'questions' array.`);
          }
          quizzesToInsert.push({
            quiz_title: item.quizTitle,
            questions: item.questions,
            group_id: currentGroupId
          });
        }
      } else if (parsed.quizTitle && parsed.questions && Array.isArray(parsed.questions)) {
        // Single quiz import structure detection
        quizzesToInsert.push({
          quiz_title: parsed.quizTitle,
          questions: parsed.questions,
          group_id: currentGroupId
        });
      } else {
        throw new Error("Invalid payload. Provide a single quiz object, or a 'quizzes' dictionary matching the bulk import specification.");
      }

      if (quizzesToInsert.length === 0) {
        throw new Error("No quizzes detected inside payload.");
      }

      if (!verifyRateLimit()) return;

      const insertedQuizzes = [];
      if (isSupabaseReady) {
        for (const q of quizzesToInsert) {
          const { data, error } = await supabaseRef.current
            .from('quizzes')
            .insert([q])
            .select();
          if (error) throw error;
          if (data && data[0]) insertedQuizzes.push(data[0]);
        }
        setQuizzes([...insertedQuizzes, ...quizzes]);
      } else {
        const localItems = quizzesToInsert.map(q => ({
          ...q,
          id: 'local_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now()
        }));
        const updatedQuizzes = [...localItems, ...quizzes];
        setQuizzes(updatedQuizzes);
        saveLocalFallback(updatedQuizzes, null, null);
      }
      
      setJsonInput('');
      setCurrentView('dashboard');
    } catch (err) {
      setErrorMsg("Import rejected: " + err.message);
    }
  };

  const handleOpenMoveModal = (quiz, e) => {
    e.stopPropagation();
    setQuizToMove(quiz);
    setTargetGroupId(quiz.group_id === null ? 'root' : String(quiz.group_id));
    setShowMoveQuizModal(true);
  };

  const handleMoveQuiz = async () => {
    if (!quizToMove) return;
    if (!verifyRateLimit()) return;
    const isSupabaseReady = isSupabaseLoaded && !!supabaseRef.current;
    
    // Coerce numeric string values to true numbers to match PostgreSQL bigint types
    let destinationGroupId = targetGroupId === 'root' ? null : targetGroupId;
    if (destinationGroupId !== null && !isNaN(Number(destinationGroupId))) {
      destinationGroupId = Number(destinationGroupId);
    }

    if (isSupabaseReady) {
      try {
        const { error } = await supabaseRef.current
          .from('quizzes')
          .update({ group_id: destinationGroupId })
          .eq('id', quizToMove.id);
        if (error) throw error;
        setQuizzes(quizzes.map(q => q.id === quizToMove.id ? { ...q, group_id: destinationGroupId } : q));
      } catch (err) {
        console.error("Cloud movement failed:", err);
      }
    } else {
      const updated = quizzes.map(q => q.id === quizToMove.id ? { ...q, group_id: destinationGroupId } : q);
      setQuizzes(updated);
      saveLocalFallback(updated, null, null);
    }
    setShowMoveQuizModal(false);
    setQuizToMove(null);
  };

  const openEditQuestionPanel = (qIdx) => {
    if (!isAdmin) return;
    const targetQ = activeQuiz.questions[qIdx];
    setEditingQuestionIndex(qIdx);
    setEditedQuestionData(JSON.parse(JSON.stringify(targetQ))); // deep copy
    setShowEditQuestionModal(true);
  };

  const handleSaveEditedQuestion = async () => {
    if (!editedQuestionData || editingQuestionIndex === null) return;
    if (!verifyRateLimit()) return;

    // Update activeQuiz in local state first
    const updatedQuestions = [...activeQuiz.questions];
    updatedQuestions[editingQuestionIndex] = editedQuestionData;
    
    const updatedQuiz = {
      ...activeQuiz,
      questions: updatedQuestions
    };
    
    setActiveQuiz(updatedQuiz);

    // Save update to global quiz list
    const updatedQuizzesList = quizzes.map(q => q.id === activeQuiz.id ? updatedQuiz : q);
    setQuizzes(updatedQuizzesList);

    // Persist to DB or LocalStorage fallback
    const isSupabaseReady = isSupabaseLoaded && !!supabaseRef.current;
    if (isSupabaseReady) {
      try {
        const { error } = await supabaseRef.current
          .from('quizzes')
          .update({ questions: updatedQuestions })
          .eq('id', activeQuiz.id);
        if (error) throw error;
      } catch (err) {
        console.error("Failed to persist edited question to Supabase:", err);
      }
    } else {
      saveLocalFallback(updatedQuizzesList, null, null);
    }

    setShowEditQuestionModal(false);
    setEditingQuestionIndex(null);
    setEditedQuestionData(null);
  };

  const deleteQuiz = async (id) => {
    if (!verifyRateLimit()) return;
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
        console.error("Failed to delete exam:", err);
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

    // Throttle progress state writes strictly if spam-clicked
    if (updatedProgress.userAnswers && !verifyRateLimit()) {
      console.warn("Write request throttled to prevent database flooding.");
      saveLocalFallback(null, null, nextStates);
      return; 
    }

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
        console.error("Database tracker update mismatch:", err);
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
    <footer className="w-full text-center py-10 border-t border-[#C5A059]/20 mt-20 text-xs text-slate-500 font-serif">
      <div className="flex flex-col items-center justify-center gap-3">
        <span className="italic text-[#C5A059] font-semibold text-[13px] tracking-wide relative flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
          Thanks to Allah for His Blessings
        </span>
        <div className="flex flex-col items-center gap-0.5 text-slate-500">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-sans">Designed & Developed by</span>
          <span className="font-bold text-slate-700 dark:text-slate-300 tracking-wider text-sm transition-colors duration-300">
            Ahmed Falah Hasan
          </span>
          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-sans mt-2">Inspiration by</span>
          <span className="font-semibold text-[#C5A059] dark:text-[#D4AF37] tracking-wider text-xs transition-colors duration-300">
            Rawan Husien
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

  // Helper to build recursive breadcrumb strings for target relocation selections
  const getFullBreadcrumbString = (targetId) => {
    const trail = [];
    let parent = targetId;
    while (parent) {
      const pGrp = groups.find(g => g.id === parent);
      if (pGrp) {
        trail.unshift(pGrp.name);
        parent = pGrp.parent_id;
      } else {
        break;
      }
    }
    return trail.length > 0 ? trail.join(" > ") : "Home Dashboard";
  };

  const currentLevelGroups = groups.filter(g => g.parent_id === currentGroupId);
  const currentLevelQuizzes = quizzes.filter(q => q.group_id === currentGroupId);

  const renderDashboard = () => (
    <div className="w-full max-w-5xl mx-auto animate-fade-in px-4 flex flex-col min-h-[85vh] justify-between">
      <div>
        {/* Navigation & Admin Panel bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-[#C5A059]/25 pb-6 gap-6">
          <div className="flex items-center gap-3.5 group">
            <div className="p-2.5 bg-gradient-to-tr from-[#C5A059] to-[#D4AF37] rounded-xl shadow-lg shadow-[#D4AF37]/10 transform transition-transform duration-300">
              <GraduationCap className="w-8 h-8 text-[#0B0F19]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-serif tracking-wide text-slate-900 dark:text-white font-black leading-tight">
                Scholar's Sanctuary
              </h1>
              <p className="text-xs text-[#C5A059] tracking-wider uppercase font-sans font-semibold mt-0.5">Academic Assessment Hub</p>
            </div>
          </div>
          <div className="flex flex-row gap-2.5 items-center">
            {isAdmin ? (
              <div className="flex flex-wrap gap-2 items-center">
                <button 
                  onClick={() => setCurrentView('prompt')}
                  className="flex items-center gap-2 px-4 py-2 border border-[#C5A059]/30 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md dark:text-[#D4AF37] text-slate-700 hover:bg-[#C5A059]/10 transition-all duration-300 rounded-lg text-sm font-semibold"
                >
                  <FileText className="w-4 h-4 text-[#C5A059]" /> Exam Prompt
                </button>
                <button 
                  onClick={() => setCurrentView('add_quiz')}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0F19] hover:opacity-95 transition-all duration-300 rounded-lg shadow-md shadow-[#D4AF37]/15 text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" /> Import Quiz
                </button>
                <button 
                  onClick={handleAdminLogout}
                  className="flex items-center gap-1.5 px-3 py-2 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 dark:hover:bg-rose-950/20 hover:bg-rose-50 rounded-lg text-xs font-bold transition-all duration-300"
                >
                  Logout Admin
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAdminLoginModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md hover:bg-[#C5A059]/10 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold border border-[#C5A059]/30 shadow-sm transition-all duration-300"
              >
                <Lock className="w-4 h-4 text-[#C5A059]" /> Admin Login
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Glowing Banner Section - Rendering ONLY on main dashboard level */}
        {currentGroupId === null && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#131a2e] to-slate-950 p-8 md:p-10 mb-8 shadow-xl border border-[#C5A059]/30 backdrop-blur-lg">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#C5A059]/15 border border-[#C5A059]/35 rounded-full text-xs font-bold text-[#D4AF37] mb-4 font-mono uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> Portal Operational
              </span>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-3 tracking-wide">
                Welcome UOBCOM 100 to your personal quiz bank
              </h2>
              <p className="text-slate-300 dark:text-[#EAE3D2] text-sm leading-relaxed mb-6 font-medium">
                Your high-fidelity study companion. Take customized mock assessments, pinpoint and immediately review conceptual errors, flag uncertain questions to master key topics, and monitor your overall learning progress.
              </p>
            </div>
          </div>
        )}

        {/* Breadcrumb Navigation Trail */}
        <div className="flex items-center gap-2 mb-8 text-xs text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase bg-[#C5A059]/5 dark:bg-slate-900/30 px-4 py-2.5 rounded-lg border border-[#C5A059]/20 flex-wrap backdrop-blur-md">
          <button 
            onClick={() => setCurrentGroupId(null)}
            className="hover:text-[#D4AF37] transition-colors flex items-center gap-1 text-[#C5A059]"
          >
            <Home className="w-3.5 h-3.5" /> HOME
          </button>
          {getBreadcrumbs().map((b, idx) => (
            <React.Fragment key={b.id}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button 
                onClick={() => setCurrentGroupId(b.id)}
                className="hover:text-[#D4AF37] transition-colors"
              >
                {b.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Admin actions and Folder creation bar */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2.5 mb-8 bg-[#C5A059]/5 dark:bg-slate-900/40 p-4 rounded-xl border border-[#C5A059]/20 backdrop-blur-md">
            <button 
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0F19] rounded-lg transition-all duration-300 text-xs font-bold shadow-md shadow-[#D4AF37]/5"
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
                className="flex items-center gap-1.5 px-4 py-2 border border-[#C5A059]/30 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-[#C5A059]/10 transition-all duration-300 text-xs font-semibold"
              >
                <Edit3 className="w-4 h-4 text-[#C5A059]" /> Rename Current Group
              </button>
            )}
          </div>
        )}

        {editingGroupId && (
          <div className="mb-6 p-4 border border-[#C5A059]/40 bg-[#C5A059]/5 rounded-xl flex flex-wrap items-center gap-4 animate-fade-in">
            <span className="text-sm font-bold dark:text-slate-300">Rename Group:</span>
            <input 
              type="text"
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              className="px-3 py-1.5 border border-[#C5A059]/30 rounded-lg bg-white/20 dark:bg-slate-950/40 text-sm focus:ring-1 focus:ring-[#D4AF37] focus:outline-none"
            />
            <button 
              onClick={handleUpdateGroup}
              className="px-4 py-1.5 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0F19] rounded-lg text-xs font-bold hover:opacity-90 transition-all"
            >
              Save
            </button>
            <button 
              onClick={() => setEditingGroupId(null)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold dark:text-slate-400"
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
                <Folder className="w-5 h-5 text-[#C5A059] fill-[#C5A059]/10" /> Academic Subgroups
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {currentLevelGroups.map(grp => (
                  <div 
                    key={grp.id}
                    className="relative group bg-white/40 dark:bg-slate-900/40 border border-[#C5A059]/20 rounded-xl p-5 flex items-center justify-between hover:shadow-md hover:border-[#D4AF37]/50 transition-all duration-300 cursor-pointer backdrop-blur-md"
                    onClick={() => setCurrentGroupId(grp.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-[#C5A059]/10 text-[#C5A059] group-hover:scale-105 transition-transform duration-300">
                        <Folder className="w-6 h-6 fill-[#C5A059]/10" />
                      </div>
                      <span className="font-serif font-bold text-md dark:text-slate-100 text-slate-800 pr-6 group-hover:text-[#D4AF37] transition-colors">
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
              <Library className="w-5 h-5 text-[#C5A059]" /> Assessments
            </h3>
            
            {currentLevelGroups.length === 0 && currentLevelQuizzes.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-[#C5A059]/30 rounded-2xl bg-[#C5A059]/5 dark:bg-slate-900/10 px-6 max-w-xl mx-auto backdrop-blur-md">
                <BookMarked className="w-12 h-12 mx-auto text-[#C5A059] mb-4" />
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
                    className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 border border-[#C5A059]/30 rounded-lg text-xs font-bold dark:text-slate-400 dark:hover:bg-slate-800 hover:bg-slate-100 transition-all"
                  >
                    <Undo className="w-3.5 h-3.5 text-[#C5A059]" /> Back Up
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
                    <div key={quiz.id} className="group relative bg-white/40 dark:bg-slate-900/40 border border-[#C5A059]/25 p-6 rounded-2xl hover:shadow-xl hover:border-[#D4AF37]/55 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm backdrop-blur-md">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C5A059]/20 group-hover:bg-[#D4AF37] transition-colors duration-300"></div>
                      
                      <div className="pl-2">
                        {isAdmin && (
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                            <button 
                              onClick={(e) => handleOpenMoveModal(quiz, e)}
                              className="p-1.5 rounded-lg dark:text-slate-400 text-slate-400 hover:text-[#D4AF37] hover:bg-[#C5A059]/10 transition-all"
                              title="Move quiz folder location"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => {
                              e.stopPropagation();
                              showConfirm(
                                "Delete Assessment",
                                `Are you sure you want to permanently delete "${quiz.quiz_title}"?`,
                                () => deleteQuiz(quiz.id)
                              );
                            }} className="p-1.5 rounded-lg dark:text-slate-400 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        
                        <h3 className="text-xl font-serif dark:text-slate-100 text-slate-800 mb-2 pr-12 leading-snug font-bold group-hover:text-[#D4AF37] transition-colors">
                          {quiz.quiz_title}
                        </h3>
                        
                        <div className="flex flex-wrap gap-2.5 mb-6 items-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider dark:text-slate-300 text-slate-500 bg-[#C5A059]/10 px-2.5 py-1 rounded-md">
                            <BookOpen className="w-3.5 h-3.5 text-[#C5A059]" />
                            {quiz.questions ? quiz.questions.length : 0} Questions
                          </span>
                          {isStarted && (
                            <>
                              <span className="text-slate-400 text-xs">•</span>
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${isCompleted ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
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
                            className="w-full flex items-center justify-center gap-2 py-3 bg-[#C5A059]/10 hover:bg-gradient-to-r hover:from-[#C5A059] hover:to-[#D4AF37] dark:text-slate-200 text-slate-700 hover:text-[#0B0F19] rounded-xl transition-all duration-300 font-bold text-sm shadow-inner"
                          >
                            <Play className="w-4 h-4 fill-current inline" /> Start Assessment
                          </button>
                        ) : isCompleted ? (
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => reviewSavedQuiz(quiz)}
                              className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white rounded-xl transition-all duration-300 text-sm font-bold shadow-md shadow-emerald-500/10"
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
                              className="flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-slate-700 rounded-xl transition-all duration-300 text-sm font-bold"
                            >
                              <RotateCcw className="w-4 h-4" /> Reset
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => continueQuiz(quiz)}
                              className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0F19] hover:opacity-95 rounded-xl transition-all duration-300 text-sm font-bold shadow-md shadow-[#D4AF37]/10"
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
                              className="flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-slate-700 rounded-xl transition-all duration-300 text-sm font-bold"
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
    <div className="w-full max-w-3xl mx-auto animate-fade-in px-4 flex flex-col min-h-[85vh] justify-between">
      <div>
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 dark:text-slate-400 text-slate-500 hover:text-[#D4AF37] mb-8 transition-colors duration-300 font-bold text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="bg-white/40 dark:bg-[#0d1321]/80 border border-[#C5A059]/25 rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A059] to-[#D4AF37]"></div>
          <h2 className="text-2xl font-serif dark:text-white text-slate-900 mb-3 flex items-center gap-3 font-bold">
            <FileText className="w-6 h-6 text-[#C5A059]" /> Import Academic Assessment
          </h2>
          <p className="dark:text-slate-400 text-slate-600 mb-4 text-sm leading-relaxed">
            Paste your raw JSON. The engine **automatically detects** both single and **bulk lecture import structures** (matching <span className="font-mono text-[#D4AF37] font-bold">image_85b257.png</span> specs).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs bg-[#C5A059]/5 border border-[#C5A059]/20 p-4 rounded-xl font-mono text-slate-600 dark:text-slate-300">
            <div>
              <span className="font-bold text-[#D4AF37]">Single Quiz Syntax:</span>
              <pre className="mt-1 opacity-80 text-[10px]">
{`{
  "quizTitle": "Lecture Title",
  "questions": [...]
}`}
              </pre>
            </div>
            <div>
              <span className="font-bold text-[#D4AF37]">Bulk Quizzes Syntax:</span>
              <pre className="mt-1 opacity-80 text-[10px]">
{`{
  "quizzes": {
    "Lecture 1": { "quizTitle": "...", "questions": [...] },
    "Lecture 2": { "quizTitle": "...", "questions": [...] }
  }
}`}
              </pre>
            </div>
          </div>
          
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full h-80 bg-white/20 dark:bg-slate-950/40 border border-[#C5A059]/30 rounded-xl p-4 dark:text-slate-300 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all resize-none shadow-inner"
            placeholder='Paste your JSON payload...'
          />
          
          {errorMsg && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold">{errorMsg}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleAddQuiz}
              disabled={!jsonInput.trim()}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0F19] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-300 font-bold shadow-md shadow-[#D4AF37]/15"
            >
              Compile & Inject Quizzes
            </button>
          </div>
        </div>
      </div>
      {renderSignatureFooter()}
    </div>
  );

  const renderPrompt = () => (
    <div className="w-full max-w-4xl mx-auto animate-fade-in px-4 flex flex-col min-h-[85vh] justify-between">
      <div>
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 dark:text-slate-400 text-slate-500 hover:text-[#D4AF37] mb-8 transition-colors duration-300 font-bold text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="bg-white/40 dark:bg-[#0d1321]/80 border border-[#C5A059]/25 rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A059] to-[#D4AF37]"></div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-serif dark:text-white text-slate-900 font-bold">AI Exam Generator Prompt</h2>
            <button 
              onClick={copyToClipboard}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#C5A059]/10 border border-[#C5A059]/30 text-slate-700 dark:text-slate-200 hover:bg-[#C5A059]/25 transition-all duration-300 rounded-xl text-xs font-bold shadow-sm"
            >
              <Copy className="w-4 h-4 text-[#C5A059]" /> {copySuccess || 'Copy Prompt'}
            </button>
          </div>
          <p className="dark:text-slate-400 text-slate-600 mb-6 border-b border-slate-200/55 dark:border-slate-800/80 pb-6 text-sm">
            Copy this instructional prompt and provide it to your preferred AI model along with your lecture notes.
          </p>

          <div className="bg-white/10 dark:bg-slate-950/30 border border-[#C5A059]/20 p-6 rounded-xl overflow-y-auto max-h-[50vh] custom-scrollbar shadow-inner">
            <pre className="dark:text-slate-300 text-slate-700 font-mono text-xs md:text-sm whitespace-pre-wrap leading-relaxed select-all">
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

    // Calculate fluid progress percentages
    const progressPercent = Math.round(((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100);

    return (
      <div className="w-full max-w-4xl mx-auto animate-fade-in px-4 flex flex-col min-h-[85vh] justify-between">
        <div>
          <div className="flex flex-row justify-between items-center mb-6">
            <button 
              onClick={resetToDashboard} 
              className="flex items-center gap-2 dark:text-slate-400 text-slate-600 hover:text-[#D4AF37] transition-all duration-300 text-xs px-3.5 py-2 border border-[#C5A059]/25 bg-white/40 dark:bg-slate-900/40 rounded-lg font-bold shadow-sm backdrop-blur-md"
            >
              <LogOut className="w-4 h-4 text-[#C5A059]" /> Save & Exit
            </button>
            
            <div className="flex items-center gap-4">
              {/* ADMIN EDIT BUTTON */}
              {isAdmin && (
                <button 
                  onClick={() => openEditQuestionPanel(currentQuestionIndex)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#D4AF37] bg-[#C5A059]/10 hover:bg-[#C5A059]/25 border border-[#C5A059]/30 px-3.5 py-2 rounded-lg transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Question
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
                className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-colors duration-300 text-xs font-bold"
              >
                <RotateCcw className="w-4 h-4" /> Restart Exam
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4 border-b border-[#C5A059]/25 pb-4">
            <h2 className="text-xl md:text-2xl font-serif dark:text-slate-100 text-slate-800 font-bold truncate pr-4 leading-tight">
              {activeQuiz.quiz_title}
            </h2>
            <div className="text-[#D4AF37] font-bold tracking-wider uppercase whitespace-nowrap bg-[#C5A059]/10 px-3.5 py-1.5 rounded-lg text-xs border border-[#C5A059]/20">
              Q{currentQuestionIndex + 1} OF {activeQuiz.questions.length}
            </div>
          </div>

          {/* Micro-animated dynamic progress bar */}
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-8 shadow-inner flex">
            <div 
              className="h-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Grid of Jump Targets */}
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
                borderClass = "border-amber-500 shadow-amber-500/10 shadow-md";
              } else if (isCurrent) {
                borderClass = "border-[#D4AF37] shadow-[#D4AF37]/10 shadow-md";
              } else if (!hasAnswered) {
                borderClass = "border-[#C5A059]/20";
              } else if (isCorrect) {
                borderClass = "border-emerald-500/30";
              } else {
                borderClass = "border-rose-500/30";
              }

              if (isCurrent && !qUncertain) {
                bgClass = "bg-[#C5A059]/15";
                textClass = "text-[#D4AF37] font-extrabold";
              } else if (!hasAnswered) {
                bgClass = "bg-white/20 dark:bg-slate-900/40 backdrop-blur-md";
                textClass = "text-slate-500 dark:text-slate-400 hover:text-[#D4AF37]";
              } else if (isCorrect) {
                bgClass = "bg-emerald-500/10";
                textClass = "text-emerald-500 font-bold";
              } else {
                bgClass = "bg-rose-500/10";
                textClass = "text-rose-500 font-bold";
              }

              const activeIndicator = isCurrent ? " ring-2 ring-[#D4AF37]/30 ring-offset-2 dark:ring-offset-slate-950" : "";

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
          <div className="bg-white/40 dark:bg-[#0d1321]/80 border border-[#C5A059]/25 rounded-2xl p-6 md:p-10 shadow-lg relative overflow-hidden backdrop-blur-md">
            <h3 className="text-xl md:text-2xl dark:text-slate-100 text-slate-800 font-serif leading-relaxed mb-8 font-bold">
              {currentQ.question}
            </h3>

            {/* Resolving low-contrast styling issues dynamically from image_870832.png */}
            <div className="space-y-4">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOptId === option.id;
                const isCorrectOption = option.isCorrect;
                
                let btnClass = "w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-start gap-4 relative group ";
                
                if (!isAnswered) {
                  btnClass += "border-[#C5A059]/20 bg-white/20 dark:bg-slate-900/20 text-slate-750 dark:text-slate-200 hover:bg-[#C5A059]/10 hover:border-[#D4AF37] cursor-pointer hover:shadow-md";
                } else {
                  if (isCorrectOption) {
                    btnClass += "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 shadow-md"; 
                  } else if (isSelected && !isCorrectOption) {
                    btnClass += "border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-300 shadow-md"; 
                  } else {
                    // RESOLVING image_870832.png: Translucent backdrop but keeping options fully readable (slate color weight)
                    btnClass += "border-[#C5A059]/15 bg-white/5 dark:bg-slate-950/20 text-slate-700 dark:text-slate-350 opacity-90 backdrop-blur-sm cursor-not-allowed"; 
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
                          : 'bg-[#C5A059]/20 text-slate-700 dark:text-[#D4AF37]'
                      }`}>
                        {option.id}
                      </span>
                      <span className="flex-grow leading-relaxed font-sans">{option.text}</span>
                      
                      {!isAnswered && (
                        <span className="hidden sm:inline-block absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-bold bg-[#C5A059]/15 px-2 py-1 rounded border border-[#C5A059]/30 text-[#D4AF37] tracking-wider">
                          PRESS {idx + 1}
                        </span>
                      )}

                      {isAnswered && isCorrectOption && <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />}
                      {isAnswered && isSelected && !isCorrectOption && <X className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
                    </button>
                    
                    {isAnswered && (
                      <div className={`mt-3 p-4 text-sm rounded-xl border-l-4 ml-2 md:ml-4 animate-fade-in shadow-sm ${
                        isCorrectOption 
                          ? "bg-emerald-500/5 border-emerald-500 text-emerald-800 dark:text-emerald-200" 
                          : "bg-rose-500/5 border-rose-500 text-rose-800 dark:text-rose-200"
                      }`}>
                        <span className="font-bold uppercase tracking-wider text-xs block mb-1 font-mono">{isCorrectOption ? 'Correct Insights:' : 'Conceptual Error Explained:'}</span>
                        <span className="leading-relaxed font-sans font-medium">{option.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination / Navigation Controllers */}
            <div className="mt-10 flex flex-col-reverse sm:flex-row justify-between items-center border-t border-[#C5A059]/20 pt-6 gap-4">
              <button 
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
                className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-2.5 border border-[#C5A059]/30 dark:text-slate-300 text-slate-700 hover:bg-[#C5A059]/10 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
              >
                <ChevronLeft className="w-4 h-4" /> <span>Previous</span>
              </button>

              <div className="w-full sm:w-auto flex justify-center items-center">
                <button
                  onClick={toggleUncertainty}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 border rounded-xl transition-all duration-300 text-xs font-bold w-full sm:w-auto ${
                    isUncertain
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : 'border-[#C5A059]/30 text-slate-500 hover:border-amber-500/60 hover:text-amber-500'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{isUncertain ? 'Marked as Uncertain' : 'Mark Uncertain'}</span>
                </button>
              </div>

              <button 
                onClick={currentQuestionIndex < activeQuiz.questions.length - 1 ? handleNextQuestion : finishQuiz}
                className="w-full sm:w-auto flex justify-center items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0F19] rounded-xl transition-all duration-300 shadow-md shadow-[#D4AF37]/15 text-xs font-bold"
              >
                {currentQuestionIndex < activeQuiz.questions.length - 1 ? 'Next Question' : 'Finish Assessment'} 
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Desktop Keyboard Assist Panel */}
            <div className="mt-8 flex flex-wrap justify-center items-center gap-y-2 gap-x-6 text-[10px] uppercase tracking-wider text-slate-400 pt-4 border-t border-dashed border-[#C5A059]/20 hidden md:flex font-bold">
              <div className="flex items-center gap-1.5 font-sans text-[#C5A059]">
                <Keyboard className="w-4 h-4" />
                <span>HOTKEYS ACTIVE:</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="bg-[#C5A059]/10 border border-[#C5A059]/30 px-1.5 py-0.5 rounded text-[9px]">1 - 4</span>
                <span>Select Response</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="bg-[#C5A059]/10 border border-[#C5A059]/30 px-1.5 py-0.5 rounded text-[9px]">C</span>
                <span>Uncertainty Toggler</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="bg-[#C5A059]/10 border border-[#C5A059]/30 px-1.5 py-0.5 rounded text-[9px]">← / →</span>
                <span>Slide Navigate</span>
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
      <div className="w-full max-w-4xl mx-auto animate-fade-in px-4 flex flex-col min-h-[85vh] justify-between">
        <div>
          {/* Completion Metrics Score Card */}
          <div className="text-center mb-10 bg-white/40 dark:bg-[#0d1321]/80 border border-[#C5A059]/25 rounded-2xl p-8 shadow-lg relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#C5A059]"></div>
            <Award className="w-16 h-16 mx-auto text-[#D4AF37] mb-4" />
            <h2 className="text-3xl font-serif dark:text-white text-slate-900 mb-2 font-bold tracking-wide">Assessment Completed</h2>
            <div className="flex items-center justify-center gap-4 text-lg">
              <span className="dark:text-slate-300 text-slate-600 font-serif">Score: <strong className="text-[#D4AF37] font-bold">{score} / {totalQuestions}</strong></span>
              <span className="dark:text-slate-700 text-slate-350">|</span>
              <span className={`font-black ${percentage >= 80 ? 'text-emerald-500' : percentage >= 60 ? 'text-[#D4AF37]' : 'text-rose-500'}`}>
                {percentage}%
              </span>
            </div>
          </div>

          {incorrect.length === 0 ? (
            <div className="text-center bg-emerald-500/5 border border-emerald-500/20 p-10 rounded-2xl shadow-sm">
              <Check className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
              <h3 className="text-2xl text-emerald-600 dark:text-emerald-400 font-serif mb-2 font-bold">Excellent understanding!</h3>
              <p className="text-emerald-600 dark:text-emerald-500/80 text-sm font-medium">You completed every question correctly without errors. Your concept grasp is established.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-xl dark:text-slate-200 text-slate-800 font-serif font-bold border-b border-[#C5A059]/25 pb-2 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" /> Review Your Mistakes
              </h3>
              {incorrect.map((item, idx) => {
                const q = item.question;
                const selectedOpt = q.options.find(o => o.id === item.selectedOptionId);
                const correctOpt = q.options.find(o => o.isCorrect);

                return (
                  <div key={idx} className="bg-white/40 dark:bg-[#0d1321]/80 border border-[#C5A059]/25 p-6 rounded-2xl relative overflow-hidden shadow-sm backdrop-blur-md">
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${item.isUncertain ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5 pl-2">
                      <h4 className="text-lg dark:text-slate-100 text-slate-800 font-serif leading-relaxed flex-grow font-bold">{q.question}</h4>
                      
                      <div className="shrink-0 font-mono">
                        {item.isUncertain ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm">
                            <AlertTriangle className="w-3.5 h-3.5" /> Uncertain / Incorrect
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-sm">
                            <ShieldAlert className="w-3.5 h-3.5" /> Confident / Incorrect
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pl-2">
                      <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500 block mb-2 font-mono">Your Choice</span>
                        {selectedOpt ? (
                          <>
                            <p className="dark:text-slate-200 text-slate-800 mb-2 font-bold text-sm">{selectedOpt.id}. {selectedOpt.text}</p>
                            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-medium">{selectedOpt.explanation}</p>
                          </>
                        ) : (
                          <p className="dark:text-slate-500 text-slate-450 italic text-xs font-semibold">Skipped Response Node</p>
                        )}
                      </div>
                      
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-550 block mb-2 font-mono">Correct Answer</span>
                        <p className="dark:text-slate-200 text-slate-800 mb-2 font-bold text-sm">{correctOpt.id}. {correctOpt.text}</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed font-medium">{correctOpt.explanation}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#C5A059]/20 pl-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-3 font-mono font-sans">Other Options Analysis</span>
                      <div className="space-y-2">
                        {q.options.filter(o => o.id !== correctOpt.id && o.id !== item.selectedOptionId).map(opt => (
                          <div key={opt.id} className="text-xs dark:text-slate-400 text-slate-600 font-medium">
                            <span className="font-bold text-slate-500 mr-1.5 font-mono">{opt.id}.</span> {opt.explanation}
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
          <div className="mt-10 bg-white/40 dark:bg-[#0d1321]/80 border border-[#C5A059]/25 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
            <button 
              onClick={() => setCorrectUncertainOpen(!correctUncertainOpen)}
              className="w-full flex justify-between items-center p-5 hover:bg-[#C5A059]/10 transition-colors duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-serif dark:text-slate-200 text-slate-800 text-lg font-bold">Correct but Uncertain Responses</h4>
                  <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5 font-semibold">
                    You answered <strong className="text-amber-500">{correctButUncertain.length}</strong> questions correctly but had marked them as uncertain.
                  </p>
                </div>
              </div>
              <div className="text-slate-450">
                {correctUncertainOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            {correctUncertainOpen && (
              <div className="p-6 border-t border-[#C5A059]/20 space-y-6 bg-slate-50/50 dark:bg-[#090d16] animate-fade-in">
                {correctButUncertain.length === 0 ? (
                  <p className="text-slate-500 text-xs italic text-center py-4 font-bold">No uncertain correct responses recorded. Complete confidence held.</p>
                ) : (
                  <div className="space-y-6">
                    <p className="dark:text-slate-400 text-slate-600 text-xs mb-4 font-semibold leading-relaxed">
                      Reviewing these concepts helps bridge educated or intuitive guesses into robust, structured retention.
                    </p>
                    
                    {correctButUncertain.map((item, idx) => {
                      const q = item.question;
                      const correctOpt = q.options.find(o => o.isCorrect);

                      return (
                        <div key={idx} className="border-l-4 border-amber-500 pl-4 py-1">
                          <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">
                            <span>Question {item.index + 1}</span>
                          </div>
                          <h5 className="font-serif dark:text-slate-200 text-slate-800 text-md mb-2 font-bold">{q.question}</h5>
                          <p className="text-xs text-emerald-500 font-bold mb-2 font-mono uppercase tracking-wider">
                            Correct Response Node: {correctOpt.id}. {correctOpt.text}
                          </p>
                          <div className="text-xs dark:text-slate-300 text-slate-700 bg-white/20 dark:bg-slate-950/40 p-4 rounded-xl border border-[#C5A059]/20 mt-2 font-medium">
                            <strong className="block text-[#D4AF37] text-[10px] uppercase tracking-widest mb-1.5 font-mono">Explanation:</strong>
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

          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4 pt-8 border-t border-[#C5A059]/20">
            <button 
              onClick={resetToDashboard}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 border border-[#C5A059]/30 dark:text-slate-300 text-slate-700 hover:bg-[#C5A059]/10 rounded-xl transition-all duration-300 font-bold text-sm shadow-sm"
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
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0F19] rounded-xl transition-all duration-300 font-bold text-sm shadow-md shadow-[#D4AF37]/15"
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
    <div className={`min-h-screen transition-colors duration-300 font-sans selection:bg-[#C5A059]/30 ${theme === 'dark' ? 'dark bg-[#0B0F19] text-slate-100' : 'bg-[#FAF8F5] text-slate-900'}`}>
      <style dangerouslySetInnerHTML={{__html: `
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #C5A059; 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D4AF37; 
        }
      `}} />

      {/* Dynamic Glowing background nodes for luxury glass feel */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-[#C5A059]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="w-full p-4 flex justify-end max-w-5xl mx-auto gap-2 relative z-10">
        <button 
          onClick={toggleTheme}
          className="p-2.5 rounded-full hover:bg-[#C5A059]/10 transition-colors border border-[#C5A059]/20 text-slate-600 dark:text-slate-300 shadow-sm bg-white/20 dark:bg-slate-900/30 backdrop-blur-sm"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </header>

      <main className="pb-20 w-full flex justify-center relative z-10">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'add_quiz' && renderAddQuiz()}
        {currentView === 'prompt' && renderPrompt()}
        {currentView === 'taking_quiz' && renderTakingQuiz()}
        {currentView === 'review' && renderReview()}
      </main>

      {/* ========================================== */}
      {/* SECURITY EXTREME FLOODING / DDOS OVERLAY */}
      {/* ========================================== */}
      {isFloodingBlocked && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white/90 dark:bg-slate-900/90 border-2 border-rose-500/50 rounded-2xl max-w-md w-full p-8 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500"></div>
            
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-serif font-black dark:text-white text-slate-900 mb-2 tracking-wide uppercase">
              Security Shield Active
            </h3>
            
            <p className="text-xs text-rose-600 dark:text-rose-400 font-mono tracking-widest uppercase font-bold mb-4">
              Anti-Flooding Protection Triggered
            </p>

            <p className="dark:text-slate-300 text-slate-600 text-sm leading-relaxed mb-6 font-medium">
              We detected a rapid burst of action requests. To protect server database integrity from spamming attacks, mutations have been temporarily throttled.
            </p>

            <div className="inline-flex items-center justify-center px-6 py-2 bg-rose-500/10 border border-rose-500/25 rounded-xl font-mono text-rose-500 font-black text-lg shadow-inner">
              Cooling Down: {floodingCooldown}s
            </div>

            <p className="text-[10px] text-slate-450 uppercase mt-6 font-bold tracking-wider font-sans">
              Portal locks will release automatically.
            </p>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ADMIN LIVE EDIT MODAL (SOPHISTICATED OVERLAY) */}
      {/* ========================================== */}
      {showEditQuestionModal && editedQuestionData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#0d1321] border border-[#C5A059] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative custom-scrollbar">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A059] to-[#D4AF37]"></div>
            
            <div className="flex items-center justify-between mb-6 border-b border-[#C5A059]/20 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">Live Edit Question {editingQuestionIndex + 1}</h3>
              </div>
              <button 
                onClick={() => setShowEditQuestionModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 text-slate-800 dark:text-slate-200">
              {/* Question text field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C5A059] mb-1 font-mono">Question Text</label>
                <textarea 
                  value={editedQuestionData.question}
                  onChange={(e) => setEditedQuestionData({
                    ...editedQuestionData,
                    question: e.target.value
                  })}
                  className="w-full px-4 py-2 border border-[#C5A059]/30 rounded-xl bg-white/20 dark:bg-slate-950/40 focus:outline-none focus:border-[#D4AF37]"
                  rows="3"
                />
              </div>

              {/* Options fields */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C5A059] font-mono">Options & Explanations</label>
                {editedQuestionData.options.map((opt, oIdx) => (
                  <div key={opt.id} className="p-3 border border-[#C5A059]/15 rounded-xl bg-slate-500/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#D4AF37] font-mono">{opt.id}</span>
                      <input 
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const updatedOpts = [...editedQuestionData.options];
                          updatedOpts[oIdx].text = e.target.value;
                          setEditedQuestionData({ ...editedQuestionData, options: updatedOpts });
                        }}
                        className="flex-grow px-3 py-1 border border-[#C5A059]/20 rounded-lg bg-white/20 dark:bg-slate-950/20 focus:outline-none text-sm font-semibold"
                        placeholder="Option Text"
                      />
                    </div>
                    <div>
                      <input 
                        type="text"
                        value={opt.explanation}
                        onChange={(e) => {
                          const updatedOpts = [...editedQuestionData.options];
                          updatedOpts[oIdx].explanation = e.target.value;
                          setEditedQuestionData({ ...editedQuestionData, options: updatedOpts });
                        }}
                        className="w-full px-3 py-1 border border-[#C5A059]/10 rounded-lg bg-white/10 dark:bg-slate-950/10 focus:outline-none text-xs"
                        placeholder="Why is this option correct/incorrect?"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Select Correct Option */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#C5A059] mb-1.5 font-mono">Correct Option</label>
                <div className="flex gap-4">
                  {editedQuestionData.options.map((opt, oIdx) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const updatedOpts = editedQuestionData.options.map(o => ({
                          ...o,
                          isCorrect: o.id === opt.id
                        }));
                        setEditedQuestionData({ ...editedQuestionData, options: updatedOpts });
                      }}
                      className={`px-4 py-2 rounded-lg font-bold text-sm border transition-all ${
                        opt.isCorrect 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                          : 'border-[#C5A059]/20 text-slate-500 hover:bg-[#C5A059]/10'
                      }`}
                    >
                      {opt.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 text-sm font-bold border-t border-[#C5A059]/20 mt-6 pt-4">
              <button 
                onClick={() => setShowEditQuestionModal(false)}
                className="px-4 py-2 border border-[#C5A059]/30 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEditedQuestion}
                className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0F19] rounded-xl transition-all shadow-md text-xs font-bold"
              >
                <Save className="w-4 h-4" /> Save Question Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ADMIN QUIZ MOVE LOCATION MODAL */}
      {/* ========================================== */}
      {showMoveQuizModal && quizToMove && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#C5A059]/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A059] to-[#D4AF37]"></div>
            <div className="flex items-center gap-3 dark:text-slate-200 text-slate-800 mb-6">
              <div className="p-2 rounded-lg bg-[#C5A059]/10 text-[#C5A059]">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-bold">Relocate Assessment</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-2 font-medium">
                  Select the target folder pathway where you would like to move <span className="font-bold text-[#D4AF37]">"{quizToMove.quiz_title}"</span>:
                </p>
                <select 
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#C5A059]/25 rounded-xl dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] text-sm font-semibold"
                >
                  <option value="root">Home Dashboard (Main Level)</option>
                  {groups.map(g => (
                    <option key={g.id} value={String(g.id)}>
                      {getFullBreadcrumbString(g.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 text-sm font-bold pt-4 border-t border-slate-200 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => {
                    setShowMoveQuizModal(false);
                    setQuizToMove(null);
                  }}
                  className="px-4 py-2 border border-[#C5A059]/30 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleMoveQuiz}
                  className="px-5 py-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0F19] rounded-xl transition-all shadow-md shadow-[#D4AF37]/15 text-xs font-bold"
                >
                  Move Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ADMIN LOGIN MODAL */}
      {/* ========================================== */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#C5A059]/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A059] to-[#D4AF37]"></div>
            <div className="flex items-center gap-3 dark:text-slate-200 text-slate-800 mb-6">
              <div className="p-2 rounded-lg bg-[#C5A059]/10 text-[#C5A059]">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-bold">Admin Portal Login</h3>
            </div>
            
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 font-mono">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-450" />
                  <input 
                    type="text" 
                    required
                    value={adminUsernameInput}
                    onChange={(e) => setAdminUsernameInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-[#C5A059]/25 rounded-xl dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] text-sm font-medium"
                    placeholder="Enter admin username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 font-mono">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-450" />
                  <input 
                    type="password" 
                    required
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-[#C5A059]/25 rounded-xl dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] text-sm font-medium"
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

              <div className="flex justify-end gap-3 text-sm font-bold pt-4 border-t border-slate-200 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => {
                    setShowAdminLoginModal(false);
                    setLoginError('');
                    setAdminUsernameInput('');
                    setAdminPasswordInput('');
                  }}
                  className="px-4 py-2 border border-[#C5A059]/30 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0F19] rounded-xl transition-all shadow-md shadow-[#D4AF37]/15 text-xs font-bold"
                >
                  Authorize Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SUBGROUP CREATION MODAL */}
      {/* ========================================== */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#C5A059]/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A059] to-[#D4AF37]"></div>
            <div className="flex items-center gap-3 dark:text-slate-200 text-slate-800 mb-6">
              <div className="p-2 rounded-lg bg-[#C5A059]/10 text-[#C5A059]">
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
                  className="w-full px-4 py-2.5 border border-[#C5A059]/25 rounded-xl dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] text-sm font-semibold"
                  placeholder="e.g. Cardiology, Hematology, CVS..."
                />
              </div>

              <div className="flex justify-end gap-3 text-sm font-bold pt-4 border-t border-slate-200 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => {
                    setShowGroupModal(false);
                    setNewGroupName('');
                  }}
                  className="px-4 py-2 border border-[#C5A059]/30 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0F19] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-[#D4AF37]/15 text-xs font-bold"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SAFE CONFIRMATION DIALOG MODAL */}
      {/* ========================================== */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#C5A059]/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A059] to-[#D4AF37]"></div>
            <div className="flex items-center gap-3 dark:text-slate-200 text-slate-800 mb-4">
              <div className="p-2 rounded-lg bg-[#C5A059]/10 text-[#C5A059]">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-bold">{confirmModal.title}</h3>
            </div>
            <p className="dark:text-slate-400 text-slate-600 text-sm leading-relaxed mb-8 font-medium">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3 text-sm font-bold border-t border-slate-200 dark:border-slate-800 pt-4">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-[#C5A059]/30 dark:text-slate-300 text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-xs font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.action}
                className="px-5 py-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B0F19] rounded-xl transition-all shadow-md shadow-[#D4AF37]/15 text-xs font-bold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}