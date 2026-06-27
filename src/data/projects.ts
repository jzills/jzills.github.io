export type PackageRegistry = 'nuget' | 'pypi' | 'npm'

export interface PackageLink {
  registry: PackageRegistry
  url: string
}

export interface Project {
  name: string
  description: string
  tags: string[]
  githubUrl: string
  demoUrl?: string
  packages?: PackageLink[]
}

export const projects: Project[] = [
  {
    name: 'Kx',
    description: 'Kubectl workflow accelerator with index-based resource selection — eliminate repetitive name copying from kubectl output.',
    tags: ['Python', 'Kubernetes', 'CLI'],
    githubUrl: 'https://github.com/jzills/Kx',
    packages: [
      { registry: 'pypi', url: 'https://pypi.org/project/kx-cli/' },
    ],
  },
  {
    name: 'Claude Marketplace',
    description: 'AI-powered development and DevOps automation tools built as marketplace extensions.',
    tags: ['TypeScript', 'AI', 'DevOps', 'Automation'],
    githubUrl: 'https://github.com/jzills',
  },
  {
    name: 'ActionCache',
    description: 'Flexible caching library for ASP.NET Core with support for multiple cache providers and invalidation strategies.',
    tags: ['C#', '.NET', 'ASP.NET Core', 'Caching'],
    githubUrl: 'https://github.com/jzills/ActionCache',
    packages: [
      { registry: 'nuget', url: 'https://www.nuget.org/packages/ActionCache/' },
    ],
  },
  {
    name: 'HmacManager',
    description: 'Cross-platform HMAC authentication tooling for .NET — middleware, handlers, and validation utilities.',
    tags: ['C#', '.NET', 'Security', 'Auth'],
    githubUrl: 'https://github.com/jzills/HmacManager',
    packages: [
      { registry: 'nuget', url: 'https://www.nuget.org/packages/HmacManager/' },
      { registry: 'npm',   url: 'https://www.npmjs.com/package/hmac-manager' },
    ],
  },
  {
    name: 'Serilog SignalR Sink',
    description: 'Serilog sink that pushes structured log events to SignalR hubs for real-time log streaming.',
    tags: ['C#', 'Serilog', 'SignalR', 'Logging'],
    githubUrl: 'https://github.com/jzills/Serilog.Sinks.AspNetCore.App.SignalR',
    packages: [
      { registry: 'nuget', url: 'https://www.nuget.org/packages/Serilog.Sinks.AspNetCore.App.SignalR/' },
    ],
  },
]
