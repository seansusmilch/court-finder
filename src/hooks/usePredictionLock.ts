import { useState, useEffect } from 'react';
import type { Id } from '@/../convex/_generated/dataModel';

/**
 * Hook to manage prediction locking to prevent view changes
 * when new predictions sync in from active scans.
 */
export function usePredictionLock(
  currentPredictionId: Id<'inference_predictions'> | undefined
) {
  const [lockedPredictionId, setLockedPredictionId] = useState<
    Id<'inference_predictions'> | undefined
  >(undefined);

  // Lock onto the current prediction when we first receive it
  useEffect(() => {
    if (currentPredictionId && !lockedPredictionId) {
      setLockedPredictionId(currentPredictionId);
    }
  }, [currentPredictionId, lockedPredictionId]);

  const clearLock = () => {
    setLockedPredictionId(undefined);
  };

  return {
    lockedPredictionId,
    clearLock,
  };
}
