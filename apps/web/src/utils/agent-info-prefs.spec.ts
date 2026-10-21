import { beforeEach, describe, expect, it } from 'vitest';
import {
  AGENT_INFO_PREFS_STORAGE_KEY,
  emptyAgentInfoPrefs,
  isAgentFavorited,
  isAgentPinned,
  parseAgentInfoPrefs,
  readAgentInfoPrefs,
  serializeAgentInfoPrefs,
  toggleAgentPreference,
  writeAgentInfoPrefs,
} from './agent-info-prefs';

describe('agent-info-prefs', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('parseAgentInfoPrefs', () => {
    it('returns empty prefs for null, invalid JSON and non-object payloads', () => {
      expect(parseAgentInfoPrefs(null)).toEqual(emptyAgentInfoPrefs());
      expect(parseAgentInfoPrefs('')).toEqual(emptyAgentInfoPrefs());
      expect(parseAgentInfoPrefs('{oops')).toEqual(emptyAgentInfoPrefs());
      expect(parseAgentInfoPrefs('[]')).toEqual(emptyAgentInfoPrefs());
      expect(parseAgentInfoPrefs('"text"')).toEqual(emptyAgentInfoPrefs());
    });

    it('keeps only string entries and ignores unknown or malformed fields', () => {
      const prefs = parseAgentInfoPrefs(
        JSON.stringify({
          favorites: ['code-mentor', 42, null, 'draw-master'],
          pinned: 'not-an-array',
        }),
      );

      expect(prefs.favorites).toEqual(['code-mentor', 'draw-master']);
      expect(prefs.pinned).toEqual([]);
    });
  });

  describe('serializeAgentInfoPrefs', () => {
    it('deduplicates ids before persisting', () => {
      const serialized = serializeAgentInfoPrefs({
        favorites: ['a', 'b', 'a'],
        pinned: ['c', 'c'],
      });

      expect(JSON.parse(serialized)).toEqual({ favorites: ['a', 'b'], pinned: ['c'] });
    });
  });

  describe('readAgentInfoPrefs / writeAgentInfoPrefs', () => {
    it('round-trips prefs through localStorage', () => {
      writeAgentInfoPrefs({ favorites: ['code-mentor'], pinned: [] });

      expect(readAgentInfoPrefs()).toEqual({ favorites: ['code-mentor'], pinned: [] });
      expect(window.localStorage.getItem(AGENT_INFO_PREFS_STORAGE_KEY)).toBe(
        '{"favorites":["code-mentor"],"pinned":[]}',
      );
    });

    it('falls back to empty prefs when storage holds garbage', () => {
      window.localStorage.setItem(AGENT_INFO_PREFS_STORAGE_KEY, 'not-json');

      expect(readAgentInfoPrefs()).toEqual(emptyAgentInfoPrefs());
    });
  });

  describe('toggleAgentPreference', () => {
    it('adds and removes an id for the requested kind only', () => {
      const start = { favorites: [], pinned: ['other'] };

      const favorited = toggleAgentPreference(start, 'favorites', 'agent-1');
      expect(favorited.favorites).toEqual(['agent-1']);
      expect(favorited.pinned).toEqual(['other']);

      const unfavorited = toggleAgentPreference(favorited, 'favorites', 'agent-1');
      expect(unfavorited.favorites).toEqual([]);
      expect(unfavorited.pinned).toEqual(['other']);
    });

    it('pins independently from favorites', () => {
      const favorited = { favorites: ['agent-1'], pinned: [] };

      const pinned = toggleAgentPreference(favorited, 'pinned', 'agent-1');
      expect(pinned).toEqual({ favorites: ['agent-1'], pinned: ['agent-1'] });

      const unpinned = toggleAgentPreference(pinned, 'pinned', 'agent-1');
      expect(unpinned).toEqual({ favorites: ['agent-1'], pinned: [] });
    });

    it('does not mutate the input prefs', () => {
      const start = { favorites: [], pinned: [] };

      toggleAgentPreference(start, 'favorites', 'agent-1');

      expect(start).toEqual({ favorites: [], pinned: [] });
    });
  });

  describe('isAgentFavorited / isAgentPinned', () => {
    it('reflects membership per kind', () => {
      const prefs = { favorites: ['agent-1'], pinned: ['agent-2'] };

      expect(isAgentFavorited(prefs, 'agent-1')).toBe(true);
      expect(isAgentFavorited(prefs, 'agent-2')).toBe(false);
      expect(isAgentPinned(prefs, 'agent-2')).toBe(true);
      expect(isAgentPinned(prefs, 'agent-1')).toBe(false);
    });
  });
});
