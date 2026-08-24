import { useCallback, useEffect, useState } from 'react';
import { checkForUpdate, startFlexibleUpdate, installFlexibleUpdate } from '../services/update';
import { getPrefs } from '../services/prefs';

/**
 * Checks Google Play for a newer build on mount. If the user enabled
 * auto-update, the download starts in the background automatically; otherwise
 * the caller shows an "Update available" prompt. On real devices installed from
 * Play only — a no-op in dev/sideload.
 */
export function useAppUpdate() {
  const [available, setAvailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const has = await checkForUpdate();
      if (!live || !has) return;
      setAvailable(true);
      const prefs = await getPrefs();
      if (prefs.autoUpdate) {
        setDownloading(true);
        startFlexibleUpdate(() => live && (setDownloaded(true), setDownloading(false))).catch(() => {});
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const update = useCallback(() => {
    setDownloading(true);
    startFlexibleUpdate(() => {
      setDownloaded(true);
      setDownloading(false);
    }).catch(() => setDownloading(false));
  }, []);

  const install = useCallback(() => installFlexibleUpdate(), []);

  return { available, downloading, downloaded, update, install };
}
