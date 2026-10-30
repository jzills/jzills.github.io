export interface ExperienceEntry {
  company: string
  role: string
  period: string
  bullets: string[]
}

export const experience: ExperienceEntry[] = [
  {
    company: 'Corient',
    role: 'Senior Platform Engineer',
    period: '2026 – Present',
    bullets: [
      'Build and optimize automated SFTP data pipelines with Prefect, Databricks, and dbt to streamline custodian data ingestion, transformation, and delivery into Azure storage.',
      'Develop an integrated trading platform connecting Addepar, Vestmark, and Salesforce, building data models and workflows with Databricks and dbt to unify investment, trading, and client data.',
      "Modernize the organization's engineering platform by implementing CI/CD practices and establishing Terraform-based Infrastructure as Code for Azure resource management.",
    ],
  },
  {
    company: 'New American Funding',
    role: 'Senior DevOps Engineer',
    period: '2025 – 2026',
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
