import { File, FilePlus, Folder, FolderPlus, Trash2 } from "lucide-react";
import { type ReactElement } from "react";
import { Link } from "react-router-dom";

import type { FileNode } from "@/api/__generated__/types.gen";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function encodeFilePathForUrl(relativePath: string): string {
  return relativePath.split("/").map((p) => encodeURIComponent(p)).join("/");
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
  const list = nodes ?? [];
  if (list.length === 0) {
    return (
      <p className={cn("text-muted-foreground pl-1 text-sm", className)}>
        {depth === 0 ? "This workspace is empty." : "Empty folder."}
      </p>
    );
  }

  return (
    <ul
      className={cn("space-y-0.5", depth > 0 && "mt-0.5 border-muted ml-2 border-l pl-2", depth === 0 && className)}
    >
      {list.map((node) => {
        const hasRowActions = [
          node.is_folder && onAddFileInFolder != null,
          node.is_folder && onAddFolderInFolder != null,
          onDeletePath != null,
        ].some(Boolean);
        return (
        <li key={node.relative_path} className="min-w-0">
          <div className="group flex min-w-0 items-center gap-1 rounded-md py-0.5 pr-1">
            {node.is_folder ? (
              <Folder className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            ) : (
              <File className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            )}
            {!node.is_folder &&
            workspaceId &&
            node.name.toLowerCase().endsWith(".md") ? (
              <Link
                to={`/workspace-v2/${workspaceId}/files/edit/${encodeFilePathForUrl(node.relative_path)}`}
                className="text-primary min-w-0 flex-1 truncate text-sm hover:underline"
                title={node.relative_path}
              >
                {node.name}
              </Link>
            ) : (
              <span className="min-w-0 flex-1 truncate text-sm" title={node.relative_path}>
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
          {node.is_folder && node.children && node.children.length > 0 ? (
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
  );
}
