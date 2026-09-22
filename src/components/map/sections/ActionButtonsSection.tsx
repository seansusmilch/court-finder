import { Check, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ScanProgress } from '../CustomNavigationControls';
import type { MapSectionConfig } from '../shared/types';

export interface ScanAction {
  onScan: () => void;
  isScanning?: boolean;
  scanProgress?: ScanProgress | null;
}

export interface UploadAction {
  onUpload: () => void;
  isUploading?: boolean;
  uploadSuccess?: boolean;
}

export interface ActionButtonsSectionProps {
  scan?: ScanAction;
  upload?: UploadAction;
  className?: string;
}

export function ActionButtonsSection({
  scan,
  upload,
  className,
}: ActionButtonsSectionProps) {
  if (!scan && !upload) return null;

  return (
    <div className={cn('space-y-2 pt-2 border-t', className)}>
      {scan && (
        <Button
          variant='default'
          onClick={scan.onScan}
          disabled={scan.isScanning}
          className='w-full h-12 text-base font-medium'
        >
          {scan.isScanning ? (
            <span className='flex items-center gap-2'>
              <Radar className='h-5 w-5 animate-scan-spin' />
              {scan.scanProgress && scan.scanProgress.totalTiles > 0
                ? `Scanning area: ${Math.round((scan.scanProgress.tilesProcessed / scan.scanProgress.totalTiles) * 100)}%`
                : 'Scanning area…'}
            </span>
          ) : (
            'Scan this area'
          )}
        </Button>
      )}

      {upload && (
        <Button
          variant={upload.uploadSuccess ? 'default' : 'outline'}
          onClick={upload.onUpload}
          disabled={upload.isUploading || upload.uploadSuccess}
          className={cn(
            'w-full h-12 text-base font-medium transition-all',
            upload.uploadSuccess && '!bg-secondary !text-secondary-foreground hover:!bg-secondary/90 border-secondary'
          )}
        >
          {upload.uploadSuccess ? (
            <span className='flex items-center gap-2'>
              <Check className='h-5 w-5' />
              Uploaded successfully!
            </span>
          ) : upload.isUploading ? (
            <span className='flex items-center gap-2'>
              <span className='h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current' />
              Uploading…
            </span>
          ) : (
            'Upload center tile'
          )}
        </Button>
      )}
    </div>
  );
}

/**
 * Creates a section config for the action buttons section
 */
export function createActionButtonsSection(
  props: ActionButtonsSectionProps
): MapSectionConfig {
  return {
    id: 'action-buttons',
    order: 4,
    renderContent: () => <ActionButtonsSection {...props} />,
  };
}
