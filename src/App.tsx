import { useState, useEffect, useCallback, useRef } from 'react';

type Mode = 'focus' | 'shortBreak' | 'longBreak';

interface Settings {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

interface TodayStats {
  date: string;
  completedPomodoros: number;
  totalFocusMinutes: number;
}

const MODE_LABELS: Record<Mode, string> = {
  focus: '专注',
  shortBreak: '短休息',
  longBreak: '长休息',
};

const MODE_COLORS: Record<Mode, { bg: string; ring: string; text: string; btn: string; btnHover: string; accent: string }> = {
  focus: {
    bg: 'from-red-50 to-orange-50',
    ring: '#ef4444',
    text: 'text-red-600',
    btn: 'bg-red-500',
    btnHover: 'hover:bg-red-600',
    accent: 'text-red-500',
  },
  shortBreak: {
    bg: 'from-green-50 to-emerald-50',
    ring: '#10b981',
    text: 'text-emerald-600',
    btn: 'bg-emerald-500',
    btnHover: 'hover:bg-emerald-600',
    accent: 'text-emerald-500',
  },
  longBreak: {
    bg: 'from-blue-50 to-indigo-50',
    ring: '#6366f1',
    text: 'text-indigo-600',
    btn: 'bg-indigo-500',
    btnHover: 'hover:bg-indigo-600',
    accent: 'text-indigo-500',
  },
};

const DEFAULT_SETTINGS: Settings = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
};

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem('pomodoro-settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_SETTINGS;
}

function loadStats(): TodayStats {
  try {
    const saved = localStorage.getItem('pomodoro-stats');
    if (saved) {
      const stats = JSON.parse(saved);
      if (stats.date === getToday()) return stats;
    }
  } catch {}
  return { date: getToday(), completedPomodoros: 0, totalFocusMinutes: 0 };
}

function saveStats(stats: TodayStats) {
  localStorage.setItem('pomodoro-stats', JSON.stringify(stats));
}

function saveSettings(settings: Settings) {
  localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
}

export default function App() {
  const [mode, setMode] = useState<Mode>('focus');
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [timeLeft, setTimeLeft] = useState(settings.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<TodayStats>(loadStats);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<Settings>(loadSettings);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const totalTime = settings[mode] * 60;
  const progress = (totalTime - timeLeft) / totalTime;

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            // Complete pomodoro
            if (mode === 'focus') {
              const newStats = {
                ...stats,
                completedPomodoros: stats.completedPomodoros + 1,
                totalFocusMinutes: stats.totalFocusMinutes + settings.focus,
              };
              setStats(newStats);
              saveStats(newStats);
            }
            // Play notification sound
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 800;
              gain.gain.value = 0.3;
              osc.start();
              osc.stop(ctx.currentTime + 0.3);
            } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, stats, settings.focus]);

  const handleModeChange = useCallback((newMode: Mode) => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(settings[newMode] * 60);
  }, [settings]);

  const handleStart = () => {
    if (timeLeft > 0) setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(settings[mode] * 60);
  };

  const handleSaveSettings = () => {
    setSettings(tempSettings);
    saveSettings(tempSettings);
    setTimeLeft(tempSettings[mode] * 60);
    setIsRunning(false);
    setShowSettings(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // SVG circle parameters
  const size = 280;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const colors = MODE_COLORS[mode];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colors.bg} flex flex-col items-center justify-center p-4 transition-all duration-700`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2 justify-center">
          <span className="text-4xl">🍅</span>
          <span>番茄专注</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">保持专注，高效工作</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-8 bg-white/70 backdrop-blur-sm rounded-full p-1.5 shadow-sm">
        {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              mode === m
                ? `${colors.btn} text-white shadow-md`
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="relative mb-8">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-6xl font-mono font-bold ${colors.text} tracking-wider`}>
            {formatTime(timeLeft)}
          </span>
          <span className="text-gray-400 text-sm mt-2 uppercase tracking-wide">
            {MODE_LABELS[mode]}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleReset}
          className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-gray-700 hover:shadow-lg transition-all duration-200"
          title="重置"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <button
          onClick={isRunning ? handlePause : handleStart}
          className={`w-16 h-16 rounded-full ${colors.btn} ${colors.btnHover} text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 transform hover:scale-105`}
          title={isRunning ? '暂停' : '开始'}
        >
          {isRunning ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          onClick={() => {
            setTempSettings(settings);
            setShowSettings(!showSettings);
          }}
          className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-gray-700 hover:shadow-lg transition-all duration-200"
          title="设置"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="w-full max-w-sm bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6 transition-all duration-300">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>⚙️</span> 自定义时长
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-gray-600 text-sm">专注时长（分钟）</label>
              <input
                type="number"
                min={1}
                max={120}
                value={tempSettings.focus}
                onChange={(e) => setTempSettings({ ...tempSettings, focus: Math.max(1, Math.min(120, Number(e.target.value))) })}
                className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 text-center text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-gray-600 text-sm">短休息（分钟）</label>
              <input
                type="number"
                min={1}
                max={30}
                value={tempSettings.shortBreak}
                onChange={(e) => setTempSettings({ ...tempSettings, shortBreak: Math.max(1, Math.min(30, Number(e.target.value))) })}
                className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-gray-600 text-sm">长休息（分钟）</label>
              <input
                type="number"
                min={1}
                max={60}
                value={tempSettings.longBreak}
                onChange={(e) => setTempSettings({ ...tempSettings, longBreak: Math.max(1, Math.min(60, Number(e.target.value))) })}
                className="w-20 px-3 py-1.5 rounded-lg border border-gray-200 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            className={`mt-5 w-full py-2.5 rounded-xl ${colors.btn} ${colors.btnHover} text-white font-medium shadow-md transition-all duration-200`}
          >
            保存设置
          </button>
        </div>
      )}

      {/* Today Stats */}
      <div className="w-full max-w-sm bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <span>📊</span> 今日统计
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${colors.accent}`}>
              {stats.completedPomodoros}
            </div>
            <div className="text-xs text-gray-400 mt-1">完成番茄数</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${colors.accent}`}>
              {stats.totalFocusMinutes}
            </div>
            <div className="text-xs text-gray-400 mt-1">专注分钟数</div>
          </div>
        </div>
        {stats.completedPomodoros > 0 && (
          <div className="mt-4 flex items-center gap-1 justify-center">
            {Array.from({ length: Math.min(stats.completedPomodoros, 8) }).map((_, i) => (
              <span key={i} className="text-lg">🍅</span>
            ))}
            {stats.completedPomodoros > 8 && (
              <span className="text-xs text-gray-400 ml-1">+{stats.completedPomodoros - 8}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-xs text-gray-400">
        数据已自动保存至本地
      </div>
    </div>
  );
}
