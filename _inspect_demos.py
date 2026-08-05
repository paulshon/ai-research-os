# -*- coding: utf-8 -*-
import json
from pathlib import Path
p = Path(r"C:\Users\saran\OneDrive\Desktop\2026-6-24\AI-Research-OS_RDOS\AI-Research-OS_RDOS_-s23\AI-Research-OS_RDOS_-s23\apps\web\lib\basic-stats\basic-stats-demos.generated.json")
d = json.loads(p.read_text(encoding="utf-8"))
print("modules", list(d.keys()))
for mid in d:
    demos = d[mid]
    print(f"\n{mid} ({len(demos)})")
    for demo in demos[:2]:
        lines = demo["csv"].strip().splitlines()
        print(f"  {demo['title']}: header={lines[0]}")
