import { describeTyping, TYPING_TIMEOUT_MS, TypingStore } from './typing-store';

describe('TypingStore', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const tom = { conversationId: 'c1', memberId: 'm1', name: 'Tom Becker' };
  const sam = { conversationId: 'c1', memberId: 'm2', name: 'Sam Whitfield' };

  it('forgets someone who stops sending typing events', () => {
    const store = new TypingStore();
    store.add(tom);
    expect(store.snapshot('c1')).toBe('Tom Becker');

    vi.advanceTimersByTime(TYPING_TIMEOUT_MS - 1);
    store.add(tom);
    vi.advanceTimersByTime(TYPING_TIMEOUT_MS - 1);
    expect(store.snapshot('c1')).toBe('Tom Becker');

    vi.advanceTimersByTime(1);
    expect(store.snapshot('c1')).toBe('');
  });

  it('keeps conversations apart and clears one when a message lands', () => {
    const store = new TypingStore();
    store.add(tom);
    store.add(sam);
    store.add({ ...tom, conversationId: 'c2' });
    expect(store.snapshot('c1')).toBe('Sam Whitfield\nTom Becker');

    store.clearConversation('c1');
    expect(store.snapshot('c1')).toBe('');
    expect(store.snapshot('c2')).toBe('Tom Becker');
  });

  it('notifies only when the set of typists changes', () => {
    const store = new TypingStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.add(tom);
    store.add(tom);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('describeTyping', () => {
  it.each([
    [[], null],
    [['Tom Becker'], 'Tom is typing…'],
    [['Sam Whitfield', 'Tom Becker'], 'Sam and Tom are typing…'],
    [['A', 'B', 'C'], '3 people are typing…'],
  ])('%j → %s', (names, expected) => {
    expect(describeTyping(names)).toBe(expected);
  });
});
