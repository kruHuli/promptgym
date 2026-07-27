from openai import AsyncOpenAI
from models import Challenge
import config

client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)

GENERATE_PROMPT = """Generate a realistic, messy "meeting notes" transcript for a software project meeting.

Requirements:
- 3-5 fictional participants with realistic names and roles (engineer, PM, designer, etc.)
- A real but underspecified technical problem to solve (a web app, tool, or service)
- At least one clear contradiction between what participants said
- At least one unstated assumption that a developer would need to figure out
- Written as informal, casual meeting notes — NOT a product spec
- Include side conversations, tangents, someone leaving early
- No category or difficulty tags
- 300-500 words
- End with an unclear, partial action item list

Also provide a short title (5-10 words) for the challenge.

Respond as JSON: {"title": "...", "brief_markdown": "..."}"""


async def generate_challenge() -> Challenge:
    response = await client.chat.completions.create(
        model=config.BUILDER_MODEL,
        messages=[{"role": "user", "content": GENERATE_PROMPT}],
        response_format={"type": "json_object"},
    )
    import json
    data = json.loads(response.choices[0].message.content or "{}")
    return Challenge(
        title=data.get("title", "Untitled Challenge"),
        brief_markdown=data.get("brief_markdown", ""),
        source="generated",
        time_limit_minutes=30,
    )


SEED_CHALLENGES = [
    {
        "title": "Internal Expense Tracker Nobody Actually Uses",
        "brief_markdown": """# Meeting Notes — Expense Tool Sync
**Date:** last Thursday maybe? The 14th?
**Attendees:** Priya (eng), Dan (PM), Soo-jin (finance), Marcus (dropped off halfway)

---

Dan: Ok so finance keeps complaining that people submit expenses wrong. Like the format is wrong or whatever.

Soo-jin: It's not just format. We have people submitting in the wrong currency, we have receipts that are photos of photos, and honestly half the time the category is just "other."

Priya: Can't we just make a form?

Soo-jin: We have a form. Nobody uses it.

Dan: Right so we want a better form. Or like, an app. Something people will actually open.

Marcus: [joining] Wait what are we building?

Dan: Expense tracker.

Marcus: Oh I thought we were fixing the Jira thing. Never mind. [leaves]

Soo-jin: It needs to handle multiple currencies. Oh and we do reimbursements in USD always, so it needs to convert. But use the rate from when they submitted, not today's rate.

Priya: Where do we get those rates?

Soo-jin: I don't know, wherever. The internet?

Dan: The main thing is just make it simple. Like really simple. But also it needs approval flows.

Priya: ...approval flows are not simple.

Dan: One level of approval. That's it. Manager approves, done.

Soo-jin: Two levels for anything over $500. And receipts are required over $50. Or was it $75? I'll check.

Priya: So do I need auth or can I just hardcode users for now?

Dan: Yeah just hardcode a few users. But make it look real.

**Action items:**
- Priya: build the thing
- Soo-jin: send the threshold numbers (maybe)
- Dan: ??? check with legal about receipt retention""",
        "source": "authored",
        "time_limit_minutes": 30,
    },
    {
        "title": "Real-Time Dashboard for the On-Call Team",
        "brief_markdown": """# Oncall tooling — quick sync
**Who:** Fen (SRE), Adaeze (backend), Tomasz (infra), "and whoever else is lurking"

---

Fen: So the problem is during incidents we're all looking at different things. I'm in Datadog, Adaeze is in the logs, Tomasz is doing his thing with kubectl. Nobody knows what anyone else knows.

Adaeze: An incident war room thing?

Fen: Kind of. Just a page where we can all see the same stuff. Current alerts, who's looking at what, a timeline.

Tomasz: Like a shared whiteboard?

Fen: No, like a real-time page. So if I acknowledge an alert it shows up for you immediately.

Adaeze: Are we pulling from Datadog or are we faking the data?

Fen: Fake it for now. Simulate some alerts coming in. Like, have a thing that generates random fake incidents every few seconds.

Tomasz: What's the data model for an incident?

Fen: I don't know. Name, severity, time, who's on it, status. That's it.

Adaeze: Does it need persistence? Like if I refresh does it reset?

Fen: ...good question. Probably should persist? But honestly if it resets that's fine for the demo.

Tomasz: Should multiple people be able to claim the same incident?

Fen: No, one owner. But anyone can add notes.

Adaeze: Notes as in a text field or like a chat?

Fen: Text field. Keep it simple. [pause] Actually maybe chat. But simple chat.

**TODO:**
- Build the realtime dashboard
- Fake data generator (Fen will spec this out... eventually)
- Figure out if we need auth (probably not for demo)""",
        "source": "authored",
        "time_limit_minutes": 25,
    },
    {
        "title": "Link-in-Bio Page Builder for the Marketing Team",
        "brief_markdown": """# Link page thing — marketing ask
**Date:** Tuesday
**People:** Keiko (marketing), Ravi (eng), Destiny (design, on phone, bad connection)

---

Keiko: So basically we want something like Linktree but ours. For the company socials.

Ravi: Can we just use Linktree?

Keiko: Legal said no. Something about data.

Ravi: Ok. So a page with links.

Keiko: And it should look good. Destiny can you talk about the design?

Destiny: [breaking up] ...yeah so like... brand colors... and the logo should be... [cuts out]

Keiko: Ok we'll sync with Destiny later. Basically it should match our website. Blue and white. Logo at the top.

Ravi: Is there an admin interface or are we hardcoding the links?

Keiko: It needs to be editable. I can't be asking eng every time we want to add a link.

Ravi: So there's a CMS basically.

Keiko: Is that hard?

Ravi: ...it's not nothing.

Keiko: Can it just be like a password-protected page where I edit stuff?

Ravi: Yeah that works. What info per link?

Keiko: Title, URL, maybe an icon? And order them by drag and drop.

Ravi: Drag and drop is going to take a while.

Keiko: Fine, up/down arrows. But it needs to look like drag and drop.

Ravi: Those are different things.

Keiko: Right, up/down is fine.

**Action items:**
- Ravi: build public page + simple admin
- Keiko: get brand colors from Destiny (colors: "definitely blue, probably #0057ff but check with Destiny")
- Analytics? (Keiko wants click counts, Ravi isn't sure if that's in scope)""",
        "source": "authored",
        "time_limit_minutes": 35,
    },
]
