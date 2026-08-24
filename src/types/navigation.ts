import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Scanner: { append?: boolean } | undefined;
  Pages: undefined;
  Documents: undefined;
  Document: { id: string };
  Settings: undefined;
  Editor: { uri: string; onDone: (uri: string) => void };
  PdfPreview: { uri: string; name: string };
  // modal
  PagePreview: { uri: string; index: number; total: number };
};

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
