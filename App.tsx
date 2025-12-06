import React, { useState, useEffect, useCallback } from 'react';
import PlanSection from './components/PlanSection';
import ReviewSection from './components/ReviewSection';
import CalendarSection from './components/CalendarSection';
import DailyCard from './components/DailyCard';
import { DayData, DailyReview, PlanItem, LongTermGoal } from './types';
import { generateDailyReflection } from './services/geminiService';

const INITIAL_REVIEW: DailyReview = {
  diet: '',
  dietWater: 0,
  languageLearning: '',
  languageTime: 0,
  finances: '',
  financeAmount: 0,
  social: '',
  socialEnergy: 50,
  surprise: '',
  mood: 'neutral',
  moodNote: ''
};

const getTodayDateString = () => new Date().toISOString().split('T')[0];

function App() {
  const [currentDate, setCurrentDate] = useState(getTodayDateString());
  const [activeTab, setActiveTab] = useState<'plan' | 'review' | 'calendar'>('plan');
  
  // App State for the CURRENT viewed day
  const [dayData, setDayData] = useState<DayData>({
    date: currentDate,
    plans: [],
    review: INITIAL_REVIEW,
  });

  // Global State for Long Term Goals (loaded once)
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([]);

  // UI States
  const [savedDates, setSavedDates] = useState<Record<string, { hasPlans: boolean; hasReview: boolean }>>({});
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showPreciousCard, setShowPreciousCard] = useState(false);

  const todayStr = getTodayDateString();
  const isFuture = currentDate > todayStr;

  // --- Initial Load Logic ---
  useEffect(() => {
    // Load long term goals
    const storedGoals = localStorage.getItem('cozyday-longterm');
    if (storedGoals) {
      try {
        setLongTermGoals(JSON.parse(storedGoals));
      } catch(e) { console.error(e); }
    }
    scanSavedDates();
  }, []);

  // Save Long Term Goals whenever they change
  useEffect(() => {
    localStorage.setItem('cozyday-longterm', JSON.stringify(longTermGoals));
  }, [longTermGoals]);

  // Helper to scan all local storage for dots on calendar
  const scanSavedDates = useCallback(() => {
    const map: Record<string, { hasPlans: boolean; hasReview: boolean }> = {};
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith('cozyday-') && key !== 'cozyday-longterm') {
        const date = key.replace('cozyday-', '');
        try {
          const data: DayData = JSON.parse(localStorage.getItem(key) || '{}');
          const hasPlans = !!(data.plans && data.plans.length > 0);
          const hasReview = !!(data.review && (
            data.review.mood !== 'neutral' || 
            data.review.moodNote || 
            data.review.diet || 
            data.review.social
          ));
          
          if (hasPlans || hasReview) {
            map[date] = { hasPlans, hasReview };
          }
        } catch (e) { }
      }
    });
    setSavedDates(map);
  }, []);

  // Load data when currentDate changes
  useEffect(() => {
    const savedData = localStorage.getItem(`cozyday-${currentDate}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setDayData(parsed);
      } catch (e) {
        console.error("Failed to parse saved data", e);
        setDayData({ date: currentDate, plans: [], review: INITIAL_REVIEW });
      }
    } else {
      setDayData({
        date: currentDate,
        plans: [],
        review: INITIAL_REVIEW,
      });
    }
  }, [currentDate]);

  // Save to LocalStorage on change and update index
  useEffect(() => {
    // Don't save future empty days to avoid clutter
    if (isFuture && dayData.plans.length === 0 && dayData.review.mood === 'neutral') {
       return;
    }

    localStorage.setItem(`cozyday-${currentDate}`, JSON.stringify(dayData));
    
    const hasPlans = dayData.plans.length > 0;
    const hasReview = !!(dayData.review.mood !== 'neutral' || dayData.review.moodNote || dayData.review.diet);
    
    setSavedDates(prev => ({
      ...prev,
      [currentDate]: { hasPlans, hasReview }
    }));
  }, [dayData, currentDate, isFuture]);

  const updatePlans = (newPlans: PlanItem[]) => {
    if (isFuture) return;
    setDayData(prev => ({ ...prev, plans: newPlans }));
  };

  const updateReview = (newReview: DailyReview) => {
    if (isFuture) return;
    setDayData(prev => ({ ...prev, review: newReview }));
  };

  const deleteDayRecord = () => {
    if (window.confirm('确定要删除这一天的所有记录吗？此操作无法撤销。')) {
      localStorage.removeItem(`cozyday-${currentDate}`);
      setDayData({ date: currentDate, plans: [], review: INITIAL_REVIEW });
      setShowPreciousCard(false);
      
      // Update savedDates index immediately to reflect on calendar
      setSavedDates(prev => {
        const next = { ...prev };
        delete next[currentDate];
        return next;
      });
    }
  };

  // --- Long Term Goal Handlers ---
  const addLongTermGoal = (goal: LongTermGoal) => {
    setLongTermGoals(prev => [...prev, goal]);
  };

  const deleteLongTermGoal = (id: string) => {
    setLongTermGoals(prev => prev.filter(g => g.id !== id));
  };

  const updateLongTermProgress = (goalId: string, completed: boolean) => {
    if (isFuture) return;
    setDayData(prev => ({
      ...prev,
      longTermProgress: {
        ...(prev.longTermProgress || {}),
        [goalId]: completed
      }
    }));
  };

  // --- AI Handler ---
  const handleGenerateReflection = async () => {
    if (isFuture) return;
    setIsGeneratingAi(true);
    const reflection = await generateDailyReflection(dayData);
    setDayData(prev => ({ ...prev, aiReflection: reflection }));
    setIsGeneratingAi(false);
    setShowPreciousCard(true); // Trigger effect
  };

  const handleDateSelect = (date: string) => {
    setCurrentDate(date);
    
    // Logic: 
    // 1. If date has an AI reflection (Precious Card), show it.
    // 2. If no card, but has data, switch to Review tab so user can see/edit.
    // 3. If empty, stay on current tab or switch to Plan? Let's switch to Plan for convenience.
    
    try {
      const saved = localStorage.getItem(`cozyday-${date}`);
      if (saved) {
        const data: DayData = JSON.parse(saved);
        if (data.aiReflection) {
          setShowPreciousCard(true);
        } else {
          // Has data but no card -> Go to review to encourage completing it
          setShowPreciousCard(false);
          setActiveTab('review');
        }
      } else {
        // No data -> Go to plan to start planning
        setShowPreciousCard(false);
        setActiveTab('plan');
      }
    } catch(e) {
      setShowPreciousCard(false);
      setActiveTab('plan');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans selection:bg-orange-100 pb-20">
      
      {/* Precious Card Overlay */}
      {showPreciousCard && (
        <DailyCard 
          data={dayData} 
          onClose={() => setShowPreciousCard(false)} 
          onDelete={deleteDayRecord}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-stone-50/95 backdrop-blur-md border-b border-stone-200 transition-all duration-300">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner transition-colors ${isFuture ? 'bg-stone-200' : 'bg-orange-100'}`}>
              {isFuture ? '🔒' : '📅'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-800 tracking-tight leading-tight">CozyDay</h1>
              <p className="text-xs text-stone-500 font-medium flex items-center gap-1">
                {currentDate === todayStr ? '今天' : currentDate}
                {isFuture && <span className="text-orange-400 bg-orange-50 px-1 rounded">未来</span>}
              </p>
            </div>
          </div>
          
          <div className="flex bg-white rounded-full p-1 shadow-sm border border-stone-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'plan' 
                  ? 'bg-stone-800 text-white shadow-md' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              计划
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'review' 
                  ? 'bg-orange-400 text-white shadow-md' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              回顾
            </button>
             <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'calendar' 
                  ? 'bg-stone-600 text-white shadow-md' 
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              日历
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Render Tab Content */}
        {activeTab === 'calendar' && (
           <CalendarSection 
             currentDate={currentDate} 
             onSelectDate={handleDateSelect}
             savedDates={savedDates}
             longTermGoals={longTermGoals}
           />
        )}

        <div className={activeTab === 'plan' ? 'block animate-in fade-in slide-in-from-bottom-2 duration-300' : 'hidden'}>
           <PlanSection 
             plans={dayData.plans} 
             longTermGoals={longTermGoals}
             currentDate={currentDate}
             longTermProgress={dayData.longTermProgress || {}}
             onUpdatePlans={updatePlans}
             onAddLongTermGoal={addLongTermGoal}
             onDeleteLongTermGoal={deleteLongTermGoal}
             onUpdateLongTermProgress={updateLongTermProgress}
             isFuture={isFuture}
           />
           
           {!isFuture && (
             <div className="mt-8 grid grid-cols-2 gap-4">
               <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center text-center">
                 <span className="text-3xl font-bold text-stone-800 mb-1">
                   {dayData.plans.filter(p => p.completed).length + Object.values(dayData.longTermProgress || {}).filter(Boolean).length}
                 </span>
                 <span className="text-xs text-stone-500 uppercase tracking-wider">今日完成</span>
               </div>
               <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center text-center">
                 <span className="text-3xl font-bold text-stone-400 mb-1">
                   {longTermGoals.length}
                 </span>
                 <span className="text-xs text-stone-500 uppercase tracking-wider">长期目标</span>
               </div>
             </div>
           )}
        </div>

        <div className={activeTab === 'review' ? 'block animate-in fade-in slide-in-from-bottom-2 duration-300' : 'hidden'}>
           <ReviewSection 
              review={dayData.review} 
              onUpdateReview={updateReview} 
              onGenerateReflection={handleGenerateReflection}
              isGenerating={isGeneratingAi}
              isFuture={isFuture}
              onDeleteRecord={deleteDayRecord}
              hasData={!!dayData.aiReflection || dayData.review.mood !== 'neutral' || !!dayData.review.moodNote}
           />
           {/* If we have a reflection, show a mini button to view card again */}
           {dayData.aiReflection && !isGeneratingAi && (
             <div className="text-center mt-4 space-y-3">
               <button 
                 onClick={() => setShowPreciousCard(true)}
                 className="bg-white border border-orange-200 text-orange-600 px-6 py-2 rounded-full text-sm font-bold shadow-sm hover:bg-orange-50 transition-colors"
               >
                 ✨ 查看今日珍藏卡片
               </button>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}

export default App;