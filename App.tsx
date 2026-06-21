import React, { useState, useEffect, useRef } from "react";
import { 
  Trophy, 
  HelpCircle, 
  Timer, 
  Volume2, 
  VolumeX, 
  Phone, 
  Users, 
  Sparkles, 
  TrendingUp, 
  RotateCcw, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  HeartHandshake, 
  PhoneCall, 
  MessageSquare,
  Shield,
  HelpCircle as HelpIcon,
  Play,
  Hourglass,
  BadgeAlert,
  Compass,
  AlertCircle
} from "lucide-react";
import { QUESTIONS, PRIZE_LEVELS, GUARANTEED_LEVELS } from "./questions";
import { Question, Lifelines, GameStatus, FriendOption } from "./types";
import { sound } from "./sound";

// Available Phone-a-Friend companions
const COMPANIONS: FriendOption[] = [
  {
    name: "Armen / Արմեն",
    avatar: "👨‍🏫",
    description: "El Polímata (Գիտունիկ): Altamente preciso, bilingüe, explica con detalles históricos.",
    accuracy: 0.90,
    personality: "Armen"
  },
  {
    name: "Elena / Ելենա",
    avatar: "👩‍🏫",
    description: "La Profesora de Español: Experta lingüística, calmada y muy alentadora.",
    accuracy: 0.85,
    personality: "Elena"
  },
  {
    name: "Gevorg / Գևորգ",
    avatar: "🙋‍♂️",
    description: "El Soñador Intuitivo: Elige basado en la suerte y corazonadas. ¡Divertido pero impredecible!",
    accuracy: 0.60,
    personality: "Gevorg"
  }
];

export default function App() {
  // Game state
  const [status, setStatus] = useState<GameStatus>("INTRO");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [confirmedOption, setConfirmedOption] = useState<number | null>(null);
  
  // Audio state
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // Lifelines
  const [lifelines, setLifelines] = useState<Lifelines>({
    fiftyFifty: { used: false, active: false, disabledOptions: [] },
    phoneFriend: { used: false, active: false, recommendation: null },
    askAudience: { used: false, active: false, pollResults: null }
  });

  // Companion selected for phone lifeline
  const [selectedCompanion, setSelectedCompanion] = useState<FriendOption>(COMPANIONS[0]);
  const [phoneState, setPhoneState] = useState<"SELECT" | "CALLING" | "TALKING" | "CLOSED">("SELECT");
  const [phoneTimer, setPhoneTimer] = useState<number>(3); // Countdown during the call animation

  // Mode and Timer
  const [gameMode, setGameMode] = useState<"TIMER" | "RELAXED">("TIMER");
  const [timerLeft, setTimerLeft] = useState<number>(30);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stats
  const [moneySecured, setMoneySecured] = useState<string>("0 ֏");
  const [usedLifelinesCount, setUsedLifelinesCount] = useState<number>(0);

  // Extract active question
  const currentQuestion = QUESTIONS[currentQuestionIndex];

  // Auto-init sound drone when starting or toggling
  useEffect(() => {
    sound.toggle(!isMuted);
    return () => {
      sound.stopDrone();
    };
  }, [isMuted]);

  // Restart ambient drone on game load/reset
  useEffect(() => {
    if (status === "PLAYING") {
      sound.startDrone();
    } else if (status !== "INTENSE_LOCK_IN") {
      sound.stopDrone();
    }
  }, [status]);

  // Timer Countdown Effect
  useEffect(() => {
    if (status === "PLAYING" && gameMode === "TIMER") {
      setTimerLeft(30);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      
      timerIntervalRef.current = setInterval(() => {
        setTimerLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            handleTimeExpiration();
            return 0;
          }
          // Tick sound in the final 10 seconds or every second for high tension
          if (prev <= 11) {
            sound.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [currentQuestionIndex, status, gameMode]);

  // Handle timer exhaustion
  const handleTimeExpiration = () => {
    sound.playWrong();
    setStatus("GAME_OVER");
  };

  // Convert current question progress to payout amount
  const calculateCurrentpayout = (failed: boolean): string => {
    if (failed) {
      // Find highest guaranteed safety net achieved
      // levels are 0 to 14 (reverse mapped from 15 to 1)
      // Level 1-4 failed -> 0 ֏
      // Level 5-9 failed -> 1,000 ֏
      // Level 10-14 failed -> 32,000 ֏
      if (currentQuestionIndex >= 10) {
        return "32,000 ֏";
      } else if (currentQuestionIndex >= 5) {
        return "1,000 ֏";
      } else {
        return "0 ֏";
      }
    } else {
      // Current draft reward (last correct question)
      if (currentQuestionIndex === 0) return "0 ֏";
      const prizeIndex = PRIZE_LEVELS.length - currentQuestionIndex;
      return PRIZE_LEVELS[prizeIndex];
    }
  };

  // Start the game
  const handleStartGame = (mode: "TIMER" | "RELAXED") => {
    setGameMode(mode);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setConfirmedOption(null);
    setLifelines({
      fiftyFifty: { used: false, active: false, disabledOptions: [] },
      phoneFriend: { used: false, active: false, recommendation: null },
      askAudience: { used: false, active: false, pollResults: null }
    });
    setUsedLifelinesCount(0);
    setPhoneState("SELECT");
    setStatus("PLAYING");
    sound.startDrone();
  };

  // Option selection hover-states
  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null || lifelines.fiftyFifty.disabledOptions.includes(idx)) return;
    setSelectedOption(idx);
    sound.playLockIn();
    
    // Simulate high television suspense "Lock In"
    setStatus("LOCK_IN");
    
    setTimeout(() => {
      setConfirmedOption(idx);
      setStatus("REVEAL");
      
      // Delay before showing actual color reveal for classic tension
      setTimeout(() => {
        const isCorrect = idx === currentQuestion.correctOptionIndex;
        if (isCorrect) {
          sound.playCorrect();
          // Check if this was the last question (15)
          if (currentQuestionIndex === 14) {
            setStatus("MILLIONAIRE");
            sound.playWin();
          }
        } else {
          sound.playWrong();
          setStatus("GAME_OVER");
        }
      }, 1500);

    }, 1800);
  };

  // Advance to next question
  const handleNextQuestion = () => {
    setSelectedOption(null);
    setConfirmedOption(null);
    // Reset temporary lifeline visual focus, keep overall "used" record
    setLifelines(prev => ({
      ...prev,
      fiftyFifty: { ...prev.fiftyFifty, active: false, disabledOptions: prev.fiftyFifty.used ? prev.fiftyFifty.disabledOptions : [] },
      phoneFriend: { ...prev.phoneFriend, active: false, recommendation: null },
      askAudience: { ...prev.askAudience, active: false, pollResults: null }
    }));
    setCurrentQuestionIndex((prev) => prev + 1);
    setStatus("PLAYING");
  };

  // Walk Away safely with money
  const handleWalkAway = () => {
    sound.playLifeline();
    setStatus("WALK_AWAY");
  };

  // LIFELINES IMPLEMENTATION
  
  // 1. 50/50 Lifeline
  const triggerFiftyFifty = () => {
    if (lifelines.fiftyFifty.used || status !== "PLAYING") return;
    sound.playLifeline();
    
    const correctIdx = currentQuestion.correctOptionIndex;
    const incorrectIndices = [0, 1, 2, 3].filter(i => i !== correctIdx);
    
    // Shuffle and pick exactly 2 to disable
    const toDisable = incorrectIndices.sort(() => 0.5 - Math.random()).slice(0, 2);
    
    setLifelines(prev => ({
      ...prev,
      fiftyFifty: { used: true, active: true, disabledOptions: toDisable }
    }));
    setUsedLifelinesCount(prev => prev + 1);
  };

  // 2. Ask Audience Lifeline
  const triggerAskAudience = () => {
    if (lifelines.askAudience.used || status !== "PLAYING") return;
    sound.playLifeline();

    const correctIdx = currentQuestion.correctOptionIndex;
    
    // Calculate custom skewed vote distributions based on question difficulty!
    // Easier level = audience is very certain. Hard level = highly split.
    const questionDifficultyMultiplier = currentQuestionIndex / 14; // 0 (easy) to 1 (hard)
    
    let correctPercentage = 85 - Math.floor(questionDifficultyMultiplier * 45); // 85% down to 40%
    if (lifelines.fiftyFifty.active) {
      // If 50/50 is active, the split is only between 2 remaining options!
      const remainingIdx = [0, 1, 2, 3].find(i => i !== correctIdx && !lifelines.fiftyFifty.disabledOptions.includes(i))!;
      const remainingShare = 100 - correctPercentage;
      
      const poll = [0, 0, 0, 0];
      poll[correctIdx] = correctPercentage;
      poll[remainingIdx] = remainingShare;
      
      setLifelines(prev => ({
        ...prev,
        askAudience: { used: true, active: true, pollResults: poll }
      }));
    } else {
      // standard 4-way split
      let remainingPercent = 100 - correctPercentage;
      const wrongPercent1 = Math.floor(remainingPercent * 0.5);
      const wrongPercent2 = Math.floor(remainingPercent * 0.3);
      const wrongPercent3 = remainingPercent - wrongPercent1 - wrongPercent2;
      
      const wrongShares = [wrongPercent1, wrongPercent2, wrongPercent3];
      const poll = [0, 0, 0, 0];
      poll[correctIdx] = correctPercentage;
      
      let shareIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i !== correctIdx) {
          poll[i] = wrongShares[shareIdx++];
        }
      }

      setLifelines(prev => ({
        ...prev,
        askAudience: { used: true, active: true, pollResults: poll }
      }));
    }
    
    setUsedLifelinesCount(prev => prev + 1);
  };

  // 3. Phone a Friend Lifeline
  const initiatePhoneCall = () => {
    if (lifelines.phoneFriend.used || status !== "PLAYING") return;
    setPhoneState("SELECT");
    setLifelines(prev => ({
      ...prev,
      phoneFriend: { ...prev.phoneFriend, active: true }
    }));
  };

  const executePhoneCall = (companion: FriendOption) => {
    setSelectedCompanion(companion);
    setPhoneState("CALLING");
    setPhoneTimer(3);
    sound.playTick();

    // Call ring simulation
    const interval = setInterval(() => {
      setPhoneTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          generateFriendMessage(companion);
          return 0;
        }
        sound.playTick();
        return prev - 1;
      });
    }, 1000);
  };

  const generateFriendMessage = (companion: FriendOption) => {
    sound.playLifeline();
    const correctIdx = currentQuestion.correctOptionIndex;
    const isCorrect = Math.random() < companion.accuracy;
    const suggestedOptionChar = ["A", "B", "C", "D"][isCorrect ? correctIdx : (correctIdx + 1) % 4];
    const suggestedOptionValue = currentQuestion.options[isCorrect ? correctIdx : (correctIdx + 1) % 4];

    let message = "";
    
    // Personality tailored paragraphs
    if (companion.personality === "Armen") {
      message = `«Ողջո՛ւյն, բարեկամս։ Իհարկե, ես սիրով կօգնեմ քեզ։ Այս հարցը շատ հետաքրքիր արմատներ ունի... Ես գրեթե 95% համոզված եմ, որ ճիշտ պատասխանն է տարբերակ ${suggestedOptionChar}՝ "${suggestedOptionValue}": Իսպաներենում դա հստակ արտահայտում է հարցի էությունը։ Գնա՛ դրան, վստա՛հ եղիր։» (¡Hola, amigo! Estoy muy seguro de que la respuesta correcta es la ${suggestedOptionChar}. Tiene base lingüística sólida.)`;
    } else if (companion.personality === "Elena") {
      message = `«¡Hola! Qué alegría escucharte en el programa. A ver... analicemos gramaticalmente la pregunta. Por lo que sé sobre vocabulario bilingüe, la opción súper correcta es la ${suggestedOptionChar} ("${suggestedOptionValue}"). Դա հաստատ ճիշտ է, ես 85% վստահ եմ, քանի որ այն կապված է իրական կյանքի կանոնների հետ: ¡Mucha suerte, lo estás haciendo excelente!»`;
    } else {
      message = `«Օ՜, բարև՜, ընկեր ջան: Դե հաստատ չգիտեմ, բայց սիրտս ինձ հուշում է, որ ճիշտը ${suggestedOptionChar}-ն է! "${suggestedOptionValue}"... Գիտես, ուղղակի զգում եմ, որ դա է, բայց եթե կասկածում ես, մտածիր, թեև ես 60-70%–ով հենց դա կընտրեի։ (¡Hombre, caramba! Creo que mi intuición dice la ${suggestedOptionChar}. ¡Suerte!)»`;
    }

    setLifelines(prev => ({
      ...prev,
      phoneFriend: { ...prev.phoneFriend, used: true, recommendation: message }
    }));
    setPhoneState("TALKING");
    setUsedLifelinesCount(prev => prev + 1);
  };

  const closePhoneDialog = () => {
    setPhoneState("CLOSED");
    setLifelines(prev => ({
      ...prev,
      phoneFriend: { ...prev.phoneFriend, active: false }
    }));
  };

  // Format indices to Option characters (A, B, C, D)
  const getChar = (idx: number) => ["A", "B", "C", "D"][idx];

  // Helper to determine letter prefix styles
  const getLetterColorClass = (idx: number, isConfirmed: boolean, isSelected: boolean, isRevealState: boolean) => {
    if (isRevealState) {
      if (idx === currentQuestion.correctOptionIndex) return "text-emerald-400 font-bold";
      if (isSelected) return "text-red-400 font-bold";
    }
    if (isSelected || isConfirmed) return "text-white font-bold";
    return "text-millionaire-gold font-bold";
  };

  return (
    <div className="min-h-screen bg-[#020230] text-white font-sans flex flex-col items-center justify-between overflow-x-hidden relative selection:bg-millionaire-glow selection:text-millionaire-dark">
      {/* Background radial highlight & hex grid design - Professional Polish Theme */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e1e6e_0%,#020230_100%)] pointer-events-none z-0" />
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(rgba(0,210,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] z-0" />

      {/* Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 py-4 flex items-center justify-between z-10 border-b border-white/10 bg-millionaire-blue/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-millionaire-gold to-orange-500 flex items-center justify-center shadow-lg shadow-millionaire-gold/20">
            <Trophy className="w-5 h-5 text-millionaire-dark" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-display font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-millionaire-gold to-yellow-200">
              QUIÉN QUIERE SER MILLONARIO
            </h1>
            <p className="text-[10px] md:text-xs text-cyan-400/80 font-mono tracking-widest uppercase">
              Spanish - Armenian Edition
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Mute toggle button */}
          <button
            onClick={() => setIsMuted(prev => !prev)}
            className="p-2 rounded-full border border-white/10 hover:border-millionaire-glow/40 hover:bg-white/5 transition duration-200"
            title={isMuted ? "Unmute Sound Engine" : "Mute Sound Engine"}
            id="sound-toggle-btn"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-red-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-millionaire-glow animate-pulse" />
            )}
          </button>

          {status === "PLAYING" && (
            <div className="hidden sm:flex items-center gap-2 bg-millionaire-blue/80 px-3 py-1.5 rounded-full border border-millionaire-glow/20">
              <span className="text-xs text-cyan-400/80 uppercase tracking-wider font-mono">Secured:</span>
              <span className="text-sm font-bold text-millionaire-gold">{calculateCurrentpayout(false)}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-7xl flex-1 flex flex-col lg:flex-row p-4 gap-6 items-center justify-center z-10 w-full">
        
        {/* ================== INTRO CARD ================== */}
        {status === "INTRO" && (
          <div className="w-full max-w-2xl bg-millionaire-blue/50 backdrop-blur-lg border border-millionaire-glow/30 rounded-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-fade-in">
            {/* Visual element representing television set ring */}
            <div className="w-32 h-32 rounded-full border-4 border-double border-millionaire-gold/60 flex items-center justify-center mb-6 relative animate-pulse-ring">
              <div className="w-28 h-28 rounded-full border border-millionaire-glow/40 bg-millionaire-dark flex flex-col items-center justify-center p-2">
                <span className="text-3xl">֏</span>
                <span className="text-[9px] font-mono tracking-wider text-cyan-400 uppercase">Quiz Show</span>
              </div>
            </div>

            <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight mb-2 text-white">
              ¿Quién Quiere Ser Millonario?
            </h2>
            <h3 className="text-lg md:text-xl font-display text-millionaire-gold mb-4 font-semibold">
              Ո՞վ է Ուզում Դառնալ Միլիոնատեր
            </h3>

            <p className="text-xs md:text-sm text-gray-300 max-w-lg mb-8 leading-relaxed">
              Consigue el gran premio de <strong className="text-millionaire-gold">1,000,000 ֏</strong> respondiendo correctamente a 15 preguntas temáticas sobre gramática, sinónimos, contrarios y vocabulario útil en el viaje del armenio al español. ¡Sácale provecho a los comodines!
            </p>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Mode Selection Cards */}
              <button
                onClick={() => handleStartGame("TIMER")}
                className="group flex flex-col items-center justify-between p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/15 duration-200 text-left transition-all hover:-translate-y-0.5"
                id="mode-classic-btn"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
                    <Timer className="w-5 h-5" />
                  </span>
                  <span className="font-display font-bold text-sm text-white">Classic Suspense</span>
                </div>
                <p className="text-[11px] text-gray-400 text-center">
                  30 segundos por pregunta. Tensión real con tictac físico al final de cada turno.
                </p>
                <div className="mt-4 flex items-center gap-1 text-[11px] text-orange-400 font-bold group-hover:underline">
                  Jugar Clásico <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              <button
                onClick={() => handleStartGame("RELAXED")}
                className="group flex flex-col items-center justify-between p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/15 duration-200 text-left transition-all hover:-translate-y-0.5"
                id="mode-relaxed-btn"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Compass className="w-5 h-5" />
                  </span>
                  <span className="font-display font-bold text-sm text-white">Modo Relajado</span>
                </div>
                <p className="text-[11px] text-gray-400 text-center">
                  Tómate tu tiempo. Sin límetes de tiempo ni estrés. Ideal para aprender el armenio y repasar español.
                </p>
                <div className="mt-4 flex items-center gap-1 text-[11px] text-cyan-400 font-bold group-hover:underline">
                  Jugar con calma <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            {/* Quick overview of rules */}
            <div className="text-[10px] text-gray-400/80 bg-millionaire-dark/60 rounded-lg p-3 border border-white/5 w-full flex items-center justify-around gap-2 font-mono">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-millionaire-gold" /> Safe zones: Q5 & Q10
              </span>
              <span className="h-4 w-px bg-white/10" />
              <span className="flex items-center gap-1">
                <HelpIcon className="w-3 h-3 text-millionaire-glow" /> 3 Comodines Clásicos
              </span>
            </div>
          </div>
        )}

        {/* ================== ACTIVE GAME SCREEN ================== */}
        {["PLAYING", "LOCK_IN", "REVEAL"].includes(status) && (
          <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch justify-center">
            
            {/* Left/Main Column: Lifelines, Questions & Answers */}
            <div className="flex-1 flex flex-col justify-between gap-6 max-w-3xl">
              
              {/* Gamestate HUD Bar */}
              <div className="flex items-center justify-between bg-millionaire-blue/50 border border-white/10 p-3 rounded-xl backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-lg bg-millionaire-dark border border-cyan-400/20">
                    <span className="text-[11px] text-cyan-400 font-mono tracking-widest block uppercase">Pregunta</span>
                    <span className="text-lg font-bold font-display leading-tight">{currentQuestionIndex + 1} / 15</span>
                  </div>
                  
                  {/* Milestones Alert indicators */}
                  <div className="hidden sm:block">
                    <span className="text-[10px] text-gray-400 font-mono block">Valor de la pregunta</span>
                    <span className="text-base font-bold text-millionaire-gold font-mono">
                      {PRIZE_LEVELS[PRIZE_LEVELS.length - 1 - currentQuestionIndex]}
                    </span>
                  </div>
                </div>

                {/* COUNTDOWN TIMER DIAL */}
                {gameMode === "TIMER" && (
                  <div className="flex items-center gap-2">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth="3.5"
                          fill="transparent"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke={timerLeft > 10 ? "#00d2ff" : timerLeft > 5 ? "#fe7201" : "#f43f5e"}
                          strokeWidth="3.5"
                          fill="transparent"
                          strokeDasharray="125.6"
                          strokeDashoffset={125.6 - (125.6 * timerLeft) / 30}
                          className="transition-all duration-1000 ease-linear"
                        />
                      </svg>
                      <span className="absolute text-sm font-bold font-mono text-white">
                        {timerLeft}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">segundos</span>
                  </div>
                )}

                {/* Lifeline Buttons */}
                <div className="flex items-center gap-3">
                  {/* 50/50 */}
                  <button
                    onClick={triggerFiftyFifty}
                    disabled={lifelines.fiftyFifty.used || status !== "PLAYING"}
                    className={`lifeline-btn-millionaire flex items-center justify-center select-none ${
                      lifelines.fiftyFifty.used 
                        ? "opacity-30 border-red-500 bg-red-950/20 text-red-400 cursor-not-allowed line-through" 
                        : lifelines.fiftyFifty.active
                        ? "border-white bg-[#e67e22] text-white shadow-[0_0_20px_rgba(255,255,255,0.6)] font-bold scale-110"
                        : "border-[#3498db] text-[#3498db] hover:border-white hover:text-white"
                    }`}
                    id="lifeline-fifty-fifty"
                    title="Comodín 50/50 (Echar fuera 2 fallos)"
                  >
                    <span className="text-[12px] font-bold tracking-tight">50:50</span>
                  </button>

                  {/* Phone Friend */}
                  <button
                    onClick={initiatePhoneCall}
                    disabled={lifelines.phoneFriend.used || status !== "PLAYING"}
                    className={`lifeline-btn-millionaire flex items-center justify-center select-none ${
                      lifelines.phoneFriend.used
                        ? "opacity-30 border-red-500 bg-red-950/20 text-red-400 cursor-not-allowed"
                        : lifelines.phoneFriend.active
                        ? "border-white bg-[#e67e22] text-white shadow-[0_0_20px_rgba(255,255,255,0.6)] scale-110"
                        : "border-[#3498db] text-[#3498db] hover:border-white hover:text-white"
                    }`}
                    id="lifeline-phone-friend"
                    title="Llamar a un amigo"
                  >
                    <Phone className="w-4.5 h-4.5" />
                  </button>

                  {/* Ask Audience */}
                  <button
                    onClick={triggerAskAudience}
                    disabled={lifelines.askAudience.used || status !== "PLAYING"}
                    className={`lifeline-btn-millionaire flex items-center justify-center select-none ${
                      lifelines.askAudience.used
                        ? "opacity-30 border-red-500 bg-red-950/20 text-red-400 cursor-not-allowed"
                        : lifelines.askAudience.active
                        ? "border-white bg-[#e67e22] text-white shadow-[0_0_20px_rgba(255,255,255,0.6)] scale-110"
                        : "border-[#3498db] text-[#3498db] hover:border-white hover:text-white"
                    }`}
                    id="lifeline-ask-audience"
                    title="Preguntar al público"
                  >
                    <Users className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Intermittent Lifeline Results Panel */}
              {lifelines.askAudience.active && lifelines.askAudience.pollResults && (
                <div className="p-4 rounded-xl bg-millionaire-blue/80 border border-millionaire-glow/30 backdrop-blur-md animate-fade-in">
                  <h4 className="text-xs text-millionaire-glow tracking-wider uppercase font-mono mb-3 flex items-center gap-1.5 font-bold">
                    <TrendingUp className="w-4 h-4" /> Resultados de Votación del Público (Հարցման արդյունքներ)
                  </h4>
                  <div className="grid grid-cols-4 gap-4 items-end h-24 px-2 pt-2">
                    {lifelines.askAudience.pollResults.map((val, idx) => {
                      const isDisabled = lifelines.fiftyFifty.disabledOptions.includes(idx);
                      return (
                        <div key={idx} className="flex flex-col items-center h-full justify-end">
                          <span className={`text-xs font-mono font-bold mb-1 ${isDisabled ? "text-gray-600" : "text-white"}`}>
                            {isDisabled ? "0%" : `${val}%`}
                          </span>
                          <div 
                            className={`w-full rounded-t-md transition-all duration-1000 ${
                              isDisabled 
                                ? "bg-gray-800" 
                                : idx === currentQuestion.correctOptionIndex
                                ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                                : "bg-gradient-to-t from-cyan-600 to-cyan-400"
                            }`}
                            style={{ height: isDisabled ? "0%" : `${val}%` }}
                          />
                          <span className="text-xs font-bold text-millionaire-gold mt-1">
                            {getChar(idx)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Phone a Friend Conversation Popups */}
              {lifelines.phoneFriend.active && (
                <div className="p-4 rounded-xl bg-millionaire-blue/80 border border-millionaire-glow/30 backdrop-blur-md animate-fade-in">
                  {phoneState === "SELECT" && (
                    <div>
                      <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                        <PhoneCall className="w-4 h-4 text-millionaire-glow" /> ¿A quién deseas llamar? (Ո՞ւմ ես ուզում զանգել)
                      </h4>
                      <p className="text-xs text-gray-400 mb-4">Cada amigo tiene diferentes destrezas y niveles de acierto en español.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {COMPANIONS.map((companion, i) => (
                          <button
                            key={i}
                            onClick={() => executePhoneCall(companion)}
                            className="p-3 rounded-lg bg-millionaire-dark/60 border border-white/10 hover:border-millionaire-gold/60 text-left hover:bg-white/5 transition duration-200"
                            id={`select-companion-${i}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{companion.avatar}</span>
                              <span className="text-xs font-bold text-white">{companion.name.split("/")[0]}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-tight line-clamp-2">{companion.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {phoneState === "CALLING" && (
                    <div className="flex flex-col items-center py-6">
                      <div className="w-12 h-12 rounded-full border-2 border-t-millionaire-gold border-millionaire-glow animate-spin mb-3" />
                      <p className="text-xs font-mono text-cyan-400 tracking-wider">
                        Estableciendo llamada con {selectedCompanion.name}...
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">Simulando enlace bilingüe</p>
                    </div>
                  )}

                  {phoneState === "TALKING" && (
                    <div className="flex gap-3 items-start p-1">
                      <div className="text-3xl bg-millionaire-dark p-2.5 rounded-full border border-millionaire-gold/30">
                        {selectedCompanion.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="text-xs font-bold text-millionaire-gold">{selectedCompanion.name}</h5>
                          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-400/10 px-2 py-0.5 rounded">En línea</span>
                        </div>
                        <div className="p-3 rounded-lg bg-millionaire-dark text-xs text-gray-200 leading-relaxed italic border border-white/5 relative">
                          <div className="absolute top-3 -left-1.5 w-3 h-3 bg-millionaire-dark rotate-45 border-l border-b border-white/5" />
                          <p>{lifelines.phoneFriend.recommendation}</p>
                        </div>
                        <button
                          onClick={closePhoneDialog}
                          className="mt-3 text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-400/10 px-3 py-1 rounded"
                        >
                          Colgar llamada (Փակել)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* THE MAIN QUESTION BOX WITH DUAL TRANSLATION */}
              <div className="relative py-2">
                {/* Horizontal guide lines representing television set layouts */}
                <div className="absolute left-[-2rem] right-[-2rem] top-1/2 h-[2px] bg-[#3498db]/30 -translate-y-1/2 z-0 hidden lg:block" />
                
                <div className="question-box-millionaire w-full p-8 md:p-10 text-center shadow-[0_0_30px_rgba(52,152,219,0.2)] relative min-h-[140px] flex flex-col justify-center items-center z-10">
                  {/* Spanish version in dominant text */}
                  <h3 className="text-lg md:text-2xl font-bold font-display px-4 mb-3 tracking-wide text-white glow-blue">
                    {currentQuestion.questionEs}
                  </h3>
                  
                  {/* Armenian version below */}
                  <p className="text-xs md:text-sm text-cyan-300 font-medium tracking-wide font-mono italic px-4">
                    {currentQuestion.questionAm}
                  </p>
                </div>
              </div>

              {/* THE OPTION GRID (2X2 RESPONSIVE) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 relative py-1">
                {/* Horizontal guide lines for options layout */}
                <div className="absolute left-[-2rem] right-[-2rem] top-[28%] h-[1px] bg-[#3498db]/20 z-0 hidden lg:block" />
                <div className="absolute left-[-2rem] right-[-2rem] top-[72%] h-[1px] bg-[#3498db]/20 z-0 hidden lg:block" />
                
                {currentQuestion.options.map((option, idx) => {
                  const isDisabled = lifelines.fiftyFifty.disabledOptions.includes(idx);
                  const isSelected = selectedOption === idx;
                  const isConfirmed = confirmedOption === idx;
                  const isCorrect = idx === currentQuestion.correctOptionIndex;
                  const isRevealState = status === "REVEAL";

                  // Use answer-btn-millionaire polygon clip path
                  let containerStyles = "answer-btn-millionaire cursor-pointer w-full py-3.5 px-8 md:px-10 text-left transition duration-200 flex items-center gap-3 relative z-10 ";
                  let labelColorClass = getLetterColorClass(idx, isConfirmed, isSelected, isRevealState);

                  if (isDisabled) {
                    containerStyles += "opacity-10 border-transparent text-gray-700 bg-black/30 cursor-not-allowed pointer-events-none";
                  } else if (isRevealState) {
                    if (isCorrect) {
                      containerStyles += "bg-emerald-600/90 border-emerald-400 text-white shadow-[0_0_20px_rgba(39,174,96,0.6)] font-semibold";
                    } else if (isSelected) {
                      containerStyles += "bg-rose-750/90 border-rose-500 text-white shadow-[0_0_20px_rgba(219,39,119,0.6)]";
                    } else {
                      containerStyles += "opacity-45 border-white/5 bg-black/40 text-gray-400";
                    }
                  } else if (isConfirmed) {
                    // Flashing Orange tension state
                    containerStyles += "bg-[#d35400] border-[#f39c12] text-white shadow-[0_0_25px_rgba(211,84,0,0.8)] animate-pulse font-semibold";
                  } else if (isSelected) {
                    containerStyles += "bg-[#e67e22] border-[#f1c40f] text-white shadow-[0_0_20px_rgba(230,126,34,0.7)]";
                  } else {
                    containerStyles += "border-[#3498db]/30 text-gray-100 hover:border-[#3498db] hover:shadow-[0_0_15px_rgba(52,152,219,0.4)] hover:scale-[1.01] group";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={selectedOption !== null || isDisabled}
                      className={containerStyles}
                      id={`option-button-${getChar(idx)}`}
                    >
                      <span className={`${labelColorClass} pr-1`}>
                        {getChar(idx)}:
                      </span>
                      <span className={`text-xs md:text-sm font-medium ${isDisabled ? "text-gray-650" : "text-white"}`}>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons: Walk Away - Reveal State - Next Question */}
              <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                {status === "PLAYING" && (
                  <button
                    onClick={handleWalkAway}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600/20 border border-yellow-500/40 rounded-xl text-yellow-300 hover:bg-yellow-600/30 text-xs md:text-sm font-bold transition duration-200 cursor-pointer"
                    id="walk-away-btn"
                  >
                    <Shield className="w-4 h-4" /> Me Planto / Retirarse (Վերցնել գումարը)
                  </button>
                )}

                {status === "REVEAL" && (
                  <div className="flex-1 flex justify-end">
                    <button
                      onClick={handleNextQuestion}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-white font-bold text-sm shadow-xl shadow-emerald-900/10 hover:-translate-y-0.5 transition duration-200"
                      id="next-question-btn"
                    >
                      <span>Siguiente Pregunta (Հաջորդ հարցը)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Prize Ladder (Visible on LG screens, collapsed on phone but togglable) */}
            <div className="w-full lg:w-64 bg-millionaire-blue/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between backdrop-blur-md">
              <div>
                <h4 className="text-xs uppercase font-mono text-cyan-400 tracking-widest border-b border-white/5 pb-2 mb-4 font-bold">
                  Tabla de Premios (Մրցանակների աղյուսակ)
                </h4>
                
                <div className="flex flex-col gap-1">
                  {PRIZE_LEVELS.map((prize, index) => {
                    // Level is 15 down to 1
                    const levelNumber = 15 - index;
                    const isGuaranteed = GUARANTEED_LEVELS.includes(index);
                    const isActive = currentQuestionIndex === levelNumber - 1;
                    const isCompleted = currentQuestionIndex >= levelNumber;

                    let rowStyles = "flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono ";
                    if (isActive) {
                      rowStyles += "bg-gradient-to-r from-millionaire-orange to-orange-500 text-white font-bold shadow-lg shadow-orange-500/20";
                    } else if (isGuaranteed) {
                      rowStyles += "text-millionaire-gold bg-white/5 border border-millionaire-gold/20 font-bold";
                    } else if (isCompleted) {
                      rowStyles += "text-gray-400 font-medium";
                    } else {
                      rowStyles += "text-gray-500";
                    }

                    return (
                      <div key={index} className={rowStyles}>
                        <div className="flex items-center gap-2">
                          <span className={`${isActive ? "text-white" : "text-millionaire-gold"} w-4 text-right font-bold`}>
                            {levelNumber}
                          </span>
                          <span className="text-[10px]">♦</span>
                          <span className={isActive ? "text-white" : "text-gray-300"}>{prize}</span>
                        </div>
                        {isGuaranteed && (
                          <Shield className="w-3.5 h-3.5 text-millionaire-gold fill-millionaire-gold/20" title="Punto de Seguridad Garantizado" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-gray-400 text-center font-mono">
                Puntos seguros en las preguntas 5 y 10.
              </div>
            </div>

          </div>
        )}

        {/* ================== WALK AWAY END SCREEN ================== */}
        {status === "WALK_AWAY" && (
          <div className="w-full max-w-xl bg-millionaire-blue/50 backdrop-blur-lg border border-millionaire-gold/40 rounded-2xl p-6 md:p-8 text-center shadow-2xl relative animate-scale-up">
            <div className="w-20 h-20 bg-yellow-500/10 border border-millionaire-gold/40 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-millionaire-gold" />
            </div>

            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-2">
              Decisión Inteligente (Իմաստուն որոշում)
            </h2>
            <p className="text-xs md:text-sm text-gray-300 mb-6 max-w-md mx-auto">
              Has decidido retirarte de manera oportuna para asegurar tus beneficios. ¡Excelente juego!
            </p>

            <div className="bg-millionaire-dark p-6 rounded-xl border border-white/5 mb-8">
              <span className="text-[10px] text-gray-400 block uppercase tracking-widest font-mono">Dinero Asegurado (Կուտակած գումար)</span>
              <span className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-millionaire-gold to-yellow-200 mt-2 block glow-gold">
                {calculateCurrentpayout(false)}
              </span>
              <p className="text-[10px] text-cyan-400 tracking-wider font-mono mt-2">Preguntas correctas: {currentQuestionIndex} / 15</p>
            </div>

            <button
              onClick={() => setStatus("INTRO")}
              className="px-6 py-3 bg-gradient-to-r from-millionaire-gold to-amber-500 hover:from-yellow-500 hover:to-amber-600 font-bold rounded-xl text-millionaire-dark transition duration-200 shadow-xl"
              id="walkaway-restart-btn"
            >
              Jugar de nuevo (Նորից խաղալ)
            </button>
          </div>
        )}

        {/* ================== GAME OVER END SCREEN ================== */}
        {status === "GAME_OVER" && (
          <div className="w-full max-w-xl bg-gradient-to-b from-slate-900 via-millionaire-dark to-slate-950 border border-red-500/30 rounded-2xl p-6 md:p-8 text-center shadow-2xl relative animate-scale-up">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <BadgeAlert className="w-10 h-10 text-red-500" />
            </div>

            <h2 className="text-xl md:text-2xl font-display font-bold text-red-400 mb-1">
              Fin de la Partida (Խաղի ավարտ)
            </h2>
            <p className="text-xs text-gray-400 mb-6">
              ¡La respuesta no era correcta o se te acabó el tiempo!
            </p>

            {/* Show where they fell */}
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 mb-6 text-left max-w-sm mx-auto">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Pregunta fallida:</span>
                <span className="font-bold text-white font-mono">#{currentQuestionIndex + 1}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Respuesta correcta:</span>
                <span className="font-bold text-emerald-400 font-mono">Option {getChar(currentQuestion.correctOptionIndex)}</span>
              </div>
            </div>

            <div className="bg-millionaire-dark p-6 rounded-xl border border-white/5 mb-8">
              <span className="text-[10px] text-gray-400 block uppercase tracking-widest font-mono">Zona Segura Alcanzada (Ապահով գումար)</span>
              <span className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-millionaire-gold to-yellow-200 mt-2 block glow-gold">
                {calculateCurrentpayout(true)}
              </span>
              <p className="text-[10px] text-gray-400 tracking-wider font-mono mt-1">Suma acumulada por los puntos de seguridad.</p>
            </div>

            <button
              onClick={() => setStatus("INTRO")}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 font-bold rounded-xl text-white transition duration-200 shadow-xl"
              id="gameover-restart-btn"
            >
              Intentar de nuevo (Փորձել նորից)
            </button>
          </div>
        )}

        {/* ================== MILLIONAIRE TRIUMPH SCREEN ================== */}
        {status === "MILLIONAIRE" && (
          <div className="w-full max-w-2xl bg-gradient-to-b from-millionaire-blue via-indigo-950 to-millionaire-dark border-2 border-millionaire-gold rounded-2xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden animate-scale-up">
            
            {/* Ambient sparking sparkles */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(226,168,0,0.15)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="w-24 h-24 bg-gradient-to-tr from-yellow-300 to-millionaire-gold rounded-full flex items-center justify-center mx-auto mb-6 relative animate-pulse shadow-2xl shadow-millionaire-gold/30">
              <Trophy className="w-12 h-12 text-millionaire-dark" />
            </div>

            <h2 className="text-2xl md:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-millionaire-gold to-yellow-100 uppercase tracking-widest block glow-gold animate-bounce mb-2">
              ¡MILLONARIO!
            </h2>
            <h3 className="text-lg md:text-2xl font-display text-white mb-6 font-bold">
              ԴՈՒՔ ԴԱՐՁԱՔ ՄԻԼԻՈՆԱՏԵՐ
            </h3>

            <p className="text-xs md:text-sm text-cyan-200 max-w-md mx-auto mb-8 leading-relaxed">
              Has respondido correctamente las 15 difíciles preguntas de vocabulario y gramática del español al armenio. ¡Eres un maestro de los dos mundos lingüísticos!
            </p>

            <div className="bg-white/5 p-8 rounded-2xl border border-millionaire-gold/40 mb-8 max-w-lg mx-auto backdrop-blur-md">
              <span className="text-[11px] text-cyan-400 block uppercase tracking-widest font-mono">Premio Supremo</span>
              <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-millionaire-gold to-yellow-100 block glow-gold mt-2">
                1,000,000 ֏
              </span>
              
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5 text-xs text-gray-300 font-mono">
                <div>
                  <span className="text-gray-400 block text-[10px]">Comodines Utilizados</span>
                  <span className="font-bold text-white text-sm">{usedLifelinesCount} / 3</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Modo de Juego</span>
                  <span className="font-bold text-white text-sm">
                    {gameMode === "TIMER" ? "Classic Time Clásico" : "Relajado / Relaxed"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStatus("INTRO")}
              className="px-8 py-4 bg-gradient-to-r from-millionaire-gold to-yellow-300 hover:from-yellow-400 hover:to-yellow-200 font-black rounded-xl text-millionaire-dark transition duration-200 shadow-2xl scale-105 hover:scale-110"
              id="millionaire-restart-btn"
            >
              Jugar otra vez (Խաղալ նորից)
            </button>
          </div>
        )}

      </main>

      {/* Footer copyright */}
      <footer className="w-full py-4 text-center text-[10px] text-gray-500 font-mono border-t border-white/5 z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Quién Quiere Ser Millonario Arm/Esp © 2026</span>
          <span className="text-cyan-400/60">Aprende español e hispanoarmonía con diversión</span>
        </div>
      </footer>
    </div>
  );
}
