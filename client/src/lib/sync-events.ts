export type SyncEventHandler = (draftId: string) => void;

class SyncEventEmitter {
  private listeners: Set<SyncEventHandler> = new Set();

  on(handler: SyncEventHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  emit(draftId: string): void {
    this.listeners.forEach((handler) => handler(draftId));
  }

  emitMany(draftIds: string[]): void {
    draftIds.forEach((id) => this.emit(id));
  }
}

export const syncEvents = new SyncEventEmitter();
