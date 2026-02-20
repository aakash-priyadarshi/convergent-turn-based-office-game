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

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-amber-500'}`} />
          <span className="font-mono text-xs font-medium text-slate-300">
            {presenceCount === 0 ? 'You' : `You + ${presenceCount} ${presenceCount === 1 ? 'spectator' : 'spectators'}`}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
          {connected ? 'LIVE' : 'POLLING'}
        </span>
      </div>

      {events.length > 0 && (
        <div className="border-t border-white/5 pt-2 mt-2 space-y-1 max-h-32 overflow-y-auto">
          {events.map((evt, i) => (
            <div key={i} className="font-mono text-[10px] text-slate-500 flex justify-between">
              <span>{evt.message}</span>
              <span className="text-slate-700">
                {new Date(evt.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
