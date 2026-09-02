#!/usr/bin/env python3
"""
smart_telegram_promoter.py — Human-Like Smart Growth Automation Engine for UpStore
================================================================================
Features:
- Telethon MTProto UserBot (Uses personal Telegram session)
- Ultra-realistic human behavior: simulated typing action & random delays (90-240s)
- Rotates dynamically among organic human-styled copywriting templates
- Auto-handles Telegram FloodWait & SpamBot protections
- Highlights top 10 unbeatable wholesale deals (Gemini 18m @ $0.25, ChatGPT @ $1.49, etc.)
- Embeds customizable referral tracking links

Usage:
  1. Install dependencies: pip install telethon
  2. Obtain API credentials from https://my.telegram.org (api_id, api_hash)
  3. Configure your API credentials and target groups list below
  4. Run: python scripts/smart_telegram_promoter.py
"""

import os
import sys
import time
import random
import asyncio
from datetime import datetime

try:
    from telethon import TelegramClient
    from telethon.errors import FloodWaitError, UserBannedInChannelError, ChatWriteForbiddenError
except ImportError:
    print("❌ Telethon is not installed! Please run: pip install telethon")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# 1. TELEGRAM API CREDENTIALS (from https://my.telegram.org)
# ─────────────────────────────────────────────────────────────────────────────
API_ID = int(os.getenv("TG_API_ID", "31577730"))
API_HASH = os.getenv("TG_API_HASH", "42d6fcd39c9e724428133de55ab0fe21")
SESSION_NAME = "upstore_promoter_session"

# ─────────────────────────────────────────────────────────────────────────────
# 2. YOUR PERSONAL REFERRAL LINK OR BOT LINK
# ─────────────────────────────────────────────────────────────────────────────
# Replace with your custom referral link, e.g., https://t.me/upstore_one_bot?start=ref_YOURID
BOT_REF_LINK = "https://t.me/upstore_one_bot"

# ─────────────────────────────────────────────────────────────────────────────
# 3. TARGET TELEGRAM GROUPS / CHANNELS (Public links or usernames)
# ─────────────────────────────────────────────────────────────────────────────
TARGET_GROUPS = [
    # --- كبرى مجموعات وشاتات النقاش المفتوحة (Verified High-Traffic Open Supergroups) ---
    "jor294",                     # 9,282 members (284 online) - تبادل خبرات المهارات الرقمية
    "digital_marketing_chat01",   # 7,048 members (336 online) - Digital Marketing Community Chat
    "jor7070",                    # 6,914 members (146 online) - تبادل خبرات المعلمين والتقنية
    "signals_crypto_arabic_chat", # 6,264 members (107 online) - مجتمع التداول والكريبتو
    "Shawxvip2",                  # 3,846 members (18 online) - مجتمع رواد الذكاء الاصطناعي
    "modmentadawulgroups",        # 3,333 members (30 online) - جروب نقاشات عامة
    "akkffh",                     # 2,617 members - قروب مصممي الجرافيك
    "O7nkKzTJfDA3OGQ0",           # 2,055 members (29 online) - تبادل خبرات المجتمعات المهنية
    "A1_des",                     # 1,186 members (19 online) - قروب مصممين جرافيك وكانفا
    "designerssoftwear",          # 857 members (11 online) - ملتقى برمجيات المصممين
    "digital_chat1",              # 856 members (6 online) - چات ديجيتال ماركتنج
    "AIApproachClub",             # 789 members (10 online) - مجتمع نادي نهج الذكاء الاصطناعي
    "maryamalbatoulofficielle",   # 536 members - خدمات رقمية واشتراكات
    "progAi2",                    # 457 members - قروب مبرمجين الذكاء الاصطناعي
    "Arabdesign21",               # 370 members - ملتقى المصممين العرب
    "sezar_apk_chat",             # 325 members - شات عالم التقنية والتطبيقات
    "FV_MM",                      # 325 members - مجتمع نقاشات عامة
    "cfvdvhbsn",                  # 278 members - ملتقى عالم المصممين
    "DigitalMarketing_AC",        # 243 members (12 online) - ADVERTISING & DIGITAL MARKETING Chat
    "X4JJJ",                      # 236 members - مجتمع مطوري البوتات والمبرمجين
    "AI_Tools_Group",             # 194 members - AI Tools Discussion Group
    "AIAgentsEngineersSociety",   # 167 members - مجتمع مهندسي وكلاء الذكاء الاصطناعي
    "blackarkchat",               # 140 members (12 online) - قروب مطورين ومبرمجين
    "ALULYAAi1",                  # 123 members - نقاشات عالم الذكاء الاصطناعي
    "csAlit22",                   # 117 members - مجتمع كلية حاسبات والذكاء الاصطناعي
    "chatgpt_arabic",             # مجتمع شات جي بي تي بالعربي (Verified working)
]

# ─────────────────────────────────────────────────────────────────────────────
# 4. ORGANIC HUMAN-STYLED COPYWRITING TEMPLATES (Rotated automatically)
# ─────────────────────────────────────────────────────────────────────────────
ORGANIC_POST_TEMPLATES = [
    # Template 1: العفوية واكتشاف كنز حقيقي
    f"""يا شباب لقيت بوت سري بيبيع اشتراكات الذكاء الاصطناعي بالجملة بأسعار مش طبيعية 🤯
أنا اشتريت منه جيمناي برو سنة ونص كاملة بـ 0.25$ (أه ربع دولار والله وشغال رسمي مع 2TB سحابي) وحبيت أشارككم عشان تستفيدوا:

🔥 أهم الأسعار اللي عنده:
• 🤖 Gemini Advanced (18 شهر كاملة): 0.25$ فقط
• 🧠 ChatGPT Plus (شهر كامل): 1.49$
• ⚡ Claude 3.7 Pro: 1.49$
• 🎨 Canva Pro سنة كاملة: 0.99$ (ومدى الحياة بـ 1.99$)
• 🔍 Perplexity AI Pro: 0.89$
• 🎬 CapCut Pro: 0.99$
• 🍿 Netflix 4K UHD: 0.99$
• 🎵 Spotify Premium: 0.49$
• 📺 YouTube Premium: 0.49$
• 💻 Windows 11 Pro Key أصلي: 1.99$

التسليم فوري بضمان استبدال، ده رابط البوت جربوه بنفسكم:
👉 {BOT_REF_LINK}""",

    # Template 2: نصيحة توفير مقارنة بالسعر الرسمي
    f"""بدل ما تدفعوا 20$ أو 30$ كل شهر في اشتراكات الـ AI والتطبيقات، في بوت بيوفرها بأسعار الجملة المباشرة مع ضمان رسمي:

💎 قائمة بأقوى العروض الحالية:
1️⃣ جيمناي أدفانسد (18 شهر + 2TB): 0.25$
2️⃣ شات جي بي تي بلس (ChatGPT Plus): 1.49$
3️⃣ كلاود برو (Claude Pro): 1.49$
4️⃣ كانفا برو (Canva Pro سنة): 0.99$
5️⃣ بيربلكسيتي برو (Perplexity): 0.89$
6️⃣ كاب كات برو (CapCut Pro): 0.99$
7️⃣ نتفليكس 4K UHD: 0.99$
8️⃣ سبوتيفاي / يوتيوب بريميوم: 0.49$
9️⃣ ويندوز 11 برو مفتاح تفعيل دائم: 1.99$

الدفع متاح بـ Bybit و Binance والتسليم فوري بعد الدفع:
👉 {BOT_REF_LINK}""",

    # Template 3: نصيحة للمصممين والمبرمجين ورواد الأعمال
    f"""نصيحة لكل صناع المحتوى والطلاب والمبرمجين اللي بيحتاجوا أدوات الذكاء الاصطناعي.. 
ده أرخص مكان رسمي ممكن تجيبوا منه الحسابات بدون وسيط وبسعر الجملة:

⚡ أفضل 10 عروض مجربة:
• Google Gemini Pro (18 شهر ضمان): $0.25
• ChatGPT Plus: $1.49
• Claude Pro: $1.49
• Canva Pro: $0.99
• Perplexity Pro: $0.89
• CapCut Pro: $0.99
• Netflix 4K: $0.99
• Spotify Premium: $0.49
• YouTube Premium: $0.49
• Windows 11 Pro Retail: $1.99

تقدروا تشوفوا باقي المنتجات وطرق التفعيل من هنا:
👉 {BOT_REF_LINK}"""
]


async def simulate_human_typing(client, entity, duration_sec):
    """Simulates realistic human typing action in the chat."""
    try:
        async with client.action(entity, 'typing'):
            await asyncio.sleep(duration_sec)
    except Exception:
        await asyncio.sleep(duration_sec)


async def main():
    if not API_ID or not API_HASH:
        print("\n⚠️ [Action Required] Please set TG_API_ID and TG_API_HASH in the script or environment variables!")
        print("💡 You can get them for free in 1 minute from: https://my.telegram.org\n")
        return

    print("════════════════════════════════════════════════════════════")
    print("🚀 Starting UpStore Smart Organic Growth Automation Engine")
    print(f"⏰ Session Time: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}")
    print("════════════════════════════════════════════════════════════\n")

    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()
    
    me = await client.get_me()
    print(f"✅ Logged in successfully as: {me.first_name} (@{me.username or 'NoUsername'}) [ID: {me.id}]")
    print(f"📋 Target Groups: {len(TARGET_GROUPS)} channels/groups configured.")
    print("────────────────────────────────────────────────────────────\n")

    for index, group_target in enumerate(TARGET_GROUPS, 1):
        try:
            print(f"[{index}/{len(TARGET_GROUPS)}] 🔍 Resolving target: @{group_target}...")
            entity = await client.get_entity(group_target)
            
            # Auto-join channel / group if needed
            try:
                from telethon.tl.functions.channels import JoinChannelRequest
                await client(JoinChannelRequest(entity))
                await asyncio.sleep(2)
            except Exception:
                pass

            # Select random copywriting template
            message_text = random.choice(ORGANIC_POST_TEMPLATES)
            
            # Simulate human behavior: Random typing time between 4 and 9 seconds
            typing_duration = random.randint(4, 8)
            print(f"  ✍️ Simulating human typing action ({typing_duration}s)...")
            await simulate_human_typing(client, entity, typing_duration)
            
            # Check if group requires paid Telegram Stars
            stars_required = getattr(entity, 'send_paid_messages_stars', None)
            
            # If target is a Broadcast Channel, auto-join its linked discussion group first if present
            if getattr(entity, 'broadcast', False):
                print(f"  📢 Target is a Broadcast Channel. Preparing discussion comment...")
                try:
                    from telethon.tl.functions.channels import GetFullChannelRequest
                    full = await client(GetFullChannelRequest(entity))
                    linked_chat_id = getattr(full.full_chat, 'linked_chat_id', None)
                    if linked_chat_id:
                        disc_entity = await client.get_entity(linked_chat_id)
                        await client(JoinChannelRequest(disc_entity))
                        await asyncio.sleep(1.5)
                except Exception:
                    pass

                messages = await client.get_messages(entity, limit=1)
                if messages and len(messages) > 0:
                    latest_msg = messages[0]
                    await client.send_message(entity, message_text, comment_to=latest_msg.id)
                    print(f"  ✅ Comment published successfully under latest post in @{group_target}!")
                else:
                    await client.send_message(entity, message_text)
                    print(f"  ✅ Post published successfully to @{group_target}!")
            else:
                # Direct Group / Supergroup Message (with auto Stars support if required)
                if stars_required and stars_required > 0:
                    from telethon.tl.functions.messages import SendMessageRequest
                    peer = await client.get_input_entity(entity)
                    req = SendMessageRequest(
                        peer=peer,
                        message=message_text,
                        random_id=random.randint(0, 2**63 - 1),
                        allow_paid_stars=stars_required
                    )
                    await client(req)
                    print(f"  ✅ Post published successfully to @{group_target} (Paid {stars_required} Stars)!")
                else:
                    await client.send_message(entity, message_text)
                    print(f"  ✅ Post published successfully to @{group_target} (Free)!")

            # Human safety delay between groups (90s - 210s) to prevent any Telegram rate limits
            if index < len(TARGET_GROUPS):
                cooldown = random.randint(90, 180)
                print(f"  ⏳ Waiting safety cooldown of {cooldown}s before next group (anti-spam protection)...\n")
                await asyncio.sleep(cooldown)

        except FloodWaitError as e:
            print(f"  ⚠️ Telegram FloodWait triggered! Must wait {e.seconds} seconds.")
            await asyncio.sleep(e.seconds + 5)
        except (UserBannedInChannelError, ChatWriteForbiddenError):
            print(f"  ⚠️ Posting restricted by admin in @{group_target}. Skipping safely.")
        except Exception as e:
            err_str = str(e)
            if "BALANCE_TOO_LOW" in err_str or "ALLOW_PAYMENT_REQUIRED" in err_str:
                stars_val = getattr(entity, 'send_paid_messages_stars', 2) if 'entity' in locals() else 2
                print(f"  ⚠️ @{group_target}: Requires {stars_val} Telegram Stars to post (Account Stars balance is low). Skipping safely.")
            else:
                print(f"  ❌ Error with @{group_target}: {e}")

    print("\n════════════════════════════════════════════════════════════")
    print("🎉 All organic promotional tasks completed safely and successfully!")
    print("════════════════════════════════════════════════════════════\n")
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
