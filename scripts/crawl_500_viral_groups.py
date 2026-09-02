import asyncio
import json
import os
import sys
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

# 500+ Viral Targeting Query Clusters: High School, Baccalaureate, Universities, Engineering, Tech & Global
VIRAL_SEARCH_CLUSTERS = [
    # 🎓 الثانوية العامة والبكالوريا والتوجيهي 2026 / 2027 (طلاب يحتاجون جيمناي وشات جي بي تي للمذاكرة)
    "ثانوية عامة 2027", "دفعة تالتة ثانوي 2027", "ثانوية 2026 شات", "بكالوريا 2027",
    "توجيهي 2027 شات", "طلاب الثانوية العامة شات", "مذكرات وملخصات ثانوية", "قروب مذاكرة تالتة ثانوي",
    "دفعة التابلت ثانوية", "اسئلة ونقاشات ثانوية عامة", "شات طلاب البكالوريا الجزائر تونس المغرب",
    "تجمع طلاب الثانوية", "مذاكرة جماعية ثانوية", "قروب دفعة 2027", "توجيهي علمي وادبي",
    
    # 🏛️ كليات الهندسة والحاسبات والجامعات (أشد الفئات استخداماً للذكاء الاصطناعي)
    "كلية هندسة شات", "طلاب هندسة مصر", "هندسة حاسبات ومعلومات", "حاسبات ومعلومات شات",
    "كلية حاسبات وذكاء اصطناعي", "طلاب كلية العلوم", "طلاب الجامعات المصرية", "ملتقى طلاب الطب",
    "مشاريع تخرج هندسة", "تجمع طلاب الجامعات", "شات طلاب جامعة القاهرة وعين شمس",
    "شات طلاب جامعة الملك سعود والامارات", "جروب هندسة برمجيات شات", "بحوث ومشاريع جامعية",
    
    # 💻 مجتمعات البرمجة، التقنية، والمطورين
    "مبرمجين العرب شات", "تجمع المطورين العرب", "بايثون ولغات البرمجة شات",
    "تعلم البرمجة من الصفر", "مشاريع برمجية وتطوير ويب", "ذكاء اصطناعي للطلاب",
    
    # 🎨 مجتمعات التصميم والمونتاج وصناع المحتوى
    "مصممين كانفا وجرافيك شات", "تجمع المصممين العرب", "فوتوشوب وكانفا برو", "مونتاج وكاب كات تيك توك",
    "صناع المحتوى واليوتيوب", "ملحقات وتصميم شات",
    
    # 🌍 International Students, Academic & Study Groups (Global High-Yield Reach)
    "study with me chat", "university students group", "college homework help ai",
    "exam prep discussion chat", "students academic hub", "international students chat",
    "engineering students group", "computer science students chat", "medical students study chat",
    "sat exam prep chat", "ielts study group chat", "college assignments ai",
    
    # 🤖 Global AI, ChatGPT & Tech Innovation Groups
    "chatgpt students discussion", "ai tools for students", "chatgpt prompts chat",
    "claude ai discussions", "gemini ai users group", "python ai machine learning chat",
    "free ai tools group", "study ai bot chat", "ai productivity group"
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

def add_to_blacklist(blacklist, username, reason, title=""):
    clean = username.lstrip("@").strip().lower()
    blacklist[clean] = {
        "title": title or clean,
        "reason": reason,
        "added_at": datetime.now().strftime("%Y-%m-%d %I:%M:%S %p")
    }
    try:
        with open(BLACKLIST_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "description": "Persistent blacklist of unusable, restricted, paid, or dead Telegram groups.",
                "updated_at": datetime.now().isoformat(),
                "total_blacklisted": len(blacklist),
                "blacklisted_groups": blacklist
            }, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

async def crawl_and_filter_viral_groups():
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()

    blacklist = load_blacklist()
    existing_list = load_existing_verified()
    
    # Pre-filter existing list
    clean_pool = [g for g in existing_list if g["username"].lstrip("@").strip().lower() not in [k.lower() for k in blacklist.keys()]]
    seen_ids = set(g["id"] for g in clean_pool if "id" in g)
    seen_unames = set(g["username"].lower().lstrip("@").strip() for g in clean_pool)

    print("════════════════════════════════════════════════════════════", flush=True)
    print("🚀 VIRAL MITOTIC EXPANSION ENGINE — 500+ TARGET SUPERGROUPS")
    print(f"🛡️ Current Blacklist: {len(blacklist)} dead/restricted groups excluded.")
    print(f"📋 Starting Verified Base: {len(clean_pool)} active groups.")
    print("════════════════════════════════════════════════════════════\n", flush=True)

    total_killed = 0
    new_active_added = 0

    for cluster_idx, query in enumerate(VIRAL_SEARCH_CLUSTERS, 1):
        try:
            print(f"[{cluster_idx:02d}/{len(VIRAL_SEARCH_CLUSTERS):02d}] 🔍 Crawling Niche: '{query}'...", flush=True)
            res = await client(SearchRequest(q=query, limit=50))
            for chat in res.chats:
                username = getattr(chat, 'username', None)
                if not username:
                    continue

                clean_uname = username.lstrip("@").strip().lower()
                if clean_uname in [k.lower() for k in blacklist.keys()] or clean_uname in seen_unames or chat.id in seen_ids:
                    continue

                title = getattr(chat, 'title', username)

                # Filter 1: Pure Supergroup / Megagroup Only (Not Broadcast Channel)
                is_megagroup = getattr(chat, 'megagroup', False) or getattr(chat, 'gigagroup', False)
                is_broadcast = getattr(chat, 'broadcast', False)
                if not is_megagroup or is_broadcast:
                    add_to_blacklist(blacklist, username, "Broadcast Channel (Not an open group)", title)
                    total_killed += 1
                    continue

                # Filter 2: Must NOT have Telegram Stars fee
                stars = getattr(chat, 'send_paid_messages_stars', None)
                if stars and stars > 0:
                    add_to_blacklist(blacklist, username, f"Paid Stars Required ({stars} stars)", title)
                    total_killed += 1
                    continue

                # Filter 3: Check member write permissions
                banned_rights = getattr(chat, 'default_banned_rights', None)
                if banned_rights:
                    if getattr(banned_rights, 'send_messages', False) or getattr(banned_rights, 'send_plain', False):
                        add_to_blacklist(blacklist, username, "Member Posting Forbidden by Admin", title)
                        total_killed += 1
                        continue

                # Filter 4: No Join Request approval wall
                if getattr(chat, 'join_request', False):
                    add_to_blacklist(blacklist, username, "Join Request Approval Wall", title)
                    total_killed += 1
                    continue

                # ⚡ Filter 5: DEAD GROUP KILLER (High-Velocity Multi-User Human Chatter Check)
                try:
                    msgs = await client.get_messages(chat, limit=8)
                    if not msgs or len(msgs) < 3:
                        add_to_blacklist(blacklist, username, "Dead Group (< 3 total messages)", title)
                        total_killed += 1
                        continue
                    
                    # Count distinct human senders in recent messages
                    senders = set(m.sender_id for m in msgs if m.sender_id)
                    if len(senders) < 2:
                        add_to_blacklist(blacklist, username, "Inactive / Dead Group (Only 1 poster)", title)
                        total_killed += 1
                        continue
                except Exception as e:
                    add_to_blacklist(blacklist, username, f"Cannot read messages ({e})", title)
                    total_killed += 1
                    continue

                # Language Detection
                combined_text = title + " " + query
                if any('\u0400' <= char <= '\u04FF' for char in combined_text):
                    lang = "ru"
                elif any('\u0600' <= char <= '\u06FF' for char in combined_text):
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
                    "active_senders": len(senders),
                    "cluster": query
                }
                clean_pool.append(chat_data)
                new_active_added += 1
                print(f"  🎉 [{len(clean_pool):03d}] VERIFIED OPEN SUPERGROUP: @{username} | '{title}' [{lang.upper()}] (Senders: {len(senders)})", flush=True)

            await asyncio.sleep(0.3)
        except Exception:
            pass

    # Save to promoter_verified_100.json
    with open(VERIFIED_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "total_verified": len(clean_pool),
            "groups": clean_pool
        }, f, ensure_ascii=False, indent=2)

    print("\n════════════════════════════════════════════════════════════")
    print(f"🏆 VIRAL EXPANSION COMPLETE: {len(clean_pool)} VERIFIED ACTIVE SUPERGROUPS")
    print(f"✨ New High-Yield Groups Added: {new_active_added}")
    print(f"💀 Dead / Restricted Groups Killed to Blacklist: {total_killed}")
    print(f"📁 Database Persisted to: {VERIFIED_FILE}")
    print("════════════════════════════════════════════════════════════\n")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(crawl_and_filter_viral_groups())
