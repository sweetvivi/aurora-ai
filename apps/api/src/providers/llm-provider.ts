export interface ChatMessage {
  content: string;
  role: 'assistant' | 'system' | 'user';
}

export interface StreamChatRequest {
  messages: ChatMessage[];
  model: string;
  providerCode?: string;
  signal?: AbortSignal;
  temperature?: number;
}

export type StreamChatEvent =
  | {
      content: string;
      type: 'delta';
    }
  | {
      type: 'done';
    };

export interface LlmProvider {
  streamChat(request: StreamChatRequest): AsyncGenerator<StreamChatEvent>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
