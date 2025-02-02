import React from "react";
import { FileExplorerRow } from "@/types";
import { sizeFormatter, dateFormatter } from "@/utils";
import { TableVirtuoso } from "react-virtuoso";
import { LucideDownload, LucideFile, LucideFolderOpen, LucideFolderPlus, LucideRotateCw, LucideServer, LucideTrash } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "./ui/context-menu";
import { useDirectoryStore } from "@/store/directoryStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";

const columnSizes = {
  "col-1": "flex-[2] flex items-center",
  "col-2": "flex-[1] flex items-center",
  "col-3": "flex-[0.5] flex items-center",
  "col-4": "flex-[1] flex items-center",
};

const FileContextMenuActions = ({ fileName }) => {
  const { deleteFiles, refreshFiles, downloadFile } = useDirectoryStore();
  const deleteRef = React.useRef(null);

  return (
    <>
      <AlertDialog>
        <ContextMenu>
          <ContextMenuTrigger className="flex">{fileName}</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem className="flex items-center" onClick={() => downloadFile(fileName)}>
              <LucideDownload className="mr-2 mb-[2px] h-4 w-4" />
              Download
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem className="flex items-center">
              <LucideFolderPlus className="mr-2 mb-[2px] h-4 w-4" /> Create Folder
            </ContextMenuItem>
            <ContextMenuItem className="flex items-center" onClick={refreshFiles}>
              <LucideRotateCw className="mr-2 mb-[2px] h-4 w-4" /> Refresh
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem className="flex items-center text-destructive" onClick={() => deleteRef.current.click()}>
              <LucideTrash className="mr-2 mb-[2px] h-4 w-4" />
              Delete
            </ContextMenuItem>
            <ContextMenuItem>Rename</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <AlertDialogTrigger asChild>
          <Button className="hidden " ref={deleteRef} />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <span className="whitespace-nowrap px-1.5 py-1 bg-muted rounded-md">{fileName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => deleteFiles([fileName])}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const FileExplorer = ({ data, onRowClick }: { data: FileExplorerRow[]; onRowClick: (file: FileExplorerRow) => void }) => {
  // React.useEffect(() => {
  //   (async () => {
  //     const menu = await Menu.new();
  //     const menuItem = await MenuItem.new({ text: "Test" });
  //     menu.insert([menuItem], 0);
  //     // await menu.popup();
  //   })();
  // }, []);

  React.useEffect(() => {
    document.addEventListener("contextmenu", (event) => event.preventDefault());
  }, []);

  if (data.length <= 1)
    return (
      <>
        <div className="flex flex-col gap-4 h-full items-center justify-center opacity-30">
          <LucideServer size={64} className="text-primary" />
          Connect to a server to view files
        </div>
      </>
    );

  return (
    <TableVirtuoso
      data={data}
      components={{
        TableHead: ({ children, style, ...props }) => (
          <thead {...props} className="z-10 sticky top-0 w-full text-left">
            {children}
          </thead>
        ),
        Table: (props) => <table className="w-full">{props.children}</table>,
        TableRow: ({ children, ...props }) => (
          <tr {...props} className="hover:bg-primary/10 animate-in ease-in-out duration-200 focus:bg-primary/40 focus:text-secondary">
            {children}
          </tr>
        ),
      }}
      fixedHeaderContent={() => (
        <tr className="bg-primary-foreground">
          <th></th>
          <th>File Name</th>
          <th>File Type</th>
          <th>Size</th>
          <th>Date</th>
        </tr>
      )}
      itemContent={(index, file) => {
        return (
          <>
            <td className="pl-2 max-w-[20px]">
              {file.file_type === "directory" ? (
                <LucideFolderOpen className="inline mr-2 stroke-primary" size={20} />
              ) : (
                <LucideFile className="inline mr-2 stroke-primary" size={20} />
              )}
            </td>
            <td className="max-w-[300px] truncate pr-6 cursor-pointer select-none" onDoubleClick={() => onRowClick(file)}>
              <FileContextMenuActions fileName={file.file_name} />
            </td>
            <td className="max-w-[100px]">{file.file_type}</td>
            <td className="max-w-[100px]">{file.file_type === "directory" ? "" : sizeFormatter(Number(file.size))}</td>
            <td className="max-w-[100px]">{dateFormatter(file.date)}</td>
          </>
        );
      }}
    />
  );
};
