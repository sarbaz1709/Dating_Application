import { ProfileSetupWizard } from '@/features/profile/components/profile-setup-wizard';
import { useMyProfile } from '@/features/profile/hooks';

export default function ProfileSetupScreen() {
  // The (app) layout only renders screens once the profile has loaded.
  const { data: profile } = useMyProfile();
  if (!profile) return null;
  return <ProfileSetupWizard profile={profile} />;
}
