import type { Metadata } from 'next';
import { RolesMatrix } from './roles-matrix';

export const metadata: Metadata = { title: 'Roles' };

export default function RolesPage() {
  return <RolesMatrix />;
}
