'use client';

import { Check, Minus } from 'lucide-react';
import { Fragment } from 'react';
import { PageHeader } from '@/components/page/page-header';
import { ErrorState, ListSkeleton } from '@/components/page/states';
import { usePermissionCatalog, useRoles } from '@/lib/queries/team';
import { groupPermissions } from './permission-groups';

export function RolesMatrix() {
  const roles = useRoles();
  const catalog = usePermissionCatalog();

  const error = roles.error ?? catalog.error;
  const retry = () => {
    void roles.refetch();
    void catalog.refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="What each role can do. Every workspace starts with these six; custom roles are on the roadmap."
      />

      {(roles.isPending || catalog.isPending) && !error && <ListSkeleton rows={5} />}
      {error && <ErrorState error={error} onRetry={retry} />}

      {roles.data && catalog.data && (
        <div className="border-border bg-surface overflow-x-auto rounded-[10px] border">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <caption className="sr-only">Permissions granted by each role</caption>
            <thead className="border-border bg-surface sticky top-0 border-b">
              <tr>
                <th scope="col" className="w-[38%] px-4 py-2.5 font-medium">
                  <span className="sr-only">Permission</span>
                </th>
                {roles.data.map((role) => (
                  <th key={role.id} scope="col" className="px-2 py-2.5 text-center font-medium">
                    {role.name}
                    <span className="text-text-muted tabular block text-[11px] font-normal">
                      {role.memberCount} {role.memberCount === 1 ? 'person' : 'people'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupPermissions(catalog.data).map((group) => (
                <Fragment key={group.area}>
                  <tr className="bg-canvas">
                    <th
                      scope="colgroup"
                      colSpan={roles.data.length + 1}
                      className="text-text-muted px-4 py-1.5 text-[12px] font-medium"
                    >
                      {group.area}
                    </th>
                  </tr>
                  {group.permissions.map((permission) => (
                    <tr key={permission.key} className="border-border border-t">
                      <th scope="row" className="px-4 py-2 font-normal">
                        {permission.description}
                      </th>
                      {roles.data.map((role) => {
                        const granted = role.permissions.includes(permission.key);
                        return (
                          <td key={role.id} className="px-2 py-2 text-center">
                            {granted ? (
                              <Check className="text-success mx-auto size-4" aria-label="Allowed" />
                            ) : (
                              <Minus
                                className="text-input mx-auto size-4"
                                aria-label="Not allowed"
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
