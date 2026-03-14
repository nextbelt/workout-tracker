import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Calendar, Heart, Apple, Loader2, ChevronDown } from 'lucide-react';
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
} from 'recharts';

type TabKey = 'volume' | 'progression' | 'consistency' | 'recovery' | 'nutrition';

const TABS: Array<{ key: TabKey; label: string; Icon: typeof BarChart3 }> = [
  { key: 'volume', label: 'Volume', Icon: BarChart3 },
  { key: 'progression', label: 'Progress', Icon: TrendingUp },
  { key: 'consistency', label: 'Streak', Icon: Calendar },
  { key: 'recovery', label: 'Recovery', Icon: Heart },
  { key: 'nutrition', label: 'Nutrition', Icon: Apple },
];

const CHART_COLORS = {
  brand: '#FF6B35',
  brandLight: '#FF8F66',
  blue: '#60A5FA',
  green: '#4ADE80',
  yellow: '#FACC15',
  red: '#F87171',
  surface: '#1a1a1a',
  border: '#333333',
  text: '#a3a3a3',
};

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('volume');
  const [loading, setLoading] = useState(false);
  const analytics = useAnalytics();
  const { exercises } = useWorkout();

  // Data states
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [volumeData, setVolumeData] = useState<Array<Record<string, any>>>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [progressionData, setProgressionData] = useState<Array<Record<string, any>>>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [consistencyData, setConsistencyData] = useState<Array<Record<string, any>>>([]);
  const [recoveryData, setRecoveryData] = useState<Array<Record<string, unknown>>>([]);
  const [nutritionData, setNutritionData] = useState<Array<Record<string, unknown>>>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');

  const loadTab = useCallback(async (tab: TabKey) => {
    setLoading(true);
    switch (tab) {
      case 'volume': {
        const data = await analytics.getVolumeOverTime(90);
        setVolumeData(data.map((d) => ({
          ...d,
          date: d.date.slice(5), // MM-DD
          volume: Math.round(d.totalVolume),
        })));
        break;
      }
      case 'progression': {
        if (selectedExercise) {
          const data = await analytics.getExerciseProgress(selectedExercise);
          setProgressionData(data.map((d) => ({
            ...d,
            date: d.date.slice(5),
          })));
        }
        break;
      }
      case 'consistency': {
        const data = await analytics.getConsistency(12);
        setConsistencyData(data);
        break;
      }
      case 'recovery': {
        const data = await analytics.getRecoveryData(90);
        const ratingMap: Record<string, number> = { great: 3, normal: 2, poor: 1 };
        setRecoveryData(data.map((d) => ({
          ...d,
          date: d.date.slice(5),
          ratingNum: ratingMap[d.rating] ?? 2,
        })));
        break;
      }
      case 'nutrition': {
        const data = await analytics.getNutritionTrends(30);
        setNutritionData(data.map((d) => ({
          ...d,
          date: d.date.slice(5),
          protein: Math.round(d.protein),
          calories: Math.round(d.calories),
        })));
        break;
      }
    }
    setLoading(false);
  }, [analytics, selectedExercise]);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  // Set default exercise for progression tab
  useEffect(() => {
    if (!selectedExercise && exercises.length > 0) {
      const compound = exercises.find((e) => e.is_compound);
      setSelectedExercise(compound?.id ?? exercises[0].id);
    }
  }, [exercises, selectedExercise]);

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
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} />
                <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} />
                <Tooltip
                  contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: '8px' }}
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
                  loadTab('progression');
                }}
                className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-3 min-h-11 text-white text-sm appearance-none focus:outline-none focus:border-brand"
              >
                {exercises
                  .filter((e) => e.is_compound)
                  .map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                <optgroup label="Isolation">
                  {exercises
                    .filter((e) => !e.is_compound)
                    .map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                </optgroup>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            </div>
            {progressionData.length === 0 ? (
              <EmptyState message="No data for this exercise yet." />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} />
                    <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: '8px' }}
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
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 10, fill: CHART_COLORS.text }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: CHART_COLORS.text }} />
                <Tooltip
                  contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="sessionsCompleted" fill={CHART_COLORS.brand} radius={[4, 4, 0, 0]} name="Sessions" />
                <Bar dataKey="targetSessions" fill={CHART_COLORS.border} radius={[4, 4, 0, 0]} name="Target" />
              </BarChart>
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
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} />
                  <YAxis domain={[0, 4]} ticks={[1, 2, 3]} tickFormatter={(v: number) => ['', 'Poor', 'Normal', 'Great'][v] ?? ''} tick={{ fontSize: 10, fill: CHART_COLORS.text }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="ratingNum" stroke={CHART_COLORS.green} strokeWidth={2} name="Recovery" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Recovery heatmap (simple grid) */}
            <div>
              <h3 className="text-neutral-400 text-xs font-medium mb-2">Recovery by Day of Week</h3>
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => {
                  const dayRatings = (recoveryData as Array<{ dayOfWeek: number; ratingNum: number }>).filter((r) => r.dayOfWeek === i);
                  const avg = dayRatings.length > 0
                    ? dayRatings.reduce((s, r) => s + r.ratingNum, 0) / dayRatings.length
                    : 0;
                  const bg = avg >= 2.5 ? 'bg-green-500/30' : avg >= 1.5 ? 'bg-yellow-500/30' : avg > 0 ? 'bg-red-500/30' : 'bg-surface-3';
                  return (
                    <div key={i} className={`${bg} rounded-lg p-2 text-center`}>
                      <span className="text-neutral-400 text-xs">{d}</span>
                      {avg > 0 && <p className="text-white text-xs font-medium mt-0.5">{avg.toFixed(1)}</p>}
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
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} />
                  <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="protein" stroke={CHART_COLORS.brand} fill={CHART_COLORS.brand} fillOpacity={0.2} strokeWidth={2} name="Protein (g)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nutritionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.text }} />
                  <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.text }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: CHART_COLORS.surface, border: `1px solid ${CHART_COLORS.border}`, borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="calories" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} name="Calories" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === key
                ? 'bg-brand/15 text-brand'
                : 'text-neutral-400 hover:text-neutral-300'
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
      <p className="text-neutral-500 text-sm">{message}</p>
    </div>
  );
}
