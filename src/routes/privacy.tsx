import { createFileRoute } from '@tanstack/react-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const Route = createFileRoute('/privacy' as const)({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className='container mx-auto max-w-3xl px-4 py-8'>
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
          <CardDescription>
            Effective date: {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className='prose prose-invert max-w-none'>
          <p>
            This Privacy Policy describes how Court Finder handles information
            in connection with your use of the Service.
          </p>
          <h3>Information We Collect</h3>
          <p>
            We may collect minimal information necessary to provide the Service,
            such as authentication data and usage metrics. We do not sell
            personal information.
          </p>
          <h3>How We Use Information</h3>
          <p>
            Information is used to operate, maintain, and improve the Service,
            and to secure user accounts.
          </p>
          <h3>Your Choices</h3>
          <p>
            You may request deletion of your account and associated data subject
            to legal obligations.
          </p>
          <h3>Changes</h3>
          <p>
            We may update this Privacy Policy from time to time. Continued use
            of the Service after changes become effective constitutes
            acceptance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
