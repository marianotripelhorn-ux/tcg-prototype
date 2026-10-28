import { useEffect, useState } from "react";
import type { CardDefinition } from "./types";

// These files are deliberately separate from the old blue sprites.
// Without the optional HQ upload, the blue cards retain their existing imagery.
export function cardSpriteBackground(card: CardDefinition) {
  if (!card.art) return "";
  if (card.faction === "blue") {
    const number = Number(card.studioId.split("-")[1]);
    const sheet = number <= 6 ? 1 : 2;
    return 'url("./cards/blue/blue-cards-' + sheet + '-hq.webp"), url("' + card.art.sprite + '")';
  }
  return 'url("' + card.art.sprite + '")';
}

// The Empíreos sprites are uploaded separately. Until they arrive, the
// conventional illustrated-free card front remains visible, not an empty box.
const readiness = new Map<string, boolean>();
export function useCardArtReady(card: CardDefinition) {
  const remote = card.faction === "white" ? card.art?.sprite : undefined;
  const [ready, setReady] = useState(!remote || readiness.get(remote) === true);
  useEffect(() => {
    if (!remote) {
      setReady(true);
      return;
    }
    if (readiness.get(remote) === true) {
      setReady(true);
      return;
    }
    let mounted = true;
    const img = new Image();
    img.onload = () => {
      readiness.set(remote, true);
      if (mounted) setReady(true);
    };
    img.onerror = () => {
      readiness.set(remote, false);
      if (mounted) setReady(false);
    };
    img.src = remote;
    return () => { mounted = false; };
  }, [remote]);
  return ready;
}
