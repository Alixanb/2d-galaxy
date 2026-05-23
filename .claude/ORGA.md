Don’t think of “Claude Code” as a persistent entity that you interact with. Claude Code is, essentially, an “agent harness” that lets you spawn and control agents. By default, that’s the “conversation” agent that it always auto-spawns, but it’s an agent maker/manager, not an agent.

Agents are ephemeral instances that are born, do work, and expire. Each new instance is spawned with an initial “context” payload taking up minimal space in its “context window”, which then fills up with “tokens” as it proceed with its work. (You don’t want to think of Claude a fixed “car” you own and drive around in. It’s more like an “Uber for agents”.)

When an instance’s context window is full, it is time for that instance to expire. Use “/config” to TURN OFF AUTO-COMPACT. Once you get to 75% or so of an instance’s token window, tell it to “Generate a machine-readable handoff document that the next instance can use to seamlessly resume this work”. Use those exact words put that wording in a scrap file, and use it over and over again. (Until you learn how to make custom slash commands. ;) )

Always, always work through externally-defined sources of truth detailed, machine-readable text documents that any given instance can simply read, figure out what to work on next, and fill in the details on what’s it’s done as it progresses. That is the operating paradigm you always want to use, and is evolving as the current best-practice: (1) Generate a detailed requirements document, and then (2) keep unleashing agents to each read it, work from it, and keep it greedily updated as they proceed. That is exactly what Anthropic has done with the native Plan mode, and that is exactly what they just did with the new Task model. Don’t just let them do it for you, though aggressively encourage CC to spawn machine-readable tracker docs dedicated to your specific current objective, and it will maintain a dedicated list of current refactoring tasks, documents to be processed, whatever.

Finally, as you’ve probably already gathered…ALWAYS have Claude generate machine-readable documents when they are meant to be consumed and maintained by future Claude instances. That is because of a simple, but incredibly important distinction, that you absolutely must understand if you are new to CC:

LLMs parse machine-readable document deterministically

LLMs parse markdown documents probabilistically

That means that when you give a list of 10 requirements to a new instance in JSON, XML, YAML/TOML or even CSV, it’s going to spin up a dedicated module of Python code to iterate through that list and parse it deterministically. It may then use reasoning to respond to an item in that list, but you can rely on it to traverse the list correctly.

If you give the same instance the same list of requirements, but as a list of markdown bullets, it will process the list probabilistically. It’s going to reason through it, and while it will almost certainly traverse the list from top to bottom, there’s absolutely no guarantee that it correctly follow every instruction you’re just hoping. I hate that.

That distinction shows up the double-edged sword of probabilistic coding: It is f-cking MAGIC…but it is simply not reliable. You must design everything you do around the assumption that agents will not necessarily follow markdown instructions, so that everything is either (a) governed deterministically, or (b) ensured by failsafes that it was done correctly and completely. That is simply our new reality.
