"""
Lift the token queue out of token-task-list/prototype.html so it can live in the
same file as the token details.

The two screens were written independently and share 57 class names — appbar,
body, header, chip, is-active, phone. Merged raw, each would restyle the other.
Sagar hit this porting the issues screen into stitched-flow and his stylesheet
says how he settled it: "prefixing keeps her declarations off this app's
elements, scoping keeps this app's off hers." So this does both.

  * every class in the queue's CSS and markup gains a `tl-` prefix
  * every id gains a `tl` prefix, because ids collide too (tabs, body, toast)
  * every rule is then scoped under #scrList

Writes _list.css, _list.html and _list.js for assemble.py to compose. Re-run it
whenever the queue changes upstream:  python3 stitch.py
"""
import pathlib, re

# Sibling folder in the repo; the scratchpad clone keeps it one level deeper.
SRC = next(p for p in (pathlib.Path('../token-task-list/prototype.html'),
                       pathlib.Path('../repo/token-task-list/prototype.html'))
           if p.exists())
src = SRC.read_text()

css  = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
js   = re.search(r'<script>(.*?)</script>', src, re.S).group(1)
body = src[src.index('<body') : src.index('<script>')]
body = body[body.index('>') + 1 :]

# ── the names to rewrite ──────────────────────────────────────────────────────
# Collected from both sides so a class used only in markup is not missed.
# Plain match, so compound selectors are covered: in `.tab.is-active` the second
# class is preceded by a word character, and a lookbehind guarding against file
# extensions skipped it — which left `is-active` unrenamed and a querySelector
# matching nothing. Extensions are excluded by name instead.
classes = set(re.findall(r'\.([A-Za-z][\w-]*)', css))
classes -= {'svg', 'png', 'jpg', 'jpeg', 'mp4', 'webp', 'woff', 'woff2', 'otf'}
for attr in re.findall(r'class="([^"]*)"', body):
    classes.update(attr.split())
# Keyframe names are not classes; neither are the type-scale tokens we do not own.
classes -= {'phone'}
ids = set(re.findall(r'id="([\w-]+)"', src))

def rename_class(m):
    name = m.group(1)
    return '.' + ('tl-' + name if name in classes else name)

# ── CSS: rename, then scope ──────────────────────────────────────────────────
css = re.sub(r'\.([A-Za-z][\w-]*)', rename_class, css)
for i in sorted(ids, key=len, reverse=True):
    css = re.sub(rf'#{re.escape(i)}\b', f'#tl{i[0].upper()}{i[1:]}', css)

def scope_block(block: str) -> str:
    """Prefix every selector in a declaration block list with #scrList."""
    out, i = [], 0
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', block):
        sel, decls = m.group(1), m.group(2)
        out.append(block[i:m.start()])
        i = m.end()
        head = sel.strip()
        # A rule's "selector" as matched here can carry the comment above it.
        # Prefixing that produced `#scrList /* ... */ .chips`, which parses but
        # reads as nonsense, and a comma inside a comment split the selector list
        # and injected #scrList mid-sentence. Hold the comments aside.
        lead = ''
        while True:
            m2 = re.match(r'\s*/\*.*?\*/\s*', head, re.S)
            if not m2: break
            lead += m2.group(0)
            head = head[m2.end():]
        if not head.strip():
            out.append(m.group(0))
            continue
        # At-rules and host-level selectors are left alone: keyframes and
        # font-faces have no selectors to scope, and html/body/:root belong to
        # the document, not to this screen.
        if head.startswith('@') or head in ('html', 'body', ':root', 'html,body', '*'):
            out.append(m.group(0))
            continue
        scoped = ','.join(
            f'#scrList {p.strip()}' if not p.strip().startswith('#scrList') else p.strip()
            for p in head.split(','))
        out.append(f'{lead}{scoped}{{{decls}}}')
    out.append(block[i:])
    return ''.join(out)

# Scope the top level, then each @media body, without touching @keyframes.
def walk(text: str) -> str:
    res, pos = [], 0
    for m in re.finditer(r'@(media|supports)[^{]*\{', text):
        res.append(walk_top(text[pos:m.start()]))
        depth, k = 1, m.end()
        while depth:
            if text[k] == '{': depth += 1
            elif text[k] == '}': depth -= 1
            k += 1
        res.append(m.group(0) + scope_block(text[m.end():k-1]) + '}')
        pos = k
    res.append(walk_top(text[pos:]))
    return ''.join(res)

def walk_top(text: str) -> str:
    res, pos = [], 0
    for m in re.finditer(r'@(keyframes|font-face|property)[^{]*\{', text):
        res.append(scope_block(text[pos:m.start()]))
        depth, k = 1, m.end()
        while depth:
            if text[k] == '{': depth += 1
            elif text[k] == '}': depth -= 1
            k += 1
        res.append(text[m.start():k])
        pos = k
    res.append(scope_block(text[pos:]))
    return ''.join(res)

css = walk(css)

# ── host-level rules are dropped, not scoped ─────────────────────────────────
# The queue was a whole document, so it carries a `* { margin:0; padding:0 }`
# reset and its own body layout. Kept, they would restyle the details screen
# sitting beside it. Its :root tokens move onto the screen itself — the values
# are the same design system, but they should not be able to redefine the host's.
# The reset is scoped, not dropped. Deleting it took box-sizing with it, and the
# queue's chips are written as `height:48px; padding:14px 16px` — content-box made
# them 78px tall, so they overflowed their row and the first one was clipped.
_reset = re.search(r'(?m)^\s*\*\s*\{([^}]*)\}', css)
_reset_decls = _reset.group(1).strip() if _reset else ''
css = re.sub(r'(?m)^\s*\*\s*\{[^}]*\}\s*', '', css)
if _reset_decls:
    css = f'#scrList, #scrList * {{ {_reset_decls} }}\n' + css
css = re.sub(r'(?m)^\s*(html\s*,\s*body|body|html)\s*\{[^}]*\}\s*', '', css)
css = css.replace(':root {', '#scrList {', 1)
# .phone belongs to the host frame; the queue is a screen inside it now.
css = re.sub(r'(?m)^\s*\.phone\s*\{[^}]*\}\s*', '', css)
css = re.sub(r'#scrList \.phone\b', '#scrList', css)

# ── assets inline, so the file stays self-contained ──────────────────────────
import base64
ASSETS = SRC.parent / 'assets'
def inline(m):
    name = m.group(2)
    f = ASSETS / pathlib.Path(name).name
    if not f.exists():
        raise SystemExit(f'missing asset: {f}')
    b64 = base64.b64encode(f.read_bytes()).decode()
    return f'{m.group(1)}data:image/svg+xml;base64,{b64}'
for pat in (r'(src=")(assets/[^"]+)', r'(url\()(assets/[^)]+)'):
    css  = re.sub(pat, inline, css)


# ── markup and script: the same renames ──────────────────────────────────────
def rename_attr(m):
    names = [('tl-' + n if n in classes else n) for n in m.group(1).split()]
    return 'class="' + ' '.join(names) + '"'

for text_name in ('body', 'js'):
    pass

body = re.sub(r'class="([^"]*)"', rename_attr, body)
# Unwrap the queue's own phone frame: the host supplies one.
m = re.search(r'<div class="phone">(.*)</div>\s*$', body, re.S)
if m: body = m.group(1)
js   = re.sub(r"(['\"`])([A-Za-z][\w-]*)\1",
              lambda m: m.group(0), js)          # untouched: handled below

for i in sorted(ids, key=len, reverse=True):
    new = f'tl{i[0].upper()}{i[1:]}'
    body = re.sub(rf'id="{re.escape(i)}"', f'id="{new}"', body)
    # id="..." inside template markup. Renaming only the selectors and not these
    # left #tlBtnSkip pointing at an element still called btnSkip, so Skip for now
    # silently did nothing. An id attribute is never ambiguous, so it is safe to
    # rewrite wherever it appears.
    js = re.sub(rf'id="{re.escape(i)}"', f'id="{new}"', js)
    # Elsewhere, only where an id is actually used. Matching any quoted "chips"
    # also hit the class attribute inside a template literal — class="chips"
    # became class="tlChips", so the chip row lost every rule that styled it.
    js = re.sub(rf"(getElementById\(\s*)(['\"]){re.escape(i)}\2",
                lambda m, n=new: m.group(1) + m.group(2) + n + m.group(2), js)
    js = re.sub(rf"(['\"])#{re.escape(i)}\1",
                lambda m, n=new: m.group(1) + '#' + n + m.group(1), js)

# ── class names in the JS ────────────────────────────────────────────────────
# Only three forms are rewritten, each matched on its own syntax:
#
#   class="a b"                     markup inside template literals
#   classList.add('name')           and remove / toggle / contains
#   querySelector('.name')          and querySelectorAll / closest / matches
#   className = 'name'              and setAttribute('class', 'name')
#
# Nothing else. Two more general approaches were tried and both broke the file:
# matching `.name` anywhere renamed property access (S.chip became S.tl-chip),
# and scanning for string literals to confine the rewrite desynchronised on
# nested template literals inside ${} holes — a `}` in a nested template's text
# ended the hole early and everything after was treated as text. Parsing
# JavaScript with a regex is not worth doing when three narrow rules cover every
# real use.
def _swap_words(text: str) -> str:
    for n in sorted(classes, key=len, reverse=True):
        text = re.sub(rf'(?<![\w-]){re.escape(n)}(?![\w-])', 'tl-' + n, text)
    return text

def swap_classes(value: str) -> str:
    """Rename class names inside a class attribute value.

    The value can carry template syntax:

        class="badge-pie${pct >= 100 ? ' is-complete' : ''}"

    Outside the ${} holes everything is a class name. Inside them everything is
    code except the quoted strings, which are class names. Both halves need
    different treatment: splitting the value on whitespace matched neither and
    left the Ongoing ring unstyled, while renaming words throughout reached into
    the hole and turned S.chip into S.tl-chip.
    """
    out, i, n = [], 0, len(value)
    while i < n:
        h = value.find('${', i)
        if h < 0:
            out.append(_swap_words(value[i:])); break
        out.append(_swap_words(value[i:h]))
        depth, k = 1, h + 2
        while k < n and depth:
            if value[k] == '{': depth += 1
            elif value[k] == '}': depth -= 1
            k += 1
        hole = value[h+2:k-1]
        hole = re.sub(r"(['\"])([^'\"]*)\1",
                      lambda m: m.group(1) + _swap_words(m.group(2)) + m.group(1), hole)
        out.append('${' + hole + '}')
        i = k
    return ''.join(out)

def swap_selector(sel: str) -> str:
    return re.sub(r'\.([A-Za-z][\w-]*)',
                  lambda m: '.tl-' + m.group(1) if m.group(1) in classes else m.group(0), sel)

js = re.sub(r'class="([^"]*)"', lambda m: f'class="{swap_classes(m.group(1))}"', js)
js = re.sub(r"(classList\.(?:add|remove|toggle|contains)\(\s*)(['\"])([^'\"]+)\2",
            lambda m: m.group(1) + m.group(2) + swap_classes(m.group(3)) + m.group(2), js)
js = re.sub(r"((?:querySelectorAll|querySelector|closest|matches)\(\s*)(['\"])([^'\"]+)\2",
            lambda m: m.group(1) + m.group(2) + swap_selector(m.group(3)) + m.group(2), js)
js = re.sub(r"(className\s*(?:\+?=)\s*)(['\"])([^'\"]*)\2",
            lambda m: m.group(1) + m.group(2) + swap_classes(m.group(3)) + m.group(2), js)
js = re.sub(r"(setAttribute\(\s*(['\"])class\2\s*,\s*)(['\"])([^'\"]*)\3",
            lambda m: m.group(1) + m.group(3) + swap_classes(m.group(4)) + m.group(3), js)

for pat in (r'(src=")(assets/[^"]+)', r'(url\()(assets/[^)]+)'):
    body = re.sub(pat, inline, body)
    js   = re.sub(pat, inline, js)

# ── the queue keeps its own hook object, and gains a bridge ──────────────────
# Both screens declared window.Yuzen. The queue's becomes a local, so the two
# cannot overwrite each other, and the bridge is the only thing they share.
js = js.replace('window.Yuzen = {', 'const LIST_HOOKS = {', 1)
# Call user: show the calling screen if the host has one. Guarded, so the queue
# still runs on its own.
assert 'window.Yuzen.onCallUser' in js, 'call site moved'
js = js.replace("""      window.Yuzen.onCallUser({ token: a.token, name: a.name });""",
"""      window.Yuzen.onCallUser({ token: a.token, name: a.name });
      if (window.YuzenCall) window.YuzenCall.open(a.name, a.plate);""")
js = js.replace("""    return S.chip === 'All' ? q : q.filter(t => t.type === S.chip);""",
"""    const byType = S.chip === 'All' ? q : q.filter(t => t.type === S.chip);
    if (!S.q) return byType;
    /* Token number, name and plate — the three things a captain has in hand. */
    return byType.filter(t => (t.token + ' ' + t.name + ' ' + t.plate)
                                .toLowerCase().includes(S.q));""")
js = js.replace("const S = { tab: 'pending', chip: 'All', nav: 'tasks' };",
                "const S = { tab: 'pending', chip: 'All', nav: 'tasks', q: '' };")
# The active card sits outside the queue, so filtering the queue left it on screen
# regardless — a search for one name still showed somebody else's token first.
js = js.replace("""      ${d.active ? activeCardHTML(d.active) : ''}""",
"""      ${d.active && matchesSearch(d.active) ? activeCardHTML(d.active) : ''}""")
js = js.replace("""  function visibleQueue() {""",
"""  function matchesSearch(t) {
    if (!S.q) return true;
    return (t.token + ' ' + t.name + ' ' + t.plate).toLowerCase().includes(S.q);
  }

  function visibleQueue() {""")
js = js.replace("""    return byType.filter(t => (t.token + ' ' + t.name + ' ' + t.plate)
                                .toLowerCase().includes(S.q));""",
"""    return byType.filter(matchesSearch);""")
js = js.replace('window.Yuzen.', 'LIST_HOOKS.')

# The stages have to match the details screen exactly or the same bike reports
# two different states depending on which screen you are looking at.
js = js.replace("""  const REPAIR_STAGES = [
    { label: 'In queue',      pct: 10 },
    { label: 'Assessment',    pct: 30 },
    { label: 'Under repair',  pct: 55 },
    { label: 'Quality check', pct: 80 },
    { label: 'Ready',         pct: 100 },
  ];""",
"""  const REPAIR_STAGES = [
    { label: 'In queue',      pct: 10 },
    { label: 'Assessment',    pct: 25 },
    { label: 'Faults marked', pct: 40 },
    { label: 'Under repair',  pct: 60 },
    { label: 'Quality check', pct: 85 },
    { label: 'Ready',         pct: 100 },
  ];""")

# ── a working search ─────────────────────────────────────────────────────────
# The magnifier had no handler at all, so it looked live and did nothing. Rather
# than a separate results screen, it filters the list already on screen: the
# captain is looking for one token among forty, not browsing.
js = js.replace("""      <div class="tl-appbar">
        <h1 class="tl-appbar-title">My tasks</h1>""",
"""      <div class="tl-appbar">
        <h1 class="tl-appbar-title">My tasks</h1>""")

js += """
  /* ══ Search ══════════════════════════════════════════════════════════════
     The magnifier used to be decoration. It filters what is already on screen
     rather than opening a results page — the captain is hunting one token in
     forty, and a second screen would only add a step and lose the tabs. ══ */
  const searchBtn = document.querySelector('#scrList .tl-btn-icon[aria-label="Search"]');
  const appbar    = document.querySelector('#scrList .tl-appbar');
  if (searchBtn && appbar) {
    const box = document.createElement('input');
    box.type = 'search';
    box.className = 'tl-search';
    box.placeholder = 'Token, name or number';
    box.setAttribute('aria-label', 'Search tokens');
    box.hidden = true;
    appbar.insertBefore(box, searchBtn);

    searchBtn.addEventListener('click', () => {
      const opening = box.hidden;
      box.hidden = !opening;
      appbar.classList.toggle('tl-is-searching', opening);
      if (opening) box.focus();
      else { box.value = ''; S.q = ''; render(); }
    });
    box.addEventListener('input', () => { S.q = box.value.trim().toLowerCase(); render(); });
  }
"""

js += """
  /* ══ Bridge to the token details screen ═════════════════════════════════
     The queue owns the data; the details screen reports back into it. Kept to
     three calls so the two screens stay separable. ══ */

  /* A repair the captain has to act on does not belong in Ongoing. Ongoing means
     "someone else has it"; the moment the bike is Ready the next move is his, so
     the card returns to Pending where he is actually looking. Without this the
     finished bikes sit in a tab he has no reason to open. */
  /* renderTabs() appends its buttons and was only ever called once, at startup —
     calling it again to refresh the count stacked a second strip beside the
     first. The count is the only thing that changes, so paint just that. */
  function paintOngoingCount() {
    const n = DATA.ongoing.queue.length;
    const tab = TABS.find(x => x.id === 'ongoing');
    if (tab) tab.count = n;
    const btn = elTabs.querySelector('.tl-tab[data-tab="ongoing"]');
    if (btn) btn.textContent = n ? `Ongoing (${n})` : 'Ongoing';
    moveUnderline();
  }

  function reclaimFinished() {
    /* Keyed on the stage, not on the token's percentage. A bike at Ready is only
       three quarters of the way through its token — the handover is still to come
       — so a percentage test never fired. What matters is whose move it is. */
    const waiting = t => t.stage === 'Ready' || t.pct >= 100;
    const ready = DATA.ongoing.queue.filter(waiting);
    if (!ready.length) return 0;
    DATA.ongoing.queue = DATA.ongoing.queue.filter(t => !waiting(t));
    ready.forEach(t => {
      t.waiting = 'Ready to collect';       // why it is back in the list
      if (!DATA.pending.queue.some(x => x.token === t.token)) DATA.pending.queue.unshift(t);
    });
    return ready.length;
  }

  const STAGES_INDEX = Object.fromEntries(REPAIR_STAGES.map((s, i) => [s.label, i]));

  window.TokenQueue = {
    onOpen: null,                       // the details screen sets this

    /* Called on every step or stage change inside a token. */
    progress(p) {
      const inOngoing = DATA.ongoing.queue.find(t => t.token === p.token);
      const target = inOngoing
        || DATA.pending.queue.find(t => t.token === p.token)
        || (DATA.pending.active && DATA.pending.active.token === p.token ? DATA.pending.active : null);
      if (!target) return;
      target.pct = p.percent;
      if (p.stage) target.stage = p.stage;
      target.state = { done: p.done, stage: p.stage
        ? STAGES_INDEX[p.stage] : undefined };
      /* Once the captain has handed it over there is nothing left to do with it. */
      if (p.percent >= 100 && p.done >= p.of) {
        DATA.pending.queue = DATA.pending.queue.filter(t => t !== target);
        DATA.ongoing.queue = DATA.ongoing.queue.filter(t => t !== target);
        if (DATA.pending.active === target) DATA.pending.active = DATA.pending.queue.shift() || null;
        if (!DATA.completed.queue.some(x => x.token === target.token)) {
          DATA.completed.queue.unshift(target);
        }
      } else if (p.stage && p.stage !== 'Ready' && !inOngoing) {
        /* It is with the mechanic now, so that is where it belongs. */
        DATA.pending.queue = DATA.pending.queue.filter(t => t !== target);
        if (DATA.pending.active === target) DATA.pending.active = DATA.pending.queue.shift() || null;
        DATA.ongoing.queue.push(target);
      }
      reclaimFinished();
      paintOngoingCount();
      render();
    },

    /* The queue is the entry point, so it says which token opened. */
    show() { render(); },
  };
  LIST_HOOKS.onTokenOpen = t => {
    /* A token opened from Completed must open completed. The queue is the only
       thing that knows how far each one got, so it says. */
    if (!t.state) {
      t.state = S.tab === 'completed'
        ? { done: 4, stage: 5 }
        : t.stage ? { done: 2 } : {};
    }
    if (window.TokenQueue.onOpen) window.TokenQueue.onOpen(t);
  };

  /* Finished repairs are already waiting when the captain opens the app. */
  if (reclaimFinished()) { paintOngoingCount(); render(); }
"""

pathlib.Path('_list.css').write_text(css)
pathlib.Path('_list.html').write_text(body.strip())
pathlib.Path('_list.js').write_text(js)
print(f'_list.css {len(css)}  _list.html {len(body)}  _list.js {len(js)}')
print(f'renamed {len(classes)} classes, {len(ids)} ids')
