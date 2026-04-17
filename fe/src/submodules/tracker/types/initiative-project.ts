export interface InitiativeProject {
  id: string
  initiative_id: string
  key: string
  name: string
  description: string | null
  status: string
  owner_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateInitiativeProjectPayload {
  initiative_id: string
  key: string
  name: string
  description?: string | null
  status?: string
  owner_id?: string | null
}

export interface UpdateInitiativeProjectPayload {
  key?: string
  name?: string
  description?: string | null
  status?: string
  owner_id?: string | null
  deleted_at?: string | null
}
