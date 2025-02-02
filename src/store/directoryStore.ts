import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { FileExplorerRow } from "@/types";
import { sortFilesByName, sortFilesByType } from "@/utils";

interface DirectoryStoreState {
  files: FileExplorerRow[];
  currentPath: string;

  setFiles: (files: FileExplorerRow[]) => void;

  refreshFiles: () => Promise<void>;
  deleteFiles: (fileNames: string[]) => Promise<void>;
  downloadFile: (fileName: string) => Promise<void>;
}

export const useDirectoryStore = create<DirectoryStoreState>((set) => ({
  // Getters
  files: [],
  currentPath: "",

  // Setters
  setFiles: (files: FileExplorerRow[]) => {
    const sortedFiles = sortFiles(files);
    set({ files: sortedFiles });
  },

  // Actions
  refreshFiles: async () => {
    const files: FileExplorerRow[] = await invoke("refresh_files");
    const sortedFiles = sortFiles(files);
    set({ files: sortedFiles });
  },
  deleteFiles: async (fileNames: string[]) => {
    await invoke("delete_files", { fileNames });
    await useDirectoryStore.getState().refreshFiles();
  },
  downloadFile: async (fileName: string) => {
    const res = await invoke("download_file", { fileName });
    console.log(res);
  },
}));

const sortFiles = (files: FileExplorerRow[]) => {
  const sortedFiles = sortFilesByType(sortFilesByName(files));
  sortedFiles.unshift({ file_name: "..", file_type: "directory", date: "", size: "0" } as FileExplorerRow);
  return sortedFiles;
};
