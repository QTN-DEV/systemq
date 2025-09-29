export type PermissionLevel = 'viewer' | 'editor'

export interface DocumentPermission {
  user_id: string
  user_name: string
  user_email: string
  permission: PermissionLevel
}

export interface DivisionPermission {
  division: string
  permission: PermissionLevel
}

export interface DocumentPermissions {
  user_permissions: DocumentPermission[]
  division_permissions: DivisionPermission[]
}

export interface AddUserPermissionRequest {
  user_id: string
  user_name: string
  user_email: string
  permission: PermissionLevel
}

export interface AddDivisionPermissionRequest {
  division: string
  permission: PermissionLevel
}

// Available divisions from the backend enum
export type Division = 
  | 'Marketing'
  | 'Graphic Design'
  | 'Developer'
  | 'UI/UX'
  | 'Internal Ops'

// Available positions from the backend enum
export type Position = 
  | 'CEO'
  | 'Internal Ops'
  | 'HR'
  | 'Div. Lead'
  | 'PM'
  | 'Team Member'

export interface User {
  id: string
  name: string
  email: string
  division: Division
  position: Position
  avatar?: string
}

export interface SearchUserResult {
  id: string
  name: string
  email: string
  division: Division
  position: Position
  avatar?: string
}

