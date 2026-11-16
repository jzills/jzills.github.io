import type { LucideIcon } from 'lucide-react'
import { Bot, Box, Cloud, Database, Hash, Infinity as InfinityIcon, Network, Orbit } from 'lucide-react'
import {
  siArgo, siClaude, siCursor, siDatabricks, siDbt, siDocker, siDotnet, siGithubactions, siGithubcopilot,
  siGnubash, siGo, siHelm, siKubernetes, siModelcontextprotocol, siPrefect, siPython, siReact,
  siRedis, siSonar, siTerraform, siTypescript,
} from './brandLogos'

// The logo beside each skill and the colour it lights up in. Official logos
// come from Simple Icons; Microsoft's (C#, Azure, ASP.NET) aren't there, so
// those get a generic icon in the brand's colour. `color` is left out for
// brands whose colour is black, which would vanish on the dark theme; those
// light up in the text colour instead.
export type SkillIcon = { color?: string } & ({ path: string } | { Icon: LucideIcon })

const brand = (icon: { path: string; hex: string }): SkillIcon => {
  const n = parseInt(icon.hex, 16)
  const luminance = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
  return { path: icon.path, color: luminance < 0.2 ? undefined : `#${icon.hex}` }
}

const MICROSOFT_BLUE = '#0078D4'
const DOTNET_PURPLE = '#7B5CD6'

export const skillIcons: Record<string, SkillIcon> = {
  'C#': { Icon: Hash, color: DOTNET_PURPLE },
  Go: brand(siGo),
  TypeScript: brand(siTypescript),
  Python: brand(siPython),
  Bash: brand(siGnubash),
  SQL: { Icon: Database },
  Kubernetes: brand(siKubernetes),
  Docker: brand(siDocker),
  Helm: { ...brand(siHelm), color: '#277A9F' },
  Terraform: brand(siTerraform),
  Azure: { Icon: Cloud, color: MICROSOFT_BLUE },
  ArgoCD: brand(siArgo),
  '.NET': { ...brand(siDotnet), color: DOTNET_PURPLE },
  'ASP.NET Core': { ...brand(siDotnet), color: DOTNET_PURPLE },
  React: brand(siReact),
  SignalR: { Icon: Network, color: DOTNET_PURPLE },
  Databricks: brand(siDatabricks),
  dbt: brand(siDbt),
  Prefect: brand(siPrefect),
  Redis: brand(siRedis),
  'Azure Cosmos DB': { Icon: Orbit, color: MICROSOFT_BLUE },
  'GitHub Actions': brand(siGithubactions),
  'Azure DevOps': { Icon: InfinityIcon, color: MICROSOFT_BLUE },
  SonarCloud: brand(siSonar),
  'Docker Scout': brand(siDocker),
  'Claude Code': brand(siClaude),
  'GitHub Copilot': brand(siGithubcopilot),
  Cursor: brand(siCursor),
  'Agent SDKs': { Icon: Bot },
  MCP: brand(siModelcontextprotocol),
}

// Kept so an unmapped skill still gets something.
export const fallbackSkillIcon: SkillIcon = { Icon: Box }
