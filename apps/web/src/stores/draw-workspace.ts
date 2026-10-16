import { defineStore } from 'pinia';

export interface DrawWork {
  createdAt: number;
  favorite: boolean;
  id: string;
  model: string;
  modelLabel: string;
  prompt: string;
  ratio: string;
  size: string;
  status: 'done' | 'generating';
  variant: number;
}

interface CreateGenerationInput {
  amount: number;
  model: string;
  modelLabel: string;
  prompt: string;
  ratio: string;
  size: string;
}

interface DrawWorkspaceState {
  works: DrawWork[];
}

function makeId(): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);

  return `draw-${Date.now().toString(36)}-${randomPart}`;
}

export const useDrawWorkspaceStore = defineStore('draw-workspace', {
  state: (): DrawWorkspaceState => ({
    works: [],
  }),
  actions: {
    createGenerationWorks(input: CreateGenerationInput): DrawWork[] {
      const amount = Math.min(Math.max(input.amount, 1), 4);
      const now = Date.now();
      const createdWorks = Array.from({ length: amount }, (_, index): DrawWork => ({
        createdAt: now + index,
        favorite: false,
        id: makeId(),
        model: input.model,
        modelLabel: input.modelLabel,
        prompt: input.prompt,
        ratio: input.ratio,
        size: input.size,
        status: 'generating',
        variant: (this.works.length + index + 7) % 8,
      }));

      this.works = [...createdWorks, ...this.works];
      return createdWorks;
    },
    completeWorks(workIds: string[]): void {
      const idSet = new Set(workIds);

      this.works = this.works.map((work) =>
        idSet.has(work.id)
          ? {
              ...work,
              status: 'done',
            }
          : work,
      );
    },
    removeWork(workId: string): void {
      this.works = this.works.filter((work) => work.id !== workId);
    },
    toggleFavorite(workId: string): void {
      this.works = this.works.map((work) =>
        work.id === workId
          ? {
              ...work,
              favorite: !work.favorite,
            }
          : work,
      );
    },
  },
});
