import json
import os
import sys

# Import functions from smart_telegram_promoter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smart_telegram_promoter import (
    load_blacklist,
    load_vip_database,
    save_vip_database,
    record_vip_success,
    is_vip_target,
    is_blacklisted,
    load_target_groups,
    get_copywriting_for_target,
    VIP_GROUPS_FILE,
    BLACKLIST_FILE
)

def test_vip_and_blacklist_system():
    print("════════════════════════════════════════════════════════════")
    print("🧪 EMPIRICAL VERIFICATION: VIP REGISTRY & INSTANT BLACKLIST SKIP")
    print("════════════════════════════════════════════════════════════\n")

    # 1. Test Blacklist Loading and Instant Filtration
    blacklist = load_blacklist()
    print(f"✅ Step 1: Blacklist Verification:")
    print(f"   Total Quarantined Groups in Blacklist: {len(blacklist)}")
    assert len(blacklist) >= 80, f"Expected at least 80 blacklisted groups, found {len(blacklist)}"
    
    # Check that known blacklisted groups return True instantly
    assert is_blacklisted("gemini12pro", blacklist) == True
    assert is_blacklisted("areejdi", blacklist) == True
    assert is_blacklisted("designerssoftwear", blacklist) == True
    print("   🛡️ Instant Blacklist Check: PASS (Zero-delay detection confirmed).")

    # 2. Test Target Pool Pre-Execution Clean Filtration
    active_targets = load_target_groups()
    print(f"\n✅ Step 2: Pre-Execution Target Pool Cleaning:")
    print(f"   Clean Active Targets Loaded: {len(active_targets)}")
    for t in active_targets:
        assert not is_blacklisted(t["username"], blacklist), f"Error: Blacklisted group {t['username']} was not filtered!"
    print("   🛡️ 100% of Blacklisted Groups are completely removed before cycle start.")

    # 3. Test VIP Golden Registry & Engagement Scoring
    test_vip_group = {
        "username": "test_fresh_vip_group_999",
        "title": "VIP Test Community",
        "lang": "ar"
    }

    # Record delivery 1
    tier1, score1 = record_vip_success(test_vip_group)
    assert score1 == 15.0
    assert tier1 == "⭐ SILVER_ACTIVE"
    print(f"\n✅ Step 3: VIP Recording Round 1: Tier={tier1}, Score={score1}")

    # Record delivery 2 (upgrades to Gold)
    tier2, score2 = record_vip_success(test_vip_group)
    assert score2 == 30.0
    assert tier2 == "🥇 GOLD_VIP"
    print(f"   ⭐ VIP Upgrading Round 2: Tier={tier2}, Score={score2}")

    # Record deliveries to reach Elite VIP
    for _ in range(3):
        tier_elite, score_elite = record_vip_success(test_vip_group)
    assert score_elite == 75.0
    assert tier_elite == "💎 ELITE_VIP"
    print(f"   💎 VIP Elite Promotion: Tier={tier_elite}, Score={score_elite}")

    # Check persistence to JSON file
    vip_db_reloaded = load_vip_database()
    assert "test_fresh_vip_group_999" in vip_db_reloaded
    assert vip_db_reloaded["test_fresh_vip_group_999"]["vip_tier"] == "💎 ELITE_VIP"
    print("   💾 VIP JSON Database Persistence: PASS.")

    # 4. Test VIP Specialized Copywriting Delivery
    vip_copy = get_copywriting_for_target(test_vip_group, is_vip=True)
    std_copy = get_copywriting_for_target(test_vip_group, is_vip=False)
    assert len(vip_copy) > 50
    assert "ref_8495121463" in vip_copy
    print("\n✅ Step 4: VIP Customized Copywriting Check: PASS (Direct ref link verified).")

    # Clean up test entry from VIP database
    if "test_fresh_vip_group_999" in vip_db_reloaded:
        del vip_db_reloaded["test_fresh_vip_group_999"]
        save_vip_database(vip_db_reloaded)
    print("   🧹 Test cleanup completed.\n")

    print("════════════════════════════════════════════════════════════")
    print("🎉 ALL VIP INTELLIGENCE & BLACKLIST TESTS PASSED (100% OPERATIONAL)")
    print("════════════════════════════════════════════════════════════\n")

if __name__ == "__main__":
    test_vip_and_blacklist_system()
