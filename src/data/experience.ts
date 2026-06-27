export interface ExperienceEntry {
  company: string
  role: string
  period: string
  bullets: string[]
}

export const experience: ExperienceEntry[] = [
  {
    company: 'New American Funding',
    role: 'Senior DevOps Engineer',
    period: '2025 – Present',
    bullets: [
      'Led Kubernetes adoption across engineering teams — designed cluster architecture, authored Helm charts, and established GitOps workflows with ArgoCD.',
      'Built Terraform-based infrastructure automation for Azure environments, reducing provisioning time and enforcing compliance through policy as code.',
      'Designed and maintained CI/CD pipelines with GitHub Actions and Azure DevOps, integrating SonarCloud and Docker Scout for code quality and security scanning.',
    ],
  },
  {
    company: 'Information Technology Partners',
    role: 'Software Developer',
    period: '2018 – 2025',
    bullets: [
      'Worked across a large-scale enterprise portal — building .NET MVC interfaces, integrating payment processing with Stripe and Avalara, and automating recurring workflows with Hangfire.',
      'Introduced distributed caching with Apache Ignite to reduce server load and improve responsiveness across high-traffic areas of the platform.',
      'Built a real-time security API using .NET and SignalR with Azure OpenAI for email scanning, and extended the platform with multilingual support via Azure Cognitive Services.',
    ],
  },
]
