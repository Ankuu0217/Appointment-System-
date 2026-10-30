import { useCallback, useEffect, useState } from 'react';

// A short-lived message (e.g. "Ankit Singh marked Confirmed."); cleared after `ms` and on unmount.
export default function useNotice(ms = 4000) {
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), ms);
    return () => clearTimeout(id);
  }, [notice, ms]);
  const show = useCallback((text) => setNotice({ text, at: Date.now() }), []);
  return [notice?.text ?? '', show];
}
