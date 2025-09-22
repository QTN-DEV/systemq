import projectsData from '../data/mockProjects.json'
import type { Project } from '../types/project-type'

const projects = projectsData as Project[]

export function getAllProjects(): Project[] {
  return projects
}

export function getProjectById(id: string): Project | undefined {
  return projects.find(p => p.id === id)
}

export function getProjectsByIds(ids: string[]): Project[] {
  const set = new Set(ids)
  return projects.filter(p => set.has(p.id))
}

