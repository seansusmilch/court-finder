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
    <div className={cn('flex items-center justify-between', className)}>
      <div className='flex items-center gap-2'>
        <ShieldCheck className='h-4 w-4 text-muted-foreground' />
        <Label htmlFor='verified-only' className='text-sm font-medium cursor-pointer'>
          Verified Only
        </Label>
      </div>
      <Switch
        id='verified-only'
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
