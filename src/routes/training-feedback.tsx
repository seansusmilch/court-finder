import { createFileRoute } from '@tanstack/react-router';
import { TrainingFeedbackPage } from '@/components/training';

export const Route = createFileRoute('/training-feedback')({
  component: TrainingFeedbackPage,
  beforeLoad: async ({ context }) => {
    // This route requires authentication
    // The component will handle the redirect if not authenticated
    return {};
  },
});
