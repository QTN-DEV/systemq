export type EmploymentType = 'full-time' | 'part-time' | 'intern'

export type Position = 'CEO' | 'Internal Ops' | 'HR' | 'PM' | 'Div. Lead' | 'Team Member'

export interface User {
  id: string
  name: string
  email: string
  title: string
  division: string
  level: string
  position: Position
  subordinates: string[]
  projects: string[]
  avatar: string
  employmentType?: EmploymentType
}

