# Daggerlight match banners

The duel result, round recap, and next-round title reuse the pointed Quiero pennant. All three use the player's faction art under a dark cloth treatment, a thin gold edge, and ivory text. The text moves with its banner and remains still during the reading hold.

| Event | Duration | Visible information |
| --- | ---: | --- |
| Duel result | 1200 ms, with 768 ms at rest | Final Power for both cards and the engine's outcome |
| Round recap | 1540 ms, with about 1 second at rest | The completed round, actual score, outcome and choice reason when relevant |
| New round | 250 ms entrance, 850 ms hold, 240 ms exit | The actual next round number |

The new-round banner moves vertically over a separate stationary backdrop. The old board is replaced only when the backdrop is opaque. Cards still arrive at their own lane Archives, and the next hand deals after the banner and cover clear.

Reduced motion presents still banners. Browser validation plays real AI matches at desktop and phone sizes, checks the three silhouettes and their centered holds, and confirms the Archive, round swap and deal handoffs.
