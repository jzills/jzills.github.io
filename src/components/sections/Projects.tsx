import { useRef } from 'react'
import type React from 'react'
import { motion, useInView } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { GitHubIcon, NuGetIcon, NpmIcon, PyPIIcon, DockerIcon, ArtifactHubIcon } from '@/components/ui/BrandIcons'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { projects } from '@/data/projects'
import type { PackageRegistry } from '@/data/projects'

const registryMeta: Record<PackageRegistry, { label: string; Icon: React.ComponentType<{ size?: number }> }> = {
  nuget:       { label: 'NuGet',       Icon: NuGetIcon       },
  pypi:        { label: 'PyPI',        Icon: PyPIIcon        },
  npm:         { label: 'npm',         Icon: NpmIcon         },
  dockerhub:   { label: 'Docker Hub',  Icon: DockerIcon      },
  artifacthub: { label: 'Artifact Hub', Icon: ArtifactHubIcon },
}

export function Projects() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  return (
    <section id="projects" ref={ref} className="py-24 px-6 border-t border-border">
      <div className="max-w-[1100px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <SectionHeading
            label="Open Source"
            heading="Projects"
            subheading="Libraries, tools, and utilities built for real engineering problems."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Card key={project.name} hover>
                <div className="flex flex-col h-full gap-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-fg mb-2">{project.name}</h3>
                    <p className="text-sm text-muted leading-relaxed">{project.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {project.tags.map((tag) => (
                      <Chip key={tag} label={tag} />
                    ))}
                  </div>

                  <div className="flex items-center gap-4 pt-[1em] border-t border-border">
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${project.name} on GitHub`}
                      className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors"
                    >
                      <GitHubIcon size={13} />
                      GitHub
                    </a>
                    {project.packages?.map(({ registry, url }) => {
                      const { label, Icon } = registryMeta[registry]
                      return (
                        <a
                          key={registry}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${project.name} on ${label}`}
                          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors"
                        >
                          <Icon size={13} />
                          {label}
                        </a>
                      )
                    })}
                    {project.demoUrl && (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
                      >
                        <ExternalLink size={13} />
                        Demo
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
