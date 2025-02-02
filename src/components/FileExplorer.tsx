import React from "react";
import { FileExplorerRow } from "@/types";
import { sizeFormatter, dateFormatter } from "@/utils";
import { TableVirtuoso } from "react-virtuoso";
import { LucideFile, LucideFolderOpen, LucideServer } from "lucide-react";
import { Separator } from "./ui/separator";
import { cn } from "@/lib/utils";
// import { Menu, MenuItem, MenuItemOptions } from "@tauri-apps/api/menu";

const columnSizes = {
  "col-1": "flex-[2] flex items-center",
  "col-2": "flex-[1] flex items-center",
  "col-3": "flex-[0.5] flex items-center",
  "col-4": "flex-[1] flex items-center",
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

  if (!data.length)
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
          <th className="pl-2">File Name</th>
          <th>File Type</th>
          <th>Size</th>
          <th>Date</th>
        </tr>
      )}
      itemContent={(index, file) => {
        return (
          <>
            <td className="max-w-[300px] truncate pl-2 pr-6" onDoubleClick={() => onRowClick(file)}>
              {file.file_type === "directory" ? (
                <LucideFolderOpen className="inline mr-2 stroke-primary" size={20} />
              ) : (
                <LucideFile className="inline mr-2 stroke-primary" size={20} />
              )}
              {file.file_name}
            </td>
            <td className="max-w-[100px]">{file.file_type}</td>
            <td className="max-w-[100px]">{file.file_type === "directory" ? "" : sizeFormatter(Number(file.size))}</td>
            <td className="max-w-[100px]">{dateFormatter(file.date)}</td>
          </>
        );
      }}
    />
  );

  return (
    <TableVirtuoso
      data={data}
      components={{
        Table: (props) => {
          return (
            <table style={props.style} className="w-full">
              {props.children}
            </table>
          );
        },
        TableHead: (props) => {
          return (
            <>
              <thead className="border-b-2 fixed w-screen z-10">{props.children}</thead>
              {/* <div className="mt-12" /> */}
            </>
          );
        },
        TableBody: (props) => {
          return <tbody className="flex flex-col justify-start">{props.children}</tbody>;
        },
        TableRow: (props) => {
          return (
            <button className="flex justify-center items-center hover:bg-primary/10 animate-in ease-in-out duration-200 focus:bg-primary/40 focus:text-secondary">
              {props.children}
            </button>
          );
        },
      }}
      fixedHeaderContent={() => (
        <tr className="h-10 bg-primary-foreground flex ">
          <th className={cn("ml-4", columnSizes["col-1"])}>File Name</th>
          <th className={columnSizes["col-2"]}>File Type</th>
          <th className={columnSizes["col-3"]}>Size</th>
          <th className={columnSizes["col-4"]}>Date</th>
        </tr>
      )}
      itemContent={(index, file) => {
        return (
          <>
            <td className={cn("gap-3 mt-1 ml-4", columnSizes["col-1"])} onDoubleClick={() => onRowClick(file)}>
              {file.file_type === "directory" ? (
                <LucideFolderOpen size={20} fill="#e5c459" stroke="#bda24a" />
              ) : (
                <LucideFile size={20} fill="#b4b4b4" stroke="#8d8d8d" />
              )}{" "}
              {file.file_name}
            </td>
            <td className={cn("", columnSizes["col-2"])}>{file.file_type}</td>
            <td className={cn("", columnSizes["col-3"])}>{file.file_type === "directory" ? "" : sizeFormatter(Number(file.size))}</td>
            <td className={cn("", columnSizes["col-4"])}>{dateFormatter(file.date)}</td>
          </>
        );
      }}
    />
  );
};
