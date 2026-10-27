# Claude Code

Lisez START_HERE.md et AGENTS.md : ce sont les instructions communes du projet.
Le chat Claude intégré existe (`connectors/agents/claude.ts`, expérimental, testé
sous macOS avec Claude Code 2.1.311) : il ne fait que proposer des tokens, sans
outil ni MCP, et l’étudiante valide le diff. Ce Claude Code de terminal est
distinct : il modifie le starter avec vos propres permissions, ce qui ne valide
pas l’adaptateur embarqué. Pour les tokens, lisez explicitement
`.agents/skills/token-change/SKILL.md`. N’importez aucun cache de compte.
