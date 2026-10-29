import type { Command, Verb } from '../types';

const VALID_VERBS: ReadonlySet<Verb> = new Set([
  'hack',
  'bribe',
  'crack',
  'escape',
  'start',
]);

// parseCommand('/heist hack cctv --loud')  -> { verb: 'hack',  target: 'cctv', flags: ['--loud'] }
// parseCommand('/heist start --hard')      -> { verb: 'start', target: undefined, flags: ['--hard'] }
// parseCommand('hello')                    -> null
export function parseCommand(body: string): Command | null {
  const match = body.match(
    /^\/heist\s+(\w+)(?:\s+([a-z][\w-]*))?((?:\s+--[\w-]+)*)/i
  );
  if (!match) return null;

  const verb = match[1].toLowerCase() as Verb;
  if (!VALID_VERBS.has(verb)) return null;

  const flags = (match[3] ?? '').trim().split(/\s+/).filter(Boolean);

  return {
    verb,
    target: match[2],
    flags,
  };
}
