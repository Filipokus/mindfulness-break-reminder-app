import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Home, Settings, Plus, X, Coffee, Moon, Users, Briefcase, BookOpen, Palette, Clock, Pause, Play, Check, Download, FlaskConical } from 'lucide-react';
import { getAssignment, isExperimentEnabled } from './experiment';
import type { ExperimentAssignment, ExperimentVariant } from './experiment';
import { trackEvent, computeMetrics, exportResultsAsJSON, exportResultsAsCSV, downloadFile } from './analytics';
import type { ExperimentResults } from './analytics';

type Screen = 'onboarding1' | 'onboarding2' | 'onboarding3' | 'home' | 'break' | 'create' | 'edit' | 'history';
type Language = 'sv' | 'en';

interface CompletedBreak {
  timestamp: string;
  message: string;
  duration: number;
}

interface Break {
  time: string;
  message: string;
  active: boolean;
}

interface UserProfile {
  name: string;
  activity: string;
  breakType: string;
  suggestedFrequency: number;
}

const ACTIVITY_RECOMMENDATIONS: Record<string, number> = {
  office: 4,
  student: 4,
  creative: 3,
  physical: 3,
  home: 2,
  evening: 2
};

const BREAK_SUGGESTIONS: Record<string, Record<Language, string[]>> = {
  office: {
    sv: ['En kort promenad?', 'Stretch vid skrivbordet', 'Titta ut genom fönstret'],
    en: ['A short walk?', 'Desk stretch break', 'Look out the window']
  },
  student: {
    sv: ['Rörelse mellan studierna', 'Lunch utan skärm', 'Frisk luft en stund'],
    en: ['Move between study sessions', 'Screen-free lunch', 'Fresh air break']
  },
  creative: {
    sv: ['Vila ögonen', 'Kaffe och reflektion', 'Skissa något annat'],
    en: ['Rest your eyes', 'Coffee and reflection', 'Sketch something else']
  },
  physical: {
    sv: ['Drick vatten', 'Sitt ner en stund', 'Stretcha mjukt'],
    en: ['Drink water', 'Sit down for a moment', 'Gentle stretch']
  },
  home: {
    sv: ['Gå ut en stund', 'Kaffe eller te', 'Bara sitta still'],
    en: ['Step outside for a bit', 'Coffee or tea', 'Just sit still']
  },
  evening: {
    sv: ['Koppla av från skärmar', 'Kvällspromenad', 'Läs några sidor'],
    en: ['Unplug from screens', 'Evening walk', 'Read a few pages']
  }
};

const TRANSLATABLE_PHRASES: Array<{ sv: string; en: string }> = [
  { sv: 'Kaffe eller te', en: 'Coffee or tea' },
  { sv: 'Gå ut en stund', en: 'Step outside for a bit' },
  { sv: 'Andas och stretcha', en: 'Breathe and stretch' },
  { sv: 'Vila ögonen', en: 'Rest your eyes' },
  { sv: 'En kort promenad?', en: 'A short walk?' },
  { sv: 'Lunch utan skärm', en: 'Screen-free lunch' },
  { sv: 'Tre djupa andetag', en: 'Three deep breaths' },
  { sv: 'Stretch vid skrivbordet', en: 'Desk stretch break' },
  { sv: 'Titta ut genom fönstret', en: 'Look out the window' },
  { sv: 'Rörelse mellan studierna', en: 'Move between study sessions' },
  { sv: 'Frisk luft en stund', en: 'Fresh air break' },
  { sv: 'Kaffe och reflektion', en: 'Coffee and reflection' },
  { sv: 'Skissa något annat', en: 'Sketch something else' },
  { sv: 'Drick vatten', en: 'Drink water' },
  { sv: 'Sitt ner en stund', en: 'Sit down for a moment' },
  { sv: 'Stretcha mjukt', en: 'Gentle stretch' },
  { sv: 'Bara sitta still', en: 'Just sit still' },
  { sv: 'Koppla av från skärmar', en: 'Unplug from screens' },
  { sv: 'Kvällspromenad', en: 'Evening walk' },
  { sv: 'Läs några sidor', en: 'Read a few pages' },
  { sv: 'Ta en promenad', en: 'Take a walk' },
  { sv: 'Drick ett glas vatten', en: 'Drink a glass of water' },
  { sv: 'Stretcha kroppen', en: 'Stretch your body' },
  { sv: 'Ring en vän', en: 'Call a friend' },
  { sv: 'Lyssna på musik', en: 'Listen to music' },
  { sv: 'Meditera i 5 min', en: 'Meditate for 5 min' },
  { sv: 'Skriv ner tankar', en: 'Write down thoughts' },
  { sv: 'Paus', en: 'Break' }
];

function translateKnownPhrase(value: string, from: Language, to: Language) {
  if (from === to) return value;
  const pair = TRANSLATABLE_PHRASES.find((item) => item[from] === value);
  return pair ? pair[to] : value;
}

function getDefaultBreakType(language: Language) {
  return language === 'sv' ? 'Kaffe eller te' : 'Coffee or tea';
}

function getInitialBreaks(language: Language): Break[] {
  return [
    { time: '10:45', message: language === 'sv' ? 'En kort promenad?' : 'A short walk?', active: true },
    { time: '13:00', message: language === 'sv' ? 'Lunch utan skärm' : 'Screen-free lunch', active: false },
    { time: '15:30', message: language === 'sv' ? 'Tre djupa andetag' : 'Three deep breaths', active: false }
  ];
}

// Minimum completions required before adaptive scheduling kicks in (below this threshold
// the data is too sparse to produce a meaningful preference signal).
const MIN_COMPLETIONS_FOR_ADAPTIVE = 3;

// Earliest and latest hours (inclusive) considered for adaptive break scheduling.
// Keeps suggested breaks within a sensible daytime window.
const ADAPTIVE_WINDOW_START_HOUR = 7;
const ADAPTIVE_WINDOW_END_HOUR = 21;

// Computes adaptive break times based on historical completion data.
// Falls back to static defaults when there are fewer than MIN_COMPLETIONS_FOR_ADAPTIVE entries.
function computeAdaptiveBreaks(
  completedBreaks: CompletedBreak[],
  activity: string,
  language: Language,
  frequency: number
): Break[] {
  if (completedBreaks.length < MIN_COMPLETIONS_FOR_ADAPTIVE) {
    return getInitialBreaks(language);
  }

  // Tally completions by hour-of-day to find peak engagement windows
  const hourCounts: number[] = Array(24).fill(0);
  completedBreaks.forEach((b) => {
    const hour = new Date(b.timestamp).getHours();
    hourCounts[hour]++;
  });

  // Restrict candidate hours to the configured daytime window
  const candidates: { hour: number; count: number }[] = [];
  for (let h = ADAPTIVE_WINDOW_START_HOUR; h <= ADAPTIVE_WINDOW_END_HOUR; h++) {
    candidates.push({ hour: h, count: hourCounts[h] });
  }
  candidates.sort((a, b) => b.count - a.count);

  const targetCount = Math.min(frequency, candidates.length);
  const topHours = candidates
    .slice(0, targetCount)
    .map((c) => c.hour)
    .sort((a, b) => a - b);

  const suggestions = (BREAK_SUGGESTIONS[activity] || BREAK_SUGGESTIONS.home)[language];
  return topHours.map((hour, i) => ({
    time: `${hour.toString().padStart(2, '0')}:00`,
    message: suggestions[i % suggestions.length],
    active: i === 0,
  }));
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage === 'en' ? 'en' : 'sv';
  });
  const [currentScreen, setCurrentScreen] = useState<Screen>('onboarding1');
  const [profile, setProfile] = useState<UserProfile>(() => ({
    name: '',
    activity: '',
    breakType: getDefaultBreakType(language),
    suggestedFrequency: 3
  }));
  const [breaks, setBreaks] = useState<Break[]>(() => getInitialBreaks(language));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<{ time: string, message: string }[]>([]);
  const [completedBreaks, setCompletedBreaks] = useState<CompletedBreak[]>([]);

  // Experiment: stable assignment (userId + variant) persisted in localStorage
  const [assignment] = useState<ExperimentAssignment>(() => getAssignment());
  // Timestamp when the break screen was shown, used to compute time-to-start
  const breakShownAtRef = useRef<number | null>(null);

  const updateBreaks = (activity: string, selectedLanguage: Language) => {
    if (assignment.variant === 'adaptive') {
      const adaptive = computeAdaptiveBreaks(
        completedBreaks,
        activity,
        selectedLanguage,
        profile.suggestedFrequency
      );
      setBreaks(adaptive);
      return;
    }

    const suggestions = (BREAK_SUGGESTIONS[activity] || BREAK_SUGGESTIONS.home)[selectedLanguage];
    const times = activity === 'office' || activity === 'student' 
      ? ['10:30', '13:00', '15:30', '17:00'] 
      : ['10:00', '14:00', '18:00', '21:00'];

    const frequency = profile.suggestedFrequency;
    const newBreaks = times.slice(0, frequency).map((time, i) => ({
      time,
      message: suggestions[i] || suggestions[0],
      active: i === 0
    }));

    setBreaks(newBreaks);
  };

  const handleLanguageChange = (nextLanguage: Language) => {
    if (nextLanguage === language) {
      return;
    }

    setProfile((prev) => ({
      ...prev,
      breakType: translateKnownPhrase(prev.breakType, language, nextLanguage)
    }));

    setBreaks((prev) => prev.map((breakItem) => ({
      ...breakItem,
      message: translateKnownPhrase(breakItem.message, language, nextLanguage)
    })));

    setHistory((prev) => prev.map((item) => ({
      ...item,
      message: translateKnownPhrase(item.message, language, nextLanguage)
    })));

    setCompletedBreaks((prev) => prev.map((item) => ({
      ...item,
      message: translateKnownPhrase(item.message, language, nextLanguage)
    })));

    setLanguage(nextLanguage);
  };

  useEffect(() => {
    const savedProfile = localStorage.getItem('profile');
    const savedBreaks = localStorage.getItem('breaks');
    const savedHistory = localStorage.getItem('history');
    const savedCompletedBreaks = localStorage.getItem('completedBreaks');

    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
    if (savedBreaks) {
      setBreaks(JSON.parse(savedBreaks));
    }
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    if (savedCompletedBreaks) {
      setCompletedBreaks(JSON.parse(savedCompletedBreaks));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('breaks', JSON.stringify(breaks));
  }, [breaks]);

  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('completedBreaks', JSON.stringify(completedBreaks));
  }, [completedBreaks]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EF] via-[#E8E4DC] to-[#D4CFC3] p-0 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-0 sm:gap-6 lg:grid-cols-[minmax(260px,1fr)_minmax(420px,560px)] lg:items-stretch">
        <aside className="hidden lg:flex lg:flex-col lg:justify-center lg:pr-6">
          <h1 className="mb-3 text-5xl leading-tight font-light text-[#2C2C2A]">
            {language === 'sv' ? 'Ta en stund' : 'Take a Moment'}
          </h1>
          <p className="max-w-md text-lg leading-relaxed font-light text-[#2C2C2A]/60">
            {language === 'sv'
              ? 'En app som hjälper dig skapa lugna, hållbara pauser under dagen. Allt sparas lokalt så du snabbt kan komma tillbaka.'
              : 'An app that helps you create calm, sustainable breaks throughout your day. Everything is saved locally so you can jump right back in.'}
          </p>
        </aside>

        <div className="relative h-[100dvh] max-h-[920px] overflow-hidden bg-[#FAFAF8] shadow-2xl sm:rounded-[34px] sm:border sm:border-white/40 lg:h-[820px]">
          <div className="absolute top-3 right-3 z-40">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as Language)}
              aria-label={language === 'sv' ? 'Välj språk' : 'Choose language'}
              className="rounded-full border border-[#E8E4DC] bg-white px-3 py-1.5 text-xs sm:text-sm font-light text-[#2C2C2A] shadow-sm focus:outline-none"
            >
              <option value="sv">Svenska</option>
              <option value="en">English</option>
            </select>
          </div>

          <AnimatePresence mode="wait">
            {currentScreen === 'onboarding1' && (
              <Onboarding1 
                key="onboarding1"
                language={language}
                profile={profile}
                setProfile={setProfile}
                onNext={() => setCurrentScreen('onboarding2')} 
              />
            )}
            {currentScreen === 'onboarding2' && (
              <Onboarding2 
                key="onboarding2"
                language={language}
                profile={profile}
                setProfile={setProfile}
                onBack={() => setCurrentScreen('onboarding1')}
                onNext={() => setCurrentScreen('onboarding3')} 
              />
            )}
            {currentScreen === 'onboarding3' && (
              <Onboarding3 
                key="onboarding3"
                language={language}
                profile={profile}
                setProfile={setProfile}
                onBack={() => setCurrentScreen('onboarding2')}
                onNext={() => {
                  updateBreaks(profile.activity, language);
                  setCurrentScreen('home');
                }} 
              />
            )}
            {currentScreen === 'home' && (
              <HomeScreen 
                key="home"
                language={language}
                profile={profile}
                breaks={breaks}
                completedBreaks={completedBreaks}
                onBreakClick={() => {
                  const activeMessage = breaks.find((b) => b.active)?.message || (language === 'sv' ? 'Paus' : 'Break');
                  breakShownAtRef.current = Date.now();
                  trackEvent({
                    timestamp: new Date().toISOString(),
                    eventType: 'break_shown',
                    experimentVariant: assignment.variant,
                    language,
                    userId: assignment.userId,
                    breakMessage: activeMessage,
                  });
                  setCurrentScreen('break');
                }}
                onCreateClick={() => setCurrentScreen('create')}
                onEditClick={(index: number) => {
                  setEditingIndex(index);
                  setCurrentScreen('edit');
                }}
                onPauseClick={() => {
                  const activeMessage = breaks.find((b) => b.active)?.message || (language === 'sv' ? 'Paus' : 'Break');
                  breakShownAtRef.current = Date.now();
                  trackEvent({
                    timestamp: new Date().toISOString(),
                    eventType: 'break_shown',
                    experimentVariant: assignment.variant,
                    language,
                    userId: assignment.userId,
                    breakMessage: activeMessage,
                  });
                  setCurrentScreen('break');
                }}
                onHistoryClick={() => setCurrentScreen('history')}
              />
            )}
            {currentScreen === 'break' && (
              <BreakScreen 
                key="break"
                language={language}
                message={breaks.find(b => b.active)?.message || (language === 'sv' ? 'Paus' : 'Break')}
                onStart={() => {
                  const shownAt = breakShownAtRef.current;
                  const timeToStartSeconds = shownAt !== null
                    ? Math.round((Date.now() - shownAt) / 1000)
                    : undefined;
                  trackEvent({
                    timestamp: new Date().toISOString(),
                    eventType: 'break_start',
                    experimentVariant: assignment.variant,
                    language,
                    userId: assignment.userId,
                    breakMessage: breaks.find((b) => b.active)?.message,
                    timeToStartSeconds,
                  });
                }}
                onComplete={(duration) => {
                  const now = new Date();
                  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                  const activeMessage = breaks.find((b) => b.active)?.message || (language === 'sv' ? 'Paus' : 'Break');
                  trackEvent({
                    timestamp: now.toISOString(),
                    eventType: 'break_complete',
                    experimentVariant: assignment.variant,
                    language,
                    userId: assignment.userId,
                    breakMessage: activeMessage,
                    durationSeconds: duration,
                  });
                  setHistory([...history, { time: timeString, message: activeMessage }]);
                  setCompletedBreaks([...completedBreaks, { timestamp: now.toISOString(), message: activeMessage, duration }]);
                  setCurrentScreen('home');
                }} 
                onCancel={(wasActive) => {
                  trackEvent({
                    timestamp: new Date().toISOString(),
                    eventType: 'break_skip',
                    experimentVariant: assignment.variant,
                    language,
                    userId: assignment.userId,
                    breakMessage: breaks.find((b) => b.active)?.message,
                    wasStarted: wasActive,
                  });
                  setCurrentScreen('home');
                }}
              />
            )}
            {currentScreen === 'create' && (
              <CreateBreakScreen 
                key="create"
                language={language}
                breaks={breaks}
                setBreaks={setBreaks}
                onBack={() => setCurrentScreen('home')} 
              />
            )}
            {currentScreen === 'edit' && editingIndex !== null && (
              <EditBreakScreen 
                key="edit"
                language={language}
                breakItem={breaks[editingIndex]}
                onSave={(updatedBreak) => {
                  const newBreaks = [...breaks];
                  newBreaks[editingIndex] = updatedBreak;
                  setBreaks(newBreaks.sort((a, b) => a.time.localeCompare(b.time)));
                  setCurrentScreen('home');
                }}
                onDelete={() => {
                  const newBreaks = breaks.filter((_, i) => i !== editingIndex);
                  setBreaks(newBreaks);
                  setCurrentScreen('home');
                }}
                onBack={() => setCurrentScreen('home')} 
              />
            )}
            {currentScreen === 'history' && (
              <HistoryScreen 
                key="history"
                language={language}
                completedBreaks={completedBreaks}
                assignment={assignment}
                onBack={() => setCurrentScreen('home')} 
              />
            )}
          </AnimatePresence>

          {/* Hidden restart button in bottom right corner */}
          <button
            onClick={() => {
              setCurrentScreen('onboarding1');
              setProfile({
                name: '',
                activity: '',
                breakType: getDefaultBreakType(language),
                suggestedFrequency: 3
              });
              setBreaks(getInitialBreaks(language));
              setHistory([]);
              setCompletedBreaks([]);
            }}
            className="absolute bottom-4 right-4 z-50 h-16 w-16 rounded-full bg-[#2C2C2A] opacity-0 transition-opacity hover:opacity-10"
            aria-label="Restart flow"
          />
        </div>
      </div>
    </div>
  );
}

// Onboarding Screen 1 - Name
function Onboarding1({ language, profile, setProfile, onNext }: any) {
  const isSv = language === 'sv';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full bg-[#FAFAF8] flex flex-col"
    >
      <div className="h-12 sm:h-16" />
      
      <div className="px-6 sm:px-8 pb-6 sm:pb-10">
        <div className="flex gap-1.5 sm:gap-2 items-center justify-center">
          <div className="w-6 sm:w-8 h-0.5 sm:h-1 bg-[#C5D4C0] rounded-full" />
          <div className="w-6 sm:w-8 h-0.5 sm:h-1 bg-[#E8E4DC] rounded-full" />
          <div className="w-6 sm:w-8 h-0.5 sm:h-1 bg-[#E8E4DC] rounded-full" />
        </div>
      </div>

      <div className="flex-1 px-6 sm:px-8">
        <div className="mb-4 sm:mb-6">
          <p className="text-xs sm:text-[13px] font-light text-[#C5D4C0] uppercase tracking-wider mb-2 sm:mb-3">
            {isSv ? 'Steg 1 av 3' : 'Step 1 of 3'}
          </p>
          <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-[#C5D4C0]/20 flex items-center justify-center mb-4 sm:mb-6">
            <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-[#C5D4C0]/40" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-[32px] leading-[32px] sm:leading-[40px] text-[#2C2C2A] font-light mb-3 sm:mb-4">
          {isSv ? 'Hej där!' : 'Hi there!'}
        </h1>
        <p className="text-sm sm:text-[18px] leading-[22px] sm:leading-[28px] text-[#2C2C2A]/60 font-light mb-8 sm:mb-12">
          {isSv
            ? 'Jag hjälper dig att komma ihåg att ta pauser som passar just ditt liv. Låt oss börja enkelt.'
            : 'I will help you remember to take breaks that fit your day. Let us start simple.'}
        </p>

        <div>
          <label className="text-sm sm:text-[15px] font-light text-[#2C2C2A]/50 mb-2 sm:mb-3 block">
            {isSv ? 'Vad heter du?' : 'What is your name?'}
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            placeholder={isSv ? 'Ditt namn' : 'Your name'}
            className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-white border-2 border-[#E8E4DC] rounded-3xl text-sm sm:text-[17px] font-light text-[#2C2C2A] placeholder:text-[#2C2C2A]/30 focus:outline-none focus:border-[#C5D4C0] transition-colors"
          />
        </div>
      </div>

      <div className="px-6 sm:px-8 pb-6 sm:pb-10">
        <button 
          onClick={onNext}
          disabled={!profile.name.trim()}
          className="w-full py-3 sm:py-5 bg-[#2C2C2A] text-[#FAFAF8] rounded-full text-sm sm:text-[17px] font-light disabled:opacity-30 transition-opacity"
        >
          {isSv ? 'Fortsätt' : 'Continue'}
        </button>
      </div>
    </motion.div>
  );
}

// Onboarding Screen 2 - Activity Type
function Onboarding2({ language, profile, setProfile, onBack, onNext }: any) {
  const isSv = language === 'sv';

  const activities = [
    { id: 'office', label: isSv ? 'Kontorsarbete' : 'Office work', emoji: '💼', desc: isSv ? 'Mycket skärmtid' : 'A lot of screen time' },
    { id: 'student', label: isSv ? 'Studier' : 'Studying', emoji: '📚', desc: isSv ? 'Lära och fokusera' : 'Learning and focus' },
    { id: 'creative', label: isSv ? 'Kreativt arbete' : 'Creative work', emoji: '🎨', desc: isSv ? 'Design, musik, konst' : 'Design, music, art' },
    { id: 'physical', label: isSv ? 'Fysiskt arbete' : 'Physical work', emoji: '🏃', desc: isSv ? 'Mycket i rörelse' : 'Mostly active' },
    { id: 'home', label: isSv ? 'Hemma' : 'At home', emoji: '🏡', desc: isSv ? 'Vård, fritid, vila' : 'Care, hobbies, rest' },
    { id: 'evening', label: isSv ? 'Kvällstid' : 'Evening time', emoji: '🌙', desc: isSv ? 'Efter jobbet' : 'After work' }
  ];

  const getRecommendation = (activityId: string) => ACTIVITY_RECOMMENDATIONS[activityId] || 3;

  const handleSelect = (activityId: string) => {
    setProfile({ 
      ...profile, 
      activity: activityId,
      suggestedFrequency: getRecommendation(activityId)
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full bg-[#FAFAF8] flex flex-col"
    >
      <div className="h-12 sm:h-16" />
      
      <div className="px-6 sm:px-8 pb-6 sm:pb-8">
        <button onClick={onBack} className="flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 -ml-2">
          <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5 text-[#2C2C2A]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="px-6 sm:px-8 pb-6 sm:pb-10">
        <div className="flex gap-1.5 sm:gap-2 items-center justify-center">
          <div className="w-6 sm:w-8 h-0.5 sm:h-1 bg-[#E8E4DC] rounded-full" />
          <div className="w-6 sm:w-8 h-0.5 sm:h-1 bg-[#C5D4C0] rounded-full" />
          <div className="w-6 sm:w-8 h-0.5 sm:h-1 bg-[#E8E4DC] rounded-full" />
        </div>
      </div>

      <div className="flex-1 px-6 sm:px-8 overflow-y-auto">
        <div className="mb-4 sm:mb-6">
          <p className="text-xs sm:text-[13px] font-light text-[#C5D4C0] uppercase tracking-wider">
            {isSv ? 'Steg 2 av 3' : 'Step 2 of 3'}
          </p>
        </div>
        <h1 className="text-xl sm:text-[28px] leading-[28px] sm:leading-[36px] text-[#2C2C2A] font-light mb-2 sm:mb-3">
          {isSv ? 'Hur ser dina dagar ut?' : 'What do your days look like?'}
        </h1>
        <p className="text-sm sm:text-[16px] leading-[20px] sm:leading-[24px] text-[#2C2C2A]/50 font-light mb-6 sm:mb-8">
          {isSv ? 'Jag anpassar pauserna efter vad du gör.' : 'I adjust your breaks based on your routine.'}
        </p>

        <div className="space-y-2 sm:space-y-3 pb-6">
          {activities.map((activity) => (
            <button
              key={activity.id}
              onClick={() => handleSelect(activity.id)}
              className={`w-full py-3 sm:py-4 px-4 sm:px-5 rounded-3xl text-left transition-all flex items-start gap-2 sm:gap-3 ${
                profile.activity === activity.id
                  ? 'bg-[#C5D4C0] text-[#2C2C2A] shadow-sm'
                  : 'bg-white text-[#2C2C2A]/60 border-2 border-[#E8E4DC]'
              }`}
            >
              <span className="text-xl sm:text-2xl flex-shrink-0 mt-0.5">{activity.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm sm:text-[17px] font-light text-[#2C2C2A]">{activity.label}</div>
                <div className="text-xs sm:text-[14px] font-light text-[#2C2C2A]/50 mt-0.5">{activity.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 sm:px-8 pb-6 sm:pb-10">
        <button 
          onClick={onNext}
          disabled={!profile.activity}
          className="w-full py-3 sm:py-5 bg-[#2C2C2A] text-[#FAFAF8] rounded-full text-sm sm:text-[17px] font-light disabled:opacity-30"
        >
          {isSv ? 'Nästa' : 'Next'}
        </button>
      </div>
    </motion.div>
  );
}

// Onboarding Screen 3 - Break Type
function Onboarding3({ language, profile, setProfile, onBack, onNext }: any) {
  const isSv = language === 'sv';

  const options = [
    { id: 'walk', label: isSv ? 'Gå ut en stund' : 'Step outside for a bit', emoji: '🌿' },
    { id: 'coffee', label: isSv ? 'Kaffe eller te' : 'Coffee or tea', emoji: '☕' },
    { id: 'breathe', label: isSv ? 'Andas och stretcha' : 'Breathe and stretch', emoji: '🧘' },
    { id: 'rest', label: isSv ? 'Vila ögonen' : 'Rest your eyes', emoji: '😌' }
  ];

  const activityNames: Record<string, string> = {
    office: isSv ? 'kontorsarbete' : 'office work',
    student: isSv ? 'studier' : 'studying',
    creative: isSv ? 'kreativa arbete' : 'creative work',
    physical: isSv ? 'fysiska arbete' : 'physical work',
    home: isSv ? 'tid hemma' : 'time at home',
    evening: isSv ? 'kvällstid' : 'evening time'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full bg-[#FAFAF8] flex flex-col"
    >
      <div className="h-12 sm:h-16" />
      
      <div className="px-6 sm:px-8 pb-6 sm:pb-8">
        <button onClick={onBack} className="flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 -ml-2">
          <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5 text-[#2C2C2A]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="px-6 sm:px-8 pb-6 sm:pb-10">
        <div className="flex gap-1.5 sm:gap-2 items-center justify-center">
          <div className="w-6 sm:w-8 h-0.5 sm:h-1 bg-[#E8E4DC] rounded-full" />
          <div className="w-6 sm:w-8 h-0.5 sm:h-1 bg-[#E8E4DC] rounded-full" />
          <div className="w-6 sm:w-8 h-0.5 sm:h-1 bg-[#C5D4C0] rounded-full" />
        </div>
      </div>

      <div className="flex-1 px-6 sm:px-8">
        <div className="mb-4 sm:mb-6">
          <p className="text-xs sm:text-[13px] font-light text-[#C5D4C0] uppercase tracking-wider">
            {isSv ? 'Steg 3 av 3' : 'Step 3 of 3'}
          </p>
        </div>
        <h1 className="text-xl sm:text-[28px] leading-[28px] sm:leading-[36px] text-[#2C2C2A] font-light mb-2 sm:mb-3">
          {isSv ? 'Vad hjälper dig mest att ladda om?' : 'What helps you recharge most?'}
        </h1>
        <p className="text-sm sm:text-[16px] leading-[20px] sm:leading-[24px] text-[#2C2C2A]/50 font-light mb-6 sm:mb-8">
          {isSv ? 'Baserat på ditt ' : 'Based on your '}
          {activityNames[profile.activity] || (isSv ? 'liv' : 'routine')}
          {isSv ? ' rekommenderar jag ' : ', I recommend '}
          <span className="text-[#2C2C2A] font-normal">
            {profile.suggestedFrequency} {isSv ? 'pauser om dagen' : 'breaks per day'}
          </span>
          .
        </p>

        <div className="space-y-2 sm:space-y-3">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => setProfile({ ...profile, breakType: option.label })}
              className={`w-full py-3 sm:py-5 px-4 sm:px-6 rounded-3xl text-sm sm:text-[17px] font-light transition-all flex items-center gap-2 sm:gap-3 ${
                profile.breakType === option.label
                  ? 'bg-[#C5D4C0] text-[#2C2C2A] shadow-sm'
                  : 'bg-white text-[#2C2C2A]/60 border-2 border-[#E8E4DC]'
              }`}
            >
              <span className="text-xl sm:text-2xl flex-shrink-0">{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 sm:px-8 pb-6 sm:pb-10">
        <button 
          onClick={onNext}
          className="w-full py-3 sm:py-5 bg-[#2C2C2A] text-[#FAFAF8] rounded-full text-sm sm:text-[17px] font-light"
        >
          {isSv ? 'Skapa mina pauser' : 'Create my breaks'}
        </button>
      </div>
    </motion.div>
  );
}

// Home Screen
function HomeScreen({ language, profile, breaks, completedBreaks, onBreakClick, onCreateClick, onEditClick, onPauseClick, onHistoryClick }: any) {
  const isSv = language === 'sv';
  const firstName = profile.name.split(' ')[0];
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 10) return isSv ? 'God morgon' : 'Good morning';
    if (hour < 17) return isSv ? 'Hej' : 'Hello';
    return isSv ? 'God kväll' : 'Good evening';
  };

  const getTodayCompletedCount = () => {
    const today = new Date().toDateString();
    return completedBreaks.filter((b: CompletedBreak) => 
      new Date(b.timestamp).toDateString() === today
    ).length;
  };

  const getNextBreak = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    for (let i = 0; i < breaks.length; i++) {
      const [hours, mins] = breaks[i].time.split(':').map(Number);
      const breakMinutes = hours * 60 + mins;
      
      if (breakMinutes > currentMinutes) {
        return { index: i, minutesLeft: breakMinutes - currentMinutes };
      }
    }
    
    // If no breaks left today, show first break tomorrow
    if (breaks.length > 0) {
      const [hours, mins] = breaks[0].time.split(':').map(Number);
      const breakMinutes = hours * 60 + mins;
      const minutesUntilMidnight = (24 * 60) - currentMinutes;
      return { index: 0, minutesLeft: minutesUntilMidnight + breakMinutes };
    }
    
    return null;
  };

  const nextBreak = getNextBreak();
  const todayCount = getTodayCompletedCount();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="h-full bg-[#FAFAF8] flex flex-col"
    >
      <div className="h-12 sm:h-16" />
      
      <div className="px-6 sm:px-8 pt-3 sm:pt-4 pb-6 sm:pb-8 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/40 mb-1 sm:mb-2">{greeting()},</p>
          <h1 className="text-2xl sm:text-[32px] leading-[32px] sm:leading-[40px] text-[#2C2C2A] font-light">{firstName || (isSv ? 'vän' : 'friend')}</h1>
        </div>
        <button 
          onClick={onPauseClick}
          className="flex-shrink-0 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-[#C5D4C0]/20 flex items-center justify-center hover:bg-[#C5D4C0]/30 transition-colors"
        >
          <Pause className="w-4 sm:w-5 h-4 sm:h-5 text-[#2C2C2A]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 px-6 sm:px-8 pb-4 sm:pb-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <p className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50">{isSv ? 'Dina stunder idag' : 'Your moments today'}</p>
          <button 
            onClick={onCreateClick}
            className="text-xs sm:text-[15px] font-light text-[#C5D4C0] flex items-center gap-1"
          >
            <Plus className="w-3 sm:w-4 h-3 sm:h-4" strokeWidth={2} />
            {isSv ? 'Lägg till' : 'Add'}
          </button>
        </div>
        
        <div className="space-y-2 sm:space-y-3">
          {breaks.map((breakItem: Break, index: number) => {
            const isNext = nextBreak?.index === index;
            const minutesLeft = isNext ? nextBreak.minutesLeft : null;
            
            return (
              <motion.button
                key={index}
                onClick={isNext ? () => onBreakClick(breakItem.message) : () => onEditClick(index)}
                whileTap={{ scale: 0.98 }}
                className={`w-full bg-white rounded-3xl p-4 sm:p-6 flex items-start gap-3 sm:gap-4 transition-all ${
                  isNext 
                    ? 'cursor-pointer border-2 border-[#C5D4C0] shadow-sm' 
                    : 'opacity-50 border-2 border-[#E8E4DC] hover:opacity-70'
                }`}
              >
                <div className={`flex-shrink-0 w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full mt-1 sm:mt-1.5 ${
                  isNext ? 'bg-[#C5D4C0]' : 'bg-[#E8E4DC]'
                }`} />
                <div className="flex-1 text-left min-w-0">
                  {isNext && (
                    <div className="text-xs sm:text-[13px] font-light text-[#C5D4C0] mb-1 uppercase tracking-wide">
                      {isSv ? 'Nästa' : 'Next'}
                    </div>
                  )}
                  <div className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50 mb-0.5 sm:mb-1">
                    {breakItem.time}
                  </div>
                  <div className="text-sm sm:text-[17px] font-light text-[#2C2C2A]">
                    {breakItem.message}
                  </div>
                  {isNext && minutesLeft !== null && (
                    <div className="text-xs sm:text-[14px] font-light text-[#2C2C2A]/40 mt-1 sm:mt-2">
                      {minutesLeft < 60 
                        ? isSv
                          ? `${minutesLeft} ${minutesLeft === 1 ? 'minut' : 'minuter'} kvar`
                          : `${minutesLeft} ${minutesLeft === 1 ? 'minute' : 'minutes'} left`
                        : isSv
                          ? `${Math.floor(minutesLeft / 60)} ${Math.floor(minutesLeft / 60) === 1 ? 'timme' : 'timmar'} kvar`
                          : `${Math.floor(minutesLeft / 60)} ${Math.floor(minutesLeft / 60) === 1 ? 'hour' : 'hours'} left`
                      }
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {nextBreak !== null && (
          <p className="text-xs sm:text-[14px] font-light text-[#2C2C2A]/30 mt-4 sm:mt-6 text-center italic">
            {isSv
              ? 'Tryck på nästa paus för att ta den nu, eller tryck på andra pauser för att redigera'
              : 'Tap the next break to take it now, or tap other breaks to edit them'}
          </p>
        )}
      </div>

      <div className="border-t border-[#E8E4DC] bg-[#FAFAF8] pb-6 sm:pb-8">
        <div className="flex items-center justify-around px-6 sm:px-8 pt-3 sm:pt-4">
          <button className="flex flex-col items-center gap-0.5 sm:gap-1 py-2">
            <Home className="w-5 sm:w-6 h-5 sm:h-6 text-[#2C2C2A]" strokeWidth={1.5} />
          </button>
          <button onClick={onHistoryClick} className="flex flex-col items-center gap-0.5 sm:gap-1 py-2 relative">
            <Clock className="w-5 sm:w-6 h-5 sm:h-6 text-[#2C2C2A]/30" strokeWidth={1.5} />
            {todayCount > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-1.5 sm:w-2 h-1.5 sm:h-2 bg-[#C5D4C0] rounded-full" />
            )}
          </button>
          <button onClick={onCreateClick} className="flex flex-col items-center gap-0.5 sm:gap-1 py-2">
            <Plus className="w-5 sm:w-6 h-5 sm:h-6 text-[#2C2C2A]/30" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Create Break Screen
function CreateBreakScreen({ language, breaks, setBreaks, onBack }: any) {
  const isSv = language === 'sv';
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');
  const [selectedHour, setSelectedHour] = useState('10');
  const [selectedMinute, setSelectedMinute] = useState('00');

  const suggestions = [
    isSv ? 'Ta en promenad' : 'Take a walk',
    isSv ? 'Drick ett glas vatten' : 'Drink a glass of water',
    isSv ? 'Stretcha kroppen' : 'Stretch your body',
    isSv ? 'Ring en vän' : 'Call a friend',
    isSv ? 'Läs några sidor' : 'Read a few pages',
    isSv ? 'Lyssna på musik' : 'Listen to music',
    isSv ? 'Meditera i 5 min' : 'Meditate for 5 min',
    isSv ? 'Skriv ner tankar' : 'Write down thoughts'
  ];

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const handleCreate = () => {
    const timeString = `${selectedHour}:${selectedMinute}`;
    if (message) {
      const newBreak = { time: timeString, message, active: false };
      setBreaks([...breaks, newBreak].sort((a, b) => a.time.localeCompare(b.time)));
      onBack();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="h-full bg-[#FAFAF8] flex flex-col"
    >
      <div className="h-12 sm:h-16" />
      
      <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex items-center justify-between gap-2">
        <button onClick={onBack} className="flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 -ml-2">
          <X className="w-4 sm:w-5 h-4 sm:h-5 text-[#2C2C2A]" strokeWidth={1.5} />
        </button>
        <h2 className="text-sm sm:text-[17px] font-light text-[#2C2C2A]">{isSv ? 'Ny paus' : 'New break'}</h2>
        <div className="w-8 sm:w-10" />
      </div>

      <div className="flex-1 px-6 sm:px-8 overflow-y-auto">
        <div className="bg-[#C5D4C0]/10 rounded-3xl p-4 sm:p-5 mb-6 sm:mb-8">
          <p className="text-xs sm:text-[15px] leading-[18px] sm:leading-[24px] font-light text-[#2C2C2A]/70">
            {isSv
              ? 'Skapa en paus som återkommer varje dag vid samma tid. Du kan alltid redigera eller ta bort den senare.'
              : 'Create a break that repeats daily at the same time. You can always edit or remove it later.'}
          </p>
        </div>

        <div className="mb-6 sm:mb-8">
          <label className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50 mb-3 sm:mb-4 block">
            {isSv ? 'När vill du bli påmind?' : 'When should we remind you?'}
          </label>
          <div className="flex gap-2 sm:gap-3 items-center">
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
              className="flex-1 py-3 sm:py-4 px-3 sm:px-5 bg-white border-2 border-[#E8E4DC] rounded-3xl text-base sm:text-[20px] font-light text-[#2C2C2A] focus:outline-none focus:border-[#C5D4C0] transition-colors appearance-none text-center"
            >
              {hours.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="text-lg sm:text-[24px] font-light text-[#2C2C2A]/30 px-0.5">:</span>
            <select
              value={selectedMinute}
              onChange={(e) => setSelectedMinute(e.target.value)}
              className="flex-1 py-3 sm:py-4 px-3 sm:px-5 bg-white border-2 border-[#E8E4DC] rounded-3xl text-base sm:text-[20px] font-light text-[#2C2C2A] focus:outline-none focus:border-[#C5D4C0] transition-colors appearance-none text-center"
            >
              {minutes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <label className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50 mb-2 sm:mb-3 block">
            {isSv ? 'Vad vill du göra?' : 'What would you like to do?'}
          </label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isSv ? 't.ex. Ta en promenad' : 'e.g. Take a walk'}
            className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-white border-2 border-[#E8E4DC] rounded-3xl text-sm sm:text-[17px] font-light text-[#2C2C2A] placeholder:text-[#2C2C2A]/30 focus:outline-none focus:border-[#C5D4C0] transition-colors"
          />
        </div>

        <div>
          <p className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50 mb-2 sm:mb-3">{isSv ? 'Förslag' : 'Suggestions'}</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setMessage(suggestion)}
                className="py-1.5 sm:py-2 px-3 sm:px-4 bg-white border border-[#E8E4DC] rounded-full text-xs sm:text-[14px] font-light text-[#2C2C2A]/60 hover:border-[#C5D4C0] hover:text-[#2C2C2A] transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-8 pb-6 sm:pb-10">
        <button 
          onClick={handleCreate}
          disabled={!message}
          className="w-full py-3 sm:py-5 bg-[#2C2C2A] text-[#FAFAF8] rounded-full text-sm sm:text-[17px] font-light disabled:opacity-30"
        >
          {isSv ? 'Skapa daglig paus' : 'Create daily break'}
        </button>
      </div>
    </motion.div>
  );
}

// Edit Break Screen
function EditBreakScreen({ language, breakItem, onSave, onDelete, onBack }: any) {
  const isSv = language === 'sv';
  const [selectedHour, setSelectedHour] = useState(breakItem.time.split(':')[0]);
  const [selectedMinute, setSelectedMinute] = useState(breakItem.time.split(':')[1]);
  const [message, setMessage] = useState(breakItem.message);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const suggestions = [
    isSv ? 'Ta en promenad' : 'Take a walk',
    isSv ? 'Drick ett glas vatten' : 'Drink a glass of water',
    isSv ? 'Stretcha kroppen' : 'Stretch your body',
    isSv ? 'Ring en vän' : 'Call a friend',
    isSv ? 'Läs några sidor' : 'Read a few pages',
    isSv ? 'Lyssna på musik' : 'Listen to music',
    isSv ? 'Meditera i 5 min' : 'Meditate for 5 min',
    isSv ? 'Skriv ner tankar' : 'Write down thoughts'
  ];

  const handleSave = () => {
    const timeString = `${selectedHour}:${selectedMinute}`;
    if (message) {
      onSave({ time: timeString, message, active: breakItem.active });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="h-full bg-[#FAFAF8] flex flex-col"
    >
      <div className="h-12 sm:h-16" />
      
      <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex items-center justify-between gap-2">
        <button onClick={onBack} className="flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 -ml-2">
          <X className="w-4 sm:w-5 h-4 sm:h-5 text-[#2C2C2A]" strokeWidth={1.5} />
        </button>
        <h2 className="text-sm sm:text-[17px] font-light text-[#2C2C2A]">{isSv ? 'Redigera paus' : 'Edit break'}</h2>
        <div className="w-8 sm:w-10" />
      </div>

      <div className="flex-1 px-6 sm:px-8 overflow-y-auto">
        <div className="mb-6 sm:mb-8">
          <label className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50 mb-3 sm:mb-4 block">
            {isSv ? 'Tid' : 'Time'}
          </label>
          <div className="flex gap-2 sm:gap-3 items-center">
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
              className="flex-1 py-3 sm:py-4 px-3 sm:px-5 bg-white border-2 border-[#E8E4DC] rounded-3xl text-base sm:text-[20px] font-light text-[#2C2C2A] focus:outline-none focus:border-[#C5D4C0] transition-colors appearance-none text-center"
            >
              {hours.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="text-lg sm:text-[24px] font-light text-[#2C2C2A]/30 px-0.5">:</span>
            <select
              value={selectedMinute}
              onChange={(e) => setSelectedMinute(e.target.value)}
              className="flex-1 py-3 sm:py-4 px-3 sm:px-5 bg-white border-2 border-[#E8E4DC] rounded-3xl text-base sm:text-[20px] font-light text-[#2C2C2A] focus:outline-none focus:border-[#C5D4C0] transition-colors appearance-none text-center"
            >
              {minutes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <label className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50 mb-2 sm:mb-3 block">
            {isSv ? 'Vad vill du göra?' : 'What would you like to do?'}
          </label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isSv ? 't.ex. Ta en promenad' : 'e.g. Take a walk'}
            className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-white border-2 border-[#E8E4DC] rounded-3xl text-sm sm:text-[17px] font-light text-[#2C2C2A] placeholder:text-[#2C2C2A]/30 focus:outline-none focus:border-[#C5D4C0] transition-colors"
          />
        </div>

        <div className="mb-6 sm:mb-8">
          <p className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50 mb-2 sm:mb-3">{isSv ? 'Förslag' : 'Suggestions'}</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setMessage(suggestion)}
                className="py-1.5 sm:py-2 px-3 sm:px-4 bg-white border border-[#E8E4DC] rounded-full text-xs sm:text-[14px] font-light text-[#2C2C2A]/60 hover:border-[#C5D4C0] hover:text-[#2C2C2A] transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onDelete}
          className="w-full py-3 sm:py-4 text-red-400 text-xs sm:text-[15px] font-light hover:text-red-500 transition-colors"
        >
          {isSv ? 'Ta bort denna paus' : 'Delete this break'}
        </button>
      </div>

      <div className="px-6 sm:px-8 pb-6 sm:pb-10">
        <button 
          onClick={handleSave}
          disabled={!message}
          className="w-full py-3 sm:py-5 bg-[#2C2C2A] text-[#FAFAF8] rounded-full text-sm sm:text-[17px] font-light disabled:opacity-30"
        >
          {isSv ? 'Spara ändringar' : 'Save changes'}
        </button>
      </div>
    </motion.div>
  );
}

// Break Screen
function BreakScreen({ language, message, onStart, onComplete, onCancel }: { language: Language; message: string; onStart: () => void; onComplete: (duration: number) => void; onCancel: (wasActive: boolean) => void }) {
  const isSv = language === 'sv';
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const targetDuration = 5 * 60; // 5 minutes in seconds

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const progress = Math.min(seconds / targetDuration, 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full bg-gradient-to-b from-[#FAFAF8] via-[#F0EDE7] to-[#E8E4DC] flex flex-col"
    >
      <div className="h-12 sm:h-16" />
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8">
        <div className="relative mb-8 sm:mb-16">
          <svg className="w-40 sm:w-56 h-40 sm:h-56 -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="75"
              stroke="#C5D4C0"
              strokeWidth="3"
              fill="none"
              opacity="0.2"
            />
            <motion.circle
              cx="80"
              cy="80"
              r="75"
              stroke="#C5D4C0"
              strokeWidth="3"
              fill="none"
              strokeDasharray={2 * Math.PI * 75}
              strokeDashoffset={2 * Math.PI * 75 * (1 - progress)}
              strokeLinecap="round"
              initial={{ strokeDashoffset: 2 * Math.PI * 75 }}
            />
          </svg>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl sm:text-[48px] font-light text-[#2C2C2A] mb-1 sm:mb-2">
                {formatTime(seconds)}
              </div>
              <div className="text-xs sm:text-[14px] font-light text-[#2C2C2A]/40">
                {isActive ? (isSv ? 'Andas lugnt' : 'Breathe calmly') : (isSv ? 'Redo när du är' : 'Ready when you are')}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-[28px] leading-[28px] sm:leading-[36px] text-[#2C2C2A] font-light mb-1 sm:mb-2">
            {message}
          </h1>
          <p className="text-xs sm:text-[16px] leading-[18px] sm:leading-[24px] text-[#2C2C2A]/50 font-light">
            {isSv ? 'Ta den tid du behöver' : 'Take the time you need'}
          </p>
        </div>
      </div>

      <div className="px-6 sm:px-8 space-y-2 sm:space-y-3 pb-6 sm:pb-10">
        {!isActive ? (
          <>
            <button 
              onClick={() => { setIsActive(true); onStart(); }}
              className="w-full py-3 sm:py-5 bg-[#2C2C2A] text-[#FAFAF8] rounded-full text-sm sm:text-[17px] font-light flex items-center justify-center gap-2"
            >
              <Play className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={1.5} fill="currentColor" />
              {isSv ? 'Starta' : 'Start'}
            </button>
            <button 
              onClick={() => onCancel(false)}
              className="w-full py-2 sm:py-3 text-[#2C2C2A]/40 text-xs sm:text-[15px] font-light"
            >
              {isSv ? 'Avbryt' : 'Cancel'}
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => {
                setIsActive(false);
                onComplete(seconds);
              }}
              className="w-full py-3 sm:py-5 bg-[#C5D4C0] text-[#2C2C2A] rounded-full text-sm sm:text-[17px] font-light flex items-center justify-center gap-2"
            >
              <Check className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={2} />
              {isSv ? 'Klar' : 'Done'}
            </button>
            <button 
              onClick={() => onCancel(true)}
              className="w-full py-2 sm:py-3 text-[#2C2C2A]/40 text-xs sm:text-[15px] font-light"
            >
              {isSv ? 'Hoppa över' : 'Skip'}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// History Screen
function HistoryScreen({ language, completedBreaks, assignment, onBack }: {
  language: Language;
  completedBreaks: CompletedBreak[];
  assignment: ExperimentAssignment;
  onBack: () => void;
}) {
  const isSv = language === 'sv';
  const [experimentEnabled, setExperimentEnabled] = useState(() => isExperimentEnabled());
  const [metrics, setMetrics] = useState<ExperimentResults>(() => computeMetrics());

  const getTodayBreaks = () => {
    const today = new Date().toDateString();
    return completedBreaks.filter((b: CompletedBreak) => 
      new Date(b.timestamp).toDateString() === today
    );
  };

  const getWeekBreaks = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return completedBreaks.filter((b: CompletedBreak) => 
      new Date(b.timestamp) >= weekAgo
    );
  };

  const getTotalTime = (breaks: CompletedBreak[]) => {
    const totalSeconds = breaks.reduce((sum, b) => sum + b.duration, 0);
    const minutes = Math.floor(totalSeconds / 60);
    return minutes;
  };

  const todayBreaks = getTodayBreaks();
  const weekBreaks = getWeekBreaks();
  const todayMinutes = getTotalTime(todayBreaks);
  const weekMinutes = getTotalTime(weekBreaks);

  const groupByDate = () => {
    const groups: Record<string, CompletedBreak[]> = {};
    completedBreaks.forEach((b: CompletedBreak) => {
      const dateKey = new Date(b.timestamp).toLocaleDateString(isSv ? 'sv-SE' : 'en-GB', {
        day: 'numeric', 
        month: 'short' 
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(b);
    });
    return groups;
  };

  const groupedBreaks = groupByDate();

  const handleToggleExperiment = () => {
    const next = !experimentEnabled;
    localStorage.setItem('adaptive_scheduler_v1', next ? 'true' : 'false');
    setExperimentEnabled(next);
  };

  const handleExportJSON = () => {
    const json = exportResultsAsJSON();
    downloadFile(json, 'experiment-results.json', 'application/json');
  };

  const handleExportCSV = () => {
    const csv = exportResultsAsCSV();
    downloadFile(csv, 'experiment-results.csv', 'text/csv');
  };

  const refreshMetrics = () => setMetrics(computeMetrics());

  const formatRate = (rate: number) => `${(rate * 100).toFixed(0)}%`;
  const formatSeconds = (s: number | null) =>
    s !== null ? (s < 60 ? `${s}s` : `${Math.round(s / 60)}m`) : '—';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full bg-[#FAFAF8] flex flex-col"
    >
      <div className="h-12 sm:h-16" />
      
      <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex items-center justify-between gap-2">
        <button onClick={onBack} className="flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 -ml-2">
          <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5 text-[#2C2C2A]" strokeWidth={1.5} />
        </button>
        <h2 className="text-sm sm:text-[17px] font-light text-[#2C2C2A]">{isSv ? 'Dina stunder' : 'Your moments'}</h2>
        <div className="w-8 sm:w-10" />
      </div>

      <div className="flex-1 px-6 sm:px-8 overflow-y-auto">
        {completedBreaks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pb-20">
            <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-[#E8E4DC] flex items-center justify-center mb-4 sm:mb-6">
              <Clock className="w-8 sm:w-10 h-8 sm:h-10 text-[#2C2C2A]/20" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg sm:text-[20px] font-light text-[#2C2C2A] mb-1 sm:mb-2">
              {isSv ? 'Inga stunder än' : 'No moments yet'}
            </h3>
            <p className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50 max-w-[250px]">
              {isSv ? 'När du tar dina pauser kommer de visas här' : 'When you complete breaks, they will appear here'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6 sm:mb-8">
              <div className="bg-white rounded-3xl p-3 sm:p-5">
                <div className="text-xs sm:text-[13px] font-light text-[#2C2C2A]/50 uppercase tracking-wide mb-1 sm:mb-2">
                  {isSv ? 'Idag' : 'Today'}
                </div>
                <div className="text-2xl sm:text-[32px] font-light text-[#2C2C2A] mb-0.5 sm:mb-1">
                  {todayBreaks.length}
                </div>
                <div className="text-xs sm:text-[14px] font-light text-[#2C2C2A]/50">
                  {todayMinutes} {isSv ? 'min' : 'min'}
                </div>
              </div>
              
              <div className="bg-white rounded-3xl p-3 sm:p-5">
                <div className="text-xs sm:text-[13px] font-light text-[#2C2C2A]/50 uppercase tracking-wide mb-1 sm:mb-2">
                  {isSv ? '7 dagar' : '7 days'}
                </div>
                <div className="text-2xl sm:text-[32px] font-light text-[#2C2C2A] mb-0.5 sm:mb-1">
                  {weekBreaks.length}
                </div>
                <div className="text-xs sm:text-[14px] font-light text-[#2C2C2A]/50">
                  {weekMinutes} {isSv ? 'min' : 'min'}
                </div>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6 pb-6">
              {Object.entries(groupedBreaks).reverse().map(([date, breaks]: [string, any]) => (
                <div key={date}>
                  <div className="text-xs sm:text-[13px] font-light text-[#2C2C2A]/50 uppercase tracking-wide mb-2 sm:mb-3">
                    {date}
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {breaks.map((b: CompletedBreak, i: number) => (
                      <div 
                        key={i}
                        className="bg-white rounded-2xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3"
                      >
                        <div className="flex-shrink-0 w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-[#C5D4C0]/20 flex items-center justify-center mt-0.5">
                          <Check className="w-3 sm:w-4 h-3 sm:h-4 text-[#C5D4C0]" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-[15px] font-light text-[#2C2C2A] mb-0.5 sm:mb-1">
                            {b.message}
                          </div>
                          <div className="text-xs sm:text-[13px] font-light text-[#2C2C2A]/40">
                            {new Date(b.timestamp).toLocaleTimeString(isSv ? 'sv-SE' : 'en-GB', {
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} • {Math.floor(b.duration / 60)} {isSv ? 'min' : 'min'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Experiment panel */}
        <div className="border-t border-[#E8E4DC] pt-4 sm:pt-6 pb-6 sm:pb-8">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#C5D4C0]" strokeWidth={1.5} />
              <p className="text-xs sm:text-[13px] font-light text-[#2C2C2A]/50 uppercase tracking-wide">
                {isSv ? 'Experiment' : 'Experiment'}
              </p>
            </div>
            <button
              onClick={refreshMetrics}
              className="text-[10px] sm:text-xs font-light text-[#2C2C2A]/40 hover:text-[#2C2C2A] transition-colors"
            >
              {isSv ? 'Uppdatera' : 'Refresh'}
            </button>
          </div>

          {/* Variant badge + feature flag toggle */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-[13px] font-light text-[#2C2C2A]/70">
                {isSv ? 'Din variant:' : 'Your variant:'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-light ${
                assignment.variant === 'adaptive'
                  ? 'bg-[#C5D4C0]/40 text-[#2C2C2A]'
                  : 'bg-[#E8E4DC] text-[#2C2C2A]/60'
              }`}>
                {assignment.variant}
              </span>
            </div>
            <button
              onClick={handleToggleExperiment}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-light border transition-colors ${
                experimentEnabled
                  ? 'border-[#C5D4C0] text-[#2C2C2A] bg-[#C5D4C0]/10'
                  : 'border-[#E8E4DC] text-[#2C2C2A]/40 bg-white'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${experimentEnabled ? 'bg-[#C5D4C0]' : 'bg-[#E8E4DC]'}`} />
              {experimentEnabled
                ? (isSv ? 'Aktiv' : 'Active')
                : (isSv ? 'Stoppad' : 'Stopped')}
            </button>
          </div>

          {/* Per-variant metrics */}
          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5">
            {metrics.variants.map((v) => (
              <div key={v.variant} className="bg-white rounded-2xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-xs sm:text-[13px] font-light text-[#2C2C2A] uppercase tracking-wide">
                    {v.variant}
                  </span>
                  <span className="text-xs font-light text-[#2C2C2A]/40">
                    {v.totalBreaksShown} {isSv ? 'visade' : 'shown'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  <div className="text-center">
                    <div className="text-sm sm:text-[15px] font-light text-[#2C2C2A]">
                      {formatRate(v.completionRate)}
                    </div>
                    <div className="text-[10px] sm:text-xs font-light text-[#2C2C2A]/40 mt-0.5">
                      {isSv ? 'avklarat' : 'complete'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm sm:text-[15px] font-light text-[#2C2C2A]">
                      {formatRate(v.skipRate)}
                    </div>
                    <div className="text-[10px] sm:text-xs font-light text-[#2C2C2A]/40 mt-0.5">
                      {isSv ? 'hoppat' : 'skipped'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm sm:text-[15px] font-light text-[#2C2C2A]">
                      {formatSeconds(v.medianTimeToStartSeconds)}
                    </div>
                    <div className="text-[10px] sm:text-xs font-light text-[#2C2C2A]/40 mt-0.5">
                      {isSv ? 'tid till start' : 'time to start'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm sm:text-[15px] font-light text-[#2C2C2A]">
                      {v.sevenDayRetention}d
                    </div>
                    <div className="text-[10px] sm:text-xs font-light text-[#2C2C2A]/40 mt-0.5">
                      {isSv ? '7d aktiv' : '7d active'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {metrics.daysSinceFirstEvent !== null && (
              <p className="text-[10px] sm:text-xs font-light text-[#2C2C2A]/30 text-center">
                {isSv
                  ? `Experiment startade för ${metrics.daysSinceFirstEvent} dag${metrics.daysSinceFirstEvent === 1 ? '' : 'ar'} sedan`
                  : `Experiment started ${metrics.daysSinceFirstEvent} day${metrics.daysSinceFirstEvent === 1 ? '' : 's'} ago`}
              </p>
            )}
          </div>

          {/* Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportJSON}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-2.5 bg-white border border-[#E8E4DC] rounded-full text-xs sm:text-[13px] font-light text-[#2C2C2A]/60 hover:border-[#C5D4C0] hover:text-[#2C2C2A] transition-colors"
            >
              <Download className="w-3 sm:w-3.5 h-3 sm:h-3.5" strokeWidth={1.5} />
              JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 sm:py-2.5 bg-white border border-[#E8E4DC] rounded-full text-xs sm:text-[13px] font-light text-[#2C2C2A]/60 hover:border-[#C5D4C0] hover:text-[#2C2C2A] transition-colors"
            >
              <Download className="w-3 sm:w-3.5 h-3 sm:h-3.5" strokeWidth={1.5} />
              CSV
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}