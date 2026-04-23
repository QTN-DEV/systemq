export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
}

export interface WorkspaceFileEntry {
  id: string;
  isFolder: boolean;
  name: string;
  mimeType: string;
}

export interface WorkspaceFilesResponse {
  previous: string | null;
  result: WorkspaceFileEntry[];
}

export interface WorkspaceUploadResponse {
  path: string;
}

export interface SkillPayload {
  name: string;
  content: string;
}
