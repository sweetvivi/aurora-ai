export type ChatContentPart =
  | {
      text: string;
      type: 'text';
    }
  | {
      image_url: {
        detail?: 'auto' | 'high' | 'low';
        url: string;
      };
      type: 'image_url';
    };

export type ReasoningEffort = 'high' | 'low' | 'medium';

export interface ChatMessage {
  content: ChatContentPart[] | string;
  role: 'assistant' | 'system' | 'user';
}

export interface StreamChatRequest {
  maxTokens?: number;
  messages: ChatMessage[];
  model: string;
  providerCode?: string;
  providerBaseUrl?: string;
  providerKeyRef?: string;
  reasoningEffort?: ReasoningEffort;
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
