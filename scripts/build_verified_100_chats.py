import asyncio
import json
import os
import sys
from datetime import datetime
from telethon import TelegramClient
from telethon.tl.functions.contacts import SearchRequest

API_ID = 31577730
API_HASH = "42d6fcd39c9e724428133de55ab0fe21"
SESSION_NAME = "upstore_promoter_session"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKLIST_FILE = os.path.join(BASE_DIR, "promoter_blacklist.json")
OUTPUT_FILE = os.path.join(BASE_DIR, "promoter_verified_100.json")

SEARCH_TOPICS = [
    # Design & Canva
    "مصممين", "كانفا", "جرافيك", "فوتوشوب", "مونتاج", "كاب كات", "صناع محتوى",
    "canva", "graphic designers", "video editing", "photoshop", "designers chat",
    
    # AI & Tools
    "ذكاء اصطناعي", "شات جي بي تي", "برومبت", "أدوات تقنية", "تطبيقات الذكاء",
    "chatgpt", "midjourney", "ai tools", "claude ai", "artificial intelligence",
    
    # Freelance & Work
    "فريلانس", "عمل حر", "مستقلين", "سوق الخدمات", "وظائف عن بعد", "خدمات مصغرة",
    "freelance", "freelancers", "remote work", "upwork", "fiverr",
    
    # Tech & Programming
    "مبرمجين", "مطورين", "برمجة", "كودينج", "بايثون", "تطوير ويب", "تقنية",
    "programmers", "developers", "python", "coding", "web dev", "tech chat",
    
    # Marketing & Subscriptions & Deals
    "تسويق رقمي", "ديجيتال ماركتنج", "سوشيال ميديا", "اعلانات", "اشتراكات", "عروض برامج",
    "digital marketing", "seo", "e-commerce", "software deals", "crypto chat", "binance", "bybit",

    # High-Traffic General & Regional Chats (شاتات عامة ضخمة)
    "دردشة وسوالف", "قروب تعارف وسوالف", "شات مصر والوطن العربي", "قروب تواصل عام",
    "شات الخليج والسعودية", "دردشة شباب وبنات العرب", "شات تبادل خبرات"
]

def load_blacklist():
    if not os.path.exists(BLACKLIST_FILE):
        return {}
    try:
        with open(BLACKLIST_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("blacklisted_groups", {})
    except Exception:
        return {}

async def discover_100_pure_chats():
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()

    blacklist = load_blacklist()
    print("════════════════════════════════════════════════════════════", flush=True)
    print("🚀 HIGH-SPEED DIRECT CRAWLER FOR 100+ VERIFIED OPEN CHATS")
    print(f"🛡️ Active Blacklist: {len(blacklist)} groups permanently excluded.")
    print("════════════════════════════════════════════════════════════\n", flush=True)

    verified_chats = []
    seen_ids = set()

    for idx, topic in enumerate(SEARCH_TOPICS, 1):
        try:
            print(f"[{idx:02d}/{len(SEARCH_TOPICS):02d}] 🔍 Searching Topic: '{topic}'...", flush=True)
            res = await client(SearchRequest(q=topic, limit=40))
            for chat in res.chats:
                if chat.id in seen_ids:
                    continue

                username = getattr(chat, 'username', None)
                if not username:
                    continue # Skip groups without public username

                if username.lower() in blacklist:
                    continue # Skip blacklisted groups

                # Rule 1: MUST be Megagroup / Supergroup (NOT Broadcast channel)
                is_megagroup = getattr(chat, 'megagroup', False) or getattr(chat, 'gigagroup', False)
                is_broadcast = getattr(chat, 'broadcast', False)
                if not is_megagroup or is_broadcast:
                    continue

                # Rule 2: MUST NOT have Stars fee
                stars = getattr(chat, 'send_paid_messages_stars', None)
                if stars and stars > 0:
                    continue

                # Rule 3: Check member write permissions
                banned_rights = getattr(chat, 'default_banned_rights', None)
                if banned_rights:
                    if getattr(banned_rights, 'send_messages', False) or getattr(banned_rights, 'send_plain', False):
                        continue

                # Rule 4: No Join Request barrier
                if getattr(chat, 'join_request', False):
                    continue

                # Language detection
                title = getattr(chat, 'title', username)
                if any('\u0400' <= char <= '\u04FF' for char in title):
                    lang = "ru"
                elif any('\u0600' <= char <= '\u06FF' for char in title):
                    lang = "ar"
                else:
                    lang = "en"

                seen_ids.add(chat.id)
                chat_data = {
                    "id": chat.id,
                    "access_hash": getattr(chat, 'access_hash', 0),
                    "username": username,
                    "title": title,
                    "lang": lang
                }
                verified_chats.append(chat_data)
                print(f"  🎉 [{len(verified_chats):03d}] Confirmed Open Chat: @{username} (ID: {chat.id}) — '{title}' [{lang.upper()}]", flush=True)

                if len(verified_chats) >= 105:
                    break

            await asyncio.sleep(0.3)
        except Exception as e:
            # print(f"Search topic error: {e}", flush=True)
            pass

        if len(verified_chats) >= 105:
            break

    # Save to promoter_verified_100.json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "total_verified": len(verified_chats),
            "groups": verified_chats
        }, f, ensure_ascii=False, indent=2)

    print("\n════════════════════════════════════════════════════════════")
    print(f"🏆 SUCCESSFULLY VERIFIED & SAVED {len(verified_chats)} PURE OPEN CHATS")
    print(f"📁 Output File: {OUTPUT_FILE}")
    print("════════════════════════════════════════════════════════════\n")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(discover_100_pure_chats())
