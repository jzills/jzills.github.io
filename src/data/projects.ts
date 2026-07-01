export type PackageRegistry = 'nuget' | 'pypi' | 'npm' | 'dockerhub' | 'artifacthub'

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
    name: 'hmac-manager',
    description: 'Cross-platform HMAC authentication tooling for .NET — middleware, handlers, and validation utilities. Extends to Kubernetes via an Istio external authorizer, bringing HMAC validation into the service mesh.',
    tags: ['C#', '.NET', 'Security', 'Auth'],
    githubUrl: 'https://github.com/jzills/hmac-manager',
    packages: [
      { registry: 'nuget',       url: 'https://www.nuget.org/packages/HmacManager/' },
      { registry: 'npm',         url: 'https://www.npmjs.com/package/hmac-manager' },
      { registry: 'dockerhub',   url: 'https://hub.docker.com/r/zills/hmac-manager' },
      { registry: 'artifacthub', url: 'https://artifacthub.io/packages/helm/zills/hmac-manager' },
    ],
  },
  {
    name: 'kx',
    description: 'Kubectl workflow accelerator with index-based resource selection — eliminate repetitive name copying from kubectl output.',
    tags: ['Python', 'Kubernetes', 'CLI'],
    githubUrl: 'https://github.com/jzills/kx',
    packages: [
      { registry: 'pypi', url: 'https://pypi.org/project/kx-cli/' },
    ],
  },
  {
    name: 'serilog-sinks-aspnetcore-app-signalr',
    description: 'Serilog sink that pushes structured log events to SignalR hubs for real-time log streaming.',
    tags: ['C#', 'Serilog', 'SignalR', 'Logging'],
    githubUrl: 'https://github.com/jzills/serilog-sinks-aspnetcore-app-signalr',
    packages: [
      { registry: 'nuget', url: 'https://www.nuget.org/packages/Serilog.Sinks.AspNetCore.App.SignalR/' },
    ],
  },
  {
    name: 'claude-marketplace',
    description: 'AI-powered development and DevOps automation tools built as marketplace extensions.',
    tags: ['TypeScript', 'AI', 'DevOps', 'Automation'],
    githubUrl: 'https://github.com/jzills/claude-marketplace',
  },
  {
    name: 'action-cache',
    description: 'Flexible caching library for ASP.NET Core with support for multiple cache providers and invalidation strategies.',
    tags: ['C#', '.NET', 'ASP.NET Core', 'Caching'],
    githubUrl: 'https://github.com/jzills/action-cache',
    packages: [
      { registry: 'nuget', url: 'https://www.nuget.org/packages/ActionCache/' },
    ],
  },
]
