import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Colors, MaxContentWidth, Spacing, Type } from '@/theme';

import { ProfileCard, type ProfileCardPhoto } from './profile-card';

interface ProfilePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  name: string;
  age: number | null;
  bio: string;
  photos: ProfileCardPhoto[];
}

/** Full-screen "this is how others see you" preview. */
export function ProfilePreviewModal({
  visible,
  onClose,
  name,
  age,
  bio,
  photos,
}: ProfilePreviewModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} testID="profile-preview">
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>How others see you</Text>
            <Text style={styles.subtitle}>Tap the photo to flip through.</Text>
          </View>
          <ProfileCard name={name} age={age} bio={bio} photos={photos} />
          <Button testID="profile-preview-close" label="Looks good" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    gap: Spacing.xs,
  },
  title: {
    ...Type.heading,
    color: Colors.text,
  },
  subtitle: {
    ...Type.small,
    color: Colors.textMuted,
  },
});
