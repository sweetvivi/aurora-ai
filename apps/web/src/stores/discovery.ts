import { defineStore } from 'pinia';

interface DiscoveryState {
  query: string;
}

export const useDiscoveryStore = defineStore('discovery', {
  state: (): DiscoveryState => ({
    query: '',
  }),
});
