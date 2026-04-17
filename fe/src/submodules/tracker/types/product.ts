export interface TrackerProduct {
  id: string
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

export interface CreateProductPayload {
  key: string
  name: string
  description?: string | null
  status?: string
  owner_id?: string | null
  target_date?: string | null
}

export interface UpdateProductPayload {
  key?: string
  name?: string
  description?: string | null
  status?: string
  owner_id?: string | null
  target_date?: string | null
  deleted_at?: string | null
}
