import { createFileRoute } from '@tanstack/react-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const Route = createFileRoute('/terms')({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className='container mx-auto max-w-3xl px-4 py-8'>
      <Card>
        <CardHeader>
          <CardTitle>Terms of Service</CardTitle>
          <CardDescription>
            Effective date: {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className='prose prose-invert max-w-none'>
          <p>
            These Terms of Service ("Terms") govern your access to and use of
            the Court Finder application (the "Service"). By accessing or using
            the Service you agree to be bound by these Terms.
          </p>
          <h3>Use of the Service</h3>
          <p>
            You agree to use the Service in compliance with all applicable laws
            and regulations. You may not use the Service to infringe upon the
            rights of others or to access locations without permission.
          </p>
          <h3>No Warranties</h3>
          <p>
            The Service and all detections are provided on an "as is" and "as
            available" basis without warranties of any kind, express or implied.
          </p>
          <h3>Limitation of Liability</h3>
          <p>
            To the maximum extent permitted by law, the project maintainers and
            contributors shall not be liable for any indirect, incidental,
            special, consequential or punitive damages, or any loss of profits
            or revenues, whether incurred directly or indirectly, or any loss of
            data, use, goodwill, or other intangible losses, resulting from your
            use of the Service.
          </p>
          <h3>Changes</h3>
          <p>
            We may modify these Terms at any time. Your continued use of the
            Service constitutes acceptance of the updated Terms.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
