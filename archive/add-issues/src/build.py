#!/usr/bin/env python3
import base64
import os

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(script_dir)

# Read template
template_path = os.path.join(script_dir, 'template.html')
with open(template_path, 'r') as f:
    template = f.read()

# Read and encode tyre image
tyre_path = os.path.join(script_dir, 'assets', 'tyre.png')
with open(tyre_path, 'rb') as f:
    tyre_data = f.read()
    tyre_b64 = base64.b64encode(tyre_data).decode('ascii')
    tyre_uri = f'data:image/png;base64,{tyre_b64}'

# Replace placeholder
output = template.replace('__IMG_TYRE__', tyre_uri)

# Write to prototype.html
output_path = os.path.join(project_dir, 'prototype.html')
with open(output_path, 'w') as f:
    f.write(output)

print(f'✓ Built prototype.html ({len(output) / 1024:.1f}KB)')
