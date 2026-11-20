import { useRef } from 'react'
import type React from 'react'
import { m, useInView } from 'framer-motion'
import { ArrowRight, BookOpen, ExternalLink, Puzzle } from 'lucide-react'
import { GitHubIcon, NuGetIcon, NpmIcon, PyPIIcon, DockerIcon, ArtifactHubIcon } from '@/components/ui/BrandIcons'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { projects } from '@/data/projects'
import { useCenterFocus } from '@/lib/useCenterFocus'
import { slug } from '@/lib/anchors'
import { OSS_URL } from '@/lib/pages'
import { revealOnScroll, rise } from '@/lib/motion'
import type { PackageRegistry } from '@/data/projects'

const registryMeta: Record<PackageRegistry, { label: string; Icon: React.ComponentType<{ size?: number }> }> = {
  nuget:       { label: 'NuGet',       Icon: NuGetIcon       },
  pypi:        { label: 'PyPI',        Icon: PyPIIcon        },
  npm:         { label: 'npm',         Icon: NpmIcon         },
  dockerhub:   { label: 'Docker Hub',  Icon: DockerIcon      },
  artifacthub: { label: 'Artifact Hub', Icon: ArtifactHubIcon },
  krew:        { label: 'Krew',        Icon: Puzzle          },
}

const linkBase = 'inline-flex items-center gap-1.5 text-xs transition-colors'
const linkClass = `${linkBase} text-muted hover:text-fg`
const demoLinkClass = `${linkBase} text-muted hover:text-accent`
// The card's destination link, lit while the card is centred on a phone, as
// hovering the card lights it on desktop.
const destinationClass = (lit: boolean) => `${linkBase} hover:text-fg ${lit ? 'text-fg' : 'text-muted'}`

// Stretched-link pattern: one anchor per card spreads its ::after over the whole
// card, making the card clickable without nesting anchors. The stretched anchor
// must stay unpositioned so inset-0 resolves against the Card (which is relative);
// every other anchor is raised above the overlay to stay clickable on its own.
const stretchClass = 'after:absolute after:inset-0 after:z-10'
const raisedClass = 'relative z-20'

export function Projects() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  // On phones, where the cards stack, the one in the middle of the screen
  // takes the hover look (and grows a touch), since touch has no hover.
  const { focused, itemRef } = useCenterFocus('(max-width: 767px)')

  return (
    <section id="projects" ref={ref} className="py-24 px-6 border-t border-border">
      <div className="max-w-[1100px] mx-auto">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <SectionHeading
            label="Open Source"
            heading="Projects"
            subheading="Libraries, tools, and utilities — born from problems I actually had."
          />

          <m.div {...revealOnScroll} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project, index) => {
              // Docs are the card's destination when they exist, GitHub otherwise.
              const docsIsStretched = Boolean(project.docsUrl)
              const centred = focused === index

              return (
                <m.div key={project.name} variants={rise}>
                  <Card
                    ref={itemRef(index)}
                    id={`project-${slug(project.name)}`}
                    hover
                    active={centred}
                    className={`relative h-full ${centred ? 'scale-[1.03] motion-reduce:scale-100' : ''}`}
                  >
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

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-[1em] border-t border-border">
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${project.name} on GitHub`}
                          className={docsIsStretched ? `${linkClass} ${raisedClass}` : `${destinationClass(centred)} ${stretchClass}`}
                        >
                          <GitHubIcon size={13} />
                          GitHub
                        </a>
                        {project.docsUrl && (
                          <a
                            href={project.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${project.name} documentation`}
                            className={`${destinationClass(centred)} ${stretchClass}`}
                          >
                            <BookOpen size={13} />
                            Docs
                          </a>
                        )}
                        {project.packages?.map(({ registry, url, title }) => {
                          const { label, Icon } = registryMeta[registry]
                          return (
                            <a
                              key={registry}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`${project.name} on ${label}`}
                              title={title}
                              className={`${linkClass} ${raisedClass}`}
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
                            className={`${demoLinkClass} ${raisedClass}`}
                          >
                            <ExternalLink size={13} />
                            Demo
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                </m.div>
              )
            })}
          </m.div>

          {/* A selection lives here; the whole catalogue is on its own site. */}
          <a
            href={OSS_URL}
            className="group mt-8 flex w-fit mx-auto items-center gap-1.5 text-sm text-accent hover:text-accent-dim transition-colors"
          >
            All open source
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </m.div>
      </div>
    </section>
  )
}
