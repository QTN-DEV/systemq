/** Path to the Markdown editor for a workspace file (relative path may contain `/`). */
export function workspaceMarkdownEditPath(workspaceId: string, fileRelativePath: string): string {
  const p = fileRelativePath.replace(/^\/+/, "");
  return `/workspaces/${workspaceId}/files/edit/${p}`;
}
