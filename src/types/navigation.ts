import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Tabs shown in the bottom navigation shell. */
export type TabParamList = {
  Home: undefined;
  Documents: undefined;
  Scan: undefined; // action tab -> pushes Scanner
  Tools: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  // tab routes are also addressable from the stack (nested resolution)
  Home: undefined;
  Documents: undefined;
  Tools: undefined;
  Settings: undefined;
  Scanner: { append?: boolean } | undefined;
  Pages: undefined;
  Joiner: undefined;
  Document: { id: string };
  Organize: { id: string };
  Editor: { uri: string; onDone: (uri: string) => void };
  Annotate: { uri: string; onDone: (uri: string) => void };
  PdfPreview: { uri: string; name: string };
  // modal
  PagePreview: { uri: string; index: number; total: number };
};

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
