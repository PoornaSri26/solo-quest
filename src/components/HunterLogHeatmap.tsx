import React, { useEffect, useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import { createAuthApi } from '../lib/api';
import { useStore } from '../store/useStore';

interface ActivityDay {
  date: string; // YYYY-MM-DD (server-local calendar day)
  count: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS = 53;

const levelClass = (count: number): string => {
  if (count <= 0) return 'bg-raised border border-border-subtle';
  if ( count === 1) return 'bg-gold-primary/30 border border-gold-primary/40';
  if (count === 2) return 'bg-gold-primary/55 border border-gold-primary/60';
  if (count <= 4) return 'bg-gold-primary/80 border border-gold-primary';
  return 'bg-gold-primary border border-gold-primary shadow-gold-glow';
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const HunterLogHeatmap: React.FC = () => {
  const token = useStore((s) => s.token);
  const [days, setDays] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const api = createAuthApi(() => token);
        const data = await api.get<{ days: ActivityDay[] }>('/hunter/activity-log');
        if (cancelled) return;
        setDays(new Map(data.days.map((d) => [d.date, d.count])));
      } catch {
        if (!cancelled) setError('The System could not retrieve your log.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  /**
   * Grid geometry: 53 columns (weeks) × 7 rows (weekdays), anchored so the
   * final cell is today. The first column is padded with nulls so each row
   * lines up with its weekday — the classic contribution-graph layout.
   */
  const { weeks, monthMarkers, currentStreak, longestStreak, total } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = today;
    const start = new Date(end.getTime() - (WEEKS * 7 - 1) * DAY_MS);

    // Pad the first week so weekday rows align (0 = Sunday).
    const firstWeekday = start.getDay();
    const cells: (Date | null)[] = [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: WEEKS * 7 - firstWeekday }, (_, i) =>
        new Date(start.getTime() + i * DAY_MS)
      ),
    ];

    const columns: (Date | null)[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      columns.push(cells.slice(w * 7, w * 7 + 7));
    }

    // Month label above the first week whose 1st–7th window contains a new month.
    const markers: { week: number; label: string }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastMonth = -1;
    columns.forEach((week, idx) => {
      for (const day of week) {
        if (!day) continue;
        if (day.getMonth() !== lastMonth) {
          lastMonth = day.getMonth();
          if (markers.length === 0 || markers[markers.length - 1].week !== idx) {
            markers.push({ week: idx, label: monthNames[lastMonth] });
          }
          break;
        }
      }
    });

    // Streaks + total are computed over days-with-data (today counts if active).
    const sorted = Array.from(days.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let current = 0;
    const cursor = new Date(today);
    if ((days.get(dayKey(cursor)) ?? 0) === 0) cursor.setTime(cursor.getTime() - DAY_MS);
    while ((days.get(dayKey(cursor)) ?? 0) > 0) {
      current++;
      cursor.setTime(cursor.getTime() - DAY_MS);
    }

    let longest = 0;
    let run = 0;
    let prevTime: number | null = null;
    for (const { date, count } of sorted) {
      if (count <= 0) {
        run = 0;
        prevTime = null;
        continue;
      }
      const time = new Date(`${date}T00:00:00`).getTime();
      run = prevTime !== null && time - prevTime === DAY_MS ? run + 1 : 1;
      longest = Math.max(longest, run);
      prevTime = time;
    }

    const totalCompletions = sorted.reduce((sum, d) => sum + d.count, 0);

    return { weeks: columns, monthMarkers: markers, currentStreak: current, longestStreak: longest, total: totalCompletions };
  }, [days]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8" role="status" aria-label="Loading hunter log">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gold-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-text-muted py-6 text-sm">{error}</p>;
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between text-xs">
        <p className="text-text-secondary">
          <span className="font-data text-gold-primary">{total}</span> quest{total !== 1 ? 's' : ''} cleared in the last year
        </p>
        <p className="flex items-center gap-1 text-text-secondary" title="Consecutive days with at least one cleared quest">
          <Flame className="w-3.5 h-3.5 text-gold-primary" aria-hidden="true" />
          <span className="font-data text-gold-primary">{currentStreak}</span> day{currentStreak !== 1 ? 's' : ''} · best {longestStreak}
        </p>
      </div>

      {/* Month labels */}
      <div className="relative ml-6 h-4" aria-hidden="true">
        {monthMarkers.map(({ week, label }) => (
          <span
            key={`${week}-${label}`}
            className="absolute text-[10px] text-text-muted"
            style={{ left: `${(week / WEEKS) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="img" aria-label={`Hunter log: ${total} quests completed in the past year, current streak ${currentStreak} days`}>
        {/* Weekday labels */}
        <div className="flex flex-col gap-1 text-[9px] text-text-muted select-none" aria-hidden="true">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} className="h-3 leading-3 w-3 text-center">{i % 2 === 1 ? label : ''}</span>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => {
              if (!day) return <span key={di} className="w-3 h-3" aria-hidden="true" />;
              const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
              const count = days.get(key) ?? 0;
              const label =
                count > 0
                  ? `${count} quest${count !== 1 ? 's' : ''} on ${key}`
                  : `No quests on ${key}`;
              return (
                <span
                  key={di}
                  className={`w-3 h-3 rounded-[2px] ${levelClass(count)} transition-fast hover:scale-125`}
                  title={label}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-[10px] text-text-muted" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 5].map((c) => (
          <span key={c} className={`w-3 h-3 rounded-[2px] ${levelClass(c)}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

export default HunterLogHeatmap;
