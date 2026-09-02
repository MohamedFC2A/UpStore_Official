import json
import os
import sys

# Import functions from smart_telegram_promoter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smart_telegram_promoter import (
    load_blacklist,
    add_to_blacklist,
    is_blacklisted,
    INITIAL_TARGET_GROUPS,
    BLACKLIST_FILE
)

def test_blacklist_system():
    print("════════════════════════════════════════════════════════════")
    print("🧪 RUNNING EMPIRICAL TEST ON BLACKLIST SYSTEM")
    print("════════════════════════════════════════════════════════════\n")

    # 1. Test loading blacklist from disk
    blacklist = load_blacklist()
    print(f"✅ Step 1: Blacklist loaded successfully from disk.")
    print(f"   Total currently blacklisted groups: {len(blacklist)}")
    assert len(blacklist) >= 13, f"Expected at least 13 blacklisted groups, got {len(blacklist)}"

    # Verify that the auto-caught group 'areejdi' is in the blacklist
    assert "areejdi" in blacklist, "Expected 'areejdi' to be present in blacklist"
    print(f"   🔍 Verified auto-quarantined group: @areejdi -> Reason: '{blacklist['areejdi']['reason']}'")

    # 2. Test filtering INITIAL_TARGET_GROUPS
    active_pool = [t for t in INITIAL_TARGET_GROUPS if not is_blacklisted(t["username"], blacklist)]
    print(f"\n✅ Step 2: Live Target Filtering Check:")
    print(f"   Initial target definitions: {len(INITIAL_TARGET_GROUPS)}")
    print(f"   Active targets after blacklist filtering: {len(active_pool)}")
    
    # Ensure no blacklisted group exists in active_pool
    for target in active_pool:
        assert target["username"] not in blacklist, f"Error: Blacklisted group {target['username']} was not filtered!"
    print(f"   🛡️ 100% of blacklisted groups are strictly excluded from active targeting.")

    # 3. Test dynamic adding to blacklist
    test_dummy = "test_dummy_spam_group_99"
    add_to_blacklist(test_dummy, "Test automated quarantine", "Dummy Group")
    
    # Reload from disk to verify file persistence
    reloaded_blacklist = load_blacklist()
    assert test_dummy in reloaded_blacklist, "Error: Dynamic blacklist entry failed to persist to JSON"
    print(f"\n✅ Step 3: Dynamic Quarantine Test Passed: Successfully written and persisted to {BLACKLIST_FILE}")

    # Clean up test dummy
    with open(BLACKLIST_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    if test_dummy in data["blacklisted_groups"]:
        del data["blacklisted_groups"][test_dummy]
        data["total_blacklisted"] = len(data["blacklisted_groups"])
        with open(BLACKLIST_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"   🧹 Test cleanup completed.\n")

    print("════════════════════════════════════════════════════════════")
    print("🎉 ALL BLACKLIST VERIFICATION TESTS PASSED (100% OPERATIONAL)")
    print("════════════════════════════════════════════════════════════\n")

if __name__ == "__main__":
    test_blacklist_system()
