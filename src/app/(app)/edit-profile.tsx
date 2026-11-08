import { EditProfileForm } from '@/features/profile/components/edit-profile-form';
import { useMyProfile } from '@/features/profile/hooks';

export default function EditProfileScreen() {
  // The (app) layout only renders screens once the profile has loaded.
  const { data: profile } = useMyProfile();
  if (!profile) return null;
  return <EditProfileForm profile={profile} />;
}
