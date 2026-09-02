#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
🚀 UpStore 24/7 Ultra-Smart Growth & Promotion Automation Engine
═══════════════════════════════════════════════════════════════════════════════
- 24/7 Perpetual Intelligent Loop: Runs continuous cycles with smart rest periods.
- Authentic Trustworthy Copywriting: Peer recommendation, zero-hype, professional tone.
- Exact Referral Attribution: Direct ref link with ID 8495121463.
- Multi-Lingual Native Targeting: Auto-switches between Arabic, English, and Russian.
- Dynamic Anti-Ban Protections: Random order shuffle, human typing, adaptive cooldowns.
═══════════════════════════════════════════════════════════════════════════════
"""

import asyncio
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
        ChatAdminRequiredError
    )
    from telethon.tl.functions.channels import JoinChannelRequest
    from telethon.tl.functions.messages import SendMessageRequest
except ImportError:
    print("❌ Telethon is not installed! Please run: pip install telethon")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# 1. AUTHENTICATION & CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
API_ID = int(os.getenv("TG_API_ID", 31577730))
API_HASH = os.getenv("TG_API_HASH", "42d6fcd39c9e724428133de55ab0fe21")
SESSION_NAME = "upstore_promoter_session"

# Direct official referral link with user ID 8495121463
BOT_REF_LINK = "https://t.me/upstore_one_bot?start=ref_8495121463"

# Timing configuration
INTER_GROUP_COOLDOWN_MIN = 45  # Seconds between groups
INTER_GROUP_COOLDOWN_MAX = 80  # Seconds between groups
ROUND_REST_MINUTES_MIN = 45    # Minutes to rest after a full cycle
ROUND_REST_MINUTES_MAX = 75    # Minutes to rest after a full cycle

# ─────────────────────────────────────────────────────────────────────────────
# 2. TARGET TELEGRAM COMMUNITIES (100% Verified Pure Open Discussion Chats)
# ─────────────────────────────────────────────────────────────────────────────
TARGET_GROUPS = [
    # Top Arabic Active Design, AI & Developer Chats
    {"username": "akkffh", "lang": "ar", "name": "قروب مصممي الجرافيك وكانفا (2.6K)"},
    {"username": "A1_des", "lang": "ar", "name": "قروب مصممي الجرافيك (1.2K)"},
    {"username": "modmentadawulgroups", "lang": "ar", "name": "جروب نقاشات عامة وعروض (3.3K)"},
    {"username": "designerssoftwear", "lang": "ar", "name": "ملتقى برمجيات المصممين (857)"},
    {"username": "AIApproachClub", "lang": "ar", "name": "نادي نهج الذكاء الاصطناعي (789)"},
    {"username": "maryamalbatoulofficielle", "lang": "ar", "name": "خدمات رقمية واشتراكات (536)"},
    {"username": "progAi2", "lang": "ar", "name": "مبرمجين الذكاء الاصطناعي (457)"},
    {"username": "Arabdesign21", "lang": "ar", "name": "ملتقى المصممين العرب (370)"},
    {"username": "blackarkchat", "lang": "ar", "name": "قروب مطورين ومبرمجين (140)"},
    {"username": "ALULYAAi1", "lang": "ar", "name": "نقاشات عالم الذكاء الاصطناعي (123)"},
    {"username": "csAlit22", "lang": "ar", "name": "حاسبات وذكاء اصطناعي (117)"},
    {"username": "areejdi", "lang": "ar", "name": "قروب مصممي الجرافيك (91)"},
    
    # International Active Open Chats (English & Russian)
    {"username": "digital_marketing_chat01", "lang": "ru", "name": "Digital Marketing Chat (7K)"},
    {"username": "digital_chat1", "lang": "ru", "name": "Digital Chat RU (856)"},
    {"username": "DigitalMarketing_AC", "lang": "en", "name": "Digital Marketing Global (243)"},
    {"username": "AI_Tools_Group", "lang": "en", "name": "AI Tools Discussion Group (194)"}
]

# ─────────────────────────────────────────────────────────────────────────────
# 3. HIGH-TRUST, AUTHENTIC & NATURAL COPYWRITING TEMPLATES
# ─────────────────────────────────────────────────────────────────────────────
TEMPLATES_AR = [
    # Template 1: نصيحة وتجربة فريلانسر حقيقية ومفيدة
    f"""يا جماعة حبيت أشارككم تجربة سريعة ممكن توفر عليكم كتير..
كنت بدور على اشتراك رسمي لـ Gemini Advanced و Canva Pro لشغلي، وجربت بوت موثوق بيوفر الاشتراكات الرقمية بأسعار الجملة المباشرة بدون وسيط.
المميز إنه تسليم فوري وتفعيل رسمي بضمان، والأسعار بتبدأ من 0.25$ بس (جيمناي 18 شهر مع مساحة سحابية 2TB).

📌 للي حابب يستفيد أو يشوف قائمة الأدوات المتاحة:
👉 {BOT_REF_LINK}""",

    # Template 2: عرض ومقارنة أدوات الذكاء الاصطناعي والتصميم
    f"""للمهتمين بأدوات الذكاء الاصطناعي والبرمجيات (ChatGPT Plus / Claude 3.7 / Canva Pro / Cursor)..
ده متجر بيوفر اشتراكات أصلية بأسعار رمزية ومناسبة جداً للطلاب والمستقلين، مع دفع آمن وتفعيل تلقائي فوري.

💎 أبرز الاشتراكات المتوفرة:
• Gemini Advanced (18 شهر كاملة) — $0.25
• Canva Pro (مدى الحياة) — $0.49
• CapCut Pro (سنة كاملة) — $0.79
• Claude 3.7 Sonnet & ChatGPT Plus
• تراخيص ويندوز 11 وأوفيس 365 أصلية

🔗 رابط التصفح والتفعيل المباشر:
👉 {BOT_REF_LINK}""",

    # Template 3: مشاركة كنز تقني بأسلوب بسيط ومهذب
    f"""مساء الخير يا شباب.. لو بتستخدموا أدوات التصميم أو الذكاء الاصطناعي بشكل يومي، البوت ده بيقدم عروض رسمية ممتازة جداً وبتسليم لحظي.
أنا مجربه شخصياً في تفعيل أدواتي لشغلي وشغال تمام ومضمون.

رابط البوت للاطلاع على الباقات والأسعار:
👉 {BOT_REF_LINK}"""
]

TEMPLATES_EN = [
    # Template 1: Clean, professional peer recommendation
    f"""Sharing a really useful resource for freelancers, designers, and developers:
Found a trusted wholesale digital distribution bot for genuine AI & productivity subscriptions with instant automated delivery.

Key available tools:
• Gemini Advanced (18 Months + 2TB Cloud) — $0.25
• Canva Pro (Lifetime) — $0.49
• CapCut Pro (1 Year) — $0.79
• ChatGPT Plus & Claude 3.7 Pro
• Genuine Windows 11 & Office 365 keys

Direct link to browse tools & instant activation:
👉 {BOT_REF_LINK}""",

    # Template 2: Direct value proposition
    f"""If you're looking for genuine, cost-effective subscriptions for AI tools (Gemini 18m, ChatGPT Plus, Canva Pro, Cursor), this automated bot delivers authentic license keys instantly with full warranty:
👉 {BOT_REF_LINK}"""
]

TEMPLATES_RU = [
    # Template 1: Polite, helpful Russian copywriting
    f"""Привет всем! Делюсь полезным проверенным ботом с оптовыми ценами на официальные подписки ИИ и софт для работы и учебы. Мгновенная автоматическая выдача ключей и полная гарантия:

• Gemini Advanced (18 месяцев + 2ТБ) — $0.25
• Canva Pro (Навсегда) — $0.49
• CapCut Pro (1 год) — $0.79
• ChatGPT Plus / Claude 3.7 / Windows 11 Pro

Ссылка на официальный бот:
👉 {BOT_REF_LINK}"""
]

def get_copywriting_for_target(target_info):
    """Selects the best language-specific copy for the target group."""
    lang = target_info.get("lang", "ar")
    if lang == "ru":
        return random.choice(TEMPLATES_RU)
    elif lang == "en":
        return random.choice(TEMPLATES_EN)
    else:
        return random.choice(TEMPLATES_AR)

# ─────────────────────────────────────────────────────────────────────────────
# 4. CORE ENGINE & LIVE VISUAL FEEDBACK
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
    """Executes a single full round across all configured target groups."""
    print("════════════════════════════════════════════════════════════")
    print(f"🔄 Starting Promotion Cycle #{cycle_num}")
    print(f"⏰ Cycle Time: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}")
    print("════════════════════════════════════════════════════════════\n")

    # Shuffle target order each cycle for natural variance
    current_targets = list(TARGET_GROUPS)
    random.shuffle(current_targets)

    success_count = 0
    skip_count = 0

    for index, target_info in enumerate(current_targets, 1):
        group_target = target_info["username"]
        group_name = target_info.get("name", group_target)
        group_lang = target_info.get("lang", "ar").upper()

        try:
            print(f"[{index:02d}/{len(current_targets):02d}] 🔍 Target: @{group_target} ({group_name}) [Lang: {group_lang}]")
            entity = await client.get_entity(group_target)
            
            # Auto-join group ONLY if account is not already a member
            if getattr(entity, 'left', False):
                try:
                    await client(JoinChannelRequest(entity))
                    await asyncio.sleep(2)
                except Exception:
                    pass

            # Select native copywriting based on group language
            message_text = get_copywriting_for_target(target_info)
            
            # Simulate realistic human typing (3s - 6s)
            typing_duration = random.randint(3, 6)
            print(f"  ✍️ Simulating human typing ({typing_duration}s)...")
            await simulate_human_typing(client, entity, typing_duration)
            
            # Post directly to the open supergroup
            await client.send_message(entity, message_text)
            print(f"  🎉 Message posted successfully to @{group_target}!")
            success_count += 1

            # Inter-group safety pause (45s - 80s)
            if index < len(current_targets):
                cooldown = random.randint(INTER_GROUP_COOLDOWN_MIN, INTER_GROUP_COOLDOWN_MAX)
                await live_countdown(cooldown, "Inter-Group Cooldown")

        except FloodWaitError as e:
            print(f"  ⚠️ Telegram FloodWait triggered! Waiting {e.seconds}s safely...")
            await asyncio.sleep(e.seconds + 5)
        except (UserBannedInChannelError, ChatWriteForbiddenError, ChatAdminRequiredError):
            print(f"  ⚠️ Posting restricted in @{group_target}. Skipping safely.")
            skip_count += 1
            await asyncio.sleep(2)
        except Exception as e:
            err_str = str(e)
            if "ALLOW_PAYMENT_REQUIRED" in err_str or "BALANCE_TOO_LOW" in err_str:
                print(f"  ⚠️ @{group_target}: Requires Telegram Stars fee. Skipping safely.")
            else:
                print(f"  ❌ Note for @{group_target}: {e}")
            skip_count += 1
            await asyncio.sleep(2)

    print("────────────────────────────────────────────────────────────")
    print(f"📊 Cycle #{cycle_num} Summary: ✅ Posted: {success_count} | ⚠️ Skipped: {skip_count}")
    print("────────────────────────────────────────────────────────────\n")


async def main():
    if not API_ID or not API_HASH:
        print("\n⚠️ [Error] Missing API credentials. Please set TG_API_ID and TG_API_HASH.\n")
        return

    print("╔════════════════════════════════════════════════════════════╗")
    print("║   🚀 UpStore 24/7 Smart Autonomous Promotion Engine        ║")
    print("║   📌 Referral Link: " + BOT_REF_LINK[:32] + "...   ║")
    print("╚════════════════════════════════════════════════════════════╝\n")

    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()
    
    me = await client.get_me()
    print(f"👤 Authenticated as: {me.first_name} (@{me.username or 'NoUsername'}) [ID: {me.id}]")
    print(f"📋 Target Pool: {len(TARGET_GROUPS)} verified active open chats configured.")
    print(f"⚡ Mode: Perpetual 24/7 Autonomous Looping Enabled.\n")

    cycle = 1
    while True:
        try:
            await run_promoter_cycle(client, cycle)
            
            # Calculate rest time between cycles (45 to 75 minutes)
            rest_minutes = random.randint(ROUND_REST_MINUTES_MIN, ROUND_REST_MINUTES_MAX)
            rest_seconds = rest_minutes * 60
            next_time = datetime.fromtimestamp(time.time() + rest_seconds).strftime('%I:%M:%S %p')
            
            print(f"💤 Cycle #{cycle} completed. Entering round rest for {rest_minutes} minutes.")
            print(f"⏰ Next Cycle (#{cycle + 1}) will start at: {next_time}\n")
            
            await live_countdown(rest_seconds, f"Round Rest (Cycle #{cycle} -> #{cycle + 1})")
            cycle += 1

        except KeyboardInterrupt:
            print("\n🛑 Promoter stopped safely by user.")
            break
        except Exception as e:
            print(f"\n⚠️ Unexpected cycle error: {e}. Recovering in 60s...")
            await asyncio.sleep(60)

    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
