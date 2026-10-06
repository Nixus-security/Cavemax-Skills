# CAVEMAX in chat apps (claude.ai, ChatGPT, Gemini, …)

Chat apps have **no file system or hooks** — there's nothing to install. Instead
you paste the CAVEMAX ruleset once into a **persistent instructions field**
(custom instructions / style / saved info / a Gem), and it applies to every new
conversation.

> The `npx` installer and Claude Code hooks are for *coding agents*. For chat
> apps, use the copy-paste prompt below.

## The prompt to paste

This condensed version fits every app's instruction box (~1000 chars). It's also
in [`assets/cavemax-chat-prompt.md`](../assets/cavemax-chat-prompt.md).

```text
Always answer in CAVEMAX hyper-compression mode: far fewer output tokens, technical content preserved.

RULES: drop articles, filler, pleasantries, hedging, subjects/pronouns, and copulas (is/are) when meaning stays clear. Use glyphs: → then/leads-to, ∵ because, ∴ therefore, w/ with, ≈ approx, ≠ not, & and. Abbreviate prose words (fn cfg req res err db auth impl repo dep ctx). Digits, not number words. Lists/tables over prose, one idea per line. No preamble, no restating the question, no closing summary unless asked.

NEVER compress — write exact and in full: code blocks, error messages, identifiers / API names / file paths / commands, numbers / units / versions, security warnings, irreversible-action confirmations (delete, drop, force-push), and order-sensitive steps. Drop back to plain prose for those, then resume.

LEVELS: say "cavemax safe" (~70%, readable), "cavemax max" (~85-90%, default), "cavemax brutal" (~90%+, extreme), or "cavemax mute" (~99%: reply ONLY yes / no / done — or oui / non / fait; if something is urgent, ONE short sentence, max 15 words). "normal mode" turns it off.
```

For fields with no length limit (Claude Projects, Custom GPTs, Gemini Gems) you
can paste the **full** ruleset from [`skills/cavemax/SKILL.md`](../skills/cavemax/SKILL.md)
instead, for slightly stronger adherence.

---

## Claude (claude.ai web / desktop)

Pick whichever scope you want. Menu labels may shift slightly between versions.

### Option A — Custom Style *(recommended, applies everywhere)*

1. Open any chat. Near the message box, click the **style selector** (the
   "Normal / Concise / Explanatory" control).
2. Choose **Create & Edit Styles → Create custom style**.
3. When asked to describe the style, paste the **prompt** above.
4. Name it `CAVEMAX`, save.
5. Select **CAVEMAX** as the active style. It now applies to new chats; switch
   back to Normal anytime.

### Option B — Profile preferences *(global, all chats)*

1. **Settings → Profile** (or **Settings → Personalization**).
2. Find **"What personal preferences should Claude consider in responses?"**
3. Paste the prompt. Save.

### Option C — Project instructions *(one project only)*

1. Create or open a **Project**.
2. **Edit project instructions** / **Set custom instructions**.
3. Paste the prompt (or the full `SKILL.md`). Every chat in that project uses it.

### Option D — Single conversation

Paste the prompt as your **first message**. Applies to that chat only.

---

## ChatGPT (chatgpt.com)

### Custom Instructions *(global)*

1. **Profile menu → Settings → Personalization → Custom instructions**.
2. In **"How would you like ChatGPT to respond?"**, paste the prompt. Save.

### Project / Custom GPT *(scoped)*

- **Project:** create a Project → **Instructions** → paste.
- **Custom GPT:** **Explore GPTs → Create → Configure → Instructions** → paste →
  save. Use that GPT when you want CAVEMAX.

---

## Gemini (gemini.google.com)

### Saved info *(global)*

1. **Settings → Saved info** (a.k.a. *Personal context*).
2. Add a note containing the prompt. Save.

### Gem *(scoped, recommended for Gemini)*

1. Open **Gems → New Gem** (Gem manager).
2. Paste the prompt (or full `SKILL.md`) into **Instructions**.
3. Name it `CAVEMAX`, save. Chat inside that Gem for compressed answers.

---

## Other chat apps (Grok, Copilot, Mistral, Perplexity, …)

Most have a **custom instructions** or **system prompt** field in settings —
paste the prompt there. If there's none, paste it as the **first message** of a
conversation.

---

## Using it

- **Switch level mid-chat:** type `cavemax safe`, `cavemax max`, `cavemax brutal`, or `cavemax mute`.
- **Turn off:** type `normal mode` or `stop cavemax`.
- **If it drifts back to verbose** (long chats can push instructions out of the
  model's attention): re-send `cavemax max`. Coding agents avoid this with a
  per-turn hook; chat apps rely on the app keeping your instructions in context.
- **Accuracy is preserved everywhere:** code, errors, identifiers, numbers, and
  security/destructive warnings are never compressed — by design.
