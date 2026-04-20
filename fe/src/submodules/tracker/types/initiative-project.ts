export interface InitiativeProject {
  id: string
  product_id: string
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
  product_id: string
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
