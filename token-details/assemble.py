"""
Compose the token-details screen on the job screen from stitched-flow.

Everything visual is Sagar's, lifted verbatim from stitched-flow's stylesheet —
font faces, tokens, type scale, the hero, the collapsing bar, the title block,
the step rows, the rail, the footer. Only the contents change: where his screen
names the task, this one names the token.
"""
import pathlib, re

HERE = pathlib.Path(__file__).parent

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Yuzen · Token details</title>
<style>
/* ═══════════════════════════════════════════════════════════════════════════
   The job screen from stitched-flow, carrying a token instead of a task.
   The block below is Sagar's, unchanged; anything added for this screen sits
   in the ADDITIONS block after it and is marked.
   ═══════════════════════════════════════════════════════════════════════════ */
__CSS__

/* ═══════════════════════════════════════════════════════════════════════════
   The token queue, lifted from token-task-list by stitch.py. Its classes are
   prefixed tl- and its rules scoped under #scrList, because the two screens
   share 57 class names and would otherwise restyle each other.
   ═══════════════════════════════════════════════════════════════════════════ */
__LIST_CSS__

/* ── ADDITIONS for the token screen ───────────────────────────────────────── */
/* His stylesheet is written for a page that hosts many screens; this file shows
   one, so the host rules are restated here rather than edited above. */
/* 2 — the background does not move. The hero sits behind the scroll region, and
   the scroll content opens with a transparent spacer the hero shows through, so
   what travels is the sheet — from the token card down. The card then pins under
   the bar instead of leaving the screen. */
/* No z-index here on purpose. The bike is drawn with mix-blend-mode:darken, and
   giving this wrapper its own stacking context left it blending against nothing,
   so the bike vanished. DOM order puts it behind the scroll instead. */
.jb__heroWrap{position:absolute;left:0;top:0;width:100%;height:395px}
.jb__scroll{position:relative;z-index:1;background:transparent}
.tk__spacer{flex:0 0 auto;height:395px;pointer-events:none}
/* Token page → Expanded view, driven by how far the sheet has travelled rather
   than by a threshold. --c runs 0 (token page) to 1 (expanded), so the hero
   recedes, the bar takes on its surface, the badge and name arrive and the
   progress docks — all in step with the finger instead of snapping at a line.
   These selectors carry the same weight as his .is-solid rules and come later,
   so they win without editing his block. */
.screen--job .jb__bar{
  background-color:rgb(255 255 255 / var(--c,0));
  box-shadow:0 1px 0 rgb(232 232 232 / var(--c,0));
}
.screen--job .jb__bar::before{opacity:var(--c,0)}
/* There is ONE progress bar, and it travels — same reasoning as the identity.
   Fading a docked strip in while the card still showed its own row put two
   progress bars on screen at once, which is what read as an abrupt transition.
   This is the card's bar, moving to the strip's place and going full-bleed as it
   arrives. _flow.js sets left/width/top from the card's hidden slot. */
.screen--job .jb__dock{opacity:1;transition:none;overflow:hidden}
/* The % label belongs to the card, not the strip — the Expanded view frame has no
   number beside it — so it goes as the bar docks. */
.screen--job .jb__progPct{opacity:calc(1 - var(--d,0))}
.tk__progSlot{visibility:hidden}
/* The docked strip drew nothing despite measuring 390x6. His .jb__prog is a flex
   item in the card's progress row, which blockifies it; in the dock its parent is
   a plain div, so the span stayed inline — and an inline box whose only child is
   a block paints its background nowhere. */
.screen--job .jb__prog--bar{display:block}
/* And the tabs pin below the strip rather than under it, so the two never
   overlap once the sheet is at the top. */
.tk__tabs{position:sticky;
          top:calc(var(--status-h) + var(--jb-bar-h) + var(--progress-h));z-index:2}
/* The hero eases back as the sheet covers it, so the two states feel joined —
   but NOT by fading the hero itself. The bike is drawn with mix-blend-mode:
   darken, and any opacity below 1 makes its parent an isolation group, so the
   blend has nothing behind it to work against: the bike tears into bands and
   disappears the instant the scroll starts. Same trap as giving this wrapper a
   z-index, which is already commented above; opacity is just the other way in.
   A white scrim over the top gets the same recession with the wrapper left at
   full opacity. */
.screen--job .jb__heroWrap{opacity:1}
.screen--job .jb__heroWrap::after{
  content:"";position:absolute;inset:0;pointer-events:none;
  background:var(--canvas-primary,#fff);
  opacity:calc(.4 * var(--c,0));
}
/* The title card scrolls away under the bar rather than pinning beneath it.
   Pinning was what forced a second copy of the name into the bar; with the card
   free to leave, the one identity can travel up into its place. */
.jb__title{position:relative;z-index:1}
.jb__steps{position:relative;z-index:1;padding-top:var(--s6)}

html,body{height:100%;margin:0}
body{display:flex;align-items:center;justify-content:center;background:#f4f4f4;
     font-family:Satoshi,-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.screen[data-pos="in"]{visibility:visible;opacity:1;pointer-events:auto;transform:none;
                       transition:none}
@media (max-width:767px){
  body{display:block;background:#fff}
  .phone{width:100%;height:100vh;height:100dvh;border-radius:0}
}
@property --fill { syntax:'<percentage>'; inherits:false; initial-value:100%; }

/* Tabs, sitting between the title block and the steps. */
.tk__tabs{background:var(--surface-inverse);border-bottom:1px solid var(--border-primary);
          display:flex;overflow-x:auto;scrollbar-width:none}
.tk__tabs::-webkit-scrollbar{display:none}
.tk__tab{flex:0 0 auto;border:0;background:none;cursor:pointer;font-family:inherit;
         padding:var(--s4) var(--s4) 0;height:56px;
         display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:14px;
         color:var(--content-secondary);white-space:nowrap;
         transition:color .16s var(--ease-out)}
.tk__tab:first-child{padding-left:var(--s6)}
.tk__tab:last-child{padding-right:var(--s6)}
.tk__tab.is-on{color:var(--content-primary)}
.tk__tab i{display:block;width:100%;height:2px;border-radius:1px;background:var(--content-primary);
           transform:scaleX(0);transition:transform .2s var(--ease-out)}
.tk__tab.is-on i{transform:scaleX(1)}

/* 1 — the token number, in a circle at the head of the title row.
   His row was space-between to push Learn to the far edge; with Learn gone the
   badge and the name sit together at the start instead. */
.jb__titleRow{justify-content:flex-start}
.jb__titleText{flex:1 1 auto}

/* ── One identity, travelling ──────────────────────────────────────────────
   The Token frame puts the badge, the name and the subtext on the card; the
   Expanded view frame puts them in the bar. Those are the same three things in
   two places, so this is ONE node that moves between them, not two that
   cross-fade. Two copies is what made the name render twice.

   It lives in the bar because the bar does not scroll, which makes it a stable
   frame to position against. The card keeps a hidden copy of the same markup
   purely to reserve the row and give the traveller something to aim at, and
   _flow.js closes the gap between them by (1 - --c) every frame.

   Sizes interpolate with calc() rather than one scale(): the badge goes 40 → 36
   (0.9) while the name goes 20/28 → 16/20 (0.8), and scaled text goes blurry. */
.tk__idBox{display:flex;align-items:center;gap:var(--s4);min-width:0}
.tk__idText{display:flex;flex-direction:column;min-width:0;
            gap:calc(4px + 4px * (1 - var(--c,0)))}
.tk__idBox .h{color:var(--content-primary);font-weight:700;white-space:nowrap;
              overflow:hidden;text-overflow:ellipsis;
              font-size:calc(16px + 4px * (1 - var(--c,0)));
              line-height:calc(20px + 8px * (1 - var(--c,0)))}
.tk__idBox .s{color:var(--content-tertiary);white-space:nowrap;
              overflow:hidden;text-overflow:ellipsis}
.tk__idBox .tk__badge{
  width:calc(36px + 4px * (1 - var(--c,0)));
  height:calc(36px + 4px * (1 - var(--c,0)));
  font-size:calc(15px + 1.667px * (1 - var(--c,0)));
  line-height:calc(20px + 3.333px * (1 - var(--c,0)))}
/* The type drops out of the subtext on the way up: once you are in the bar the
   tabs are what say Service, so repeating it there is noise.
   It fades ~2.5x faster than it narrows. Fading at the same rate as the clip
   left a half-eaten word on screen — "Servic|Dex NV" — for most of the dock. */
.tk__idType{display:inline-block;overflow:hidden;vertical-align:bottom;
            white-space:nowrap;
            max-width:calc(64px * (1 - var(--c,0)));
            opacity:clamp(0, calc(1 - var(--c,0) * 2.5), 1)}
/* The bar's own leading gap is 16, not the screen's 24: the back arrow is an
   icon in a 40px button, so 24 of padding reads as far more than 24 of space. */
.screen--job .jb__bar{padding-left:var(--s4)}
/* The travelling instance. Absolute inside the bar so its resting place is the
   bar slot: 16px padding + 40px back button + 16px gap = 72px in. */
.tk__id{position:absolute;left:72px;right:72px;top:0;height:100%;
        will-change:transform;pointer-events:none}
/* Taken out of the flow, the identity no longer pushes the 3-dots to the end. */
.screen--job .jb__bar #btnMore{margin-left:auto}
/* The card's placeholder. Same markup, same size, never painted.
   Its own --c is pinned at 0 so it keeps the card a fixed height. Letting it
   resize with the scroll made the card 12px shorter as --c rose, which changed
   the very scroll geometry --c is measured from. That loop converged here, but
   it is exactly what jitters under a real finger. */
.tk__idSlot{visibility:hidden;--c:0}

.tk__badge{
  flex:0 0 auto;width:40px;height:40px;border-radius:100px;
  display:flex;align-items:center;justify-content:center;
  background:linear-gradient(180deg,rgba(0,0,0,.3) 0%,rgba(0,0,0,0) 100%),var(--surface-positive);
  color:var(--content-inverse);font-weight:700;font-size:16.667px;line-height:23.333px;
}

/* 2 — the overflow sheet that Learn moved into. */
.tk__scrim{position:absolute;inset:0;z-index:40;background:rgba(0,0,0,.32);
           opacity:0;transition:opacity .24s var(--ease-out)}
.tk__scrim.is-on{opacity:1}
.tk__sheet{
  position:absolute;left:0;right:0;bottom:0;z-index:41;
  background:var(--surface-inverse);border-radius:20px 20px 0 0;
  padding:var(--s2) 0 var(--s9);
  transform:translateY(100%);transition:transform .3s var(--ease-out);
  box-shadow:0 -8px 32px rgba(0,0,0,.1);
}
.tk__sheet.is-on{transform:translateY(0)}
.tk__grab{display:block;width:48px;height:4px;border-radius:4px;margin:0 auto var(--s2);
          background:var(--border-primary)}
.tk__opt{display:flex;align-items:center;gap:var(--s4);width:100%;border:0;background:none;
         cursor:pointer;font-family:inherit;color:var(--content-primary);
         padding:var(--s4) var(--s6);text-align:left}
.tk__opt:active{background:var(--surface-secondary)}
.tk__opt svg{width:24px;height:24px;flex:0 0 auto}

/* 3 — the active step is identified by its dot, not by a band behind the row. */
.jb__step.is-active{background:none;padding-top:var(--s4);padding-bottom:var(--s4)}
.jb__step.is-active .dot{position:relative}
.jb__step.is-active .dot::after{
  content:'';position:absolute;inset:0;border-radius:50%;pointer-events:none;
  animation:tk-pulse 1.9s var(--ease-out) infinite;
}
@keyframes tk-pulse{
  0%   {box-shadow:0 0 0 0 rgba(0,101,79,.38)}
  70%  {box-shadow:0 0 0 11px rgba(0,101,79,0)}
  100% {box-shadow:0 0 0 0 rgba(0,101,79,0)}
}
@media (prefers-reduced-motion:reduce){ .jb__step.is-active .dot::after{animation:none} }

/* 4 — the rail fills to the step in hand, and travels there rather than jumping. */
.jb__rail--done{
  position:absolute;left:35px;width:2px;z-index:0;
  background:var(--surface-positive);border-radius:1px;
  height:0;
  transition:height .55s var(--ease-out);
}

/* A done step gets the tick in the dot and a green rail above it. */
.jb__step.is-done .dot svg{display:block;width:24px;height:24px}
.jb__step .extra{width:100%}
/* Content-driven height, animated — the only way to transition to "as tall as
   the content is" without measuring it. */
.tk__fold{display:grid;grid-template-rows:0fr;transition:grid-template-rows .32s var(--ease-out)}
.tk__fold.is-open{grid-template-rows:1fr}
.tk__fold>div{overflow:hidden;min-height:0}
.tk__foldInner{padding:var(--s2) 0 0}
.tk__chev{flex:0 0 auto;width:24px;height:24px;display:grid;place-items:center;border:0;
          background:none;cursor:pointer}
.tk__chev svg{width:24px;height:24px;fill:none;stroke:var(--content-secondary);stroke-width:1.6;
              stroke-linecap:round;stroke-linejoin:round;transition:transform .24s var(--ease-out)}
.tk__chev.is-open svg{transform:rotate(180deg)}

/* The complaint, played back. */
/* The recorder, inline in a step row: the same .fbaudio pill, minus the page
   body's 36px lead-in, plus a delete in the trailing control's slot. */
.fbaudio--inline{margin-top:var(--s2)}
.fbaudio__del svg{display:block;width:20px;height:20px}
.fbaudio__del{color:var(--content-negative)}
.tk__time{color:var(--content-primary);font-variant-numeric:tabular-nums}
.tk__wave{flex:1;display:flex;align-items:center;gap:2px;height:20px;overflow:hidden}
.tk__wave i{flex:1;min-width:2px;max-width:3px;border-radius:2px;background:var(--content-disabled);
            transition:background-color .12s linear}
.tk__wave i.is-played{background:var(--content-primary)}

/* What the mechanic is doing, and what he has found. */
.tk__work{display:flex;flex-direction:column;gap:var(--s2)}
.tk__workHead{display:flex;align-items:baseline;justify-content:space-between;gap:var(--s2)}
.tk__stage{font-weight:700;font-size:14px;line-height:16px;color:var(--content-primary)}
.tk__pct{color:var(--content-tertiary);font-variant-numeric:tabular-nums}
.tk__bar{height:4px;border-radius:2px;background:var(--border-primary);overflow:hidden}
.tk__bar i{display:block;height:100%;width:0;border-radius:2px;background:var(--surface-positive);
           transition:width .6s var(--ease-out)}
.tk__faultsTitle{color:var(--content-tertiary);text-transform:uppercase;letter-spacing:.04em}
.tk__fault{display:flex;align-items:center;gap:var(--s2);color:var(--content-primary)}
.tk__fault b{flex:0 0 auto;font-weight:500;font-size:12px;line-height:16px;padding:1px 8px;
             border-radius:100px}
.tk__fault.is-major b{background:var(--reveal-negative);color:var(--content-negative)}
.tk__fault.is-minor b{background:#fdf0e0;color:var(--content-caution)}
.tk__note{color:var(--content-secondary)}
.tk__escalate{align-self:flex-start;border:0;background:none;cursor:pointer;font-family:inherit;
              font-weight:700;color:var(--content-primary);padding:var(--s2) 0;
              text-decoration:underline;text-underline-offset:3px}

/* Recording: the footer button becomes the recorder. */
.tk__rec{flex:1;min-height:60px;display:flex;align-items:center;gap:var(--s4);
         padding:0 var(--s2) 0 var(--s6);border:1px solid var(--border-primary);
         border-radius:100px;background:var(--surface-inverse)}
.tk__recWave{flex:1;display:flex;align-items:center;gap:2px;height:24px;overflow:hidden}
/* The waveform spans the whole pill and is drawn in as the recording runs, so
   the line grows rather than sitting there at a fixed length. A bar only starts
   moving once the recording has reached it. */
.tk__recWave i{flex:1;min-width:2px;max-width:3px;border-radius:2px;
               background:var(--border-primary);height:18%;
               transition:background-color .15s linear}
.tk__recWave i.is-on{background:var(--content-primary);
                     animation:tk-bounce .9s ease-in-out infinite}
@keyframes tk-bounce{0%,100%{height:18%}50%{height:90%}}
.tk__stop{flex:0 0 auto;width:44px;height:44px;border-radius:50%;background:var(--surface-inverse);
          box-shadow:var(--shadow-1);display:grid;place-items:center;border:0;cursor:pointer}
.tk__stop b{display:block;width:14px;height:14px;border-radius:2px;background:var(--content-primary)}

/* The other two tabs. */
.tk__stub{padding:var(--s6);display:flex;flex-direction:column;gap:var(--s4);
          background:var(--surface-inverse)}
.tk__stub p{color:var(--content-secondary)}
.tk__choice{display:flex;padding:var(--s4);border:1px solid var(--border-primary);border-radius:12px;
            background:none;text-align:left;width:100%;cursor:pointer;font-family:inherit;
            color:var(--content-primary);
            transition:border-color .16s var(--ease-out),background-color .16s var(--ease-out)}
.tk__choice.is-on{border-color:var(--border-selected);border-width:1.5px;
                  background:var(--surface-secondary)}
.tk__choice em{display:block;font-style:normal;font-size:14px;line-height:20px;
               color:var(--content-secondary)}

.tk__more{flex:0 0 auto;border:0;background:none;cursor:pointer;font-family:inherit;
          color:var(--content-primary);margin-right:var(--s6)}
.ffooter .btn-primary{display:flex;align-items:center;justify-content:center;gap:var(--s2)}
.ffooter .btn-primary svg{width:24px;height:24px;flex:0 0 auto}

/* ── Customer feedback — its own page ─────────────────────────────────────
   The step row only ever shows state; the work happens here. Closing this page
   is what completes the step, which is why Done and the back arrow do the same
   thing.

   The layout is his #scrFeedback, whole: .appbar/.fb__row/.fb__pagetitle for the
   bar, .fbbody for the body, .fbaudio for the clip, .fbquote for the transcript,
   .fbdivider between the halves. His page reports and stops; this one captures,
   so where his numbered .fblist sits, this has a field. That field is the only
   thing here without a counterpart in his sheet, and it is cut to match .fbaudio
   exactly — same 64px pill, same radius, same surface — so the two halves of the
   page read as one component set. */
/* Spacing. His body opens with 8px, which left the first heading crowded against
   the app bar; 36 gives it the same air the headings have from their own content.
   Sections sit 48 apart, so the divider carries 24 either side rather than his 48,
   which totalled 96. Scoped to this screen — his page keeps its own rhythm. */
#scrFb .fbbody{padding-top:var(--s9)}
#scrFb .fbdivider{margin:var(--s6) 0}

.fb__field{margin-top:36px;height:64px;border-radius:32px;
           background:var(--surface-secondary);padding:0 var(--s4) 0 0;
           display:flex;align-items:center;gap:0}
/* The label fills the whole text side of the pill and the input fills the label,
   so a tap anywhere left of the mic lands on the control itself. That is what
   raises the keyboard: a phone ignores a programmatic focus() called from a
   container's click handler, and only obeys a real tap on the input or on a
   label bound to it. Tapping the padding used to hit the div and do nothing. */
/* The pill's own inset lives on the label, not on the pill, so the padding is
   inside the tappable area rather than a dead margin around it. Everything from
   the pill's left edge to the mic focuses the input. */
.fb__grow{flex:1 1 auto;min-width:0;display:flex;align-items:center;
          align-self:stretch;cursor:text;padding:0 var(--s2) 0 var(--s4)}
.fb__input{width:100%;height:100%;min-width:0;border:0;background:none;
           font-family:inherit;color:var(--content-primary);
           font-size:16px;line-height:24px;font-weight:500}
.fb__input:focus{outline:none}
.fb__input::placeholder{color:var(--content-tertiary)}
.fb__mic{width:36px;height:36px;flex:0 0 auto;border-radius:18px;border:0;cursor:pointer;
         background:var(--surface-inverse);color:var(--content-primary);
         display:flex;align-items:center;justify-content:center}
.fb__mic svg{display:block;width:20px;height:20px;fill:currentColor}
.fb__mic.is-live{background:var(--content-primary);color:var(--content-inverse)}
/* The row's link to its page. Muted until touched — it is a way through, not a
   thing to look at. */
.tk__go{flex:0 0 auto;display:flex;align-items:center;color:var(--content-tertiary)}
.tk__go svg{display:block;width:24px;height:24px}
.jb__step[data-open]{cursor:pointer}
.jb__step[data-open]:active{background:var(--surface-secondary)}
.jb__step .top{display:flex;align-items:center;gap:var(--s2)}
.jb__step .lbl{flex:1 1 auto;min-width:0}
/* The repair line says what it is before it says where it is. */
.tk__workCap{display:block;color:var(--content-tertiary);text-transform:uppercase;
             letter-spacing:.04em;margin-bottom:var(--s1)}

/* ── A step's page ─────────────────────────────────────────────────────────── */
.stp__state{display:flex;align-items:center;gap:var(--s2);margin-top:var(--s4)}
.stp__pill{display:inline-flex;align-items:center;gap:var(--s2);height:32px;padding:0 var(--s4);
           border-radius:100px;background:var(--surface-secondary);color:var(--content-primary)}
.stp__pill.is-done{background:rgba(0,101,79,.1);color:var(--content-positive)}
.stp__pill i{width:8px;height:8px;border-radius:4px;background:currentColor;flex:0 0 auto}
.stp__meta{color:var(--content-tertiary)}
/* The workshop's own trail, so "which stage" is answerable without asking. */
.stp__stages{margin-top:var(--s6);display:flex;flex-direction:column;gap:0}
.stp__stage{display:flex;align-items:center;gap:var(--s4);min-height:44px;
            color:var(--content-tertiary)}
.stp__stage b{width:20px;height:20px;border-radius:10px;flex:0 0 auto;
              background:var(--surface-disabled);display:flex;align-items:center;
              justify-content:center;color:var(--content-inverse)}
.stp__stage.is-done{color:var(--content-primary)}
.stp__stage.is-done b{background:var(--surface-positive)}
.stp__stage.is-now{color:var(--content-primary);font-weight:700}
.stp__stage.is-now b{background:var(--content-primary)}
.stp__stage svg{width:14px;height:14px;fill:currentColor}
.stp__faults{margin-top:var(--s6);display:flex;flex-direction:column;gap:var(--s2)}
.stp__fault{display:flex;align-items:flex-start;gap:var(--s2);color:var(--content-primary)}
.stp__tag{flex:0 0 auto;padding:2px var(--s2);border-radius:6px;
          background:var(--surface-secondary);color:var(--content-secondary)}
.stp__tag.is-major{background:rgba(193,53,21,.1);color:var(--content-negative)}
.stp__empty{margin-top:var(--s6);color:var(--content-tertiary)}

/* ── Outcome tabs ──────────────────────────────────────────────────────────
   The Others frame is two list rows; his .sheet__opt is already that row at the
   exact metrics — 72px tall, 24px sides, the divider inset 24 either side — so
   the rows are his component rather than a new one that would drift from it. */
/* The screen's horizontal margin is 24 everywhere else; this content had none,
   so the caption and the chips sat flush against the edge. The list rows keep
   their own padding, so they opt out. */
.tk__outcomes{padding:var(--s2) var(--s6) 0}
.tk__outcomes .sheet__list{margin:0 calc(-1 * var(--s6))}
/* A tab the token has outgrown. Visible, so the captain can see the route
   existed, and plainly not available. */
.tk__tab[disabled]{color:var(--content-disabled);cursor:not-allowed}
.tk__tab[disabled] i{background:var(--content-disabled)}

/* The reason sheet. His .tk__sheet supplies the slide-up; this is its content. */
.tk__rsn{padding:var(--s9) var(--s6) var(--s6)}
.tk__rsn h2{color:var(--content-primary);margin:0 0 var(--s6)}
.tk__chiprow{display:flex;flex-wrap:wrap;gap:var(--s2);margin-bottom:var(--s9)}
.tk__rsn .btn-primary{width:100%}

/* The footer button spans the footer. His is padded to hug its label, which is
   right on a screen where two buttons share the row; here there is one action and
   it should be the width of the thing it acts on. */
.ffooter .btn-primary{flex:1 1 auto;width:100%}

/* Both inputs are the same control: a pill, the text on the left, the mic on the
   right. They were mirror images of each other — the customer's mic on the left,
   the captain's on the right — which made two identical jobs look like two
   different ones. */
.fbaudio--idle{padding:0 var(--s4);cursor:text}
.fbaudio--idle .fbaudio__hint{order:1}
.fbaudio--idle .fbaudio__mic{order:2}
/* Saving is a tick, not a square: it confirms the recording rather than merely
   halting it. */
.fbaudio__save{
  width:36px;height:36px;flex:0 0 auto;border:0;cursor:pointer;border-radius:18px;
  background:var(--surface-positive);color:var(--content-inverse);
  display:flex;align-items:center;justify-content:center;
}
.fbaudio__save svg{display:block;width:22px;height:22px;fill:currentColor}

/* The footer holds a reason above the button when the button cannot be used, so
   it stacks rather than centring a single control. */
.ffooter{flex-direction:column;align-items:stretch;gap:var(--s2)}
.tk__why{display:block;text-align:center;color:var(--content-tertiary)}

/* The search box takes the app bar's width while it is open, so the title steps
   aside rather than the two competing for the row. */
#scrList .tl-search{
  flex:1 1 auto;min-width:0;height:44px;border:0;border-radius:22px;
  background:var(--surface-secondary);padding:0 var(--s4);
  font-family:inherit;font-size:16px;color:var(--content-primary);
}
#scrList .tl-search:focus{outline:2px solid var(--border-selected);outline-offset:-2px}
#scrList .tl-appbar.tl-is-searching .tl-appbar-title{display:none}

/* Calling. Full-bleed and dark, because a call takes over a phone. */
.tk__call{
  position:absolute;inset:0;z-index:60;background:var(--canvas-inverse);
  display:flex;flex-direction:column;align-items:center;
  padding:120px var(--s6) var(--s12);color:var(--content-inverse);
}
.tk__callAvatar{
  width:96px;height:96px;border-radius:48px;background:var(--surface-positive);
  display:flex;align-items:center;justify-content:center;
  font-size:36px;font-weight:700;color:var(--content-inverse);
}
.tk__callName{margin-top:var(--s6);color:var(--content-inverse)}
.tk__callNum{margin-top:var(--s1);color:var(--content-disabled)}
.tk__callState{margin-top:var(--s9);color:var(--content-disabled)}
.tk__callEnd{
  margin-top:auto;width:72px;height:72px;border-radius:36px;border:0;cursor:pointer;
  background:var(--surface-negative);color:var(--content-inverse);
  display:flex;align-items:center;justify-content:center;
}
.tk__callEnd svg{width:32px;height:32px}

/* Others, inline in the reason sheet. */
.tk__other{margin:0 0 var(--s9)}
.tk__otherLabel{display:block;color:var(--content-secondary);margin-bottom:var(--s2)}
.tk__otherField{width:100%;resize:none;border:0;border-bottom:1px solid var(--border-secondary);
  background:var(--surface-secondary);border-radius:var(--s2) var(--s2) 0 0;
  padding:var(--s4);font-family:inherit;color:var(--content-primary)}
.tk__otherField:focus{outline:none;border-bottom-color:var(--border-selected)}
.tk__otherField::placeholder{color:var(--content-tertiary)}
.tk__otherFoot{display:flex;justify-content:space-between;gap:var(--s4);
  margin-top:var(--s2);color:var(--content-negative)}
.tk__otherFoot #rsnCount{color:var(--content-tertiary)}

/* The close confirmation. */
.tk__okScrim{position:absolute;inset:0;z-index:50;background:rgba(0,0,0,.32);
  opacity:0;transition:opacity .24s var(--ease-out)}
.tk__okScrim.is-on{opacity:1}
.tk__ok{
  position:absolute;left:var(--s6);right:var(--s6);top:50%;z-index:51;
  transform:translateY(-50%) scale(.94);opacity:0;
  transition:opacity .24s var(--ease-out),transform .24s var(--ease-out);
  background:var(--surface-inverse);border-radius:var(--s6);
  padding:var(--s9) var(--s6) var(--s6);text-align:center;
}
.tk__ok.is-on{opacity:1;transform:translateY(-50%) scale(1)}
.tk__okTick{display:flex;width:96px;height:96px;margin:0 auto var(--s6);
  align-items:center;justify-content:center;border-radius:48px;
  background:var(--surface-secondary);color:var(--surface-positive)}
.tk__okTick svg{width:56px;height:56px;padding:10px;border-radius:28px;
  background:var(--surface-positive);color:var(--content-inverse)}
.tk__ok h2{color:var(--content-primary)}
.tk__ok p{color:var(--content-secondary);margin-top:var(--s2)}
.tk__ok .btn-primary{width:100%;margin-top:var(--s9)}

/* The swap page: what is actually available, then why. Availability comes first
   because it is what the decision turns on — a reason picked before knowing
   whether a bike exists is a decision made blind. */
.swp__cap{display:block;color:var(--content-tertiary);text-transform:uppercase;
          letter-spacing:.04em;margin:var(--s9) 0 var(--s2)}
.swp__count{color:var(--content-primary)}
.swp__bikes{display:flex;flex-direction:column;gap:var(--s2);margin-top:var(--s4)}
.swp__bike{display:flex;align-items:center;gap:var(--s4);height:64px;
           padding:0 var(--s4);border-radius:var(--s4);
           background:var(--surface-secondary)}
.swp__bike .m{flex:1 1 auto;min-width:0;color:var(--content-primary)}
.swp__bike .c{flex:0 0 auto;color:var(--content-secondary);
              font-variant-numeric:tabular-nums}
.swp__none{margin-top:var(--s4);color:var(--content-tertiary)}

/* ── The recorder's three states ───────────────────────────────────────────
   His .fbaudio is the finished state only — there is no audio behind his page, so
   it reports and stops. Recording adds the two states before it, in the same
   64px pill so the row never changes shape underneath you: a mic to start, then
   pause and stop while it runs. */
.fbaudio--idle{cursor:pointer}
.fbaudio__mic{
  width:36px;height:36px;flex:0 0 auto;border:0;cursor:pointer;border-radius:18px;
  background:var(--surface-inverse);color:var(--content-primary);
  display:flex;align-items:center;justify-content:center;
}
.fbaudio__mic svg{display:block;width:20px;height:20px;fill:currentColor}
.fbaudio__hint{flex:1 1 auto;min-width:0;color:var(--content-secondary);
               white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* Recording: the dot is live rather than a separator, and the bars breathe. */
.fbaudio--live .fbaudio__dot{background:var(--content-negative);
  animation:fb-pulse 1.1s ease-in-out infinite}
@keyframes fb-pulse{0%,100%{opacity:1}50%{opacity:.25}}
.fbaudio--live .fbaudio__wave i{animation:fb-bounce .9s ease-in-out infinite;
  transform-origin:50% 50%}
.fbaudio--paused .fbaudio__wave i{animation:none}
.fbaudio--paused .fbaudio__dot{background:var(--content-caution);animation:none}
@keyframes fb-bounce{0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1)}}
@media (prefers-reduced-motion:reduce){
  .fbaudio--live .fbaudio__wave i,.fbaudio--live .fbaudio__dot{animation:none}
}
/* Stop is the affirmative action here, so it carries the fill. */
.fbaudio__stop{
  width:36px;height:36px;flex:0 0 auto;border:0;cursor:pointer;border-radius:18px;
  background:var(--content-primary);color:var(--content-inverse);
  display:flex;align-items:center;justify-content:center;
}
.fbaudio__stop b{display:block;width:12px;height:12px;border-radius:2px;
                 background:currentColor}
/* The summary of what was said, under the clip it belongs to. */
.fbsummary{margin-top:var(--s4)}
.fbsummary .t-body-md{color:var(--content-secondary)}
.fbsummary strong{font-weight:500;color:var(--content-primary)}

/* His waveform is static — there is no audio behind it. These two play, so the
   bars passed already are darkened as the clip runs. */
.fbaudio__wave i.is-played{background:var(--content-primary)}
.fbaudio__play.is-playing{background:var(--content-primary);color:var(--content-inverse)}

.tk__toast{position:absolute;left:var(--s6);right:var(--s6);
           bottom:calc(var(--footer-h) + var(--s2));z-index:30;
           padding:var(--s2) var(--s4);border-radius:12px;
           background:var(--content-primary);color:var(--content-inverse);
           opacity:0;transform:translateY(8px);pointer-events:none;
           transition:opacity .2s var(--ease-out),transform .2s var(--ease-out)}
.tk__toast.is-on{opacity:1;transform:translateY(0)}
</style>
</head>
<body>
<div class="phone" id="phone">
  <!-- ══ The token queue — the entry screen ═══════════════════════════════
       Lifted whole from token-task-list. Tapping a token opens the details
       screen beside it; the details screen reports progress back.
       ══════════════════════════════════════════════════════════════════════ -->
  <section class="screen" id="scrList" data-pos="in" aria-label="Tokens">
__LIST_HTML__
  </section>

  <section class="screen screen--job" id="scrJob" data-pos="right" aria-label="Token details">
    <div class="jb__heroWrap">
      <div class="jb__hero"></div>
      <div class="jb__bike" role="img" aria-label="Vehicle"></div>
    </div>

    <div class="jb__scroll" id="jbScroll">

      <div class="tk__spacer" aria-hidden="true"></div>

      <!-- Where his screen names the task, this one names the token. The row is
           a hidden placeholder: it reserves the space and gives the travelling
           identity in the bar a live target to aim at. Nothing here paints. -->
      <div class="jb__title" id="jbTitle">
        <div class="jb__titleRow tk__idBox tk__idSlot" id="tokSlot" aria-hidden="true">
          <span class="tk__badge">08</span>
          <div class="tk__idText">
            <span class="h">Rakesh Kumar</span>
            <span class="s t-label-sm"><span class="tk__idType">Service |&nbsp;</span>Dex NV &bull; 543210</span>
          </div>
        </div>
        <div class="jb__progRow">
          <span class="jb__prog tk__progSlot" id="tokProgSlot" aria-hidden="true"><i></i></span>
          <span class="jb__progPct t-label-sm" id="tokProgPct">0%</span>
        </div>
      </div>

      <div class="tk__tabs" id="tabs" role="tablist">
        <button class="tk__tab t-label-md is-on" data-tab="service" role="tab" type="button">Service<i></i></button>
        <button class="tk__tab t-label-md" data-tab="puncture" role="tab" type="button">Puncture<i></i></button>
        <button class="tk__tab t-label-md" data-tab="swap" role="tab" type="button">Others<i></i></button>
      </div>

      <div class="jb__steps" id="jbSteps">
        <!-- The rails live outside the rows on purpose. render() replaces the
             rows wholesale, and a node inserted and sized in the same tick has
             no previous height to transition from — the fill jumped to the next
             dot instead of travelling to it. Kept here, it survives a render
             and its height animates. -->
        <div id="jbRails"></div>
        <div id="jbRows"></div>
      </div>
    </div>

    <header class="jb__bar" id="jbBar">
      <button id="btnClose" type="button" aria-label="Back">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.454 12l4.073 4.073a.749.749 0 01-.53 1.28.723.723 0 01-.535-.216l-4.49-4.49a.9.9 0 010-1.294l4.49-4.49a.72.72 0 01.523-.217.75.75 0 01.542 1.28L10.454 12z" fill="currentColor"/></svg>
      </button>
      <!-- The one identity. It rests here, in the bar, and travels down onto the
           card whenever the card is on screen. -->
      <div class="tk__idBox tk__id" id="tokId">
        <span class="tk__badge" id="tokBadge" aria-label="Token 08">08</span>
        <div class="tk__idText">
          <span class="h" id="tokName">Rakesh Kumar</span>
          <span class="s t-label-sm" id="tokSub"><span class="tk__idType">Service |&nbsp;</span>Dex NV &bull; 543210</span>
        </div>
      </div>
      <button id="btnMore" type="button" aria-label="More options">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" fill="currentColor"/></svg>
      </button>
    </header>
    <div class="jb__dock" id="jbDock" aria-hidden="true">
      <span class="jb__prog jb__prog--bar" id="tokDockProg" role="progressbar"
            aria-label="Token progress" aria-valuemin="0" aria-valuemax="100"
            aria-valuenow="0"><i></i></span>
    </div>

    <div class="ffooter is-shown" id="footer"></div>

    <!-- The overflow menu. Learn lives here now rather than beside the name. -->

    <div class="tk__scrim" id="scrim" hidden></div>
    <div class="tk__sheet" id="moreSheet" role="dialog" aria-modal="true"
         aria-label="Token options" hidden>
      <span class="tk__grab" aria-hidden="true"></span>
      <button class="tk__opt t-label-md" id="optLearn" type="button">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.65 15.75 15.525 12.625c.233-.15.35-.358.35-.625s-.117-.475-.35-.625L10.65 8.25c-.25-.167-.504-.179-.762-.037-.259.141-.388.362-.388.662v6.25c0 .3.129.521.388.663.258.141.512.129.762-.038ZM12 22a9.7 9.7 0 0 1-3.9-.788 10.1 10.1 0 0 1-3.175-2.137A10.1 10.1 0 0 1 2.788 15.9 9.7 9.7 0 0 1 2 12a9.7 9.7 0 0 1 .788-3.9 10.1 10.1 0 0 1 2.137-3.175A10.1 10.1 0 0 1 8.1 2.788 9.7 9.7 0 0 1 12 2a9.7 9.7 0 0 1 3.9.788 10.1 10.1 0 0 1 3.175 2.137A10.1 10.1 0 0 1 21.212 8.1 9.7 9.7 0 0 1 22 12a9.7 9.7 0 0 1-.788 3.9 10.1 10.1 0 0 1-2.137 3.175 10.1 10.1 0 0 1-3.175 2.137A9.7 9.7 0 0 1 12 22Zm0-2c2.233 0 4.125-.775 5.675-2.325C19.225 16.125 20 14.233 20 12s-.775-4.125-2.325-5.675C16.125 4.775 14.233 4 12 4s-4.125.775-5.675 2.325C4.775 7.875 4 9.767 4 12s.775 4.125 2.325 5.675C7.875 19.225 9.767 20 12 20Z" fill="currentColor"/></svg>
        Learn
      </button>
    </div>
    <!-- The reason picker, from the Reason for unserviceability frame: a sheet
         over a scrim, a heading, chips, and Confirm. Both outcomes use it —
         unserviceable ends the token, swap converts it. -->
    <div class="tk__scrim" id="rsnScrim" hidden></div>
    <div class="tk__sheet tk__rsn" id="rsnSheet" role="dialog" aria-modal="true"
         aria-labelledby="rsnTitle" hidden>
      <h2 class="t-heading-lg" id="rsnTitle">Reason for unserviceability</h2>
      <div class="tk__chiprow" id="rsnChips" role="group" aria-labelledby="rsnTitle"></div>
      <!-- Others opens here rather than in a second sheet: it is five words, not
           a new task. Submit stays shut until the minimum is met. -->
      <div class="tk__other" id="rsnOther" hidden>
        <label class="tk__otherLabel t-label-sm" for="rsnText">Enter other comment</label>
        <textarea class="tk__otherField t-body-md" id="rsnText" rows="2"
                  maxlength="100" placeholder="Type here..."></textarea>
        <div class="tk__otherFoot">
          <span class="t-label-xs" id="rsnHint">Minimum 5 characters required</span>
          <span class="t-label-xs" id="rsnCount">0/100</span>
        </div>
      </div>
      <button class="btn-primary t-label-md700" id="rsnConfirm" type="button" disabled>
        <span>Submit</span>
      </button>
    </div>
    <!-- Closing a token is the one thing the captain cannot undo from here, so it
         is acknowledged rather than announced in a toast that slides away. -->
    <!-- Calling. A dummy, but it has to exist: tapping Call user and having
         nothing happen is indistinguishable from a broken button. -->
    <div class="tk__call" id="callScr" hidden>
      <span class="tk__callAvatar" id="callInitial" aria-hidden="true">R</span>
      <span class="tk__callName t-heading-md" id="callName">Rakesh Kumar</span>
      <span class="tk__callNum t-body-md" id="callNum">+91 98•••• ••21</span>
      <span class="tk__callState t-label-md" id="callState">Calling…</span>
      <button class="tk__callEnd" id="callEnd" type="button" aria-label="End call">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5c-1.4 0-2.7-.2-4-.7
          -.4-.1-.7 0-1 .3l-1.7 2.1a17 17 0 0 1-5-5l2.1-1.8c.3-.2.4-.6.3-1-.5-1.2-.7-2.6-.7-4
          0-.6-.4-1-1-1H1.4C.8 4.4.4 4.8.4 5.4a20 20 0 0 0 20 18.2c.5 0 1-.4 1-1V19c0-.6-.4-1-1-1
          -1.4 0-2.7-.2-4-.7" fill="currentColor" transform="rotate(135 12 12)"/></svg>
      </button>
    </div>
    <div class="tk__okScrim" id="okScrim" hidden></div>
    <div class="tk__ok" id="okCard" role="alertdialog" aria-modal="true"
         aria-labelledby="okTitle" hidden>
      <span class="tk__okTick" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M9.5 16.2 5.3 12l1.4-1.4 2.8 2.8 7.1-7.1 1.4 1.4z"
             fill="currentColor"/></svg>
      </span>
      <h2 class="t-heading-md" id="okTitle">Success</h2>
      <p class="t-body-md" id="okMsg">Token Closed Successfully</p>
      <button class="btn-primary t-label-md700" id="okBtn" type="button"><span>Ok got it</span></button>
    </div>
    <div class="tk__toast t-body-sm" id="toast" role="status"></div>
  </section>

  <!-- The feedback page. A sibling screen, so closing it returns to the token
       with the step behind it completed. -->
  <!-- ══ Customer feedback ══════════════════════════════════════════════════
       Laid out on his #scrFeedback, whole: the same app bar, body, clip,
       transcript and divider. His page reports and stops at "Okay"; this one
       captures, so the numbered list is a field and the footer says Done.
       ══════════════════════════════════════════════════════════════════════ -->
  <section class="screen screen--feedback" id="scrFb" data-pos="right" aria-label="Customer feedback">
    <header class="appbar">
      <div class="appbar__row fb__row">
        <div class="leading-action">
          <button class="icon-btn" id="fbBack" type="button" aria-label="Back to the token">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.454 12l4.073 4.073a.749.749 0 01-.53 1.28.723.723 0 01-.535-.216l-4.49-4.49a.9.9 0 010-1.294l4.49-4.49a.72.72 0 01.523-.217.75.75 0 01.542 1.28L10.454 12z" fill="currentColor"/></svg>
          </button>
        </div>
        <p class="fb__pagetitle t-label-md700">Customer feedback</p>
        <button class="icon-btn fb__more" id="fbMore" type="button" aria-label="More options">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0-6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" fill="currentColor"/></svg>
        </button>
      </div>
    </header>

    <main class="fbbody" id="fbbody">
      <h2 class="t-heading-sm">Customer recorded feedback</h2>
      <!-- Three states, rendered by _flow.js: a mic to start, pause/stop while
           recording, then the clip with its summary. -->
      <div id="recCustomer"></div>

      <div class="fbdivider"></div>

      <h2 class="t-heading-sm">Report your feedback</h2>
      <!-- Type it or record it. Once recorded it behaves exactly like the
           customer's: same component, same three states, same summary. -->
      <div class="fb__field" id="fbField">
        <label class="fb__grow" for="fbInput">
          <input class="fb__input" id="fbInput" type="text" placeholder="Enter feedback.."
                 enterkeyhint="done" inputmode="text" autocomplete="off">
        </label>
        <button class="fb__mic" id="fbMic" type="button"
                aria-label="Record your feedback"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 0 0-7 0v5.5A3.5 3.5 0 0 0 12 15Zm6-3.5a6 6 0 0 1-5 5.916V21h-2v-3.584A6 6 0 0 1 6 11.5h2a4 4 0 0 0 8 0h2Z" fill="currentColor"/></svg></button>
      </div>
      <div id="recCaptain"></div>
    </main>

    <div class="ffooter is-shown">
      <button class="btn-primary t-label-md700" id="fbDone" type="button"><span>Done</span></button>
    </div>
  </section>

  <!-- ══ A step's own page ═════════════════════════════════════════════════
       The checklist row is status only. Everything that happened — the
       recording, the faults the mechanic marked, what was done and when — is
       here, one page per step, on the same shell as the feedback page.
       ══════════════════════════════════════════════════════════════════════ -->
  <section class="screen screen--feedback" id="scrStep" data-pos="right" aria-label="Step details">
    <header class="appbar">
      <div class="appbar__row fb__row">
        <div class="leading-action">
          <button class="icon-btn" id="stepBack" type="button" aria-label="Back to the token">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.454 12l4.073 4.073a.749.749 0 01-.53 1.28.723.723 0 01-.535-.216l-4.49-4.49a.9.9 0 010-1.294l4.49-4.49a.72.72 0 01.523-.217.75.75 0 01.542 1.28L10.454 12z" fill="currentColor"/></svg>
          </button>
        </div>
        <p class="fb__pagetitle t-label-md700" id="stepTitle">Step</p>
      </div>
    </header>
    <main class="fbbody" id="stepBody"></main>
    <!-- The step's own action. Finishing it opens the next step, so the captain
         is walked forward instead of being returned to the list to find it. -->
    <div class="ffooter" id="stepFooter"></div>
  </section>
</div>
<script>
/* The queue, in its own closure. It exposes window.TokenQueue and nothing else. */
(function () {
__LIST_JS__
})();
</script>
<script>
__JS__
</script>
</body>
</html>
"""

def build(with_queue=False, out_dir='.', list_dir='.'):
    """Compose prototype.html.

    with_queue=False is the screen on its own — no queue, nothing to go back to.
    That is the form other profiles take: the mechanic's and QC's flows will wrap
    this same screen in their own list, so it must not depend on the captain's.

    with_queue=True composes the captain's queue alongside it, from the _list.*
    files stitch.py generates.
    """
    out_dir = pathlib.Path(out_dir)
    list_dir = pathlib.Path(list_dir)
    page = (HEAD.replace('__CSS__', (HERE / '_job.css').read_text())
                .replace('__JS__', (HERE / '_flow.js').read_text()))

    if with_queue:
        page = (page.replace('__LIST_CSS__',  (list_dir / '_list.css').read_text())
                    .replace('__LIST_HTML__', (list_dir / '_list.html').read_text())
                    .replace('__LIST_JS__',   (list_dir / '_list.js').read_text()))
    else:
        # Drop the queue's three slots and the closure that would have held it,
        # then hand the details screen the entry position the queue was using.
        page = re.sub(r'\n?/\* ═+\n   The token queue.*?═+ \*/\n__LIST_CSS__\n', '\n',
                      page, flags=re.S)
        page = re.sub(r'\n?  <!-- ══ The token queue.*?__LIST_HTML__\n  </section>\n', '\n',
                      page, flags=re.S)
        page = re.sub(r'<script>\n/\* The queue, in its own closure.*?__LIST_JS__\n\}\)\(\);\n</script>\n',
                      '', page, flags=re.S)
        page = page.replace('<section class="screen screen--job" id="scrJob" data-pos="right"',
                            '<section class="screen screen--job" id="scrJob" data-pos="in"')

    for slot in ('__LIST_CSS__', '__LIST_HTML__', '__LIST_JS__', '__CSS__', '__JS__'):
        if slot in page:
            raise SystemExit(f'unfilled slot left in the build: {slot}')

    target = out_dir / 'prototype.html'
    target.write_text(page)
    left = [r for r in re.findall(r'(?:src|href)="([^"]+)"', page)
            if not r.startswith(('data:', '#'))]
    kind = 'with the queue' if with_queue else 'on its own'
    print(f'built {target} {kind}, {round(len(page) / 1024)} KB; '
          f'external refs: {left or "none"}')
    return page


if __name__ == '__main__':
    build(with_queue=False)
