# Wynn XP — Vehicle Control

Amitesh's prototype for the Wynn XP scooter control screen: power on/off, seat
open/close, lock/unlock, with real video playback for the power and seat actions.

Open `prototype.html` directly in a browser. No build step, no server needed.

## Why it moved

This lived at the repo root as `prototype.html` with its videos in `/videos`.
Both moved here unchanged when the Yuzen vehicle control screen took over the
root `prototype.html`. Nothing was rewritten — the file and its four video
references are byte-identical, and git tracked the move as a rename, so the
history is intact.
