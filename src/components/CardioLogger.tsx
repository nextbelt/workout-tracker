import { useState, useCallback } from 'react';
import { Activity, Clock, Flame, Heart, MapPin, Plus, Trash2, Loader2, X } from 'lucide-react';
import { useCardio } from '../hooks/useCardio';
import type { CardioType, CardioIntensity } from '../types/database';

const CARDIO_TYPES: Array<{ value: CardioType; label: string }> = [
  { value: 'walking', label: 'Walking' },
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'rowing', label: 'Rowing' },
  { value: 'elliptical', label: 'Elliptical' },
  { value: 'stairmaster', label: 'Stairmaster' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'jump_rope', label: 'Jump Rope' },
  { value: 'other', label: 'Other' },
];

const INTENSITY_LEVELS: Array<{ value: CardioIntensity; label: string; color: string }> = [
  { value: 'low', label: 'Low', color: 'text-green-400' },
  { value: 'moderate', label: 'Moderate', color: 'text-yellow-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'max', label: 'Max', color: 'text-red-400' },
];

export function CardioLogger() {
  const { sessions, loading, logCardio, deleteCardio } = useCardio();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [cardioType, setCardioType] = useState<CardioType>('walking');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [intensity, setIntensity] = useState<CardioIntensity>('moderate');
  const [notes, setNotes] = useState('');

  const resetForm = useCallback(() => {
    setCardioType('walking');
    setDuration('');
    setDistance('');
    setCalories('');
    setHeartRate('');
    setIntensity('moderate');
    setNotes('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!duration) return;
    setSaving(true);
    await logCardio({
      cardioType,
      durationMinutes: parseInt(duration),
      distance: distance ? parseFloat(distance) : null,
      caloriesBurned: calories ? parseInt(calories) : null,
      avgHeartRate: heartRate ? parseInt(heartRate) : null,
      intensity,
      notes: notes || null,
    });
    setSaving(false);
    resetForm();
    setShowForm(false);
  }, [cardioType, duration, distance, calories, heartRate, intensity, notes, logCardio, resetForm]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-brand" />
          <h2 className="text-lg font-bold text-white">Cardio</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-2 min-h-11 min-w-11 bg-brand/10 hover:bg-brand/20 rounded-lg transition-colors flex items-center justify-center"
        >
          {showForm ? <X size={18} className="text-brand" /> : <Plus size={18} className="text-brand" />}
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <div className="bg-surface-2 rounded-xl p-4 space-y-4 border border-border animate-slide-up">
          {/* Cardio type */}
          <div>
            <label className="text-neutral-400 text-xs mb-2 block">Type</label>
            <div className="flex flex-wrap gap-2">
              {CARDIO_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => setCardioType(ct.value)}
                  className={`px-3 py-2 min-h-11 rounded-lg text-xs font-medium transition-colors ${
                    cardioType === ct.value
                      ? 'bg-brand text-white'
                      : 'bg-surface-3 text-neutral-400 border border-border-2'
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration & Distance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-neutral-400 text-xs mb-1 block">Duration (min) *</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="30"
                  className="w-full bg-surface-3 border border-border-2 rounded-lg pl-9 pr-3 py-3 min-h-11 text-white text-sm focus:outline-none focus:border-brand"
                />
              </div>
            </div>
            <div>
              <label className="text-neutral-400 text-xs mb-1 block">Distance (mi)</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="number"
                  step="0.1"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="3.0"
                  className="w-full bg-surface-3 border border-border-2 rounded-lg pl-9 pr-3 py-3 min-h-11 text-white text-sm focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>

          {/* Calories & Heart Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-neutral-400 text-xs mb-1 block">Calories</label>
              <div className="relative">
                <Flame size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="250"
                  className="w-full bg-surface-3 border border-border-2 rounded-lg pl-9 pr-3 py-3 min-h-11 text-white text-sm focus:outline-none focus:border-brand"
                />
              </div>
            </div>
            <div>
              <label className="text-neutral-400 text-xs mb-1 block">Avg HR</label>
              <div className="relative">
                <Heart size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="140"
                  className="w-full bg-surface-3 border border-border-2 rounded-lg pl-9 pr-3 py-3 min-h-11 text-white text-sm focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>

          {/* Intensity */}
          <div>
            <label className="text-neutral-400 text-xs mb-2 block">Intensity</label>
            <div className="flex gap-2">
              {INTENSITY_LEVELS.map((il) => (
                <button
                  key={il.value}
                  onClick={() => setIntensity(il.value)}
                  className={`flex-1 py-2 min-h-11 rounded-lg text-xs font-medium transition-colors ${
                    intensity === il.value
                      ? 'bg-brand/15 text-brand border border-brand/30'
                      : 'bg-surface-3 text-neutral-400 border border-border-2'
                  }`}
                >
                  {il.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-neutral-400 text-xs mb-1 block">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="w-full bg-surface-3 border border-border-2 rounded-lg px-3 py-3 min-h-11 text-white text-sm focus:outline-none focus:border-brand"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!duration || saving}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl py-3 min-h-11 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Log Cardio
          </button>
        </div>
      )}

      {/* Recent sessions */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="text-brand animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8">
          <Activity size={32} className="text-neutral-600 mx-auto mb-2" />
          <p className="text-neutral-500 text-sm">No cardio sessions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.slice(0, 10).map((session) => (
            <div
              key={session.id}
              className="bg-surface-2 rounded-xl p-4 flex items-center justify-between border border-border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm">
                    {CARDIO_TYPES.find((ct) => ct.value === session.cardio_type)?.label ?? session.cardio_type}
                  </span>
                  {session.intensity && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      INTENSITY_LEVELS.find((il) => il.value === session.intensity)?.color ?? 'text-neutral-400'
                    } bg-surface-3`}>
                      {session.intensity}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-neutral-500 text-xs mt-1">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {session.duration_minutes} min
                  </span>
                  {session.distance && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {session.distance} {session.distance_unit}
                    </span>
                  )}
                  {session.calories_burned && (
                    <span className="flex items-center gap-1">
                      <Flame size={12} /> {session.calories_burned} cal
                    </span>
                  )}
                  <span>{session.session_date}</span>
                </div>
              </div>
              <button
                onClick={() => deleteCardio(session.id)}
                className="p-2 min-h-11 min-w-11 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center"
              >
                <Trash2 size={14} className="text-neutral-500 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
