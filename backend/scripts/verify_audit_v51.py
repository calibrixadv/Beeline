import json
import os
import re

# 1. Audit JSON
with open('backend/models/master_tournament_v1_v51.json') as f:
    d = json.load(f)
assert len(d['models']) == 51, f"Expected 51 models, got {len(d['models'])}"
assert len(d['category_winners']) >= 19, f"Category winners count: {len(d['category_winners'])}"
for k, m in d['models'].items():
    assert 'how_it_works_mechanically' in m, f"Missing how_it_works_mechanically in {k}"
    assert 'implementation_audit_check' in m, f"Missing implementation_audit_check in {k}"
    assert 'ablation_verdict' in m, f"Missing ablation_verdict in {k}"
    assert 'cv_metrics' in m, f"Missing cv_metrics in {k}"
    assert 'test_2026_metrics' in m, f"Missing test_2026_metrics in {k}"
    assert 'top_features' in m, f"Missing top_features in {k}"
print("JSON verification PASSED: all 51 models verified with full structure.")

# 2. Audit Markdown
with open('backend/models/MASTER_TOURNAMENT_V1_TO_V51.md') as f:
    md = f.read()

# Check all 51 model headings in Section 3
for v in range(1, 52):
    pattern = rf"### 3\.{v} Approach V{v}:"
    match = re.search(pattern, md)
    assert match is not None, f"Missing heading for 3.{v} Approach V{v}:"
print("Markdown verification PASSED: all 51 model sub-sections present.")

# Check tables
assert '| Rank | Model Architecture | Regressor MAE (min) |' in md
assert '| Rank | Model Architecture | 2026 Test MAE (min) |' in md
assert '| Category Metric | All-Time Winner (#1) |' in md
assert '## 5. Principal ML Auditor Conclusions & Tiered Production Deployment Matrix' in md

# Check count of rows in Table 1
t1_part = md[md.find('### 2.1 Table 1'):md.find('### 2.2 Table 2')]
t1_rows = [line for line in t1_part.split('\n') if line.startswith('| #') or line.startswith('| **#')]
assert len(t1_rows) == 51, f"Table 1 rows: {len(t1_rows)}, expected 51"
print(f"Table 1 rows verified: {len(t1_rows)}")

# Check count of rows in Table 2
t2_part = md[md.find('### 2.2 Table 2'):md.find('### 2.3 Table 3')]
t2_rows = [line for line in t2_part.split('\n') if line.startswith('| #') or line.startswith('| **#')]
assert len(t2_rows) == 51, f"Table 2 rows: {len(t2_rows)}, expected 51"
print(f"Table 2 rows verified: {len(t2_rows)}")

# Check count of rows in Table 4.7 Waterfall
t4_part = md[md.find('### 4.7 Unified Quantitative Ablation Waterfall'):md.find('## 5. Principal ML Auditor Conclusions')]
t4_rows = [line for line in t4_part.split('\n') if line.startswith('| `v')]
assert len(t4_rows) == 51, f"Table 4.7 rows: {len(t4_rows)}, expected 51"
print(f"Table 4.7 Waterfall rows verified: {len(t4_rows)}")

print("ALL AUDIT CHECKS PASSED PERFECTLY!")
