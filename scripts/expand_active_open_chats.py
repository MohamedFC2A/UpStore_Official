import asyncio
import json
import os
from datetime import datetime
from telethon import TelegramClient
from telethon.tl.functions.contacts import SearchRequest
from telethon.tl.types import InputPeerChannel

API_ID = 31577730
API_HASH = "42d6fcd39c9e724428133de55ab0fe21"
SESSION_NAME = "upstore_promoter_session"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKLIST_FILE = os.path.join(BASE_DIR, "promoter_blacklist.json")
VERIFIED_FILE = os.path.join(BASE_DIR, "promoter_verified_100.json")

NEW_SEARCH_QUERIES = [
    # Design, Media & Tools
    "مصممين كانفا", "تجمع مصممين", "فوتوشوب اليستريتور", "مونتاج فيديو كاب كات",
    "ملتقى المصممين المحترفين", "تصميم جرافيك وتعديل", "صناع محتوى يوتيوب وتيك توك",
    "canva templates", "graphic designer chat", "video creators chat", "photo edit chat",
    
    # AI, Tech & Software Deals
    "شات الذكاء الاصطناعي العربي", "ادوات ومواقع ذكاء اصطناعي", "برومبتات شات جي بي تي",
    "تطبيقات وخدمات رقمية", "حسابات واشتراكات بريميوم", "عروض برامج وتطبيقات",
    "ai prompts chat", "chatgpt discussion", "midjourney prompts", "digital tools chat",
    
    # Freelancing & Digital Business
    "عمل حر وفريلانس عربي", "تجمع فريلانسرز", "سوق الخدمات الرقمية والبرمجية",
    "وظائف اونلاين وعن بعد", "مسوقين واعلانات رقمية", "تسويق بالعمولة وافلييت",
    "freelance marketplace chat", "remote workers hub", "affiliate marketing chat",
    
    # Developers, Coding & Tech
    "مبرمجين العرب كودينج", "تطوير تطبيقات ومواقع", "بايثون ولغات البرمجة",
    "python developers group", "web developers discussion", "tech startups chat",
    
    # High-Activity Regional Discussions
    "دردشة شباب وبنات تقنية", "ملتقى طلاب الجامعات تقنية", "سوالف ومشاريع رقمية",
    "تجمع شباب الخليج ومصر", "دردشة وتبادل افكار تقنية"
]

def load_blacklist():
    if not os.path.exists(BLACKLIST_FILE):
        return {}
    try:
        with open(BLACKLIST_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("blacklisted_groups", {})
    except Exception:
        return {}

def load_existing_verified():
    if not os.path.exists(VERIFIED_FILE):
        return []
    try:
        with open(VERIFIED_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("groups", [])
    except Exception:
        return []

async def expand_open_chats():
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()

    blacklist = load_blacklist()
    existing_verified = load_existing_verified()
    
    # Filter existing list against blacklist
    clean_existing = [g for g in existing_verified if g["username"].lstrip("@").strip().lower() not in [k.lower() for k in blacklist.keys()]]
    seen_ids = set(g["id"] for g in clean_existing if "id" in g)
    seen_unames = set(g["username"].lower() for g in clean_existing)

    print("════════════════════════════════════════════════════════════")
    print(f"🚀 EXPANDING OPEN CHATS WITH VIP ENGAGEMENT VERIFICATION")
    print(f"🛡️ Current Blacklist: {len(blacklist)} groups permanently excluded.")
    print(f"📋 Clean Existing Targets: {len(clean_existing)} active groups.")
    print("════════════════════════════════════════════════════════════\n")

    new_discovered = []

    for idx, query in enumerate(NEW_SEARCH_QUERIES, 1):
        try:
            print(f"[{idx:02d}/{len(NEW_SEARCH_QUERIES):02d}] 🔍 Exploring: '{query}'...", flush=True)
            res = await client(SearchRequest(q=query, limit=40))
            for chat in res.chats:
                if chat.id in seen_ids:
                    continue

                username = getattr(chat, 'username', None)
                if not username:
                    continue

                clean_uname = username.lower().lstrip("@").strip()
                if clean_uname in [k.lower() for k in blacklist.keys()] or clean_uname in seen_unames:
                    continue

                # Rule 1: Supergroup only
                is_megagroup = getattr(chat, 'megagroup', False) or getattr(chat, 'gigagroup', False)
                is_broadcast = getattr(chat, 'broadcast', False)
                if not is_megagroup or is_broadcast:
                    continue

                # Rule 2: No Stars
                stars = getattr(chat, 'send_paid_messages_stars', None)
                if stars and stars > 0:
                    continue

                # Rule 3: Member permissions
                banned_rights = getattr(chat, 'default_banned_rights', None)
                if banned_rights:
                    if getattr(banned_rights, 'send_messages', False) or getattr(banned_rights, 'send_plain', False):
                        continue

                # Rule 4: No join request
                if getattr(chat, 'join_request', False):
                    continue

                # Test get_messages to verify open conversation velocity
                try:
                    msgs = await client.get_messages(chat, limit=5)
                    if not msgs or len(msgs) < 2:
                        continue
                    senders = set(m.sender_id for m in msgs if m.sender_id)
                    if len(senders) < 2:
                        continue
                except Exception:
                    continue

                # Detect language
                title = getattr(chat, 'title', username)
                if any('\u0400' <= char <= '\u04FF' for char in title):
                    lang = "ru"
                elif any('\u0600' <= char <= '\u06FF' for char in title):
                    lang = "ar"
                else:
                    lang = "en"

                seen_ids.add(chat.id)
                seen_unames.add(clean_uname)
                
                chat_data = {
                    "id": chat.id,
                    "access_hash": getattr(chat, 'access_hash', 0),
                    "username": username,
                    "title": title,
                    "lang": lang,
                    "active_senders": len(senders)
                }
                new_discovered.append(chat_data)
                clean_existing.append(chat_data)
                print(f"  🎉 Found Open Group: @{username} (ID: {chat.id}) — '{title}' [{lang.upper()}] (Active Senders: {len(senders)})", flush=True)

            await asyncio.sleep(0.3)
        except Exception:
            pass

    # Save to promoter_verified_100.json
    with open(VERIFIED_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "total_verified": len(clean_existing),
            "groups": clean_existing
        }, f, ensure_ascii=False, indent=2)

    print("\n════════════════════════════════════════════════════════════")
    print(f"🏆 TOTAL CLEAN VERIFIED TARGET POOL: {len(clean_existing)} OPEN CHATS")
    print(f"✨ New Verified Additions: {len(new_discovered)}")
    print("════════════════════════════════════════════════════════════\n")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(expand_open_chats())
