"""
Regenerate index.html — the landing page GitHub Pages serves at the repo root.

One card per prototype, with the blurb read from that folder's own README, so
the index cannot drift from what each folder says about itself. Run it after
adding a folder:  python3 build-index.py
"""
import pathlib, re, html

# The index lists the main flow only. bike-assessment is where the work landed:
# every one of the standalone prototypes below either fed a screen into it or was
# superseded by it, so a landing page offering fifteen doors sent readers to
# earlier drafts of the thing they were meant to see.
FOLDERS = ['bike-assessment']

# SET ASIDE, not deleted. Every folder is still in the repo and still reachable at
# its own URL — only the landing page stopped pointing at them. Restoring any is a
# matter of moving its name up into FOLDERS.
#
# Most belong to other people, which is why nothing here was removed: the call to
# retire someone else's prototype is theirs, not this repo's landing page's.
#   Vaishnavi     mechanic-checks, qc-task-list, wynn-xp
#   Barun Sethi   assessment-flow, token-details, token-flow-captain
#   Mridul Goyal  add-issues, quality-associate-flow
#   shared        RnM-home-page, token-task-list, mechanic-rnm-flow, stitched-flow
#   Sagar         mark-faults
SET_ASIDE = ['token-flow-captain', 'token-details', 'token-task-list', 'stitched-flow',
             'RnM-home-page', 'wynn-xp', 'assessment-flow',
             'mark-faults', 'mechanic-checks', 'mechanic-rnm-flow', 'add-issues',
             'qc-task-list', 'quality-associate-flow']


def blurb(folder):
    f = pathlib.Path(folder) / 'README.md'
    if not f.exists():
        return ''
    out = []
    for ln in f.read_text().splitlines()[1:]:
        if ln.startswith('#'):
            continue
        if not ln.strip():
            if out:
                break
            continue
        out.append(ln.strip())
    text = ' '.join(out)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'[*`_]', '', text)
    return (text[:150].rsplit(' ', 1)[0] + '\u2026') if len(text) > 150 else text


def cards():
    for d in FOLDERS:
        p = pathlib.Path(d)
        if (p / 'prototype.html').exists():
            yield d, f'{d}/prototype.html', blurb(d)
            continue
        for sub in sorted(q.parent.name for q in p.glob('*/prototype.html')):
            yield f'{d} / {sub}', f'{d}/{sub}/prototype.html', ''


rows = '\n'.join(
    f'''    <li>
      <a href="{href}">
        <span class="n">{html.escape(name)}</span>
        <span class="d">{html.escape(desc)}</span>
      </a>
    </li>''' for name, href, desc in cards())

tpl = pathlib.Path('index.template.html').read_text()
pathlib.Path('index.html').write_text(tpl.replace('__ROWS__', rows))
print('index.html rebuilt')
