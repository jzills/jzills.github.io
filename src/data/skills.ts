export interface SkillGroup {
  label: string
  skills: string[]
}

export const skillGroups: SkillGroup[] = [
  {
    label: 'Languages',
    skills: ['C#', 'TypeScript', 'JavaScript', 'Python', 'Bash', 'SQL'],
  },
  {
    label: 'Platform & Cloud',
    skills: ['Kubernetes', 'Docker', 'Helm', 'Terraform', 'Azure', 'ArgoCD'],
  },
  {
    label: 'Frameworks',
    skills: ['.NET', 'ASP.NET Core', 'React', 'SignalR'],
  },
  {
    label: 'Tooling',
    skills: ['GitHub Actions', 'Azure DevOps', 'SonarCloud', 'Docker Scout'],
  },
]
