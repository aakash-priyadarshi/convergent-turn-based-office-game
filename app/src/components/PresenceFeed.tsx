'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ActivityEvent } from '@/lib/types';

interface Props {
  gameId: string;
  onUpdate?: () => void;
}

/**
 * Realtime presence counter + activity feed.
 * Uses Supabase Realtime channels; falls back to polling if unavailable.
 */
export default function PresenceFeed({ gameId, onUpdate }: Props) {
  const [presenceCount, setPresenceCount] = useState(0);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channelName = `game:${gameId}`;
    let fallbackInterval: NodeJS.Timeout | null = null;

    try {
      const channel = supabase.channel(channelName, {
        config: { presence: { key: crypto.randomUUID() } },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          // Subtract 1 to exclude the current player (they are the owner, not a viewer)
          setPresenceCount(Math.max(0, Object.keys(state).length - 1));
        })
        .on('broadcast', { event: 'quarter_advanced' }, (payload) => {
          const event: ActivityEvent = {
            type: 'quarter_advanced',
            message: `Quarter advanced to Y${payload.payload.year} Q${payload.payload.quarter}`,
            timestamp: new Date().toISOString(),
          };
          setEvents((prev) => [event, ...prev].slice(0, 10));
          onUpdate?.();
        })
        .on('broadcast', { event: 'bot_applied' }, (payload) => {
          const event: ActivityEvent = {
            type: 'bot_applied',
            message: `Bot recommendation applied: ${payload.payload.strategy}`,
            timestamp: new Date().toISOString(),
          };
          setEvents((prev) => [event, ...prev].slice(0, 10));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setConnected(true);
            await channel.track({ online_at: new Date().toISOString() });
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Fallback: poll for updates every 5s
      fallbackInterval = setInterval(() => {
        onUpdate?.();
      }, 5000);

      return () => {
        if (fallbackInterval) clearInterval(fallbackInterval);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative">
      {/* Compact always-visible bar */}
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-1.5">
        <div className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-amber-500'}`} />
        <span className="font-mono text-xs font-medium text-slate-300 whitespace-nowrap">
          {presenceCount === 0 ? 'You' : `You + ${presenceCount}`}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
          {connected ? 'LIVE' : 'POLL'}
        </span>

        {events.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-1 flex items-center gap-1 font-mono text-[10px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            title={expanded ? 'Collapse activity' : 'Show activity'}
          >
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold leading-none">
              {events.length}
            </span>
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Expandable activity feed dropdown */}
      {expanded && events.length > 0 && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Activity Feed</span>
            <button
              onClick={() => setExpanded(false)}
              className="font-mono text-[10px] text-slate-600 hover:text-slate-300 transition-colors cursor-pointer"
            >
              CLOSE
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {events.map((evt, i) => (
              <div key={i} className="font-mono text-[10px] text-slate-400 flex justify-between gap-2">
                <span className="truncate">{evt.message}</span>
                <span className="text-slate-600 whitespace-nowrap">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
