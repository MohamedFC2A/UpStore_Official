import asyncio
from telethon import TelegramClient
from telethon.tl.functions.contacts import SearchRequest
from telethon.tl.types import InputPeerChannel

API_ID = 31577730
API_HASH = "42d6fcd39c9e724428133de55ab0fe21"
SESSION_NAME = "upstore_promoter_session"

async def test_search():
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()

    res = await client(SearchRequest(q="مصممين", limit=10))
    print(f"Found {len(res.chats)} chats from search without username resolution:")
    for c in res.chats:
        is_megagroup = getattr(c, 'megagroup', False) or getattr(c, 'gigagroup', False)
        print(f"  Title: {c.title} | Username: @{getattr(c, 'username', 'NoUname')} | Megagroup: {is_megagroup}")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(test_search())
