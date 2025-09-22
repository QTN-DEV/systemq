export type EmploymentType = 'full-time' | 'part-time' | 'intern'

export interface User {
  id: string
  name: string
  email: string
  title: string
  division: string
  level: string
  position: string
  subordinates: string[]
  projects: string[]
  avatar: string
  employmentType?: EmploymentType
}

