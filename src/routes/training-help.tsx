import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, HelpCircle, Check, X, Minus } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/training-help')({
  component: TrainingHelpPage,
});

export function TrainingHelpPage() {
  const navigate = useNavigate();

  return (
    <div className='container mx-auto px-4 py-4 sm:py-8 max-w-2xl'>
      <div className='flex items-center space-x-2 sm:space-x-4 mb-4 sm:mb-6'>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => navigate({ to: '/training-feedback' })}
          className='flex items-center space-x-2'
        >
          <ArrowLeft className='h-4 w-4' />
          <span className='hidden sm:inline'>Back</span>
        </Button>
        <h1 className='text-xl sm:text-2xl font-bold flex items-center'>
          <HelpCircle className='h-5 w-5 sm:h-6 sm:w-6 mr-2' />
          Training Help
        </h1>
      </div>

      <div className='space-y-4 sm:space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg sm:text-xl'>How to Provide Training Feedback</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-sm sm:text-base text-muted-foreground'>
              Help improve the court detection model by confirming or rejecting predictions. 
              Your feedback helps train the AI to be more accurate.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-lg sm:text-xl'>Understanding the Interface</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-3'>
              <div className='flex items-start space-x-2 sm:space-x-3'>
                <div className='w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1'>
                  <span className='text-xs sm:text-sm font-medium text-blue-600'>1</span>
                </div>
                <div>
                  <h4 className='font-medium text-sm sm:text-base'>View the Image</h4>
                  <p className='text-xs sm:text-sm text-muted-foreground'>
                    The satellite image shows a potential court location. The red box indicates where the AI detected something.
                  </p>
                </div>
              </div>
              
              <div className='flex items-start space-x-2 sm:space-x-3'>
                <div className='w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1'>
                  <span className='text-xs sm:text-sm font-medium text-blue-600'>2</span>
                </div>
                <div>
                  <h4 className='font-medium text-sm sm:text-base'>Interact with the Image</h4>
                  <p className='text-xs sm:text-sm text-muted-foreground'>
                    Pinch to zoom, drag to pan, and scroll to zoom in/out on desktop.
                  </p>
                </div>
              </div>
              
              <div className='flex items-start space-x-2 sm:space-x-3'>
                <div className='w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1'>
                  <span className='text-xs sm:text-sm font-medium text-blue-600'>3</span>
                </div>
                <div>
                  <h4 className='font-medium text-sm sm:text-base'>Provide Feedback</h4>
                  <p className='text-xs sm:text-sm text-muted-foreground'>
                    Use the buttons at the bottom to confirm or reject the detection.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-lg sm:text-xl'>Response Options</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-4'>
              <div className='flex items-center space-x-2 sm:space-x-3 p-3 rounded-lg border'>
                <Button
                  size='sm'
                  variant='outline'
                  className='bg-green-500 hover:bg-green-600 text-white w-14 sm:w-16'
                  disabled
                >
                  <Check className='h-4 w-4' /> Yes
                </Button>
                <div>
                  <h4 className='font-medium text-sm sm:text-base'>Yes - This is correct</h4>
                  <p className='text-xs sm:text-sm text-muted-foreground'>
                    Click when the AI correctly identified a court in the highlighted area.
                  </p>
                </div>
              </div>
              
              <div className='flex items-center space-x-2 sm:space-x-3 p-3 rounded-lg border'>
                <Button
                  size='sm'
                  variant='outline'
                  className='bg-red-500 hover:bg-red-600 text-white w-14 sm:w-16'
                  disabled
                >
                  <X className='h-4 w-4' /> No
                </Button>
                <div>
                  <h4 className='font-medium text-sm sm:text-base'>No - This is incorrect</h4>
                  <p className='text-xs sm:text-sm text-muted-foreground'>
                    Click when the AI incorrectly identified something as a court.
                  </p>
                </div>
              </div>
              
              <div className='flex items-center space-x-2 sm:space-x-3 p-3 rounded-lg border'>
                <Button
                  size='sm'
                  variant='outline'
                  className='w-14 sm:w-16'
                  disabled
                >
                  <Minus className='h-4 w-4' /> Unsure
                </Button>
                <div>
                  <h4 className='font-medium text-sm sm:text-base'>Unsure - Cannot determine</h4>
                  <p className='text-xs sm:text-sm text-muted-foreground'>
                    Click when you cannot clearly see or determine if it's a court.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-lg sm:text-xl'>Tips for Better Feedback</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <ul className='space-y-2 text-xs sm:text-sm'>
              <li className='flex items-start space-x-2'>
                <span className='text-blue-500 mt-1'>•</span>
                <span>Zoom in to see details clearly before making a decision</span>
              </li>
              <li className='flex items-start space-x-2'>
                <span className='text-blue-500 mt-1'>•</span>
                <span>Look for characteristic court shapes (rectangular, often with lines)</span>
              </li>
              <li className='flex items-start space-x-2'>
                <span className='text-blue-500 mt-1'>•</span>
                <span>Consider the context - courts are often near schools or community centers</span>
              </li>
              <li className='flex items-start space-x-2'>
                <span className='text-blue-500 mt-1'>•</span>
                <span>When in doubt, use "Unsure" rather than guessing</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className='flex justify-center pt-4'>
          <Button
            onClick={() => navigate({ to: '/training-feedback' })}
            size='lg'
            className='px-6 sm:px-8'
          >
            Start Training
          </Button>
        </div>
      </div>
    </div>
  );
}
