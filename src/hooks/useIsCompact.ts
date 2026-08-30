import { useEffect, useState } from "react";

const compactQuery = "(max-width: 820px)";

export function useIsCompact(): boolean {
  const [isCompact, setIsCompact] = useState(() => window.matchMedia(compactQuery).matches);

  useEffect(() => {
    const media = window.matchMedia(compactQuery);
    const update = () => setIsCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isCompact;
}
