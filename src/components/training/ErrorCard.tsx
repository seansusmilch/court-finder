import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

type ErrorCardProps = {
  message: string;
};

/**
 * Card shown when there's an error displaying the prediction.
 */
export function ErrorCard({ message }: ErrorCardProps) {
  return (
    <div className='container mx-auto px-4 py-4'>
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8'>
            <AlertCircle className='h-12 w-12 text-destructive mx-auto mb-4' />
            <p className='text-muted-foreground mb-4'>{message}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
