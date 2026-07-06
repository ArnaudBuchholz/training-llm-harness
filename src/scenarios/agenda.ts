import type { ITool } from '../ITool.js';

/*
 * What do I have on July 7th?
 * Schedule a design review next tuesday from 2pm to 3pm
 * 2x
 * Am I free next Monday?
 */

interface Meeting {
  title: string;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
}

const meetings: Meeting[] = [
  { title: 'Team standup', date: '2026-07-07', startTime: '09:00', endTime: '09:15' },
  { title: 'Sprint planning', date: '2026-07-07', startTime: '10:00', endTime: '11:30' },
  { title: 'One-on-one with Alice', date: '2026-07-08', startTime: '14:00', endTime: '14:30' },
  { title: 'Quarterly review', date: '2026-07-10', startTime: '13:00', endTime: '15:00' },
];

export const SYSTEM_PROMPT = `You are a personal assistant helping the user manage their calendar agenda.
You can list meetings within a date range and schedule new ones.
When asked about availability or conflicts, use list_meetings to check before creating.
Dates are in YYYY-MM-DD format, times in HH:MM 24-hour format.
Today is 2026-07-06.`;

export const TOOLS: ITool[] = [
  {
    name: 'list_meetings',
    description: 'List all meetings within a date range (inclusive)',
    parameters: {
      start_date: { type: 'string', description: 'Start date of the range in YYYY-MM-DD format' },
      end_date: { type: 'string', description: 'End date of the range in YYYY-MM-DD format' },
    },
    execute: async (args) => {
      const { start_date, end_date } = args;
      const filtered = meetings
        .filter((m) => m.date >= start_date && m.date <= end_date)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
      if (filtered.length === 0) return 'No meetings found in this date range.';
      return filtered
        .map((m) => `[${m.date}] ${m.startTime}–${m.endTime}  ${m.title}`)
        .join('\n');
    },
  },
  {
    name: 'create_meeting',
    description: 'Create a new meeting and add it to the calendar',
    parameters: {
      title: { type: 'string', description: 'Title or subject of the meeting' },
      date: { type: 'string', description: 'Date of the meeting in YYYY-MM-DD format' },
      start_time: { type: 'string', description: 'Start time in HH:MM 24-hour format' },
      end_time: { type: 'string', description: 'End time in HH:MM 24-hour format' },
    },
    execute: async (args) => {
      const { title, date, start_time, end_time } = args;
      // Detect conflicts
      const conflicts = meetings.filter(
        (m) => m.date === date && m.startTime < end_time && m.endTime > start_time,
      );
      if (conflicts.length > 0) {
        const names = conflicts.map((m) => `"${m.title}" (${m.startTime}–${m.endTime})`).join(', ');
        return `Conflict detected with: ${names}. Meeting was NOT created.`;
      }
      meetings.push({ title, date, startTime: start_time, endTime: end_time });
      return `Meeting "${title}" created on ${date} from ${start_time} to ${end_time}.`;
    },
  },
];
