# Second Brain - Overlord Ops Floor Edition

Transferred UI and agent architecture from Money-Ai-dashboard PR #7.

## Key Features

### Agent Architecture
- **BaseAgent**: Core class for all agents with schema validation (Zod)
- **HermesManager**: Strategic orchestrator
- **DennisAgent**: Research & Ideation specialist
- **BunkAgent**: Production & Design specialist
- **PlatformAgents**: Specialized agents for e-commerce platforms

### UI Components
- **Overlord Ops Floor**: Cyberpunk-themed 3-column dashboard
- **Hex-Grid Map**: Central mission visualization with flow lines
- **Agent Roster**: Left sidebar with RPG-style stats and progression
- **Quest Panel**: Right sidebar for mission tracking and upgrades
- **Ticker Log**: Real-time activity log at bottom

### RPG Progression System
- Agent Levels & XP
- Ranks (CMD-3, RSC-2, etc.)
- Unlockable Perks at level milestones
- Treasury economy with upgrades
- Achievements system

### Mission Pipeline
1. Brainstorm (Hermes)
2. Research & Ideation (Dennis)
3. Production & Copy (Bunk)
4. Publishing Pass (Platform Specialist)
5. Early Signal (Comment Analyst)

## File Structure

```
├── agents-config.js          # All agent definitions with stats
├── agents/
│   ├── baseAgent.js         # Base class with schema validation
│   ├── hermesManager.js
│   ├── dennisAgent.js
│   ├── bunkAgent.js
│   ├── commentAnalystAgent.js
│   ├── platformAgents.js    # Factory for platform specialists
│   └── promptUtils.js       # Template loading and filling
└── prompts/
    ├── hermes/orchestration.md
    ├── dennis/research.md
    ├── bunk/production.md
    ├── comment_analyst/analysis.md
    └── platforms/generic.md
```

## Agent Personas
- **Balanced**: Neutral, measured approach
- **Aggressive**: Fast-paced, high-risk strategy
- **Academic**: Research-driven, methodical
- **Creative**: Innovative, unconventional
- **Skeptical**: Careful, verification-focused

## Persistence
- Agent stats (levels, XP, ranks, perks)
- Treasury and market upgrades
- Mission archive
- Achievements
- Strategic context (Hermes memory)
