/* ═══════════════════════════════════════════════════════════════════════════
   DATA
   The five parts Yulu has renders for, named as they are named in Figma
   (2123:27951). Every part carries a real image — there are no placeholder
   entries left. The list grows as more renders arrive; a part added without one
   falls back to the "photo pending" tile rather than borrowing another part's.

   The per-part `reasons` vocabulary from the original Assessment prototype is
   gone: nothing collects reasons now, and carrying names that no longer match
   any part was worse than dropping it.
   ═══════════════════════════════════════════════════════════════════════════ */
const ASSETS = {
  mcu      : "var(--img-mcu)",
  piglight : "var(--img-piglight)",
  throttle : "var(--img-throttle)",
  fwheel   : "var(--img-fwheel)",
  tyre     : "var(--img-tyre)",
};

/* Thumbnail crops, taken verbatim from the 56px tiles in Figma 2123:27951 and
   scaled by 48/56 for this 48px tile. Figma positions each render absolutely
   inside the tile; dx/dy are the offsets of the render's centre from the
   tile's, which is what background-position:calc(50% + dx) expresses. */
const CROPS = {
  mcu      : {w: 86.57, h:86.57, dx: 2.14, dy:-5.57},
  piglight : {w: 89.14, h:49.71, dx:-3.43, dy: 1.71},
  throttle : {w:114.86, h:64.29, dx: 2.57, dy:-3.00},
  fwheel   : {w: 94.29, h:53.14, dx: 2.57, dy:-1.71},
  tyre     : {w: 92.57, h:52.29, dx: 3.43, dy:-2.14},
};

/* `note` and `reasons` came over from the mechanic's servicing checklist, which
   had both and read better for it — Sagar's call, and the reason the assessment
   list was rebuilt around them.

     note      what to actually LOOK at, written as an instruction. The name alone
               says which part; the note says what counts as good. Kept to roughly
               forty characters so it holds one line in the row and in the card.
     system    mechanical or electrical. The assessment dashboard splits its
               findings down that line — "Mechanical faults" and "Electrical
               faults" are two rows — so every part has to fall on one side of it.
               Judged by what fails and who fixes it: a charging port is wiring, a
               battery LOCK is a latch. Invented, like the rest of this block, and
               the handful of genuinely arguable ones (throttle controller, seat
               lock) are worth a second opinion.
     reasons   what can be wrong with THIS part. Per part, not one global list:
               "Wobble" is a wheel fault and means nothing on a horn, and a picker
               offering every fault for every part is a picker nobody reads.
               "Missing" is added to every part by the sheet — see MISSING.

   Both are invented content. The vocabulary is plausible and consistent, not
   Yulu's own; it wants a pass from someone who does the inspection. */
const PARTS = [
  /* Renders in hand (Figma 2123:27951) */
  {name:"MCU", system:"elec",                 photo:"mcu",      crop:"mcu",
   note:"Check for error codes and a loose connector",
   reasons:["Error code","Connector loose","Water ingress","No response"]},
  {name:"Pigtail Light", system:"elec",       photo:"piglight", crop:"piglight",
   note:"Check the pigtail for cuts and corrosion",
   reasons:["Cut insulation","Corroded pins","Loose in socket"]},
  {name:"Throttle controller", system:"elec", photo:"throttle", crop:"throttle",
   note:"Twist through full travel and check return",
   reasons:["Sticks open","No return","Mapping off","Play in grip"]},
  {name:"Front wheel", system:"mech",         photo:"fwheel",   crop:"fwheel",
   note:"Spin for wobble and check bearing play",
   reasons:["Wobble","Bearing noise","Spokes loose","Rim bent"]},
  {name:"Tyre", system:"mech",                photo:"tyre",     crop:"tyre",
   note:"Check tread depth, cuts and side wall",
   reasons:["Tread below limit","Cut","Side wall cracked","Under pressure"]},
  /* Awaiting photography — these carry the "photo pending" tile rather than
     borrowing a render of a different part. */
  {name:"Display", system:"elec",
   note:"Check it lights up and reads correctly",
   reasons:["Blank","Flickering","Wrong reading","Cracked"]},
  {name:"Rear wheel", system:"mech",
   note:"Spin for wobble and check bearing play",
   reasons:["Wobble","Bearing noise","Spokes loose","Rim bent"]},
  {name:"Front brake", system:"mech",
   note:"Check lever bite and pad wear",
   reasons:["Weak bite","Pads worn","Lever bottoms out","Squealing"]},
  {name:"Rear brake", system:"mech",
   note:"Check lever bite and pad wear",
   reasons:["Weak bite","Pads worn","Lever bottoms out","Squealing"]},
  {name:"Headlight", system:"elec",
   note:"Check both beams and the lens for cracks",
   reasons:["Not lighting","Dim","Lens cracked","Beam misaligned"]},
  {name:"Indicators", system:"elec",
   note:"Check all four blink at an even rate",
   reasons:["One not blinking","Rate wrong","Lens broken"]},
  {name:"Horn", system:"elec",
   note:"Press and check it sounds at full volume",
   reasons:["No sound","Weak","Intermittent"]},
  {name:"Charging port", system:"elec",
   note:"Check the pins and that the flap shuts",
   reasons:["Pins bent","Flap broken","Not charging"]},
  {name:"Battery lock", system:"mech",
   note:"Lock and unlock, check the key turns free",
   reasons:["Key jams","Will not lock","Barrel loose"]},
  {name:"Side stand", system:"mech",
   note:"Check the spring returns it and the stop",
   reasons:["Spring weak","Will not fold","Stop worn"]},
  {name:"Seat lock", system:"mech",
   note:"Lock and unlock, check the catch holds",
   reasons:["Will not latch","Key jams","Catch worn"]},
  {name:"Number plate", system:"mech",
   note:"Check it is present, legible and secure",
   reasons:["Illegible","Loose","Bent"]},
].map((p,i) => ({
  id:"p"+i, status:"pending", photo:null, crop:null,
  /* What the checklist's fault sheet recorded, and now the only place a part
     says WHAT is wrong with it. It used to have a rival: screen 2 kept its own
     `damage` list over a separate global vocabulary (Wear out / Cuts / Rust /
     Missing), so a QCA was asked the same question twice in two words. That
     screen asks for the penalty alone now and the duplication is gone. */
  reasons_selected:[],
  /* screen 2 detail, kept on the part so it survives a trip back to screen 1. */
  penalty:null, photos:[],
  ...p,
}));

/* Appended to every part's own reasons by the fault sheet, and mutually exclusive
   with all of them: a part that is not there cannot also be worn. */
const MISSING_REASON = "Missing";

/* The task list upstream hands over { id, name, battery, tab } on a row tap, so
   these three live in one place rather than being hardcoded per screen. */
const BIKE = {id:"543210", battery:60, model:"Dex NV", assignee:"Sagar Malik"};

const CUSTOMER_PHOTOS = ["--img-cust1","--img-cust2","--img-cust3","--img-cust4"];
/* Severity, single-select, and the only thing screen 2 asks for.

   A DAMAGE list stood beside it — Wear out / Cuts / Rust / Missing, multi-select
   with Missing exclusive against the rest. It is gone, and so is the conflict it
   was half of: the checklist's fault sheet already asks what is wrong with a
   part, in that part's own words, and this asked again in four generic ones. One
   question, in the place that can answer it precisely. */
const PENALTY = [
  {value:"no",    label:"No"},
  {value:"minor", label:"Minor"},
  {value:"major", label:"Major"},
];
const PENALTY_LABEL = {major:"Major penalty", minor:"Minor penalty", no:"No penalty"};

let activeIndex = 0;   /* part expanded into the assessment card on screen 1 */
/* Screen 2 opens every faulty part at once; this holds the ones that have
   since been folded away. Empty means all open, which is the arrival state. */
const collapsedFaults = new Set();

