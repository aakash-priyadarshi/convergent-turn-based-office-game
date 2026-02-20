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
  const [presenceCount, setPresenceCount] = useState(1);
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
          setPresenceCount(Object.keys(state).length);
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
    <div className="bg-white rounded-lg shadow p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-sm font-medium">
            {presenceCount} {presenceCount === 1 ? 'viewer' : 'viewers'}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {connected ? 'Live' : 'Polling'}
        </span>
      </div>

      {events.length > 0 && (
        <div className="border-t pt-2 mt-2 space-y-1 max-h-32 overflow-y-auto">
          {events.map((evt, i) => (
            <div key={i} className="text-xs text-gray-500 flex justify-between">
              <span>{evt.message}</span>
              <span className="text-gray-300">
                {new Date(evt.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
