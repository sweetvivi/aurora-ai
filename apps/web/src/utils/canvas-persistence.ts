export interface LocalCanvasWorkflow<TDocument extends { nodes: unknown[] }> {
  document: TDocument;
  id: string;
  savedAt: number;
}

export function parseLocalCanvasWorkflow<TDocument extends { nodes: unknown[] }>(
  raw: string | null,
): LocalCanvasWorkflow<TDocument> | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      return null;
    }

    const wrapped = isRecord(parsed.document);
    const document = wrapped ? parsed.document : parsed;

    if (!isRecord(document) || !Array.isArray(document.nodes)) {
      return null;
    }

    return {
      document: document as TDocument,
      id: typeof parsed.id === 'string' ? parsed.id : '',
      savedAt:
        typeof parsed.savedAt === 'number' && Number.isFinite(parsed.savedAt) ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

export function serializeLocalCanvasWorkflow<TDocument extends { nodes: unknown[] }>(
  workflow: LocalCanvasWorkflow<TDocument>,
): string {
  return JSON.stringify(workflow);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
