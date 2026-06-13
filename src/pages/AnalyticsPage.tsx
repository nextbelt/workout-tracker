import { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, TrendingUp, Calendar, Heart, Apple, Loader2, ChevronDown, Smile, Scale } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useWorkout } from '../hooks/useWorkout';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

type TabKey = 'volume' | 'progression' | 'consistency' | 'recovery' | 'nutrition' | 'mood' | 'weight';

const TABS: Array<{ key: TabKey; label: string; Icon: typeof BarChart3 }> = [
  { key: 'volume', label: 'Volume', Icon: BarChart3 },
  { key: 'progression', label: 'Progress', Icon: TrendingUp },
  { key: 'consistency', label: 'Streak', Icon: Calendar },
  { key: 'weight', label: 'Weight', Icon: Scale },
  { key: 'recovery', label: 'Recovery', Icon: Heart },
  { key: 'nutrition', label: 'Nutrition', Icon: Apple },
  { key: 'mood', label: 'Mood', Icon: Smile },
];

const CHART_COLORS = {
  brand: '#FF6B35',
  brandLight: '#FF8F66',
  blue: '#60A5FA',
  green: '#4ADE80',
  yellow: '#FACC15',
  red: '#F87171',
};

function useChartTheme() {
  // Memoized: getComputedStyle forces a reflow, and a fresh object every render
  // would defeat recharts' internal memoization.
  return useMemo(() => {
    const style = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
    return {
      surface: style?.getPropertyValue('--color-surface-2').trim() || '#1a1a1a',
      border: style?.getPropertyValue('--color-border').trim() || '#333333',
      text: style?.getPropertyValue('--color-muted').trim() || '#a3a3a3',
    };
  }, []);
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('volume');
  const [loading, setLoading] = useState(false);
  const {
    getVolumeOverTime,
    getExerciseProgress,
    getConsistency,
    getRecoveryData,
    getNutritionTrends,
    getMoodCorrelation,
    getBodyweightTrend,
  } = useAnalytics();
  const { blockExercises } = useWorkout();
  const chartTheme = useChartTheme();

  // Derive unique exercises from current block (not entire library)
  const programExercises = useMemo(() => {
    const seen = new Set<string>();
    return blockExercises
      .filter((be) => {
        if (seen.has(be.exercise.id)) return false;
        seen.add(be.exercise.id);
        return true;
      })
      .map((be) => be.exercise)
      .sort((a, b) => {
        // Compounds first, then alphabetical
        if (a.is_compound !== b.is_compound) return a.is_compound ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [blockExercises]);

  // Data states
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [volumeData, setVolumeData] = useState<Array<Record<string, any>>>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [progressionData, setProgressionData] = useState<Array<Record<string, any>>>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [consistencyData, setConsistencyData] = useState<Array<Record<string, any>>>([]);
  const [recoveryData, setRecoveryData] = useState<Array<Record<string, unknown>>>([]);
  const [nutritionData, setNutritionData] = useState<Array<Record<string, unknown>>>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [moodData, setMoodData] = useState<Array<Record<string, any>>>([]);
  const [weightData, setWeightData] = useState<Array<{ date: string; weight: number }>>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');

  const loadTab = useCallback(async (tab: TabKey, exerciseOverride?: string) => {
    setLoading(true);
    switch (tab) {
      case 'volume': {
        const data = await getVolumeOverTime(90);
        setVolumeData(data.map((d) => ({
          ...d,
          date: d.date.slice(5), // MM-DD
          volume: Math.round(d.totalVolume),
        })));
        break;
      }
      case 'progression': {
        const exId = exerciseOverride ?? selectedExercise;
        if (exId) {
          const data = await getExerciseProgress(exId);
          setProgressionData(data.map((d) => ({
            ...d,
            date: d.date.slice(5),
          })));
        }
        break;
      }
      case 'consistency': {
        const data = await getConsistency(12);
        setConsistencyData(data);
        break;
      }
      case 'recovery': {
        const data = await getRecoveryData(90);
        const ratingMap: Record<string, number> = { great: 3, normal: 2, poor: 1 };
        setRecoveryData(data.map((d) => ({
          ...d,
          date: d.date.slice(5),
          ratingNum: ratingMap[d.rating] ?? 2,
        })));
        break;
      }
      case 'nutrition': {
        const data = await getNutritionTrends(30);
        setNutritionData(data.map((d) => ({
          ...d,
          date: d.date.slice(5),
          protein: Math.round(d.protein),
          calories: Math.round(d.calories),
        })));
        break;
      }
      case 'mood': {
        const data = await getMoodCorrelation(90);
        setMoodData(data);
        break;
      }
      case 'weight': {
        const data = await getBodyweightTrend(90);
        setWeightData(data);
        break;
      }
    }
    setLoading(false);
  }, [getVolumeOverTime, getExerciseProgress, getConsistency, getRecoveryData, getNutritionTrends, getMoodCorrelation, getBodyweightTrend, selectedExercise]);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  // Set default exercise for progression tab from program exercises
  useEffect(() => {
    if (!selectedExercise && programExercises.length > 0) {
      const compound = programExercises.find((e) => e.is_compound);
      setSelectedExercise(compound?.id ?? programExercises[0].id);
    }
  }, [programExercises, selectedExercise]);

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="text-brand animate-spin" />
        </div>
      );
    }

    switch (activeTab) {
      case 'volume':
        return volumeData.length === 0 ? (
          <EmptyState message="Complete some workouts to see volume trends." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.border} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.text }} />
                <YAxis tick={{ fontSize: 10, fill: chartTheme.text }} />
                <Tooltip
                  contentStyle={{ backgroundColor: chartTheme.surface, border: `1px solid ${chartTheme.border}`, borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke={CHART_COLORS.brand}
                  fill={CHART_COLORS.brand}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  name="Total Volume (lbs)"
                />
                <Area
                  type="monotone"
                  dataKey="totalSets"
                  stroke={CHART_COLORS.blue}
                  fill={CHART_COLORS.blue}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name="Sets"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      case 'progression':
        return (
          <div className="space-y-3">
            {/* Exercise selector */}
            <div className="relative">
              <select
                value={selectedExercise}
                onChange={(e) => {
                  setSelectedExercise(e.target.value);
                  loadTab('progression', e.target.value);
                }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-3 min-h-11 text-foreground text-sm appearance-none focus:outline-none focus:border-brand"
              >
                {programExercises
                  .filter((e) => e.is_compound)
                  .map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                <optgroup label="Isolation">
                  {programExercises
                    .filter((e) => !e.is_compound)
                    .map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                </optgroup>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
            </div>
            {progressionData.length === 0 ? (
              <EmptyState message="No data for this exercise yet." />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.text }} />
                    <YAxis tick={{ fontSize: 10, fill: chartTheme.text }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartTheme.surface, border: `1px solid ${chartTheme.border}`, borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="maxWeight" stroke={CHART_COLORS.brand} strokeWidth={2} dot={{ fill: CHART_COLORS.brand }} name="Max Weight" />
                    <Line type="monotone" dataKey="bestSetVolume" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ fill: CHART_COLORS.blue }} name="Best Set Vol" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        );

      case 'consistency':
        return consistencyData.length === 0 ? (
          <EmptyState message="Work out for a few weeks to see consistency data." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consistencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.border} />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 10, fill: chartTheme.text }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: chartTheme.text }} />
                <Tooltip
                  contentStyle={{ backgroundColor: chartTheme.surface, border: `1px solid ${chartTheme.border}`, borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="sessionsCompleted" fill={CHART_COLORS.brand} radius={[4, 4, 0, 0]} name="Sessions" />
                <Bar dataKey="targetSessions" fill={chartTheme.border} radius={[4, 4, 0, 0]} name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'weight':
        return weightData.length === 0 ? (
          <EmptyState message="Log your bodyweight (Settings) to see your trend." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.border} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.text }} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10, fill: chartTheme.text }} />
                <Tooltip
                  contentStyle={{ backgroundColor: chartTheme.surface, border: `1px solid ${chartTheme.border}`, borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [`${Number(value).toFixed(1)} lbs`, 'Weight']}
                />
                <Line type="monotone" dataKey="weight" stroke={CHART_COLORS.brand} strokeWidth={2} dot={{ fill: CHART_COLORS.brand, r: 2 }} name="Weight" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case 'recovery':
        return recoveryData.length === 0 ? (
          <EmptyState message="Rate your recovery after workouts to see trends." />
        ) : (
          <div className="space-y-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recoveryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.text }} />
                  <YAxis domain={[0, 4]} ticks={[1, 2, 3]} tickFormatter={(v: number) => ['', 'Poor', 'Normal', 'Great'][v] ?? ''} tick={{ fontSize: 10, fill: chartTheme.text }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: chartTheme.surface, border: `1px solid ${chartTheme.border}`, borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="ratingNum" stroke={CHART_COLORS.green} strokeWidth={2} name="Recovery" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Recovery heatmap (simple grid) */}
            <div>
              <h3 className="text-muted text-xs font-medium mb-2">Recovery by Day of Week</h3>
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => {
                  const dayRatings = (recoveryData as Array<{ dayOfWeek: number; ratingNum: number }>).filter((r) => r.dayOfWeek === i);
                  const avg = dayRatings.length > 0
                    ? dayRatings.reduce((s, r) => s + r.ratingNum, 0) / dayRatings.length
                    : 0;
                  const bg = avg >= 2.5 ? 'bg-green-500/30' : avg >= 1.5 ? 'bg-yellow-500/30' : avg > 0 ? 'bg-red-500/30' : 'bg-surface-3';
                  return (
                    <div key={i} className={`${bg} rounded-lg p-2 text-center`}>
                      <span className="text-muted text-xs">{d}</span>
                      {avg > 0 && <p className="text-foreground text-xs font-medium mt-0.5">{avg.toFixed(1)}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'nutrition':
        return nutritionData.length === 0 ? (
          <EmptyState message="Log some meals to see nutrition trends." />
        ) : (
          <div className="space-y-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={nutritionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.text }} />
                  <YAxis tick={{ fontSize: 10, fill: chartTheme.text }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: chartTheme.surface, border: `1px solid ${chartTheme.border}`, borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="protein" stroke={CHART_COLORS.brand} fill={CHART_COLORS.brand} fillOpacity={0.2} strokeWidth={2} name="Protein (g)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nutritionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.text }} />
                  <YAxis tick={{ fontSize: 10, fill: chartTheme.text }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: chartTheme.surface, border: `1px solid ${chartTheme.border}`, borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="calories" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} name="Calories" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'mood':
        return moodData.length === 0 ? (
          <EmptyState message="Log your pre-workout mood to see correlations." />
        ) : (
          <div className="space-y-4">
            {/* Mood vs Volume scatter */}
            <div>
              <h3 className="text-muted text-xs font-medium mb-2">Mood vs Total Volume</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.border} />
                    <XAxis
                      dataKey="moodNum"
                      type="number"
                      domain={[0.5, 3.5]}
                      ticks={[1, 2, 3]}
                      tickFormatter={(v: number) => ['', 'Drained', 'Normal', 'Energized'][v] ?? ''}
                      tick={{ fontSize: 9, fill: chartTheme.text }}
                      name="Mood"
                    />
                    <YAxis
                      dataKey="totalVolume"
                      tick={{ fontSize: 10, fill: chartTheme.text }}
                      name="Volume"
                    />
                    <ZAxis dataKey="energy" range={[40, 200]} name="Energy" />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartTheme.surface, border: `1px solid ${chartTheme.border}`, borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value, name) => {
                        if (name === 'Mood') {
                          const labels = ['', 'Drained', 'Normal', 'Energized'];
                          return labels[Number(value)] ?? value;
                        }
                        return name === 'Volume' ? `${Number(value).toLocaleString()} lbs` : value;
                      }}
                    />
                    <Scatter data={moodData} fill={CHART_COLORS.brand} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Mood over time */}
            <div>
              <h3 className="text-muted text-xs font-medium mb-2">Mood Over Time</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.text }} />
                    <YAxis
                      domain={[0.5, 3.5]}
                      ticks={[1, 2, 3]}
                      tickFormatter={(v: number) => ['', '😫', '😐', '🔥'][v] ?? ''}
                      tick={{ fontSize: 12, fill: chartTheme.text }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartTheme.surface, border: `1px solid ${chartTheme.border}`, borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="moodNum" stroke={CHART_COLORS.brand} strokeWidth={2} dot={{ fill: CHART_COLORS.brand }} name="Mood" />
                    <Line type="monotone" dataKey="energy" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ fill: CHART_COLORS.blue }} name="Energy" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Mood summary cards */}
            <div className="grid grid-cols-3 gap-2">
              {(['energized', 'normal', 'low_energy'] as const).map((m) => {
                const moodLabels: Record<string, string> = { energized: '🔥', normal: '😐', low_energy: '😫' };
                const count = (moodData as Array<{ mood: string }>).filter((d) => d.mood === m).length;
                const avgVol = count > 0
                  ? Math.round((moodData as Array<{ mood: string; totalVolume: number }>)
                      .filter((d) => d.mood === m)
                      .reduce((s, d) => s + d.totalVolume, 0) / count)
                  : 0;
                return (
                  <div key={m} className="bg-surface-3 rounded-lg p-2 text-center">
                    <span className="text-lg">{moodLabels[m]}</span>
                    <p className="text-foreground text-xs font-medium mt-1">{count}×</p>
                    {avgVol > 0 && <p className="text-faint text-[10px]">{avgVol.toLocaleString()} avg</p>}
                  </div>
                );
              })}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-3xl font-serif font-light text-foreground">Analytics</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === key
                ? 'bg-brand/15 text-brand'
                : 'text-muted hover:text-secondary'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="bg-surface-2 rounded-xl p-4 border border-border">
        {renderChart()}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <BarChart3 size={32} className="text-neutral-600 mb-2" />
      <p className="text-faint text-sm">{message}</p>
    </div>
  );
}
