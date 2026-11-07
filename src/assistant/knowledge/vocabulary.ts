// Technology names, their synonyms and how they relate. This is knowledge, not
// logic: add a synonym here and both the index and visitors' questions pick it up.
// Every skill, project tag and project keyword on the site is added as a term
// automatically; list a term here only to give it aliases or implications.
// Concepts rather than products are named in lowercase so they read naturally
// mid-sentence ("where data pipelines show up").

export interface TermDefinition {
  // Display name, as answers show it.
  name: string
  aliases?: string[]
  // Terms this one is a kind of: a C# project is evidence of .NET work.
  // Keep these definitional, never "people who know X usually know Y".
  implies?: string[]
  // Overrides the generated token, for names that are also everyday words. The
  // name itself is then not matched, only the aliases (see text.ts for "Go").
  token?: string
}

export const terms: TermDefinition[] = [
  { name: 'Kubernetes', aliases: ['k8s', 'kube', 'k8'] },
  { name: '.NET', aliases: ['dotnet', 'dot net', '.net core', 'net core', '.net framework', 'asp.net'] },
  { name: 'ASP.NET Core', aliases: ['aspnet core', 'aspnetcore', 'asp net core', 'asp.net mvc'], implies: ['.NET'] },
  { name: 'C#', aliases: ['csharp', 'c sharp'], implies: ['.NET'] },
  // "go" is an everyday word, so only "Go", "golang" or "go" after with/in/know/… count (see text.ts).
  { name: 'Go', aliases: ['golang'], token: 'golang' },
  { name: 'TypeScript', aliases: ['ts'] },
  { name: 'JavaScript', aliases: ['js'] },
  { name: 'Python', aliases: ['py'] },
  { name: 'Bash', aliases: ['shell scripting', 'shell scripts'] },
  { name: 'Azure', aliases: ['microsoft azure', 'azure cloud'] },
  { name: 'Azure DevOps', aliases: ['ado', 'azdo', 'vsts'], implies: ['CI/CD', 'Azure'] },
  { name: 'Azure OpenAI', aliases: ['openai'], implies: ['Azure', 'AI'] },
  { name: 'Azure Cognitive Services', aliases: ['cognitive services'], implies: ['Azure'] },
  { name: 'GitHub Actions', aliases: ['gh actions', 'github action', 'github workflows'], implies: ['CI/CD'] },
  {
    name: 'CI/CD',
    aliases: ['cicd', 'ci cd', 'ci/cd pipelines', 'continuous integration', 'continuous delivery', 'continuous deployment', 'build pipelines', 'deployment pipelines'],
  },
  { name: 'infrastructure as code', aliases: ['iac', 'infra as code', 'infrastructure-as-code'] },
  { name: 'Terraform', implies: ['Infrastructure as Code'] },
  { name: 'GitOps', aliases: ['git ops'] },
  { name: 'ArgoCD', aliases: ['argo cd', 'argo'], implies: ['GitOps', 'Kubernetes'] },
  { name: 'Helm', aliases: ['helm charts', 'helm chart'], implies: ['Kubernetes'] },
  { name: 'Istio', implies: ['Kubernetes', 'Service Mesh'] },
  { name: 'kubectl', implies: ['Kubernetes'] },
  { name: 'Krew', implies: ['kubectl'] },
  { name: 'Docker', aliases: ['containers', 'containerization', 'dockerfile', 'dockerfiles'] },
  {
    name: 'data pipelines',
    aliases: ['data pipeline', 'etl', 'elt', 'data engineering', 'data ingestion', 'ingestion pipelines', 'data workflows'],
  },
  { name: 'Databricks' },
  { name: 'dbt', aliases: ['data build tool'] },
  { name: 'Prefect' },
  { name: 'SignalR', implies: ['ASP.NET Core'] },
  { name: 'Serilog', implies: ['.NET'] },
  { name: 'SQL Server', aliases: ['mssql', 'ms sql', 'microsoft sql server'], implies: ['SQL'] },
  { name: 'Cosmos DB', aliases: ['cosmosdb', 'azure cosmos db'], implies: ['Azure'] },
  { name: 'Redis' },
  { name: 'MCP', aliases: ['model context protocol', 'mcp server', 'mcp servers'] },
  { name: 'AI', aliases: ['artificial intelligence', 'llm', 'llms', 'genai', 'generative ai', 'ai-assisted engineering', 'ai assisted'] },
  { name: 'Claude Code', implies: ['AI'] },
  { name: 'GitHub Copilot', aliases: ['copilot'], implies: ['AI'] },
  { name: 'Apache Ignite', aliases: ['ignite'], implies: ['Caching'] },
  { name: 'caching', aliases: ['cache', 'caches', 'distributed caching', 'distributed cache'] },
  { name: 'HMAC', aliases: ['request signing', 'hmac authentication'] },
  { name: 'security', aliases: ['secure', 'appsec', 'application security'] },
  { name: 'authentication', aliases: ['authentication', 'authorization'] },
  { name: 'logging', aliases: ['logs', 'structured logging'] },
  { name: 'service mesh', aliases: ['mesh'] },
  { name: 'SonarCloud', aliases: ['sonar', 'sonarqube'] },
  { name: 'Stripe' },
  { name: 'Avalara' },
  { name: 'Hangfire' },
  { name: 'SFTP' },
  { name: 'Salesforce' },
  { name: 'platform engineering', aliases: ['platform engineer', 'platform engineers', 'developer platforms', 'developer platform', 'internal developer platform'] },
]

// Broad groups visitors ask about ("what cloud and DevOps tools does he use?").
// An answer lists only the members the knowledge base has evidence for.
export interface CategoryDefinition {
  name: string
  aliases: string[]
  members: string[]
  // A skill group on the site whose members are all listed, evidence or not.
  skillGroup?: string
}

export const categories: CategoryDefinition[] = [
  { name: 'Languages', aliases: ['languages', 'programming languages', 'language'], members: [], skillGroup: 'Languages' },
  { name: 'Frameworks', aliases: ['frameworks', 'framework', 'libraries'], members: [], skillGroup: 'Frameworks' },
  { name: 'Cloud platforms', aliases: ['cloud', 'cloud platforms', 'cloud providers', 'cloud platform'], members: ['Azure', 'Azure OpenAI', 'Azure Cognitive Services', 'Cosmos DB', 'AWS', 'GCP'] },
  {
    name: 'DevOps and infrastructure',
    aliases: ['devops', 'infrastructure', 'infra', 'platform tools', 'platform & cloud'],
    members: ['Kubernetes', 'Docker', 'Helm', 'Terraform', 'ArgoCD', 'Istio', 'GitHub Actions', 'Azure DevOps', 'SonarCloud', 'Docker Scout', 'CI/CD', 'Infrastructure as Code', 'GitOps'],
  },
  { name: 'Databases', aliases: ['databases', 'database', 'data stores', 'datastores', 'db', 'dbs'], members: ['SQL', 'SQL Server', 'Redis', 'Cosmos DB', 'PostgreSQL', 'MySQL', 'MongoDB'] },
  { name: 'Data', aliases: ['data tools', 'data platform', 'data stack'], members: [], skillGroup: 'Data' },
  { name: 'Tools', aliases: ['tooling', 'tools', 'developer tools'], members: [], skillGroup: 'Tooling' },
  { name: 'AI tools', aliases: ['ai tools', 'ai tooling', 'ai coding tools'], members: [], skillGroup: 'AI' },
]

// Technologies the site doesn't mention, so a question about one gets a clear
// "not in the knowledge base" instead of fuzzy matches on lookalike words.
export const unlistedTerms: { name: string; aliases?: string[]; category: string }[] = [
  { name: 'AWS', aliases: ['amazon web services', 'ec2'], category: 'Cloud platforms' },
  { name: 'GCP', aliases: ['google cloud', 'google cloud platform'], category: 'Cloud platforms' },
  { name: 'Java', category: 'Languages' },
  { name: 'Rust', category: 'Languages' },
  { name: 'Ruby', aliases: ['rails', 'ruby on rails'], category: 'Languages' },
  { name: 'PHP', category: 'Languages' },
  { name: 'Kotlin', category: 'Languages' },
  { name: 'Swift', category: 'Languages' },
  { name: 'Scala', category: 'Languages' },
  { name: 'C++', aliases: ['cpp'], category: 'Languages' },
  { name: 'Angular', category: 'Frameworks' },
  { name: 'Vue', aliases: ['vue.js', 'vuejs'], category: 'Frameworks' },
  { name: 'Django', category: 'Frameworks' },
  { name: 'Spring', aliases: ['spring boot'], category: 'Frameworks' },
  { name: 'PostgreSQL', aliases: ['postgres'], category: 'Databases' },
  { name: 'MySQL', category: 'Databases' },
  { name: 'MongoDB', aliases: ['mongo'], category: 'Databases' },
  { name: 'Kafka', category: 'DevOps and infrastructure' },
  { name: 'Ansible', category: 'DevOps and infrastructure' },
  { name: 'Jenkins', category: 'DevOps and infrastructure' },
  { name: 'Pulumi', category: 'DevOps and infrastructure' },
  { name: 'OpenShift', category: 'DevOps and infrastructure' },
  { name: 'Machine Learning', aliases: ['ml', 'deep learning', 'pytorch', 'tensorflow'], category: 'AI tools' },
]
