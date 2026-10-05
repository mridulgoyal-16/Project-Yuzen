"""
Build the captain's flow: the token details screen, with the captain's queue in
front of it.

Neither screen lives here. Both are lifted from their own folders at build time,
so this folder can never drift from them:

    ../token-details      the token screen, and its sources
    ../token-task-list    the queue

`stitch.py` prepares the queue (prefix, scope, inline) into _list.*; this then
asks the details screen's own builder to compose the two together.

    python3 stitch.py && python3 build.py

The details screen is deliberately buildable on its own — that is how the
mechanic's and QC's flows will take it, each wrapping it in their own list. It
never depends on the captain's queue; the queue attaches to it.
"""
import importlib.util, pathlib, sys

DETAILS = pathlib.Path(__file__).parent / '..' / 'token-details' / 'assemble.py'
if not DETAILS.exists():
    sys.exit(f'cannot find the token screen at {DETAILS.resolve()} — '
             'this folder builds from its siblings, not from copies')

spec = importlib.util.spec_from_file_location('token_details_build', DETAILS)
details = importlib.util.module_from_spec(spec)
spec.loader.exec_module(details)          # defines build(), writes nothing on import

details.build(with_queue=True, out_dir=pathlib.Path(__file__).parent,
              list_dir=pathlib.Path(__file__).parent)
