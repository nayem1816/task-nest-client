export interface TypingEvent {
  conversationId: string;
  memberId: string;
  name: string;
}

// The server relays at most one event per second per person and clients send
// one every few seconds while typing, so silence this long means they stopped.
export const TYPING_TIMEOUT_MS = 4_000;

/**
 * Who is typing where. Kept outside React state so a typing event re-renders
 * only the composer of that conversation, not everything under the provider.
 */
export class TypingStore {
  private readonly entries = new Map<
    string,
    { event: TypingEvent; timer: ReturnType<typeof setTimeout> }
  >();
  private readonly listeners = new Set<() => void>();

  add(event: TypingEvent): void {
    const key = `${event.conversationId}:${event.memberId}`;
    clearTimeout(this.entries.get(key)?.timer);
    const timer = setTimeout(() => {
      this.entries.delete(key);
      this.notify();
    }, TYPING_TIMEOUT_MS);
    const known = this.entries.has(key);
    this.entries.set(key, { event, timer });
    if (!known) this.notify();
  }

  /** Someone in the conversation just sent a message, so whoever was typing it is done. */
  clearConversation(conversationId: string): void {
    let changed = false;
    for (const [key, { event, timer }] of this.entries) {
      if (event.conversationId !== conversationId) continue;
      clearTimeout(timer);
      this.entries.delete(key);
      changed = true;
    }
    if (changed) this.notify();
  }

  reset(): void {
    for (const { timer } of this.entries.values()) clearTimeout(timer);
    this.entries.clear();
    this.notify();
  }

  /** Names joined into one string, so React can compare snapshots by value. */
  snapshot(conversationId: string): string {
    return [...this.entries.values()]
      .filter(({ event }) => event.conversationId === conversationId)
      .map(({ event }) => event.name)
      .sort()
      .join('\n');
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    for (const listener of this.listeners) listener();
  }
}

/** "Tom is typing", "Tom and Sam are typing", "3 people are typing". */
export function describeTyping(names: string[]): string | null {
  const first = (name: string) => name.split(' ')[0] ?? name;
  if (names.length === 0) return null;
  if (names.length === 1) return `${first(names[0]!)} is typing…`;
  if (names.length === 2) return `${first(names[0]!)} and ${first(names[1]!)} are typing…`;
  return `${names.length} people are typing…`;
}
