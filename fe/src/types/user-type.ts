export type EmploymentType = 'full-time' | 'part-time' | 'intern'

export type Position = 'Admin' | 'CEO' | 'Internal Ops' | 'Div Lead' | 'PM' | 'Team Member'

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

