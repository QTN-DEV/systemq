import { ChevronDown, ChevronRight, File, FilePlus, Folder, FolderOpen, FolderPlus, Trash2 } from "lucide-react";
import { type ReactElement, useState } from "react";
import { Link } from "react-router-dom";

import type { FileNode } from "@/api/__generated__/types.gen";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { client } from "@/api/__generated__/client.gen";

function encodeFilePathForUrl(relativePath: string): string {
  // Encode the entire path including slashes (e.g. /foo/bar.png -> %2Ffoo%2Fbar.png)
  return encodeURIComponent(relativePath.replace(/^\/+/, ""));
}

export type V2FileTreeProps = {
  className?: string;
  nodes: FileNode[] | null | undefined;
  depth?: number;
  /** When set, `.md` files link to the v2 markdown editor. */
  workspaceId?: string;
  onDeletePath?: (args: { relativePath: string; name: string; isFolder: boolean }) => void;
  /** Shown on folder rows: add file (opens tabbed file dialog). */
  onAddFileInFolder?: (args: { folderRelativePath: string }) => void;
  /** Shown on folder rows: add subfolder. */
  onAddFolderInFolder?: (args: { folderRelativePath: string }) => void;
};

export function V2FileTree(props: V2FileTreeProps): ReactElement {
  const { className, nodes, depth = 0, workspaceId, onDeletePath, onAddFileInFolder, onAddFolderInFolder } = props;
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const toggleFolder = (path: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const list = nodes ?? [];
  if (list.length === 0) {
    return (
      <p className={cn("text-muted-foreground pl-1 text-sm", className)}>
        {depth === 0 ? "This workspace is empty." : "Empty folder."}
      </p>
    );
  }

  return (
    <>
      <ul
        className={cn("space-y-0.5", depth > 0 && "mt-0.5 border-muted ml-2 border-l pl-2", depth === 0 && className)}
      >
        {list.map((node) => {
          // Default to uncollapsed (isCollapsed = false)
          const isCollapsed = collapsedFolders[node.relative_path] ?? false;
          const isImage = /\.(png|jpe?g|gif|webp|bmp|ico)$/i.test(node.name);
          const hasRowActions = [
            node.is_folder && onAddFileInFolder != null,
            node.is_folder && onAddFolderInFolder != null,
            onDeletePath != null,
          ].some(Boolean);

          const imageUrl = `${client.getConfig().baseUrl}/workspace_v2/${workspaceId}/files/${encodeFilePathForUrl(node.relative_path)}`;
          console.log({ imageUrl })
          return (
            <li key={node.relative_path} className="min-w-0">
              <div className="group flex min-w-0 items-center gap-1 rounded-md py-0.5 pr-1 transition-colors hover:bg-black/5">
                {node.is_folder && (
                  <button
                    type="button"
                    onClick={() => toggleFolder(node.relative_path)}
                    className="text-muted-foreground hover:text-primary flex h-4 w-4 items-center justify-center rounded-sm transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                )}

                {!node.is_folder && <div className="w-4" />}

                {node.is_folder ? (
                  isCollapsed ? (
                    <Folder className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                  ) : (
                    <FolderOpen className="text-primary h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                  )
                ) : (
                  <File className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                )}

                {workspaceId && !node.is_folder && (node.name.toLowerCase().endsWith(".md") || isImage) ? (
                  isImage ? (
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: imageUrl, name: node.name })}
                      className="text-primary min-w-0 flex-1 truncate text-left text-sm hover:underline"
                      title={node.relative_path}
                    >
                      {node.name}
                    </button>
                  ) : (
                    <Link
                      to={`/workspace-v2/${workspaceId}/files/edit/${encodeFilePathForUrl(node.relative_path)}`}
                      className="text-primary min-w-0 flex-1 truncate text-sm hover:underline"
                      title={node.relative_path}
                    >
                      {node.name}
                    </Link>
                  )
                ) : (
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm select-none",
                      node.is_folder && "cursor-pointer hover:text-primary"
                    )}
                    title={node.relative_path}
                    onClick={() => node.is_folder && toggleFolder(node.relative_path)}
                  >
                    {node.name}
                  </span>
                )}

                {hasRowActions ? (
                  <Separator orientation="vertical" className="mx-0.5 h-4 shrink-0" aria-hidden />
                ) : null}

                <div className="flex shrink-0 items-center gap-0.5">
                  {node.is_folder && onAddFileInFolder ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label={`Add file in ${node.name}`}
                          onClick={() => onAddFileInFolder({ folderRelativePath: node.relative_path })}
                        >
                          <FilePlus className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Add file</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  {node.is_folder && onAddFolderInFolder ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label={`Create subfolder in ${node.name}`}
                          onClick={() => onAddFolderInFolder({ folderRelativePath: node.relative_path })}
                        >
                          <FolderPlus className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>New folder</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  {onDeletePath ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label={node.is_folder ? `Delete folder ${node.name}` : `Delete file ${node.name}`}
                          onClick={() =>
                            onDeletePath({
                              relativePath: node.relative_path,
                              name: node.name,
                              isFolder: node.is_folder,
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Delete{node.is_folder ? " folder" : " file"}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
              </div>
              {node.is_folder && !isCollapsed && node.children && node.children.length > 0 ? (
                <V2FileTree
                  nodes={node.children}
                  depth={depth + 1}
                  workspaceId={workspaceId}
                  onDeletePath={onDeletePath}
                  onAddFileInFolder={onAddFileInFolder}
                  onAddFolderInFolder={onAddFolderInFolder}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      <Dialog open={previewImage !== null} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{previewImage?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[80vh] items-center justify-center overflow-auto p-1">
            {previewImage && (
              <Image
                src={previewImage.url}
                alt={previewImage.name}
                className="h-auto max-w-full rounded-md object-contain shadow-sm"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
