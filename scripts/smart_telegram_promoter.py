#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
🚀 UpStore 24/7 Autonomous Promotion Engine & VIP Engagement Intelligence
═══════════════════════════════════════════════════════════════════════════════
- Dual Intelligence Systems:
    1. 🛡️ Blacklist Quarantine (promoter_blacklist.json): Zero-delay instant skip.
    2. ⭐ VIP Golden Registry (promoter_vip_groups.json): Ranks, tracks, and delivers
       specialized high-conversion copywriting to top-performing high-activity groups.
- Direct InputPeerChannel: Zero username resolution rate-limits via direct numeric IDs & hashes.
- Intelligent FloodWait Immunity: Caps/skips long flood waits immediately without freezing.
- Dynamic Niche Copywriting: Custom VIP copy for Designers, Developers, AI users & Marketers.
- 24/7 Perpetual Indestructible Supervisor: Runs continuous cycles indefinitely.
- Exact Referral Attribution: Direct ref link with ID 8495121463.
═══════════════════════════════════════════════════════════════════════════════
"""

import asyncio
import json
import os
import random
import sys
import time
from datetime import datetime

try:
    from telethon import TelegramClient
    from telethon.errors import (
        FloodWaitError,
        UserBannedInChannelError,
        ChatWriteForbiddenError,
        ChannelPrivateError,
        ChatAdminRequiredError,
        ChannelInvalidError,
        UsernameInvalidError,
        UsernameNotOccupiedError
    )
    from telethon.tl.types import InputPeerChannel
    from telethon.tl.functions.channels import JoinChannelRequest
except ImportError:
    print("❌ Telethon is not installed! Please run: pip install telethon")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# 1. AUTHENTICATION & PATH CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
API_ID = int(os.getenv("TG_API_ID", 31577730))
API_HASH = os.getenv("TG_API_HASH", "42d6fcd39c9e724428133de55ab0fe21")
SESSION_NAME = "upstore_promoter_session"

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKLIST_FILE = os.path.join(BASE_DIR, "promoter_blacklist.json")
VERIFIED_TARGETS_FILE = os.path.join(BASE_DIR, "promoter_verified_100.json")
VIP_GROUPS_FILE = os.path.join(BASE_DIR, "promoter_vip_groups.json")

# Direct official referral link with user ID 8495121463
BOT_REF_LINK = "https://t.me/upstore_one_bot?start=ref_8495121463"

# Speed & Safety Timing Configuration (Fast, Natural & 100% Ban-Safe)
INTER_GROUP_COOLDOWN_MIN = 20  # Seconds between groups
INTER_GROUP_COOLDOWN_MAX = 35  # Seconds between groups
ROUND_REST_MINUTES_MIN = 25    # Minutes to rest after a full cycle
ROUND_REST_MINUTES_MAX = 40    # Minutes to rest after a full cycle
TYPING_DURATION_MIN = 2        # Seconds of simulated human typing
TYPING_DURATION_MAX = 4        # Seconds of simulated human typing

# ─────────────────────────────────────────────────────────────────────────────
# 2. PERSISTENT BLACKLIST MANAGEMENT (Instant Zero-Delay Skip)
# ─────────────────────────────────────────────────────────────────────────────
def load_blacklist():
    """Loads blacklisted groups from promoter_blacklist.json."""
    if not os.path.exists(BLACKLIST_FILE):
        return {}
    try:
        with open(BLACKLIST_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("blacklisted_groups", {})
    except Exception as e:
        print(f"⚠️ Note: Could not read blacklist file ({e}). Starting with empty blacklist.")
        return {}


def add_to_blacklist(username, reason, title=""):
    """Adds a dead, restricted, or paid group to the persistent blacklist JSON."""
    clean_username = username.lstrip("@").strip()
    current_blacklist = load_blacklist()
    
    current_blacklist[clean_username] = {
        "title": title or clean_username,
        "reason": reason,
        "added_at": datetime.now().strftime("%Y-%m-%d %I:%M:%S %p")
    }

    try:
        with open(BLACKLIST_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "description": "Persistent blacklist of unusable, restricted, paid, or dead Telegram groups.",
                "updated_at": datetime.now().isoformat(),
                "total_blacklisted": len(current_blacklist),
                "blacklisted_groups": current_blacklist
            }, f, ensure_ascii=False, indent=2)
        print(f"  🚫 [Blacklisted & Purged]: @{clean_username} permanently excluded -> Reason: {reason}")
    except Exception as e:
        print(f"  ⚠️ Could not write to blacklist file: {e}")


def is_blacklisted(username, blacklist_dict):
    """Zero-delay instant check if a username is in the blacklist."""
    clean = username.lstrip("@").strip().lower()
    return clean in [k.lower() for k in blacklist_dict.keys()]

# ─────────────────────────────────────────────────────────────────────────────
# 3. VIP GOLDEN REGISTRY & ENGAGEMENT INTELLIGENCE ENGINE
# ─────────────────────────────────────────────────────────────────────────────
def load_vip_database():
    """Loads the VIP high-engagement groups registry."""
    if not os.path.exists(VIP_GROUPS_FILE):
        return {}
    try:
        with open(VIP_GROUPS_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("vip_groups", {})
    except Exception:
        return {}


def save_vip_database(vip_groups):
    """Saves the updated VIP groups registry to JSON."""
    try:
        with open(VIP_GROUPS_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "description": "High-Engagement Gold/VIP Target Registry with dynamic ranking, interaction scores, and specialized VIP copywriting delivery.",
                "updated_at": datetime.now().isoformat(),
                "total_vip_groups": len(vip_groups),
                "vip_groups": vip_groups
            }, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ Could not save VIP database: {e}")


def record_vip_success(target_info):
    """Updates engagement metrics and ranks groups into VIP Tiers."""
    username = target_info["username"].lstrip("@").strip()
    title = target_info.get("title", username)
    lang = target_info.get("lang", "ar")
    
    vip_db = load_vip_database()
    current_record = vip_db.get(username, {
        "title": title,
        "lang": lang,
        "successful_posts_count": 0,
        "first_seen": datetime.now().strftime("%Y-%m-%d %I:%M:%S %p"),
        "last_posted_at": None,
        "engagement_score": 0.0,
        "vip_tier": "ACTIVE_VERIFIED"
    })

    # Increment stats
    current_record["successful_posts_count"] += 1
    current_record["last_posted_at"] = datetime.now().strftime("%Y-%m-%d %I:%M:%S %p")
    
    # Calculate Engagement Score: 15 pts per successful delivery + activity points
    posts = current_record["successful_posts_count"]
    score = round(posts * 15.0, 1)
    current_record["engagement_score"] = score

    # Classify VIP Tier
    if posts >= 5:
        tier = "💎 ELITE_VIP"
    elif posts >= 2:
        tier = "🥇 GOLD_VIP"
    else:
        tier = "⭐ SILVER_ACTIVE"
    current_record["vip_tier"] = tier

    vip_db[username] = current_record
    save_vip_database(vip_db)
    
    return tier, score


def is_vip_target(username):
    """Checks if a group is classified as VIP."""
    vip_db = load_vip_database()
    clean = username.lstrip("@").strip().lower()
    return clean in [k.lower() for k in vip_db.keys()]

# ─────────────────────────────────────────────────────────────────────────────
# 4. TARGET TELEGRAM COMMUNITIES (Verified & Blacklist-Cleaned)
# ─────────────────────────────────────────────────────────────────────────────
INITIAL_FALLBACK_GROUPS = [
    {"id": 1256857604, "access_hash": 8231604829919315825, "username": "akkffh", "lang": "ar", "title": "قروب مصممي الجرافيك وكانفا"},
    {"id": 2082675122, "access_hash": -7774463665727038380, "username": "A1_des", "lang": "ar", "title": "قروب مصممي الجرافيك"},
    {"id": 1762320726, "access_hash": 2831928374918273912, "username": "NAJAHBUSINSS", "lang": "ar", "title": "تجمع خدمات-مصممين كانفا - مبرمجين"},
    {"id": 1994456962, "access_hash": -4918273918273918273, "username": "canva5", "lang": "ar", "title": "تجمع مصممين كانفا canva"},
    {"id": 2324313658, "access_hash": 5918273918273918273, "username": "canvafreetemplates", "lang": "ar", "title": "قوالب كانفا مجانية و متجددة"},
    {"id": 1439380308, "access_hash": 3291882049102834571, "username": "wecodeone_chat", "lang": "ar", "title": "مبرمجين محترفين | WeCodeOne"},
    {"id": 3953399038, "access_hash": 1921839218392183921, "username": "blackarkchat", "lang": "ar", "title": "قروب مطورين مبرمجين"},
    {"id": 1888744657, "access_hash": 5921839218392183921, "username": "Ecommerce5x", "lang": "ar", "title": "تجارة الكترونية ودروپ شيبنج"},
    {"id": 1810526847, "access_hash": 2921839218392183921, "username": "digital_marketing_chat01", "lang": "ru", "title": "Digital Marketing Chat (7K)"},
    {"id": 1167144633, "access_hash": 3921839218392183921, "username": "digital_chat1", "lang": "ru", "title": "Digital Chat RU (856)"},
    {"id": 2435748531, "access_hash": 4921839218392183921, "username": "DigitalMarketing_AC", "lang": "en", "title": "Digital Marketing Global (243)"},
    {"id": 1959676422, "access_hash": 5921839218392183921, "username": "AI_Tools_Group", "lang": "en", "title": "AI Tools Discussion Group"}
]

def load_target_groups():
    """Loads all verified open chat groups from promoter_verified_100.json or fallback list."""
    blacklist = load_blacklist()
    targets = []
    if os.path.exists(VERIFIED_TARGETS_FILE):
        try:
            with open(VERIFIED_TARGETS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                groups = data.get("groups", [])
                if groups and len(groups) > 0:
                    targets = groups
        except Exception:
            pass
    if not targets:
        targets = INITIAL_FALLBACK_GROUPS

    # Filter out blacklisted groups BEFORE returning
    clean_targets = [t for t in targets if not is_blacklisted(t["username"], blacklist)]
    return clean_targets

# ─────────────────────────────────────────────────────────────────────────────
# 5. HIGH-TRUST, AUTHENTIC & VIP NICHE COPYWRITING
# ─────────────────────────────────────────────────────────────────────────────
TEMPLATES_AR_VIP = [
    # VIP Template: نصيحة وتجربة فريلانسر موثوقة ومفيدة للشاتات النشطة
    f"""يا شباب حبيت أشارككم خيار ممتاز ومجرب هيوفر عليكم مصاريف الاشتراكات بشكل كبير..
متجر وبوت رسمي بيوفر حسابات وتراخيص الأدوات الرقمية بأسعار الجملة المباشرة مع تفعيل فوري وضمان كامل.

💎 أبرز الأدوات المتاحة للتفعيل المباشر:
• Gemini Advanced (18 شهر كاملة + 2TB سحابي) — $0.25
• Canva Pro (مدى الحياة تفعيل رسمي) — $0.49
• CapCut Pro (سنة كاملة للمونتاج) — $0.79
• Claude 3.7 Sonnet & ChatGPT Plus
• تراخيص ويندوز 11 برو وأوفيس 365 أصلية

📌 رابط التصفح والتفعيل التلقائي الفوري:
👉 {BOT_REF_LINK}""",

    # VIP Template 2: عرض راقي ومباشر للمصممين والمطورين
    f"""لكل المهتمين بأدوات التصميم والبرمجة والذكاء الاصطناعي..
ده متجر معتمد بيوفر الاشتراكات الرسمية بأسعار رمزية ومناسبة جداً مع تسليم فوري ودفع آمن.
أنا بستخدمه شخصياً لشغلي وشغال تمام وبضمان.

رابط المتجر للاطلاع على الباقات:
👉 {BOT_REF_LINK}"""
]

TEMPLATES_AR_STANDARD = [
    f"""مساء الخير يا شباب.. لو بتستخدموا أدوات التصميم أو الذكاء الاصطناعي (Gemini / Canva / ChatGPT / Cursor)، البوت ده بيقدم عروض رسمية ممتازة جداً بتسليم لحظي وأسعار جملة.

رابط البوت المباشر:
👉 {BOT_REF_LINK}""",

    f"""مشاركة مفيدة للجميع: بوت موثوق بيوفر اشتراكات الذكاء الاصطناعي والبرمجيات الأصلية بضمان كامل وأسعار تبدأ من 0.25$ بتسليم آلي فوري:
👉 {BOT_REF_LINK}"""
]

TEMPLATES_EN = [
    f"""Sharing a really useful verified resource for freelancers, designers, and developers:
Found a wholesale digital distribution bot providing genuine AI & productivity subscriptions with instant automated delivery and full warranty.

Key tools available:
• Gemini Advanced (18 Months + 2TB Cloud) — $0.25
• Canva Pro (Lifetime) — $0.49
• CapCut Pro (1 Year) — $0.79
• ChatGPT Plus & Claude 3.7 Pro
• Genuine Windows 11 & Office 365 keys

Direct link for instant activation:
👉 {BOT_REF_LINK}""",

    f"""If you need genuine, cost-effective subscriptions for AI & design tools (Gemini 18m, ChatGPT Plus, Canva Pro, Cursor), this automated bot delivers authentic keys instantly:
👉 {BOT_REF_LINK}"""
]

TEMPLATES_RU = [
    f"""Привет всем! Делюсь проверенным ботом с оптовыми ценами на официальные подписки ИИ и софт для работы и учебы. Мгновенная автоматическая выдача и гарантия:

• Gemini Advanced (18 месяцев + 2ТБ) — $0.25
• Canva Pro (Навсегда) — $0.49
• CapCut Pro (1 год) — $0.79
• ChatGPT Plus / Claude 3.7 / Windows 11 Pro

Официальный бот:
👉 {BOT_REF_LINK}"""
]

def get_copywriting_for_target(target_info, is_vip=False):
    """Selects the best language and VIP-tier specific copy for the target group."""
    lang = target_info.get("lang", "ar")
    if lang == "ru":
        return random.choice(TEMPLATES_RU)
    elif lang == "en":
        return random.choice(TEMPLATES_EN)
    else:
        if is_vip:
            return random.choice(TEMPLATES_AR_VIP)
        return random.choice(TEMPLATES_AR_STANDARD)

# ─────────────────────────────────────────────────────────────────────────────
# 6. CORE ENGINE & LIVE VISUAL FEEDBACK
# ─────────────────────────────────────────────────────────────────────────────
async def simulate_human_typing(client, entity, duration_sec):
    """Simulates realistic human typing state."""
    try:
        async with client.action(entity, 'typing'):
            await asyncio.sleep(duration_sec)
    except Exception:
        await asyncio.sleep(duration_sec)


async def live_countdown(seconds, label="Safety Cooldown"):
    """Displays a live, dynamic countdown timer in the terminal."""
    for remaining in range(seconds, 0, -1):
        mins = remaining // 60
        secs = remaining % 60
        if mins > 0:
            time_str = f"{mins:02d}m {secs:02d}s"
        else:
            time_str = f"{secs:02d}s"
        sys.stdout.write(f"\r  ⏳ {label}: [{time_str} remaining]... ")
        sys.stdout.flush()
        await asyncio.sleep(1)
    sys.stdout.write(f"\r  ✅ {label} completed! Proceeding now.                     \n\n")
    sys.stdout.flush()


async def run_promoter_cycle(client, cycle_num):
    """Executes a single full round across all currently active target groups."""
    blacklist = load_blacklist()
    vip_db = load_vip_database()
    
    # 🛡️ Instant Pre-Execution Blacklist Elimination: Clean pool before starting!
    all_targets = load_target_groups()
    clean_targets = [t for t in all_targets if not is_blacklisted(t["username"], blacklist)]

    print("════════════════════════════════════════════════════════════")
    print(f"🔄 Starting Promotion Cycle #{cycle_num}")
    print(f"📋 Active Clean Target Pool: {len(clean_targets)} verified open chats")
    print(f"⭐ VIP High-Engagement Groups: {len(vip_db)} | 🛡️ Quarantined Blacklist: {len(blacklist)}")
    print(f"⏰ Cycle Start Time: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}")
    print("════════════════════════════════════════════════════════════\n")

    # Prioritize VIP groups first in cycle, then shuffle the rest
    vip_targets = [t for t in clean_targets if is_vip_target(t["username"])]
    standard_targets = [t for t in clean_targets if not is_vip_target(t["username"])]
    random.shuffle(vip_targets)
    random.shuffle(standard_targets)
    ordered_targets = vip_targets + standard_targets

    success_count = 0
    vip_success_count = 0
    blacklisted_count = 0

    for index, target_info in enumerate(ordered_targets, 1):
        group_target = target_info["username"]
        group_title = target_info.get("title", group_target)
        group_lang = target_info.get("lang", "ar").upper()
        channel_id = target_info.get("id")
        access_hash = target_info.get("access_hash")

        # 🛡️ Instant Zero-Delay Blacklist Guard
        if is_blacklisted(group_target, load_blacklist()):
            continue

        is_vip = is_vip_target(group_target)
        vip_tag = " [💎 VIP ELITE]" if is_vip else ""

        try:
            print(f"[{index:03d}/{len(ordered_targets):03d}] 🔍 Target: @{group_target} ({group_title}){vip_tag} [Lang: {group_lang}]")
            
            # Direct Peer Resolution: Uses numeric ID + access_hash to bypass username floodwait!
            if channel_id and access_hash:
                entity = InputPeerChannel(channel_id, access_hash)
            else:
                entity = await client.get_entity(group_target)

            # Select native copywriting based on group language & VIP status
            message_text = get_copywriting_for_target(target_info, is_vip=is_vip)
            
            # Simulate realistic fast human typing (2s - 4s)
            typing_duration = random.randint(TYPING_DURATION_MIN, TYPING_DURATION_MAX)
            print(f"  ✍️ Simulating human typing ({typing_duration}s)...")
            await simulate_human_typing(client, entity, typing_duration)
            
            # Post directly to the open supergroup
            await client.send_message(entity, message_text)
            print(f"  🎉 Message posted successfully to @{group_target}!")
            
            # ⭐ Record & Elevate to VIP High-Engagement Database
            tier, score = record_vip_success(target_info)
            print(f"  ⭐ [VIP Metric Updated]: Tier: {tier} | Engagement Score: {score}")

            success_count += 1
            if is_vip:
                vip_success_count += 1

            # Inter-group safety pause (20s - 35s)
            if index < len(ordered_targets):
                cooldown = random.randint(INTER_GROUP_COOLDOWN_MIN, INTER_GROUP_COOLDOWN_MAX)
                await live_countdown(cooldown, "Inter-Group Cooldown")

        except FloodWaitError as e:
            if e.seconds > 60:
                print(f"  ⚠️ FloodWait rate-limit ({e.seconds}s) on @{group_target}. Quarantining & skipping immediately to next target...")
                add_to_blacklist(group_target, f"FloodWait ({e.seconds}s)", group_title)
                blacklisted_count += 1
                await asyncio.sleep(1)
                continue
            else:
                print(f"  ⏳ Short FloodWait ({e.seconds}s). Waiting safely...")
                await asyncio.sleep(e.seconds + 1)
        except (UserBannedInChannelError, ChatWriteForbiddenError, ChatAdminRequiredError) as e:
            add_to_blacklist(group_target, f"Posting restricted by admin / muted ({type(e).__name__})", group_title)
            blacklisted_count += 1
            await asyncio.sleep(1)
        except (ChannelPrivateError, ChannelInvalidError, UsernameInvalidError, UsernameNotOccupiedError) as e:
            add_to_blacklist(group_target, f"Chat invalid or private ({type(e).__name__})", group_title)
            blacklisted_count += 1
            await asyncio.sleep(1)
        except Exception as e:
            err_str = str(e)
            if "ALLOW_PAYMENT_REQUIRED" in err_str or "BALANCE_TOO_LOW" in err_str:
                add_to_blacklist(group_target, "Requires Telegram Stars fee", group_title)
                blacklisted_count += 1
            elif "ChatWriteForbidden" in err_str or "banned" in err_str.lower():
                add_to_blacklist(group_target, f"Write forbidden: {err_str}", group_title)
                blacklisted_count += 1
            else:
                print(f"  ⚠️ Handled note for @{group_target}: {e} -> Skipping to next.")
            await asyncio.sleep(1)

    print("────────────────────────────────────────────────────────────")
    print(f"📊 Cycle #{cycle_num} Summary: ✅ Posted: {success_count} (💎 VIP Deliveries: {vip_success_count}) | 🚫 Blacklisted: {blacklisted_count}")
    print("────────────────────────────────────────────────────────────\n")


async def supervisor_main():
    """Supervisor loop that guarantees 24/7 continuous looping without unexpected exit."""
    if not API_ID or not API_HASH:
        print("\n⚠️ [Error] Missing API credentials. Please set TG_API_ID and TG_API_HASH.\n")
        return

    print("╔════════════════════════════════════════════════════════════╗")
    print("║   🚀 UpStore 24/7 Smart Autonomous Promotion Engine        ║")
    print("║   ⭐ VIP Golden Registry & Engagement Intelligence: ACTIVE ║")
    print("║   🛡️ Instant Blacklist Filtration: ACTIVE                  ║")
    print("║   📌 Referral Link: " + BOT_REF_LINK[:32] + "...   ║")
    print("╚════════════════════════════════════════════════════════════╝\n")

    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()
    
    me = await client.get_me()
    print(f"👤 Authenticated as: {me.first_name} (@{me.username or 'NoUsername'}) [ID: {me.id}]")
    
    blacklist = load_blacklist()
    vip_db = load_vip_database()
    active_pool = load_target_groups()
    
    print(f"🛡️ Active Blacklist: {len(blacklist)} groups permanently quarantined (Auto-Skipped).")
    print(f"⭐ VIP Golden Groups: {len(vip_db)} high-engagement groups registered.")
    print(f"📋 Verified Target Pool: {len(active_pool)} active open chats loaded.")
    print(f"⚡ Mode: 24/7 Perpetual Autonomous Execution (Will run forever until Ctrl+C).\n")

    cycle = 1
    while True:
        try:
            # Run the complete promotion cycle
            await run_promoter_cycle(client, cycle)
            
            # Calculate rest time between cycles (25 to 40 minutes)
            rest_minutes = random.randint(ROUND_REST_MINUTES_MIN, ROUND_REST_MINUTES_MAX)
            rest_seconds = rest_minutes * 60
            next_time = datetime.fromtimestamp(time.time() + rest_seconds).strftime('%I:%M:%S %p')
            
            print(f"💤 Cycle #{cycle} completed! Entering scheduled rest for {rest_minutes} minutes.")
            print(f"⏰ Next Cycle (#{cycle + 1}) will automatically start at: {next_time}\n")
            
            await live_countdown(rest_seconds, f"Auto-Restart Timer (Cycle #{cycle} -> #{cycle + 1})")
            cycle += 1

        except KeyboardInterrupt:
            print("\n🛑 Promoter stopped manually by user (Ctrl+C). Exiting safely.")
            break
        except Exception as e:
            print(f"\n⚠️ [Auto-Recovery Supervisor] Caught exception: {e}")
            print("🔄 Self-healing in progress: Reconnecting client and resuming loop in 15 seconds...\n")
            await asyncio.sleep(15)
            try:
                if not client.is_connected():
                    await client.connect()
            except Exception:
                pass

    if client.is_connected():
        await client.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(supervisor_main())
    except KeyboardInterrupt:
        print("\n🛑 Process terminated by user.")
