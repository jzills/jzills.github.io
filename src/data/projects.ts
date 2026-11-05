export type PackageRegistry = 'nuget' | 'pypi' | 'npm' | 'dockerhub' | 'artifacthub' | 'krew'

export interface PackageLink {
  registry: PackageRegistry
  url: string
  title?: string
}

export interface Project {
  name: string
  description: string
  tags: string[]
  githubUrl: string
  demoUrl?: string
  docsUrl?: string
  packages?: PackageLink[]
  // Searched like tags but never shown, so cards keep a short chip row.
  keywords?: string[]
}

export const projects: Project[] = [
  {
    name: 'hmac-manager',
    description: 'Cross-platform HMAC authentication tooling for .NET — middleware, handlers, and validation utilities. Extends to Kubernetes via an Istio external authorizer, bringing HMAC validation into the service mesh.',
    tags: ['C#', '.NET', 'Security', 'Auth'],
    keywords: ['Istio', 'Kubernetes', 'Helm', 'Docker', 'TypeScript', 'ASP.NET Core', 'Middleware', 'API', 'Request Signing', 'Service Mesh', 'ext-authz', 'Operator'],
    githubUrl: 'https://github.com/jzills/hmac-manager',
    docsUrl: 'https://jzills.github.io/hmac-manager/',
    packages: [
      { registry: 'nuget',       url: 'https://www.nuget.org/packages/HmacManager/', title: 'dotnet add package HmacManager' },
      { registry: 'npm',         url: 'https://www.npmjs.com/package/hmac-manager', title: 'npm install hmac-manager' },
      { registry: 'dockerhub',   url: 'https://hub.docker.com/r/zills/hmac-manager', title: 'docker pull zills/hmac-manager' },
      { registry: 'artifacthub', url: 'https://artifacthub.io/packages/helm/zills/hmac-manager', title: 'helm repo add zills https://jzills.github.io/hmac-manager\nhelm install hmac-manager zills/hmac-manager' },
    ],
  },
  {
    name: 'kx',
    description: 'Kubectl workflow accelerator with index-based resource selection — eliminate repetitive name copying from kubectl output.',
    tags: ['Go', 'Kubernetes', 'CLI'],
    keywords: ['kubectl', 'k8s', 'Krew', 'Plugin', 'Terminal', 'DevOps', 'MCP'],
    githubUrl: 'https://github.com/jzills/kx',
    docsUrl: 'https://jzills.github.io/kx/',
    packages: [
      { registry: 'pypi', url: 'https://pypi.org/project/kx-cli/', title: 'pip install kx-cli' },
      { registry: 'krew', url: 'https://krew.sigs.k8s.io/plugins/', title: 'kubectl krew install idx' },
    ],
  },
  {
    name: 'snoop',
    description: 'Local AI agent session monitoring — watch sessions in real time or inspect past ones to understand costs, file changes, and time spent. Reads existing agent transcripts without modifying them or sending data off your machine.',
    tags: ['AI', 'Claude', 'Go', 'CLI', 'Agent Monitoring'],
    keywords: ['Claude Code', 'AI Agents', 'Observability', 'Cost Tracking', 'Transcripts', 'TUI', 'Terminal'],
    githubUrl: 'https://github.com/jzills/snoop',
    docsUrl: 'https://jzills.github.io/snoop/',
  },
  {
    name: 'serilog-sinks-aspnetcore-app-signalr',
    description: 'Serilog sink that pushes structured log events to SignalR hubs for real-time log streaming.',
    tags: ['C#', 'Serilog', 'SignalR', 'Logging'],
    keywords: ['.NET', 'ASP.NET Core', 'NuGet', 'Real-time', 'Structured Logging', 'Sink'],
    githubUrl: 'https://github.com/jzills/serilog-sinks-aspnetcore-app-signalr',
    packages: [
      { registry: 'nuget', url: 'https://www.nuget.org/packages/Serilog.Sinks.AspNetCore.App.SignalR/', title: 'dotnet add package Serilog.Sinks.AspNetCore.App.SignalR' },
    ],
  },
  {
    name: 'claude-marketplace',
    description: 'AI-powered development and DevOps automation tools built as marketplace extensions.',
    tags: ['TypeScript', 'AI', 'DevOps', 'Automation'],
    keywords: ['Claude Code', 'Plugins', 'Skills', 'Agents', 'Git', 'Workflow'],
    githubUrl: 'https://github.com/jzills/claude-marketplace',
  },
  {
    name: 'action-cache',
    description: 'Flexible caching library for ASP.NET Core with support for multiple cache providers and invalidation strategies.',
    tags: ['C#', '.NET', 'ASP.NET Core', 'Caching'],
    keywords: ['Redis', 'SQL Server', 'Cosmos DB', 'Azure', 'Memory Cache', 'Invalidation', 'MVC', 'Response Caching'],
    githubUrl: 'https://github.com/jzills/action-cache',
    docsUrl: 'https://jzills.github.io/action-cache/',
    packages: [
      { registry: 'nuget', url: 'https://www.nuget.org/packages/ActionCache/', title: 'dotnet add package ActionCache' },
    ],
  },
]
