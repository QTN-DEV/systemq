export interface TrackerInitiative {
  id: string
  product_id: string
  key: string
  name: string
  description: string | null
  status: string
  owner_id: string | null
  target_date: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateInitiativePayload {
  product_id: string
  key: string
  name: string
  description?: string | null
  status?: string
  owner_id?: string | null
  target_date?: string | null
}

export interface UpdateInitiativePayload {
  key?: string
  name?: string
  description?: string | null
  status?: string
  owner_id?: string | null
  target_date?: string | null
  deleted_at?: string | null
}
