export type ImageProviderProtocol = 'openai' | 'seedream';
export type VideoProviderProtocol = 'seedance' | 'xai';

interface ProtocolCandidate {
  model?: string;
  providerBaseUrl?: string;
  providerCode?: string;
}

const SEEDREAM_PATTERN = /(^|[-_/\s])(seedream|doubao|volcengine|volc)([-_/\s]|$)/i;
const SEEDANCE_PATTERN = /(^|[-_/\s])(seedance|doubao|volcengine|volc)([-_/\s]|$)/i;

export function resolveImageProviderProtocol(input: ProtocolCandidate): ImageProviderProtocol {
  return matchesProtocol(input, SEEDREAM_PATTERN) ? 'seedream' : 'openai';
}

export function resolveVideoProviderProtocol(input: ProtocolCandidate): VideoProviderProtocol {
  return matchesProtocol(input, SEEDANCE_PATTERN) ? 'seedance' : 'xai';
}

export function buildArkApiUrl(providerBaseUrl: string, endpoint: string): string {
  const baseUrl = providerBaseUrl.trim().replace(/\/+$/, '');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (/\/api\/v3$/i.test(baseUrl)) {
    return `${baseUrl}${normalizedEndpoint}`;
  }

  if (/\/doubao$/i.test(baseUrl)) {
    return `${baseUrl}/api/v3${normalizedEndpoint}`;
  }

  const rootUrl = baseUrl.replace(/\/v1$/i, '');

  return `${rootUrl}/api/v3${normalizedEndpoint}`;
}

function matchesProtocol(input: ProtocolCandidate, pattern: RegExp): boolean {
  return [input.providerCode, input.model, input.providerBaseUrl].some((value) =>
    value ? pattern.test(value) : false,
  );
}
