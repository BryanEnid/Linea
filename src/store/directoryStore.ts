import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { FileExplorerRow } from "@/types";
import { getSavePath, sortFilesByName, sortFilesByType } from "@/utils";

interface DirectoryStoreState {
  files: FileExplorerRow[];
  currentPath: string;

  setFiles: (files: FileExplorerRow[]) => void;

  refreshFiles: () => Promise<void>;
  deleteFiles: (fileNames: string[]) => Promise<void>;
  downloadFile: (file: FileExplorerRow) => Promise<void>;
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
  downloadFile: async (file: FileExplorerRow) => {
    const { filePath } = await getSavePath(file);
    invoke("download_file", { fileName: file.file_name, toPath: filePath })
      .then((msg) => console.log(msg))
      .catch((err) => console.error("Download error:", err));

    // Listen for completion
    listen("download_complete", (event) => {
      console.log("Download finished:", event.payload);
      alert(event.payload); // Show a message
    });
  },
  uploadFile: async (file: File) => {},
}));

const sortFiles = (files: FileExplorerRow[]) => {
  const sortedFiles = sortFilesByType(sortFilesByName(files));
  sortedFiles.unshift({ file_name: "..", file_type: "directory", date: "", size: "0" } as FileExplorerRow);
  return sortedFiles;
};
