import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus, FolderPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  createWorkspaceFileWorkspaceV2WorkspaceIdDriveFilePostMutation,
  createWorkspaceFolderWorkspaceV2WorkspaceIdDriveFolderPostMutation,
  deleteWorkspacePathWorkspaceV2WorkspaceIdFilesFilePathDeleteMutation,
  getWorkspaceTreeWorkspaceV2WorkspaceIdTreeGetOptions,
  getWorkspaceTreeWorkspaceV2WorkspaceIdTreeGetQueryKey,
  uploadFileToWorkspaceWorkspaceV2WorkspaceIdDriveUploadPostMutation,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AddFileInFolderDialog,
  CreateFolderInFolderDialog,
  DeletePathDialog,
  V2FileTree,
} from "@/components/workspace-v2";
import { cn } from "@/lib/utils";
import { DEFAULT_MARKDOWN } from "@/lib/workspace-v2-defaults";

function joinFolderAndName(folderRelativePath: string, name: string): string {
  const seg = name.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!seg || seg.includes("/")) {
    return "";
  }
  const base = folderRelativePath.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!base) {
    return `/${seg}`;
  }
  return `/${[...base.split("/").filter(Boolean), seg].join("/")}`;
}

function toApiPath(path: string): string {
  return path.replace(/^\/+/, "");
}

export type WorkspaceV2FilesTabProps = {
  className?: string;
};

export function WorkspaceV2FilesTab(props: WorkspaceV2FilesTabProps) {
  const { className } = props;
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const [pathToDelete, setPathToDelete] = useState<{
    relativePath: string;
    name: string;
    isFolder: boolean;
  } | null>(null);
  const [addFileInFolder, setAddFileInFolder] = useState<{
    folderRelativePath: string;
  } | null>(null);
  const [addFolderIn, setAddFolderIn] = useState<{
    folderRelativePath: string;
  } | null>(null);

  const id = workspaceId?.trim() ?? "";

  const { data, isLoading, isError } = useQuery({
    ...getWorkspaceTreeWorkspaceV2WorkspaceIdTreeGetOptions({
      path: { workspace_id: id },
    }),
    enabled: id.length > 0,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const tree = data?.result ?? null;

  const invalidateTree = (): void => {
    void queryClient.invalidateQueries({
      queryKey: getWorkspaceTreeWorkspaceV2WorkspaceIdTreeGetQueryKey({
        path: { workspace_id: id },
      }),
    });
  };

  useEffect(() => {
    window.addEventListener("focus", invalidateTree);
    return () => window.removeEventListener("focus", invalidateTree);
    // invalidateTree is intentionally excluded — it is recreated each render
    // but its identity doesn't affect the focus listener registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, queryClient]);

  const createFolderMutation = useMutation({
    ...createWorkspaceFolderWorkspaceV2WorkspaceIdDriveFolderPostMutation(),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error("Could not create folder");
        return;
      }
      toast.success("Folder created");
      setAddFolderIn(null);
      invalidateTree();
    },
    onError: () => {
      toast.error("Could not create folder");
    },
  });

  const createMdMutation = useMutation({
    ...createWorkspaceFileWorkspaceV2WorkspaceIdDriveFilePostMutation(),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error("Could not create file");
        return;
      }
      toast.success("File created");
      setAddFileInFolder(null);
      invalidateTree();
    },
    onError: () => {
      toast.error("Could not create file");
    },
  });

  const uploadMutation = useMutation({
    ...uploadFileToWorkspaceWorkspaceV2WorkspaceIdDriveUploadPostMutation(),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error("Could not upload file");
        return;
      }
      toast.success("File uploaded");
      setAddFileInFolder(null);
      invalidateTree();
    },
    onError: () => {
      toast.error("Could not upload file");
    },
  });

  const isMutatingItem =
    createFolderMutation.isPending ||
    createMdMutation.isPending ||
    uploadMutation.isPending;

  const deletePathMutation = useMutation({
    ...deleteWorkspacePathWorkspaceV2WorkspaceIdFilesFilePathDeleteMutation(),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error("Could not delete item");
        return;
      }
      toast.success("Deleted");
      setPathToDelete(null);
      invalidateTree();
    },
    onError: () => {
      toast.error("Could not delete item");
    },
  });

  if (!workspaceId) {
    return null;
  }

  if (isError) {
    return (
      <div className={cn("p-4 md:p-6", className)}>
        <p className="text-muted-foreground text-sm">
          This workspace was not found or you don&apos;t have access.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn("min-h-0 flex-1 overflow-auto p-4 md:p-6 outline-none", className)}
        onFocus={() => invalidateTree()}
        tabIndex={-1}
      >
        <div className="mb-3 flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label="New file in root"
                onClick={() => setAddFileInFolder({ folderRelativePath: "" })}
              >
                <FilePlus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>New file</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label="New folder in root"
                onClick={() => setAddFolderIn({ folderRelativePath: "" })}
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>New folder</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading file tree…</p>
        ) : (
          <V2FileTree
            workspaceId={id}
            nodes={tree}
            onAddFileInFolder={(p) => setAddFileInFolder(p)}
            onAddFolderInFolder={(p) => setAddFolderIn(p)}
            onDeletePath={(p) => setPathToDelete(p)}
          />
        )}

        <AddFileInFolderDialog
          open={addFileInFolder !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAddFileInFolder(null);
            }
          }}
          folderRelativePath={addFileInFolder?.folderRelativePath ?? ""}
          isSubmitting={isMutatingItem}
          onCreateMarkdown={(fileName) => {
            if (!addFileInFolder) {
              return;
            }
            const full = joinFolderAndName(
              addFileInFolder.folderRelativePath,
              fileName,
            );
            if (!full) {
              toast.error("Invalid file name");
              return;
            }
            createMdMutation.mutate({
              path: { workspace_id: id },
              body: {
                path: toApiPath(full),
                content: DEFAULT_MARKDOWN,
              },
            });
          }}
          onUpload={(file) => {
            if (!addFileInFolder) {
              return;
            }
            const full = joinFolderAndName(
              addFileInFolder.folderRelativePath,
              file.name,
            );
            if (!full) {
              toast.error("Invalid path");
              return;
            }
            uploadMutation.mutate({
              path: { workspace_id: id },
              body: { file, path: toApiPath(full) },
            });
          }}
        />

        <CreateFolderInFolderDialog
          open={addFolderIn !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAddFolderIn(null);
            }
          }}
          folderRelativePath={addFolderIn?.folderRelativePath ?? ""}
          isSubmitting={isMutatingItem}
          onConfirm={(folderName) => {
            if (!addFolderIn) {
              return;
            }
            const full = joinFolderAndName(
              addFolderIn.folderRelativePath,
              folderName,
            );
            if (!full) {
              toast.error("Invalid folder name");
              return;
            }
            createFolderMutation.mutate({
              path: { workspace_id: id },
              body: { path: toApiPath(full) },
            });
          }}
        />

        <DeletePathDialog
          open={pathToDelete !== null}
          onOpenChange={(open) => {
            if (!open) {
              setPathToDelete(null);
            }
          }}
          name={pathToDelete?.name ?? ""}
          isFolder={pathToDelete?.isFolder ?? false}
          isDeleting={deletePathMutation.isPending}
          onConfirm={() => {
            if (!pathToDelete) {
              return;
            }
            deletePathMutation.mutate({
              path: {
                workspace_id: id,
                file_path: pathToDelete.relativePath,
              },
            });
          }}
        />
      </div>
    </TooltipProvider>
  );
}
