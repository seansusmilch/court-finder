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
    <div className='container mx-auto px-4 py-6 lg:py-10 max-w-4xl'>
      {/* Header Section */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-6'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => navigate({ to: '/training-feedback' })}
            className='flex items-center gap-2 hover:bg-accent'
          >
            <ArrowLeft className='h-4 w-4' />
            <span className='hidden sm:inline'>Back to Training</span>
          </Button>
        </div>

        <div className='flex items-center gap-3'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl'>
              Training Help
            </h1>
            <p className='text-muted-foreground mt-1'>
              Learn how to provide effective feedback to improve our court
              detection model
            </p>
          </div>
        </div>
      </div>

      <div className='space-y-6'>
        {/* Overview Card */}
        <Card className='border-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20'>
          <CardHeader>
            <CardTitle className='text-lg sm:text-xl flex items-center gap-2'>
              <HelpCircle className='h-5 w-5 text-blue-600 dark:text-blue-400' />
              How to Provide Training Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground leading-relaxed'>
              Help improve the court detection model by confirming or rejecting
              predictions. Your feedback helps train the AI to be more accurate
              in identifying courts from satellite imagery.
            </p>
          </CardContent>
        </Card>

        {/* Interface Guide */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg sm:text-xl'>
              Understanding the Interface
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='grid gap-6 sm:grid-cols-1'>
              {[
                {
                  step: '1',
                  title: 'View the Image',
                  description:
                    'The satellite image shows a potential court location. The red box indicates where the AI detected something.',
                  icon: '🔍',
                },
                {
                  step: '2',
                  title: 'Interact with the Image',
                  description:
                    'Pinch to zoom, drag to pan, and scroll to zoom in/out on desktop. Use touch gestures on mobile devices.',
                  icon: '👆',
                },
                {
                  step: '3',
                  title: 'Provide Feedback',
                  description:
                    'Use the buttons at the bottom to confirm or reject the detection based on what you observe.',
                  icon: '✅',
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className='flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors'
                >
                  <div className='flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center'>
                    <span className='text-sm font-semibold text-primary'>
                      {item.step}
                    </span>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-2'>
                      <span className='text-lg'>{item.icon}</span>
                      <h4 className='font-semibold text-base'>{item.title}</h4>
                    </div>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Response Options */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg sm:text-xl'>
              Response Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4'>
              {[
                {
                  button: {
                    icon: Check,
                    text: 'Yes',
                    variant: 'default',
                    className: 'bg-green-600 hover:bg-green-700 text-white',
                  },
                  title: 'Yes - This is correct',
                  description:
                    'Click when the AI correctly identified a court in the highlighted area.',
                  color: 'green',
                },
                {
                  button: {
                    icon: X,
                    text: 'No',
                    variant: 'default',
                    className: 'bg-red-600 hover:bg-red-700 text-white',
                  },
                  title: 'No - This is incorrect',
                  description:
                    'Click when the AI incorrectly identified something as a court.',
                  color: 'red',
                },
                {
                  button: { icon: Minus, text: 'Unsure', variant: 'outline' },
                  title: 'Unsure - Cannot determine',
                  description:
                    "Click when you cannot clearly see or determine if it's a court.",
                  color: 'gray',
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                    item.color === 'green'
                      ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800'
                      : item.color === 'red'
                      ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800'
                      : 'border-gray-200 bg-gray-50/50 dark:bg-gray-950/20 dark:border-gray-800'
                  }`}
                >
                  <Button
                    size='sm'
                    variant={item.button.variant as any}
                    className={`w-20 ${item.button.className || ''}`}
                    disabled
                  >
                    <item.button.icon className='h-4 w-4' />
                    {item.button.text}
                  </Button>
                  <div className='flex-1 min-w-0'>
                    <h4 className='font-semibold text-base mb-1'>
                      {item.title}
                    </h4>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tips Section */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg sm:text-xl'>
              Tips for Better Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-1 lg:grid-cols-2'>
              {[
                'Zoom in to see details clearly before making a decision',
                'Look for characteristic court shapes (rectangular, often with lines)',
                'Consider the context - courts are often near schools or community centers',
                'When in doubt, use "Unsure" rather than guessing',
              ].map((tip, index) => (
                <div
                  key={index}
                  className='flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors'
                >
                  <div className='flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5'>
                    <span className='text-xs font-semibold text-primary'>
                      {index + 1}
                    </span>
                  </div>
                  <p className='text-sm leading-relaxed'>{tip}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className='flex justify-center pt-6'>
          <Button
            onClick={() => navigate({ to: '/training-feedback' })}
            size='lg'
            className='px-8 py-3 text-base font-medium'
          >
            Start Training
          </Button>
        </div>
      </div>
    </div>
  );
}
