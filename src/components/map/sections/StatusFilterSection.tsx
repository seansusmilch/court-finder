import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { MapSectionConfig } from '../shared/types';

export interface StatusFilterSectionProps {
  verifiedOnly: boolean;
  onVerifiedOnlyChange: (value: boolean) => void;
  className?: string;
}

export function StatusFilterSection({
  verifiedOnly,
  onVerifiedOnlyChange,
  className,
}: StatusFilterSectionProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className='flex min-w-0 items-start gap-2'>
        <ShieldCheck className='h-4 w-4 text-muted-foreground' />
        <div className='min-w-0'>
          <Label htmlFor='verified-only' className='cursor-pointer text-sm font-medium'>
            Community verified only
          </Label>
          <p className='mt-1 text-xs leading-4 text-muted-foreground'>
            Show facilities with community confirmation.
          </p>
        </div>
      </div>
      <Switch
        id='verified-only'
        className='mt-0.5'
        checked={verifiedOnly}
        onCheckedChange={onVerifiedOnlyChange}
      />
    </div>
  );
}

export function createStatusFilterSection(
  props: StatusFilterSectionProps
): MapSectionConfig {
  return {
    id: 'statusFilter',
    order: 1,
    renderContent: () => <StatusFilterSection {...props} />,
  };
}
