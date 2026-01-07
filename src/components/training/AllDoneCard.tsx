import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type AllDoneCardProps = {
  onNavigateToMap: () => void;
};

/**
 * Card shown when user has completed all feedback.
 */
export function AllDoneCard({ onNavigateToMap }: AllDoneCardProps) {
  return (
    <div className='container mx-auto px-4 py-8 text-center'>
      <Card className='max-w-md mx-auto'>
        <CardHeader>
          <CardTitle>All Done!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground mb-4'>
            You have provided feedback on all available images. Thank you!
          </p>
          <Button onClick={onNavigateToMap}>Back to Map</Button>
        </CardContent>
      </Card>
    </div>
  );
}
