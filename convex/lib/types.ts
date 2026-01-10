// Verification status for courts
export type CourtStatus = 'verified' | 'pending' | 'rejected';

// Prediction confidence ranges for display
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

// Type guard for verified status
export function isVerified(status: CourtStatus | undefined): status is 'verified' {
  return status === 'verified';
}

// Type guard for pending status
export function isPending(status: CourtStatus | undefined): status is 'pending' {
  return status === 'pending';
}
