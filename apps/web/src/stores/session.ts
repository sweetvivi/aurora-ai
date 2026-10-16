import { defineStore } from 'pinia';

interface SessionState {
  displayName: string;
  points: number;
  tier: string;
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
    displayName: '演示用户',
    points: 100,
    tier: '开发体验版',
  }),
  getters: {
    initials: (state) => state.displayName.slice(0, 1),
  },
});
