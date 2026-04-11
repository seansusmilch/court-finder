import { useEffect, useRef, useState } from 'react';
import { useClerk } from '@clerk/react';
import { useMutation, useQuery } from 'convex/react';
import type { ChangeEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { api } from '@/../convex/_generated/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Camera, LogOut, Shield, X } from 'lucide-react';
import { ProfileImageCropper } from '@/components/profile/ProfileImageCropper';

export const Route = createFileRoute('/_authed/account')({
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const user = useQuery(api.users.me);
  const stats = useQuery(api.feedback_submissions.getFeedbackStats);
  const profileImageUrl = useQuery(api.users.getProfileImageUrl, {});
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateProfileImage = useMutation(api.users.updateProfileImage);
  const removeProfileImage = useMutation(api.users.removeProfileImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (user && name === '') {
      setName(user.name || '');
    }
  }, [user, name]);

  const handleSaveName = async () => {
    setIsSavingName(true);
    try {
      await updateProfile({ name: name || undefined });
      setIsEditingName(false);
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error(error);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirectUrl: '/' });
    navigate({ to: '/' });
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      e.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image must be less than 5MB');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setShowCropDialog(true);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploadingImage(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': croppedBlob.type },
        body: croppedBlob,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const { storageId } = await response.json();
      await updateProfileImage({ storageId });
      toast.success('Profile picture updated');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await removeProfileImage();
      toast.success('Profile picture removed');
    } catch (error) {
      console.error('Error removing profile picture:', error);
      toast.error('Failed to remove profile picture');
    }
  };

  if (user === undefined) {
    return (
      <div className='container mx-auto max-w-2xl px-4 py-8'>
        <div className='space-y-6'>
          <Skeleton className='h-8 w-48' />
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-32' />
            </CardHeader>
            <CardContent className='space-y-4'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className='container mx-auto max-w-2xl px-4 py-8'>
        <Card>
          <CardContent className='pt-6 space-y-4'>
            <p className='text-muted-foreground'>Not authenticated</p>
            <Button asChild>
              <Link to='/login'>Go to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials =
    user.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || user.email?.[0].toUpperCase() || 'U';

  return (
    <div className='container mx-auto max-w-2xl space-y-6 px-4 py-8 md:pb-8'>
      <div>
        <h1 className='text-3xl font-bold'>Account</h1>
        <p className='mt-1 text-muted-foreground'>
          Manage your account settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-4'>
            <div className='flex items-center gap-4'>
              <div className='relative flex-shrink-0'>
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt='Profile'
                    className='h-16 w-16 rounded-full border-2 border-border object-cover'
                  />
                ) : (
                  <div className='flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-primary/10 text-xl font-semibold text-primary'>
                    {initials}
                  </div>
                )}
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>Profile picture</p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Maximum file size: 5MB
                </p>
              </div>
            </div>
            <div className='flex gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
              >
                <Camera className='mr-2 h-4 w-4' />
                {profileImageUrl ? 'Change Photo' : 'Add Photo'}
              </Button>
              {profileImageUrl ? (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleRemovePhoto}
                  disabled={isUploadingImage}
                >
                  <X className='mr-2 h-4 w-4' />
                  Remove
                </Button>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              className='hidden'
              onChange={handleFileSelect}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input id='email' type='email' value={user.email || ''} disabled className='bg-muted' />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='role'>Role</Label>
            <Input
              id='role'
              value={user.role || 'user'}
              disabled
              className='bg-muted'
            />
            {user.role === 'admin' ? (
              <p className='flex items-center gap-2 text-xs text-muted-foreground'>
                <Shield className='h-3.5 w-3.5' />
                Admin access enabled
              </p>
            ) : null}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='name'>Name</Label>
            {isEditingName ? (
              <div className='space-y-2'>
                <Input id='name' value={name} onChange={(e) => setName(e.target.value)} placeholder='Your name' />
                <div className='flex gap-2'>
                  <Button onClick={handleSaveName} disabled={isSavingName}>
                    {isSavingName ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant='outline' onClick={() => setIsEditingName(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className='flex items-center gap-2'>
                <Input id='name' value={user.name || ''} disabled className='bg-muted' />
                <Button variant='outline' size='sm' onClick={() => setIsEditingName(true)}>
                  Edit
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Your feedback contribution summary</CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='rounded-lg border p-4'>
                <p className='text-sm text-muted-foreground'>Feedback submissions</p>
                <p className='mt-1 text-2xl font-semibold'>{stats.userSubmissionCount}</p>
              </div>
              <div className='rounded-lg border p-4'>
                <p className='text-sm text-muted-foreground'>Total predictions</p>
                <p className='mt-1 text-2xl font-semibold'>{stats.totalPredictions}</p>
              </div>
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>Loading stats...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className='flex items-center justify-between pt-6'>
          <div>
            <p className='font-medium'>Sign out</p>
            <p className='text-sm text-muted-foreground'>End your current session</p>
          </div>
          <Button variant='outline' onClick={handleSignOut}>
            <LogOut className='mr-2 h-4 w-4' />
            Sign out
          </Button>
        </CardContent>
      </Card>

      <ProfileImageCropper
        open={showCropDialog}
        onOpenChange={setShowCropDialog}
        onCropComplete={handleCropComplete}
        imageFile={selectedFile}
      />
    </div>
  );
}
