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
  | 'Internal Ops'
  | 'Business Development'
  | 'Developer'
  | 'Finance'
  | 'Graphic Design'
  | 'Infrastructure'
  | 'Marketing'
  | 'UI/UX'
  | 'Product'
  | 'Ops Support'

// Available positions from the backend enum
export type Position = 
  | 'Admin'
  | 'CEO'
  | 'Internal Ops'
  | 'Div Lead'
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

