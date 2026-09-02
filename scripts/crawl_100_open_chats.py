import asyncio
import json
import os
import sys
from datetime import datetime
from telethon import TelegramClient
from telethon.tl.functions.channels import GetFullChannelRequest, JoinChannelRequest
from telethon.tl.functions.contacts import SearchRequest

API_ID = 31577730
API_HASH = "42d6fcd39c9e724428133de55ab0fe21"
SESSION_NAME = "upstore_promoter_session"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKLIST_FILE = os.path.join(BASE_DIR, "promoter_blacklist.json")
OUTPUT_FILE = os.path.join(BASE_DIR, "promoter_verified_100.json")

# Massive, exhaustive list of search queries across all relevant sectors
SEARCH_QUERIES = [
    # AI & Tools
    "chatgpt chat", "ai chat", "midjourney group", "ai tools discussion",
    "ذكاء اصطناعي شات", "شات الذكاء الاصطناعي", "مجتمع الذكاء الاصطناعي",
    "قروب ذكاء اصطناعي", "نقاشات الذكاء الاصطناعي", "برومبتات شات",
    "بوتات الذكاء الاصطناعي شات", "أدوات الذكاء الاصطناعي",
    
    # Design, Canva & Video
    "canva chat", "graphic design chat", "designers group", "photoshop chat",
    "مصممين جرافيك شات", "قروب مصممين", "ملتقى المصممين", "كانفا شات",
    "مونتاج وكاب كات شات", "صناع المحتوى شات", "ملحقات تصميم شات",
    "فيديو اديت شات", "جرافيك ديزاين عربي",
    
    # Freelancing & Remote Work
    "freelance chat", "freelancers group", "remote work chat", "upwork chat",
    "شات فريلانس", "جروب العمل الحر", "مستقلين مصر", "فريلانسرز العرب",
    "سوق الخدمات المصغرة", "خدمات رقمية شات", "وظائف وعمل حر",
    
    # Programming & Developers
    "programmers chat", "developers chat", "python chat", "web development chat",
    "مبرمجين شات", "مطورين شات", "قروب مبرمجين", "ملتقى المبرمجين",
    "برمجة وتطوير شات", "كودينج عربي", "مشاريع برمجية",
    
    # Digital Marketing, SEO, E-Commerce
    "digital marketing chat", "seo chat", "e-commerce group", "social media marketing chat",
    "تسويق رقمي شات", "ديجيتال ماركتنج جروب", "اعلانات وتسويق شات",
    "تجارة الكترونية شات", "سوشيال ميديا شات", "افلييت ومشاريع",
    
    # Software, Subscriptions, Accounts, Crypto
    "software deals chat", "crypto chat arab", "binance chat arab", "bybit chat arab",
    "شات كريبتو", "تداول وعملات شات", "عروض وتطبيقات شات", "اشتراكات وبرامج",
    "تبادل خبرات تقنية", "خدمات وحسابات شات",
    
    # General Tech, Students & Discussions
    "tech discussion chat", "students chat tech", "نقاشات تقنية",
    "شات سوالف وتقنية", "قروب تواصل وتبادل", "حاسبات ومعلومات شات"
]

def load_blacklist():
    if not os.path.exists(BLACKLIST_FILE):
        return {}
    try:
        with open(BLACKLIST_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("blacklisted_groups", {})
    except Exception:
        return {}

async def crawl_and_verify_100_groups():
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()

    blacklist = load_blacklist()
    print("════════════════════════════════════════════════════════════", flush=True)
    print("🚀 STARTING MASSIVE CRAWLER FOR 100+ VERIFIED OPEN CHAT GROUPS")
    print(f"🛡️ Active Blacklist: {len(blacklist)} groups permanently excluded.")
    print("════════════════════════════════════════════════════════════\n", flush=True)

    discovered_candidates = set()

    # Step 1: Global Telegram Search Across All Queries
    for idx, q in enumerate(SEARCH_QUERIES, 1):
        try:
            print(f"[{idx:02d}/{len(SEARCH_QUERIES):02d}] 🔍 Query: '{q}'...", flush=True)
            res = await client(SearchRequest(q=q, limit=35))
            for chat in res.chats:
                uname = getattr(chat, 'username', None)
                if uname and uname.lower() not in blacklist and uname not in discovered_candidates:
                    discovered_candidates.add(uname)
            await asyncio.sleep(0.3)
        except Exception:
            pass

    print(f"\n📋 Discovered {len(discovered_candidates)} Candidate Groups.", flush=True)
    print("⚡ Stress-Testing Every Group for 100% Free Public Writing Permissions...\n", flush=True)

    verified_chats = []
    seen_ids = set()

    for idx, uname in enumerate(discovered_candidates, 1):
        if uname.lower() in blacklist:
            continue

        try:
            entity = await client.get_entity(uname)
            
            # Check 1: Must be Supergroup / Megagroup, NOT a Broadcast channel
            is_megagroup = getattr(entity, 'megagroup', False) or getattr(entity, 'gigagroup', False)
            is_broadcast = getattr(entity, 'broadcast', False)
            if not is_megagroup or is_broadcast:
                continue

            # Check 2: Must NOT require paid Telegram Stars
            stars = getattr(entity, 'send_paid_messages_stars', None)
            if stars and stars > 0:
                continue

            # Check 3: Check default banned rights for members
            banned_rights = getattr(entity, 'default_banned_rights', None)
            if banned_rights:
                if getattr(banned_rights, 'send_messages', False) or getattr(banned_rights, 'send_plain', False):
                    continue

            # Check 4: No Join Request barrier
            if getattr(entity, 'join_request', False):
                continue

            # Check 5: Fetch recent messages to verify multi-user chat activity
            msgs = await client.get_messages(entity, limit=10)
            if not msgs or len(msgs) < 3:
                continue

            senders = set(m.sender_id for m in msgs if m.sender_id)
            if len(senders) < 2:
                continue # Skip dead/single-user broadcast groups

            # Check 6: Check full channel details
            full = await client(GetFullChannelRequest(entity))
            total_members = getattr(full.full_chat, 'participants_count', 0) or 0
            online_count = getattr(full.full_chat, 'online_count', 0) or 0

            # Filter for groups with real members (> 50)
            if total_members < 50:
                continue

            # Detect primary language
            title = getattr(entity, 'title', uname)
            about = getattr(full.full_chat, 'about', '') or ''
            combined_text = title + " " + about
            
            # Russian detection
            if any('\u0400' <= char <= '\u04FF' for char in combined_text):
                lang = "ru"
            # Arabic detection
            elif any('\u0600' <= char <= '\u06FF' for char in combined_text):
                lang = "ar"
            else:
                lang = "en"

            chat_item = {
                "username": uname,
                "title": title,
                "lang": lang,
                "total_members": total_members,
                "online_count": online_count,
                "active_senders": len(senders)
            }

            if entity.id not in seen_ids:
                seen_ids.add(entity.id)
                verified_chats.append(chat_item)
                print(f"  🎉 [{len(verified_chats):03d}] VERIFIED OPEN CHAT: @{uname} | '{title}' | Lang: {lang.upper()} | Members: {total_members:,} | Online: {online_count}", flush=True)

            if len(verified_chats) >= 105:
                print("\n🎯 Reached 100+ verified groups milestone! Finalizing list...", flush=True)
                break

        except Exception:
            pass

    # Sort verified chats by online active members & total members
    verified_chats.sort(key=lambda x: (x['online_count'], x['total_members']), reverse=True)

    # Save to persistent verified json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "total_verified": len(verified_chats),
            "groups": verified_chats
        }, f, ensure_ascii=False, indent=2)

    print("\n════════════════════════════════════════════════════════════")
    print(f"🏆 SUCCESSFULLY COLLECTED & VERIFIED {len(verified_chats)} PURE OPEN CHATS")
    print(f"📁 Saved to: {OUTPUT_FILE}")
    print("════════════════════════════════════════════════════════════\n")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(crawl_and_verify_100_groups())
