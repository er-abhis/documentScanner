import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { pickImages } from '../services/gallery';
import { useDraft } from '../state/draft';
import type { RootStackParamList } from '../types/navigation';

/**
 * Shared "pick images from gallery -> build a new document draft" action, used
 * by both Home and Tools so the flow lives in one place.
 */
export function useImportImages() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { clear, addPages } = useDraft();

  return async () => {
    const uris = await pickImages();
    if (uris.length === 0) return;
    clear();
    addPages(uris);
    navigation.navigate('Pages');
  };
}
