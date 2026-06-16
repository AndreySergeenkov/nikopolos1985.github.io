"""
Fetch donor counts per project per epoch from Octant V1 API,
compute QF impact analysis (donor count vs leverage).
v1: covers QF epochs 4-11 plus 1-3 for baseline comparison.
"""

import requests
import csv
import time
import statistics
from collections import defaultdict

BASE = "https://backend.mainnet.octant.app"

# Load master CSV
with open("octant_projects_master_v2.csv", "r", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

# Filter to projects that received funding (epochs 1-11, exclude Epoch 0 curated)
target_rows = [r for r in rows
               if int(r["epoch"]) >= 1
               and (float(r["allocated_eth"]) > 0 or float(r["matched_eth"]) > 0)]

print(f"Fetching donor counts for {len(target_rows)} project-epoch combinations...")
print()

results = []
errors = 0
for i, r in enumerate(target_rows):
    addr = r["project_address"]
    epoch = int(r["epoch"])
    url = f"{BASE}/allocations/project/{addr}/epoch/{epoch}"

    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            unique_donors = len(set(d["address"].lower() for d in data))
            total_from_donors = sum(int(d["amount"]) for d in data) / (10**18)
            allocated_eth = float(r["allocated_eth"])
            matched_eth = float(r["matched_eth"])
            leverage = matched_eth / allocated_eth if allocated_eth > 0 else 0
            avg_donation = allocated_eth / unique_donors if unique_donors > 0 else 0

            results.append({
                "epoch": epoch,
                "project_name": r["project_name"],
                "project_address": addr,
                "n_donors": unique_donors,
                "allocated_eth": round(allocated_eth, 6),
                "matched_eth": round(matched_eth, 6),
                "total_eth": round(allocated_eth + matched_eth, 6),
                "leverage": round(leverage, 3),
                "avg_donation_eth": round(avg_donation, 6),
            })
        else:
            errors += 1
            if errors <= 5:
                print(f"  Error {resp.status_code} for {r['project_name'][:30]} epoch {epoch}")
    except Exception as e:
        errors += 1
        if errors <= 5:
            print(f"  Exception for {r['project_name'][:30]} epoch {epoch}: {e}")

    if (i + 1) % 30 == 0:
        print(f"  Progress: {i + 1}/{len(target_rows)}")
    time.sleep(0.25)

print(f"\nFetched {len(results)} rows ({errors} errors)")
print()

# Save raw data
with open("octant_donor_counts_v1.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "epoch", "project_name", "project_address",
        "n_donors", "allocated_eth", "matched_eth", "total_eth",
        "leverage", "avg_donation_eth"
    ])
    writer.writeheader()
    writer.writerows(results)
print(f"Saved raw data to octant_donor_counts_v1.csv\n")


# ===== ANALYSIS =====

print("=" * 95)
print("PER-EPOCH STATS: donors and leverage")
print("=" * 95)
print(f"\n  {'Epoch':>5} {'N':>3} {'AvgDonors':>10} {'MedDonors':>10} {'AvgLeverage':>12} {'MedLeverage':>12}")
print("  " + "-" * 65)

by_epoch = defaultdict(list)
for r in results:
    by_epoch[r["epoch"]].append(r)

for epoch in sorted(by_epoch.keys()):
    rs = by_epoch[epoch]
    donors = [r["n_donors"] for r in rs]
    leverages = [r["leverage"] for r in rs if r["leverage"] > 0]
    if donors and leverages:
        print(f"  {epoch:>5} {len(rs):>3} {statistics.mean(donors):>10.1f} {statistics.median(donors):>10.0f} {statistics.mean(leverages):>12.2f} {statistics.median(leverages):>12.2f}")


# ===== BUCKET ANALYSIS for QF epochs (4-11) =====
print("\n\n" + "=" * 95)
print("LEVERAGE BY DONOR COUNT BUCKET (QF epochs 4-11 only)")
print("=" * 95)

qf_results = [r for r in results if r["epoch"] >= 4 and r["leverage"] > 0]
buckets = [(1, 20), (21, 50), (51, 100), (101, 200), (201, 9999)]
print(f"\n  {'Bucket':<15} {'N proj':>8} {'AvgDonors':>10} {'AvgAlloc':>10} {'AvgMatch':>10} {'AvgLeverage':>12}")
print("  " + "-" * 75)
for low, high in buckets:
    bucket_rs = [r for r in qf_results if low <= r["n_donors"] <= high]
    if bucket_rs:
        avg_donors = statistics.mean(r["n_donors"] for r in bucket_rs)
        avg_alloc = statistics.mean(r["allocated_eth"] for r in bucket_rs)
        avg_match = statistics.mean(r["matched_eth"] for r in bucket_rs)
        avg_lev = statistics.mean(r["leverage"] for r in bucket_rs)
        label = f"{low}-{high}" if high < 9999 else f"{low}+"
        print(f"  {label:<15} {len(bucket_rs):>8} {avg_donors:>10.1f} {avg_alloc:>10.3f} {avg_match:>10.3f} {avg_lev:>12.2f}")


# ===== CORRELATION =====
print("\n\n" + "=" * 95)
print("CORRELATION: donor count vs leverage (per epoch, QF era only)")
print("=" * 95)

def correlation(xs, ys):
    n = len(xs)
    if n < 3:
        return None
    mx, my = sum(xs)/n, sum(ys)/n
    num = sum((x-mx)*(y-my) for x, y in zip(xs, ys))
    denx = sum((x-mx)**2 for x in xs)**0.5
    deny = sum((y-my)**2 for y in ys)**0.5
    if denx == 0 or deny == 0:
        return None
    return num / (denx * deny)


print(f"\n  {'Epoch':>5} {'N':>3} {'Correlation(donors, leverage)':<35}")
print("  " + "-" * 50)
for epoch in sorted(by_epoch.keys()):
    if epoch < 4:
        continue
    rs = [r for r in by_epoch[epoch] if r["leverage"] > 0]
    if len(rs) < 3:
        continue
    donors = [r["n_donors"] for r in rs]
    leverages = [r["leverage"] for r in rs]
    c = correlation(donors, leverages)
    if c is not None:
        print(f"  {epoch:>5} {len(rs):>3} {c:>+.3f}")


# ===== TOP/BOTTOM examples for ARTICLE =====
print("\n\n" + "=" * 95)
print("EXAMPLES: high-donor vs low-donor projects within same epoch (QF era)")
print("=" * 95)

# Find pairs in same epoch with similar allocated but different donor counts
for epoch in sorted(by_epoch.keys()):
    if epoch < 4:
        continue
    rs = sorted([r for r in by_epoch[epoch] if r["leverage"] > 0], key=lambda r: r["allocated_eth"])
    if len(rs) < 4:
        continue
    print(f"\n  Epoch {epoch}:")
    print(f"    {'Project':<35} {'Donors':>7} {'Alloc':>8} {'Match':>8} {'Lev':>7} {'AvgDon':>9}")
    # Top 2 by donors, bottom 2 by donors
    sorted_by_donors = sorted(rs, key=lambda r: -r["n_donors"])
    print(f"    -- Highest donor counts --")
    for r in sorted_by_donors[:2]:
        print(f"    {r['project_name'][:35]:<35} {r['n_donors']:>7} {r['allocated_eth']:>8.3f} {r['matched_eth']:>8.3f} {r['leverage']:>7.1f} {r['avg_donation_eth']:>9.4f}")
    print(f"    -- Lowest donor counts --")
    for r in sorted_by_donors[-2:]:
        print(f"    {r['project_name'][:35]:<35} {r['n_donors']:>7} {r['allocated_eth']:>8.3f} {r['matched_eth']:>8.3f} {r['leverage']:>7.1f} {r['avg_donation_eth']:>9.4f}")


# ===== SAME-ALLOCATED COMPARISON =====
print("\n\n" + "=" * 95)
print("SAME-ALLOCATED COMPARISON: pairs with similar total donations, different donor counts")
print("=" * 95)
print("\n  Looking for project pairs in same epoch where:")
print("  - allocated_eth values are within 20% of each other")
print("  - donor counts differ by 3x or more")
print()

found_pairs = []
for epoch in sorted(by_epoch.keys()):
    if epoch < 4:
        continue
    rs = [r for r in by_epoch[epoch] if r["leverage"] > 0]
    for i, a in enumerate(rs):
        for b in rs[i+1:]:
            if a["allocated_eth"] < 0.01 or b["allocated_eth"] < 0.01:
                continue
            ratio = max(a["allocated_eth"], b["allocated_eth"]) / min(a["allocated_eth"], b["allocated_eth"])
            donor_ratio = max(a["n_donors"], b["n_donors"]) / max(min(a["n_donors"], b["n_donors"]), 1)
            if ratio <= 1.2 and donor_ratio >= 3:
                found_pairs.append((epoch, a, b, donor_ratio))

# Show top 5 most dramatic pairs
found_pairs.sort(key=lambda p: -p[3])
print(f"  Found {len(found_pairs)} matching pairs. Showing top 8 by donor count ratio:\n")
for epoch, a, b, dratio in found_pairs[:8]:
    p_high = a if a["n_donors"] > b["n_donors"] else b
    p_low = a if a["n_donors"] <= b["n_donors"] else b
    match_ratio = p_high["matched_eth"] / p_low["matched_eth"] if p_low["matched_eth"] > 0 else float("inf")
    print(f"  Epoch {epoch}:")
    print(f"    {p_high['project_name'][:40]:<40} {p_high['n_donors']:>4} donors, {p_high['allocated_eth']:.3f} ETH alloc → {p_high['matched_eth']:.2f} ETH match (lev {p_high['leverage']:.1f}x)")
    print(f"    {p_low['project_name'][:40]:<40} {p_low['n_donors']:>4} donors, {p_low['allocated_eth']:.3f} ETH alloc → {p_low['matched_eth']:.2f} ETH match (lev {p_low['leverage']:.1f}x)")
    print(f"    Same alloc within 20%, {dratio:.1f}x more donors → {match_ratio:.1f}x more match\n")

print("\nDone.")
