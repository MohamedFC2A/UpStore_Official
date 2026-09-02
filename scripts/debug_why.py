import asyncio
from telethon import TelegramClient
from telethon.tl.functions.channels import GetFullChannelRequest

API_ID = 31577730
API_HASH = "42d6fcd39c9e724428133de55ab0fe21"
SESSION_NAME = "upstore_promoter_session"

TEST_CANDIDATES = [
    "chatgpt_chat",
    "ai_tools_discussion",
    "canva_chat",
    "graphic_design_chat",
    "freelance_chat",
    "programmers_chat",
    "developers_chat",
    "digital_marketing_chat",
    "crypto_chat_arab",
    "software_deals_chat"
]

async def debug_why():
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()

    for uname in TEST_CANDIDATES:
        try:
            entity = await client.get_entity(uname)
            is_megagroup = getattr(entity, 'megagroup', False) or getattr(entity, 'gigagroup', False)
            is_broadcast = getattr(entity, 'broadcast', False)
            stars = getattr(entity, 'send_paid_messages_stars', None)
            banned_rights = getattr(entity, 'default_banned_rights', None)
            
            print(f"Candidate @{uname}: Title='{getattr(entity, 'title', uname)}' | is_megagroup={is_megagroup} | is_broadcast={is_broadcast} | stars={stars}")
            if not is_megagroup or is_broadcast:
                print(f"  -> Skipped: is_megagroup={is_megagroup}, is_broadcast={is_broadcast}")
                continue
            
            try:
                msgs = await client.get_messages(entity, limit=5)
                senders = set(m.sender_id for m in msgs if m.sender_id)
                print(f"  -> msgs fetched: {len(msgs)}, senders: {len(senders)}")
            except Exception as e:
                print(f"  -> get_messages error: {e}")

        except Exception as e:
            print(f"Candidate @{uname} -> get_entity failed: {type(e).__name__}: {e}")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(debug_why())
