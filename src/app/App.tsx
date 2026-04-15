import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Home, Settings, Plus, X, Coffee, Moon, Users, Briefcase, BookOpen, Palette, Clock, Pause, Play, Check } from 'lucide-react';

type Screen = 'onboarding1' | 'onboarding2' | 'onboarding3' | 'home' | 'break' | 'create' | 'edit' | 'history';

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

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('onboarding1');
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    activity: '',
    breakType: 'Kaffe eller te',
    suggestedFrequency: 3
  });
  const [breaks, setBreaks] = useState<Break[]>([
    { time: '10:45', message: 'En kort promenad?', active: true },
    { time: '13:00', message: 'Lunch utan skärm', active: false },
    { time: '15:30', message: 'Tre djupa andetag', active: false }
  ]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<{ time: string, message: string }[]>([]);
  const [completedBreaks, setCompletedBreaks] = useState<{ timestamp: string, message: string, duration: number }[]>([]);

  const updateBreaks = (activity: string, breakType: string) => {
    const breakSuggestions: Record<string, string[]> = {
      'office': ['En kort promenad?', 'Stretch vid skrivbordet', 'Titta ut genom fönstret'],
      'student': ['Rörelse mellan studierna', 'Lunch utan skärm', 'Frisk luft en stund'],
      'creative': ['Vila ögonen', 'Kaffe och reflektion', 'Skissa något annat'],
      'physical': ['Drick vatten', 'Sitt ner en stund', 'Stretcha mjukt'],
      'home': ['Gå ut en stund', 'Kaffe eller te', 'Bara sitta still'],
      'evening': ['Koppla av från skärmar', 'Kvällspromenad', 'Läs några sidor']
    };

    const suggestions = breakSuggestions[activity] || breakSuggestions['home'];
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
          <h1 className="mb-3 text-5xl leading-tight font-light text-[#2C2C2A]">Ta en stund</h1>
          <p className="max-w-md text-lg leading-relaxed font-light text-[#2C2C2A]/60">
            En app som hjalper dig skapa lugna, hallbara pauser under dagen. Allt sparas lokalt sa du snabbt kan komma tillbaka.
          </p>
        </aside>

        <div className="relative h-[100dvh] max-h-[920px] overflow-hidden bg-[#FAFAF8] shadow-2xl sm:rounded-[34px] sm:border sm:border-white/40 lg:h-[820px]">
          <AnimatePresence mode="wait">
            {currentScreen === 'onboarding1' && (
              <Onboarding1 
                key="onboarding1"
                profile={profile}
                setProfile={setProfile}
                onNext={() => setCurrentScreen('onboarding2')} 
              />
            )}
            {currentScreen === 'onboarding2' && (
              <Onboarding2 
                key="onboarding2"
                profile={profile}
                setProfile={setProfile}
                onBack={() => setCurrentScreen('onboarding1')}
                onNext={() => setCurrentScreen('onboarding3')} 
              />
            )}
            {currentScreen === 'onboarding3' && (
              <Onboarding3 
                key="onboarding3"
                profile={profile}
                setProfile={setProfile}
                onBack={() => setCurrentScreen('onboarding2')}
                onNext={() => {
                  updateBreaks(profile.activity, profile.breakType);
                  setCurrentScreen('home');
                }} 
              />
            )}
            {currentScreen === 'home' && (
              <HomeScreen 
                key="home"
                profile={profile}
                breaks={breaks}
                completedBreaks={completedBreaks}
                onBreakClick={() => setCurrentScreen('break')}
                onCreateClick={() => setCurrentScreen('create')}
                onEditClick={(index: number) => {
                  setEditingIndex(index);
                  setCurrentScreen('edit');
                }}
                onPauseClick={() => setCurrentScreen('break')}
                onHistoryClick={() => setCurrentScreen('history')}
              />
            )}
            {currentScreen === 'break' && (
              <BreakScreen 
                key="break"
                message={breaks.find(b => b.active)?.message || 'Paus'}
                onComplete={(duration) => {
                  const now = new Date();
                  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                  setHistory([...history, { time: timeString, message: breaks.find(b => b.active)?.message || 'Paus' }]);
                  setCompletedBreaks([...completedBreaks, { timestamp: now.toISOString(), message: breaks.find(b => b.active)?.message || 'Paus', duration }]);
                  setCurrentScreen('home');
                }} 
                onCancel={() => setCurrentScreen('home')}
              />
            )}
            {currentScreen === 'create' && (
              <CreateBreakScreen 
                key="create"
                breaks={breaks}
                setBreaks={setBreaks}
                onBack={() => setCurrentScreen('home')} 
              />
            )}
            {currentScreen === 'edit' && editingIndex !== null && (
              <EditBreakScreen 
                key="edit"
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
                completedBreaks={completedBreaks}
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
                breakType: 'Kaffe eller te',
                suggestedFrequency: 3
              });
              setBreaks([
                { time: '10:45', message: 'En kort promenad?', active: true },
                { time: '13:00', message: 'Lunch utan skärm', active: false },
                { time: '15:30', message: 'Tre djupa andetag', active: false }
              ]);
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
function Onboarding1({ profile, setProfile, onNext }: any) {
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
          <p className="text-xs sm:text-[13px] font-light text-[#C5D4C0] uppercase tracking-wider mb-2 sm:mb-3">Steg 1 av 3</p>
          <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-[#C5D4C0]/20 flex items-center justify-center mb-4 sm:mb-6">
            <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-[#C5D4C0]/40" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-[32px] leading-[32px] sm:leading-[40px] text-[#2C2C2A] font-light mb-3 sm:mb-4">
          Hej där!
        </h1>
        <p className="text-sm sm:text-[18px] leading-[22px] sm:leading-[28px] text-[#2C2C2A]/60 font-light mb-8 sm:mb-12">
          Jag hjälper dig att komma ihåg att ta pauser som passar just ditt liv. Låt oss börja enkelt.
        </p>

        <div>
          <label className="text-sm sm:text-[15px] font-light text-[#2C2C2A]/50 mb-2 sm:mb-3 block">
            Vad heter du?
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            placeholder="Ditt namn"
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
          Fortsätt
        </button>
      </div>
    </motion.div>
  );
}

// Onboarding Screen 2 - Activity Type
function Onboarding2({ profile, setProfile, onBack, onNext }: any) {
  const activities = [
    { id: 'office', label: 'Kontorsarbete', emoji: '💼', desc: 'Mycket skärmtid' },
    { id: 'student', label: 'Studier', emoji: '📚', desc: 'Lära och fokusera' },
    { id: 'creative', label: 'Kreativt arbete', emoji: '🎨', desc: 'Design, musik, konst' },
    { id: 'physical', label: 'Fysiskt arbete', emoji: '🏃', desc: 'Mycket i rörelse' },
    { id: 'home', label: 'Hemma', emoji: '🏡', desc: 'Vård, fritid, vila' },
    { id: 'evening', label: 'Kvällstid', emoji: '🌙', desc: 'Efter jobbet' }
  ];

  const getRecommendation = (activityId: string) => {
    const recommendations: Record<string, number> = {
      'office': 4,
      'student': 4,
      'creative': 3,
      'physical': 3,
      'home': 2,
      'evening': 2
    };
    return recommendations[activityId] || 3;
  };

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
          <p className="text-xs sm:text-[13px] font-light text-[#C5D4C0] uppercase tracking-wider">Steg 2 av 3</p>
        </div>
        <h1 className="text-xl sm:text-[28px] leading-[28px] sm:leading-[36px] text-[#2C2C2A] font-light mb-2 sm:mb-3">
          Hur ser dina dagar ut?
        </h1>
        <p className="text-sm sm:text-[16px] leading-[20px] sm:leading-[24px] text-[#2C2C2A]/50 font-light mb-6 sm:mb-8">
          Jag anpassar pauserna efter vad du gör.
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
          Nästa
        </button>
      </div>
    </motion.div>
  );
}

// Onboarding Screen 3 - Break Type
function Onboarding3({ profile, setProfile, onBack, onNext }: any) {
  const options = [
    { id: 'walk', label: 'Gå ut en stund', emoji: '🌿' },
    { id: 'coffee', label: 'Kaffe eller te', emoji: '☕' },
    { id: 'breathe', label: 'Andas och stretcha', emoji: '🧘' },
    { id: 'rest', label: 'Vila ögonen', emoji: '😌' }
  ];

  const activityNames: Record<string, string> = {
    'office': 'kontorsarbete',
    'student': 'studier',
    'creative': 'kreativa arbete',
    'physical': 'fysiska arbete',
    'home': 'tid hemma',
    'evening': 'kvällstid'
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
          <p className="text-xs sm:text-[13px] font-light text-[#C5D4C0] uppercase tracking-wider">Steg 3 av 3</p>
        </div>
        <h1 className="text-xl sm:text-[28px] leading-[28px] sm:leading-[36px] text-[#2C2C2A] font-light mb-2 sm:mb-3">
          Vad hjälper dig mest att ladda om?
        </h1>
        <p className="text-sm sm:text-[16px] leading-[20px] sm:leading-[24px] text-[#2C2C2A]/50 font-light mb-6 sm:mb-8">
          Baserat på ditt {activityNames[profile.activity] || 'liv'} rekommenderar jag <span className="text-[#2C2C2A] font-normal">{profile.suggestedFrequency} pauser om dagen</span>.
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
          Skapa mina pauser
        </button>
      </div>
    </motion.div>
  );
}

// Home Screen
function HomeScreen({ profile, breaks, completedBreaks, onBreakClick, onCreateClick, onEditClick, onPauseClick, onHistoryClick }: any) {
  const firstName = profile.name.split(' ')[0];
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 'God morgon';
    if (hour < 17) return 'Hej';
    return 'God kväll';
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
          <h1 className="text-2xl sm:text-[32px] leading-[32px] sm:leading-[40px] text-[#2C2C2A] font-light">{firstName || 'vän'}</h1>
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
          <p className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50">Dina stunder idag</p>
          <button 
            onClick={onCreateClick}
            className="text-xs sm:text-[15px] font-light text-[#C5D4C0] flex items-center gap-1"
          >
            <Plus className="w-3 sm:w-4 h-3 sm:h-4" strokeWidth={2} />
            Lägg till
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
                      Nästa
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
                        ? `${minutesLeft} ${minutesLeft === 1 ? 'minut' : 'minuter'} kvar`
                        : `${Math.floor(minutesLeft / 60)} ${Math.floor(minutesLeft / 60) === 1 ? 'timme' : 'timmar'} kvar`
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
            Tryck på nästa paus för att ta den nu, eller tryck på andra pauser för att redigera
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
function CreateBreakScreen({ breaks, setBreaks, onBack }: any) {
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');
  const [selectedHour, setSelectedHour] = useState('10');
  const [selectedMinute, setSelectedMinute] = useState('00');

  const suggestions = [
    'Ta en promenad',
    'Drick ett glas vatten',
    'Stretcha kroppen',
    'Ring en vän',
    'Läs några sidor',
    'Lyssna på musik',
    'Meditera i 5 min',
    'Skriv ner tankar'
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
        <h2 className="text-sm sm:text-[17px] font-light text-[#2C2C2A]">Ny paus</h2>
        <div className="w-8 sm:w-10" />
      </div>

      <div className="flex-1 px-6 sm:px-8 overflow-y-auto">
        <div className="bg-[#C5D4C0]/10 rounded-3xl p-4 sm:p-5 mb-6 sm:mb-8">
          <p className="text-xs sm:text-[15px] leading-[18px] sm:leading-[24px] font-light text-[#2C2C2A]/70">
            Skapa en paus som återkommer varje dag vid samma tid. Du kan alltid redigera eller ta bort den senare.
          </p>
        </div>

        <div className="mb-6 sm:mb-8">
          <label className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50 mb-3 sm:mb-4 block">
            När vill du bli påmind?
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
            Vad vill du göra?
          </label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="t.ex. Ta en promenad"
            className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-white border-2 border-[#E8E4DC] rounded-3xl text-sm sm:text-[17px] font-light text-[#2C2C2A] placeholder:text-[#2C2C2A]/30 focus:outline-none focus:border-[#C5D4C0] transition-colors"
          />
        </div>

        <div>
          <p className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50 mb-2 sm:mb-3">Förslag</p>
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
          Skapa daglig paus
        </button>
      </div>
    </motion.div>
  );
}

// Edit Break Screen
function EditBreakScreen({ breakItem, onSave, onDelete, onBack }: any) {
  const [selectedHour, setSelectedHour] = useState(breakItem.time.split(':')[0]);
  const [selectedMinute, setSelectedMinute] = useState(breakItem.time.split(':')[1]);
  const [message, setMessage] = useState(breakItem.message);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const suggestions = [
    'Ta en promenad',
    'Drick ett glas vatten',
    'Stretcha kroppen',
    'Ring en vän',
    'Läs några sidor',
    'Lyssna på musik',
    'Meditera i 5 min',
    'Skriv ner tankar'
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
        <h2 className="text-sm sm:text-[17px] font-light text-[#2C2C2A]">Redigera paus</h2>
        <div className="w-8 sm:w-10" />
      </div>

      <div className="flex-1 px-6 sm:px-8 overflow-y-auto">
        <div className="mb-6 sm:mb-8">
          <label className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50 mb-3 sm:mb-4 block">
            Tid
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
            Vad vill du göra?
          </label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="t.ex. Ta en promenad"
            className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-white border-2 border-[#E8E4DC] rounded-3xl text-sm sm:text-[17px] font-light text-[#2C2C2A] placeholder:text-[#2C2C2A]/30 focus:outline-none focus:border-[#C5D4C0] transition-colors"
          />
        </div>

        <div className="mb-6 sm:mb-8">
          <p className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50 mb-2 sm:mb-3">Förslag</p>
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
          Ta bort denna paus
        </button>
      </div>

      <div className="px-6 sm:px-8 pb-6 sm:pb-10">
        <button 
          onClick={handleSave}
          disabled={!message}
          className="w-full py-3 sm:py-5 bg-[#2C2C2A] text-[#FAFAF8] rounded-full text-sm sm:text-[17px] font-light disabled:opacity-30"
        >
          Spara ändringar
        </button>
      </div>
    </motion.div>
  );
}

// Break Screen
function BreakScreen({ message, onComplete, onCancel }: { message: string; onComplete: (duration: number) => void; onCancel: () => void }) {
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
                {isActive ? 'Andas lugnt' : 'Redo när du är'}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-[28px] leading-[28px] sm:leading-[36px] text-[#2C2C2A] font-light mb-1 sm:mb-2">
            {message}
          </h1>
          <p className="text-xs sm:text-[16px] leading-[18px] sm:leading-[24px] text-[#2C2C2A]/50 font-light">
            Ta den tid du behöver
          </p>
        </div>
      </div>

      <div className="px-6 sm:px-8 space-y-2 sm:space-y-3 pb-6 sm:pb-10">
        {!isActive ? (
          <>
            <button 
              onClick={() => setIsActive(true)}
              className="w-full py-3 sm:py-5 bg-[#2C2C2A] text-[#FAFAF8] rounded-full text-sm sm:text-[17px] font-light flex items-center justify-center gap-2"
            >
              <Play className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={1.5} fill="currentColor" />
              Starta
            </button>
            <button 
              onClick={onCancel}
              className="w-full py-2 sm:py-3 text-[#2C2C2A]/40 text-xs sm:text-[15px] font-light"
            >
              Avbryt
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
              Klar
            </button>
            <button 
              onClick={onCancel}
              className="w-full py-2 sm:py-3 text-[#2C2C2A]/40 text-xs sm:text-[15px] font-light"
            >
              Hoppa över
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// History Screen
function HistoryScreen({ completedBreaks, onBack }: any) {
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
      const dateKey = new Date(b.timestamp).toLocaleDateString('sv-SE', { 
        day: 'numeric', 
        month: 'short' 
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(b);
    });
    return groups;
  };

  const groupedBreaks = groupByDate();

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
        <h2 className="text-sm sm:text-[17px] font-light text-[#2C2C2A]">Dina stunder</h2>
        <div className="w-8 sm:w-10" />
      </div>

      <div className="flex-1 px-6 sm:px-8 overflow-y-auto">
        {completedBreaks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pb-20">
            <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-[#E8E4DC] flex items-center justify-center mb-4 sm:mb-6">
              <Clock className="w-8 sm:w-10 h-8 sm:h-10 text-[#2C2C2A]/20" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg sm:text-[20px] font-light text-[#2C2C2A] mb-1 sm:mb-2">
              Inga stunder än
            </h3>
            <p className="text-xs sm:text-[15px] font-light text-[#2C2C2A]/50 max-w-[250px]">
              När du tar dina pauser kommer de visas här
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6 sm:mb-8">
              <div className="bg-white rounded-3xl p-3 sm:p-5">
                <div className="text-xs sm:text-[13px] font-light text-[#2C2C2A]/50 uppercase tracking-wide mb-1 sm:mb-2">
                  Idag
                </div>
                <div className="text-2xl sm:text-[32px] font-light text-[#2C2C2A] mb-0.5 sm:mb-1">
                  {todayBreaks.length}
                </div>
                <div className="text-xs sm:text-[14px] font-light text-[#2C2C2A]/50">
                  {todayMinutes} min
                </div>
              </div>
              
              <div className="bg-white rounded-3xl p-3 sm:p-5">
                <div className="text-xs sm:text-[13px] font-light text-[#2C2C2A]/50 uppercase tracking-wide mb-1 sm:mb-2">
                  7 dagar
                </div>
                <div className="text-2xl sm:text-[32px] font-light text-[#2C2C2A] mb-0.5 sm:mb-1">
                  {weekBreaks.length}
                </div>
                <div className="text-xs sm:text-[14px] font-light text-[#2C2C2A]/50">
                  {weekMinutes} min
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
                            {new Date(b.timestamp).toLocaleTimeString('sv-SE', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} • {Math.floor(b.duration / 60)} min
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
      </div>
    </motion.div>
  );
}