import type { Metadata } from 'next';
import { KnowledgePage } from './knowledge-page';

export const metadata: Metadata = { title: 'Knowledge' };

export default function Page() {
  return <KnowledgePage />;
}
