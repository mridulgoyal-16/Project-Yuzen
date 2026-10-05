
/* ═══════════════════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  /* Screen 2: open the next part with no details yet, as soon as penalty and
     damage are both set. Off by default — photos are optional and usually
     added after the damage call, and auto-advancing would steal that step. */
  AUTO_ADVANCE: false,
  /* 'auto'   → real camera on touch devices, sample photo on desktop
     'camera' → always open the OS camera / file picker
     'sample' → always drop in the sample photo (fastest for demoing)        */
  CAMERA_MODE: 'auto',
  MAX_PHOTOS: 3,
  /* How long a bike takes on an external power source. Sagar: 5-10 minutes, so
     9 is a long one — and it is REAL time, not a demo shortcut, because the
     point of the stack is that revivals outlast the attention of the person who
     started them. A four-second version would have made it a progress bar.

     THE REAL SIGNAL IS THE BIKE'S: the app sends nothing and cannot hurry it.
     This stands in for a message that arrives when it arrives.

     Counted from the revival's OWN start, so the two bikes seeded part-way
     through in fleets.js finish when they are due rather than restarting their
     wait at load. To watch one come back without waiting, call
     finishRevival("<id>") — that is the bike reporting in. */
  REVIVE_MS: 9 * 60000,
};

