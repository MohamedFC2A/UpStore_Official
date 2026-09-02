#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
🚀 UPSTORE ULTRA-FAST 24/7 AUTONOMOUS VIRAL PROMOTION ENGINE (V3)
═══════════════════════════════════════════════════════════════════════════════
High-Velocity Enterprise Edition:
1. ⚡ Ultra-Fast Continuous Cycling: 8s-14s inter-group cooldown, 2-4m cycle rest.
2. 🧠 Smart Strike-Based Blacklisting: Only blacklists on confirmed fatal restrictions.
3. 🔄 Dynamic AI Copywriting: Diverse high-converting variants for maximum deliverability.
4. 🌐 Continuous Auto-Discovery: Dynamically discovers fresh active groups every round.
5. ⭐ VIP Golden Registry: Automatically elevates and prioritizes top engaging groups.
6. 🛡️ Unbreakable Self-Healing: Runs continuously 24/7/365 without freezing.
7. 🎯 Focused Core Offer:
   - Gemini Advanced (18 Months + 2TB) — $0.25 (ربع دولار)
   - ChatGPT Plus Official Wholesale
   - Ref: https://t.me/upstore_one_bot?start=ref_8495121463
═══════════════════════════════════════════════════════════════════════════════
"""

import asyncio
import ctypes
import functools
import json
import os
import random
import sys
import time
from datetime import datetime

# Enforce real-time unbuffered printing across the entire process
print = functools.partial(print, flush=True)

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
    from telethon.tl.functions.contacts import SearchRequest
except ImportError:
    print("❌ Telethon is not installed! Please run: pip install telethon")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# 1. WINDOWS CONSOLE FREEZE PROTECTION (QuickEdit Mode Disabler)
# ─────────────────────────────────────────────────────────────────────────────
def disable_windows_quickedit():
    """Disables QuickEdit mode in Windows Console to prevent accidental terminal freezing upon mouse click."""
    if os.name == "nt":
        try:
            kernel32 = ctypes.windll.kernel32
            h_stdin = kernel32.GetStdHandle(-10)  # STD_INPUT_HANDLE
            mode = ctypes.c_ulong()
            if kernel32.GetConsoleMode(h_stdin, ctypes.byref(mode)):
                ENABLE_QUICK_EDIT_MODE = 0x0040
                ENABLE_EXTENDED_FLAGS = 0x0080
                new_mode = (mode.value & ~ENABLE_QUICK_EDIT_MODE) | ENABLE_EXTENDED_FLAGS
                kernel32.SetConsoleMode(h_stdin, new_mode)
        except Exception:
            pass

# ─────────────────────────────────────────────────────────────────────────────
# 2. CONFIGURATION & STATE PERSISTENCE
# ─────────────────────────────────────────────────────────────────────────────
API_ID = int(os.getenv("TG_API_ID", 31577730))
API_HASH = os.getenv("TG_API_HASH", "42d6fcd39c9e724428133de55ab0fe21")
SESSION_NAME = "upstore_promoter_session"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKLIST_FILE = os.path.join(BASE_DIR, "promoter_blacklist.json")
VERIFIED_TARGETS_FILE = os.path.join(BASE_DIR, "promoter_verified_100.json")
VIP_GROUPS_FILE = os.path.join(BASE_DIR, "promoter_vip_groups.json")

BOT_REF_LINK = "https://t.me/upstore_one_bot?start=ref_8495121463"

# High-Velocity Timers
INTER_GROUP_COOLDOWN_MIN = 8   # Seconds between groups
INTER_GROUP_COOLDOWN_MAX = 14  # Seconds between groups
ROUND_REST_MINUTES_MIN = 2     # Minutes between full rounds
ROUND_REST_MINUTES_MAX = 4     # Minutes between full rounds
TYPING_DURATION_MIN = 1        # Seconds of simulated typing
TYPING_DURATION_MAX = 2        # Seconds of simulated typing
NETWORK_TIMEOUT_SEC = 10       # Maximum seconds per network RPC call

# In-memory fail strike tracker to avoid premature blacklisting
FAIL_STRIKES = {}

AUTONOMOUS_SEARCH_CLUSTERS = [
    # High School & Baccalaureate 2026/2027
    "ثانوية عامة 2027", "دفعة تالتة ثانوي 2027", "بكالوريا 2027", "توجيهي 2027",
    "مذكرات وملخصات ثانوية", "قروب مذاكرة تالتة ثانوي", "شات طلاب الثانوية",
    # Universities, Engineering & CS
    "كلية هندسة شات", "طلاب حاسبات ومعلومات", "هندسة برمجيات شات", "طلاب الجامعات",
    "ملتقى طلاب الطب", "مشاريع تخرج حاسبات وهندسة", "شات مبرمجين العرب",
    # International & Study AI Groups
    "study with me chat", "university students group", "college homework help ai",
    "exam prep chat", "chatgpt students discussion", "ai tools for students",
    "python ai machine learning chat", "international students chat"
]

# ─────────────────────────────────────────────────────────────────────────────
# 3. SMART BLACKLIST QUARANTINE ENGINE
# ─────────────────────────────────────────────────────────────────────────────
def load_blacklist():
    if not os.path.exists(BLACKLIST_FILE):
        return {}
    try:
        with open(BLACKLIST_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("blacklisted_groups", {})
    except Exception:
        return {}


def add_to_blacklist(username, reason, title=""):
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
        print(f"  🚫 [Blacklisted & Purged]: @{clean_username} -> Reason: {reason}")
    except Exception:
        pass


def is_blacklisted(username, blacklist_dict):
    clean = username.lstrip("@").strip().lower()
    return clean in [k.lower() for k in blacklist_dict.keys()]

# ─────────────────────────────────────────────────────────────────────────────
# 4. VIP GOLDEN REGISTRY ENGINE
# ─────────────────────────────────────────────────────────────────────────────
def load_vip_database():
    if not os.path.exists(VIP_GROUPS_FILE):
        return {}
    try:
        with open(VIP_GROUPS_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("vip_groups", {})
    except Exception:
        return {}


def save_vip_database(vip_groups):
    try:
        with open(VIP_GROUPS_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "description": "High-Engagement Gold/VIP Target Registry with dynamic ranking, interaction scores, and specialized VIP copywriting delivery.",
                "updated_at": datetime.now().isoformat(),
                "total_vip_groups": len(vip_groups),
                "vip_groups": vip_groups
            }, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def record_vip_success(target_info):
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

    current_record["successful_posts_count"] += 1
    current_record["last_posted_at"] = datetime.now().strftime("%Y-%m-%d %I:%M:%S %p")
    
    posts = current_record["successful_posts_count"]
    score = round(posts * 15.0, 1)
    current_record["engagement_score"] = score

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
    vip_db = load_vip_database()
    clean = username.lstrip("@").strip().lower()
    return clean in [k.lower() for k in vip_db.keys()]

# ─────────────────────────────────────────────────────────────────────────────
# 5. TARGET MANAGEMENT & AUTONOMOUS GROUP DISCOVERY ENGINE
# ─────────────────────────────────────────────────────────────────────────────
def load_target_groups():
    blacklist = load_blacklist()
    targets = []
    if os.path.exists(VERIFIED_TARGETS_FILE):
        try:
            with open(VERIFIED_TARGETS_FILE, "r", encoding="utf-8") as f:
                targets = json.load(f).get("groups", [])
        except Exception:
            pass
    clean_targets = [t for t in targets if not is_blacklisted(t["username"], blacklist)]
    return clean_targets


def save_target_groups(groups):
    try:
        with open(VERIFIED_TARGETS_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "generated_at": datetime.now().isoformat(),
                "total_verified": len(groups),
                "groups": groups
            }, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


async def autonomous_discover_new_groups(client, max_discover=10):
    """Autonomously explores and adds verified active supergroups to the target pool."""
    print("🧠 [Autonomous Discovery] Scanning Telegram network for fresh active supergroups...")
    blacklist = load_blacklist()
    current_targets = load_target_groups()
    seen_unames = set(g["username"].lower().lstrip("@").strip() for g in current_targets)
    seen_ids = set(g["id"] for g in current_targets if "id" in g)

    query = random.choice(AUTONOMOUS_SEARCH_CLUSTERS)
    added_count = 0

    try:
        res = await asyncio.wait_for(client(SearchRequest(q=query, limit=30)), timeout=10.0)
        for chat in res.chats:
            if added_count >= max_discover:
                break
            
            username = getattr(chat, 'username', None)
            if not username:
                continue

            clean_uname = username.lstrip("@").strip().lower()
            if clean_uname in [k.lower() for k in blacklist.keys()] or clean_uname in seen_unames or chat.id in seen_ids:
                continue

            title = getattr(chat, 'title', username)

            # Verification 1: Supergroup check
            if not getattr(chat, 'megagroup', False) or getattr(chat, 'broadcast', False):
                continue

            # Verification 2: No Stars
            stars = getattr(chat, 'send_paid_messages_stars', None)
            if stars and stars > 0:
                continue

            # Verification 3: Writable permissions
            banned_rights = getattr(chat, 'default_banned_rights', None)
            if banned_rights:
                if getattr(banned_rights, 'send_messages', False) or getattr(banned_rights, 'send_plain', False):
                    continue

            # Verification 4: Dead Group Killer (Multi-user human activity)
            try:
                msgs = await asyncio.wait_for(client.get_messages(chat, limit=6), timeout=6.0)
                if not msgs or len(msgs) < 2:
                    continue
                senders = set(m.sender_id for m in msgs if m.sender_id)
                if len(senders) < 2:
                    continue
            except Exception:
                continue

            # Language detection
            if any('\u0400' <= c <= '\u04FF' for c in title):
                lang = "ru"
            elif any('\u0600' <= c <= '\u06FF' for c in title):
                lang = "ar"
            else:
                lang = "en"

            new_entry = {
                "id": chat.id,
                "access_hash": getattr(chat, 'access_hash', 0),
                "username": username,
                "title": title,
                "lang": lang,
                "active_senders": len(senders),
                "cluster": query
            }
            current_targets.append(new_entry)
            seen_unames.add(clean_uname)
            seen_ids.add(chat.id)
            added_count += 1
            print(f"  ✨ [New Group Discovered]: @{username} | '{title}' [{lang.upper()}]")

        if added_count > 0:
            save_target_groups(current_targets)
            print(f"🧠 [Discovery Complete] Successfully integrated {added_count} new open chats into active database!\n")
    except Exception as e:
        print(f"⚠️ Note in discovery: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# 6. DYNAMIC & PERSUASIVE COPYWRITING POOL (GEMINI 18M $0.25 & CHATGPT PLUS)
# ─────────────────────────────────────────────────────────────────────────────
TEMPLATES_AR = [
    # Variant 1: تجربة شخصية ومشاركة مفيدة
    f"""يا شباب حبيت أشارككم حل عملي ومجرب هيوفر عليكم مصاريف باهظة في المذاكرة والشغل..
لو محتاج أدوات الذكاء الاصطناعي الرسمية ومش حابب تدفع الأسعار الشهرية العالية، في بوت معتمد بيوفر الاشتراكات بتفعيل رسمي وفوري وبسعر رمزي:

💎 العروض الأساسية المتاحة:
1️⃣ Gemini Advanced (اشتراك 18 شهر كاملة + مساحة سحابية 2TB على حسابك) — بسعر 0.25$ بس (ربع دولار)!
2️⃣ ChatGPT Plus (النسخة المدفوعة الرسمية مع ميزات التحليل وحل المسائل) — بأسعار الجملة المباشرة وتفعيل فوري.

المميز إنه تسليم آلي لحظي بضمان كامل وبدون أي تعقيد.
🔗 رابط البوت المباشر للتفعيل والاستفادة:
👉 {BOT_REF_LINK}""",

    # Variant 2: مخصص للطلاب والمهندسين
    f"""لكل طلاب الثانوية العامة والجامعات والمهندسين اللي بيعتمدوا على الذكاء الاصطناعي في المذاكرة وحل المسائل والأبحاث..
بدل ما تشتري باشتراكات شهرية مكلفة، المتجر ده بيوفرلك:

🔥 Gemini Advanced (18 شهر + 2000GB مساحة Google One) 👈 بـ 0.25$ فقط
🔥 ChatGPT Plus 4o (أحدث نماذج الذكاء الاصطناعي الرسمية) 👈 بأسعار الجملة المباشرة

✨ التفعيل رسمي وفوري وبضمان كامل مع دعم وسائل دفع متعددة.
📌 رابط الدخول والتفعيل:
👉 {BOT_REF_LINK}""",

    # Variant 3: سريع ومباشر
    f"""مساء الخير يا شباب.. للي محتاج حسابات ذكاء اصطناعي رسمية للمذاكرة والشغل:
• اشتراك Gemini Advanced رسمي (18 شهر كاملة مع 2TB) بـ 0.25$ بس
• اشتراك ChatGPT Plus الرسمي بأسعار الجملة المباشرة

تسليم لحظي وتفعيل مضمون 100%:
👉 {BOT_REF_LINK}""",

    # Variant 4: توفير مصاريف المذاكرة
    f"""مشاركة سريعة ومفيدة للجميع 💡
بوت رسمي لتوزيع اشتراكات الذكاء الاصطناعي بتفعيل لحظي وضمان كامل:
⭐ Gemini Advanced مع مساحة 2TB لمدة 18 شهر: فقط 0.25$
⭐ ChatGPT Plus: أسعار الجملة المباشرة

رابط التفعيل الفوري:
👉 {BOT_REF_LINK}"""
]

TEMPLATES_EN = [
    f"""A genuine recommendation for students, researchers, and developers looking for cost-effective AI subscriptions:
Found a trusted wholesale automated distribution bot providing official AI licenses with instant delivery and full warranty:

⭐ Gemini Advanced (Full 18-Month Plan + 2TB Google One Cloud) — Only $0.25
⭐ ChatGPT Plus (Official Access with Advanced Data Analysis & Reasoning) — Direct Wholesale Pricing

Instant automated activation link:
👉 {BOT_REF_LINK}""",

    f"""If you're studying for exams or working on projects and need official AI power:
• Gemini Advanced 18 Months + 2TB Cloud: $0.25
• ChatGPT Plus: Direct Wholesale Price & Instant Setup

Get your official access key instantly:
👉 {BOT_REF_LINK}""",

    f"""Helpful resource for students and developers:
Get official AI subscriptions with instant automated key delivery:
• Gemini Advanced 18M + 2TB: $0.25
• ChatGPT Plus: Direct wholesale prices

Access the bot here:
👉 {BOT_REF_LINK}"""
]

TEMPLATES_RU = [
    f"""Полезная проверенная рекомендация для учебы и работы:
Официальные подписки ИИ по оптовым ценам с моментальной автоматической выдачей и гарантией:

• Gemini Advanced (18 месяцев + 2ТБ облако Google One) — всего $0.25
• ChatGPT Plus (Официальный доступ) — по оптовой цене

Ссылка на бот:
👉 {BOT_REF_LINK}"""
]

def get_copywriting_for_target(target_info, is_vip=False):
    lang = target_info.get("lang", "ar")
    if lang == "ru":
        return random.choice(TEMPLATES_RU)
    elif lang == "en":
        return random.choice(TEMPLATES_EN)
    else:
        return random.choice(TEMPLATES_AR)

# ─────────────────────────────────────────────────────────────────────────────
# 7. EXECUTION ENGINE & LIVE RUNNER
# ─────────────────────────────────────────────────────────────────────────────
async def simulate_human_typing(client, entity, duration_sec):
    try:
        async with client.action(entity, 'typing'):
            await asyncio.sleep(duration_sec)
    except Exception:
        await asyncio.sleep(duration_sec)


async def live_countdown(seconds, label="Safety Cooldown"):
    if not sys.stdout.isatty():
        print(f"  ⏳ {label} ({seconds}s)...")
        await asyncio.sleep(seconds)
        print(f"  ✅ {label} completed. Proceeding.")
        return

    for remaining in range(seconds, 0, -1):
        mins = remaining // 60
        secs = remaining % 60
        time_str = f"{mins:02d}m {secs:02d}s" if mins > 0 else f"{secs:02d}s"
        try:
            sys.stdout.write(f"\r  ⏳ {label}: [{time_str} remaining]... ")
            sys.stdout.flush()
        except Exception:
            pass
        await asyncio.sleep(1)
    try:
        sys.stdout.write(f"\r  ✅ {label} completed! Proceeding now.                     \n\n")
        sys.stdout.flush()
    except Exception:
        pass


async def run_promoter_cycle(client, cycle_num):
    blacklist = load_blacklist()
    vip_db = load_vip_database()
    all_targets = load_target_groups()
    clean_targets = [t for t in all_targets if not is_blacklisted(t["username"], blacklist)]

    print("════════════════════════════════════════════════════════════")
    print(f"🚀 Starting High-Velocity Promotion Cycle #{cycle_num}")
    print(f"📋 Active Clean Target Pool: {len(clean_targets)} verified open supergroups")
    print(f"⭐ VIP Golden Groups: {len(vip_db)} | 🛡️ Quarantined Blacklist: {len(blacklist)}")
    print(f"⏰ Cycle Start Time: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}")
    print("════════════════════════════════════════════════════════════\n")

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
        clean_uname = group_target.lstrip("@").strip().lower()

        if is_blacklisted(group_target, load_blacklist()):
            continue

        is_vip = is_vip_target(group_target)
        vip_tag = " [💎 VIP ELITE]" if is_vip else ""

        try:
            print(f"[{index:03d}/{len(ordered_targets):03d}] 🔍 Target: @{group_target} ({group_title}){vip_tag} [Lang: {group_lang}]")
            
            # Resolve entity with strict timeout
            if channel_id and access_hash:
                entity = InputPeerChannel(channel_id, access_hash)
            else:
                entity = await asyncio.wait_for(client.get_entity(group_target), timeout=NETWORK_TIMEOUT_SEC)

            # Dead Group Killer Verification (Lightweight)
            try:
                msgs = await asyncio.wait_for(client.get_messages(entity, limit=4), timeout=5.0)
                if msgs and len(msgs) >= 2:
                    senders = set(m.sender_id for m in msgs if m.sender_id)
                    if len(senders) < 1:
                        add_to_blacklist(group_target, "Inactive Group (Zero senders)", group_title)
                        blacklisted_count += 1
                        continue
            except Exception:
                pass

            message_text = get_copywriting_for_target(target_info)
            
            typing_duration = random.randint(TYPING_DURATION_MIN, TYPING_DURATION_MAX)
            print(f"  ✍️ Simulating human typing ({typing_duration}s)...")
            await simulate_human_typing(client, entity, typing_duration)
            
            # Send message with strict timeout
            await asyncio.wait_for(client.send_message(entity, message_text), timeout=NETWORK_TIMEOUT_SEC)
            print(f"  🎉 Message posted successfully to @{group_target}!")
            
            # Reset fail strike on success
            if clean_uname in FAIL_STRIKES:
                del FAIL_STRIKES[clean_uname]

            tier, score = record_vip_success(target_info)
            print(f"  ⭐ [VIP Metric Updated]: Tier: {tier} | Engagement Score: {score}")

            success_count += 1
            if is_vip:
                vip_success_count += 1

            if index < len(ordered_targets):
                cooldown = random.randint(INTER_GROUP_COOLDOWN_MIN, INTER_GROUP_COOLDOWN_MAX)
                await live_countdown(cooldown, "Inter-Group Cooldown")

        except asyncio.TimeoutError:
            print(f"  ⚠️ Timeout on @{group_target} (> {NETWORK_TIMEOUT_SEC}s). Skipping safely...")
            continue
        except FloodWaitError as e:
            if e.seconds > 60:
                print(f"  ⚠️ FloodWait rate-limit ({e.seconds}s) on @{group_target}. Quarantining & skipping...")
                add_to_blacklist(group_target, f"FloodWait ({e.seconds}s)", group_title)
                blacklisted_count += 1
                await asyncio.sleep(1)
                continue
            else:
                print(f"  ⏳ Short FloodWait ({e.seconds}s). Waiting safely...")
                await asyncio.sleep(e.seconds + 1)
        except (UserBannedInChannelError, ChatAdminRequiredError) as e:
            # Fatal restrictions -> direct blacklist
            add_to_blacklist(group_target, f"Permanently restricted ({type(e).__name__})", group_title)
            blacklisted_count += 1
            await asyncio.sleep(0.5)
        except ChatWriteForbiddenError as e:
            # Two-strike rule for write forbidden
            strikes = FAIL_STRIKES.get(clean_uname, 0) + 1
            FAIL_STRIKES[clean_uname] = strikes
            if strikes >= 2:
                add_to_blacklist(group_target, f"Muted/Forbidden 2 consecutive times", group_title)
                blacklisted_count += 1
            else:
                print(f"  ⚠️ Write restricted on @{group_target} (Strike {strikes}/2) -> Skipping for now.")
            await asyncio.sleep(0.5)
        except (ChannelPrivateError, ChannelInvalidError, UsernameInvalidError, UsernameNotOccupiedError) as e:
            add_to_blacklist(group_target, f"Chat invalid or private ({type(e).__name__})", group_title)
            blacklisted_count += 1
            await asyncio.sleep(0.5)
        except Exception as e:
            err_str = str(e)
            if "ALLOW_PAYMENT_REQUIRED" in err_str or "BALANCE_TOO_LOW" in err_str:
                add_to_blacklist(group_target, "Requires Telegram Stars fee", group_title)
                blacklisted_count += 1
            elif "join the discussion group" in err_str.lower() or "discussion group before commenting" in err_str.lower():
                try:
                    await asyncio.wait_for(client(JoinChannelRequest(entity)), timeout=NETWORK_TIMEOUT_SEC)
                    await asyncio.wait_for(client.send_message(entity, message_text), timeout=NETWORK_TIMEOUT_SEC)
                    print(f"  🎉 Message posted after auto-joining @{group_target}!")
                    tier, score = record_vip_success(target_info)
                    success_count += 1
                except Exception as join_err:
                    add_to_blacklist(group_target, f"Discussion join restricted: {join_err}", group_title)
                    blacklisted_count += 1
            else:
                print(f"  ⚠️ Note for @{group_target}: {e} -> Continuing.")
            await asyncio.sleep(0.5)

    print("────────────────────────────────────────────────────────────")
    print(f"📊 Cycle #{cycle_num} Summary: ✅ Posted: {success_count} (💎 VIP: {vip_success_count}) | 🚫 Blacklisted: {blacklisted_count}")
    print("────────────────────────────────────────────────────────────\n")


async def supervisor_main():
    """Perpetual self-evolving supervisor loop with clean cycle-level client lifecycle."""
    disable_windows_quickedit()

    if not API_ID or not API_HASH:
        print("\n⚠️ [Error] Missing API credentials. Please set TG_API_ID and TG_API_HASH.\n")
        return

    print("╔════════════════════════════════════════════════════════════╗")
    print("║   🚀 UpStore Ultra-Fast 24/7 Viral Marketing Engine        ║")
    print("║   🎯 Offer: Gemini Advanced 18M ($0.25) & ChatGPT Plus     ║")
    print("║   ⚡ Speed: 8s-14s Cooldown | 2-4m Cycle Rest              ║")
    print("║   🧠 Autonomous Group Discovery: ENABLED                   ║")
    print("║   💀 Smart Strike Blacklist + VIP Registry: ACTIVE         ║")
    print("║   📌 Referral Link: " + BOT_REF_LINK[:32] + "...   ║")
    print("╚════════════════════════════════════════════════════════════╝\n")

    cycle = 1
    while True:
        client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        try:
            await client.start()
            
            me = await client.get_me()
            print(f"👤 Authenticated as: {me.first_name} (@{me.username or 'NoUsername'}) [ID: {me.id}]")
            
            blacklist = load_blacklist()
            vip_db = load_vip_database()
            active_pool = load_target_groups()
            
            print(f"🛡️ Active Blacklist: {len(blacklist)} groups permanently quarantined.")
            print(f"⭐ VIP Golden Registry: {len(vip_db)} high-engagement groups.")
            print(f"📋 Verified Target Pool: {len(active_pool)} active open supergroups loaded.")
            print(f"⚡ Mode: Autonomous Continuous Execution (Runs 24/7 perpetually).\n")

            # 1. Autonomous Self-Evolution: Discover new groups before cycle
            await autonomous_discover_new_groups(client, max_discover=8)
            
            # 2. Run the main promotion cycle
            await run_promoter_cycle(client, cycle)
            
            # 3. Inter-cycle brief rest (2 to 4 minutes)
            rest_minutes = random.randint(ROUND_REST_MINUTES_MIN, ROUND_REST_MINUTES_MAX)
            rest_seconds = rest_minutes * 60
            next_time = datetime.fromtimestamp(time.time() + rest_seconds).strftime('%I:%M:%S %p')
            
            print(f"💤 Cycle #{cycle} completed! Short rest for {rest_minutes} minutes.")
            print(f"⏰ Next Cycle (#{cycle + 1}) will start automatically at: {next_time}\n")
            
            await live_countdown(rest_seconds, f"Auto-Restart Timer (Cycle #{cycle} -> #{cycle + 1})")
            cycle += 1

        except KeyboardInterrupt:
            print("\n🛑 Promoter stopped manually by user (Ctrl+C). Exiting safely.")
            break
        except BaseException as e:
            print(f"\n⚠️ [Auto-Recovery Supervisor] Caught: {type(e).__name__}: {e}")
            print("🔄 Self-healing in progress: Reconnecting and resuming loop in 5 seconds...\n")
            await asyncio.sleep(5)
        finally:
            try:
                if client.is_connected():
                    await client.disconnect()
            except Exception:
                pass


if __name__ == "__main__":
    disable_windows_quickedit()
    while True:
        try:
            asyncio.run(supervisor_main())
            break
        except KeyboardInterrupt:
            print("\n🛑 Process terminated by user.")
            break
        except BaseException as e:
            print(f"\n[Infinite Resilient Loop] Supervisor caught unhandled exit: {e}. Relaunching in 3s...\n")
            time.sleep(3)
