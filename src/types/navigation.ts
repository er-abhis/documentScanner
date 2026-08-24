import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';

/** Tabs shown in the bottom navigation shell. */
export type TabParamList = {
  Home: undefined;
  Documents: undefined;
  Scan: undefined; // action tab -> pushes Scanner
  Tools: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  // tab routes are also addressable from the stack (nested resolution)
  Home: undefined;
  Documents: undefined;
  Tools: undefined;
  Settings: undefined;
  Scanner: { append?: boolean } | undefined;
  Pages: undefined;
  Joiner: undefined;
  CollageStudio: undefined;
  CollageEditor: { templateId: string };
  Convert: undefined;
  Document: { id: string };
  Organize: { id: string };
  // edit an app document by id, OR external/rasterized pages by uri list
  PdfEditor: { id: string } | { pages: string[]; name: string };
  PdfTextEditor: { uri: string; name: string };
  Ocr: { uri: string; name: string; kind: 'pdf' | 'image' };
  PdfPreview: { uri: string; name: string; editable?: boolean };
  Editor: { uri: string; onDone: (uri: string) => void };
  Annotate: { uri: string; onDone: (uri: string) => void };
  Coffee: undefined;
  About: undefined;
  Privacy: undefined;
  Faq: undefined;
  AppGuide: undefined;
  // modal
  PagePreview: { uri: string; index: number; total: number };
};

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
