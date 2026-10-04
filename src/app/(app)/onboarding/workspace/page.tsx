import type { Metadata } from 'next';
import { CreateWorkspaceForm } from './create-workspace-form';

export const metadata: Metadata = { title: 'Set up your workspace' };

export default function CreateWorkspacePage() {
  return (
    <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-[22px] font-semibold tracking-tight">Set up your workspace</h1>
      <p className="text-text-muted mt-1.5">
        A workspace holds your team, inbox and AI agent. Most businesses need just one.
      </p>
      <div className="mt-7">
        <CreateWorkspaceForm />
      </div>
    </main>
  );
}
