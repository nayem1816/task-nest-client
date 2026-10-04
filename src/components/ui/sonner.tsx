'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    className="toaster group"
    position="bottom-right"
    icons={{
      success: <CircleCheckIcon className="text-success size-4" />,
      info: <InfoIcon className="text-info size-4" />,
      warning: <TriangleAlertIcon className="text-warning size-4" />,
      error: <OctagonXIcon className="text-danger size-4" />,
      loading: <Loader2Icon className="size-4 animate-spin" />,
    }}
    style={
      {
        '--normal-bg': 'var(--popover)',
        '--normal-text': 'var(--popover-foreground)',
        '--normal-border': 'var(--border)',
        '--border-radius': 'var(--radius)',
      } as React.CSSProperties
    }
    {...props}
  />
);

export { Toaster };
