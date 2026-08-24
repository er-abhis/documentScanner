import RNFS from 'react-native-fs';

/** Small JSON-backed app preferences store (RNFS, no extra dependency). */
export type Prefs = {
  autoUpdate: boolean;
};

const DEFAULTS: Prefs = { autoUpdate: true };
const FILE = `${RNFS.DocumentDirectoryPath}/prefs.json`;

export async function getPrefs(): Promise<Prefs> {
  try {
    if (!(await RNFS.exists(FILE))) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(await RNFS.readFile(FILE, 'utf8')) };
  } catch {
    return DEFAULTS;
  }
}

export async function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): Promise<void> {
  const prefs = await getPrefs();
  prefs[key] = value;
  await RNFS.writeFile(FILE, JSON.stringify(prefs), 'utf8');
}
