import React from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileExplorerRow } from "./types";
import { sortFilesByName, sortFilesByType } from "@/utils";
import { FileExplorer } from "@/components/FileExplorer";
import { Titlebar } from "./components/Titlebar";
import { ConnectModal } from "./components/ConnectModal";
import "./Global.css";
import { MenuBar } from "./components/MenuBar";

function App() {
  const [files, setFiles] = React.useState<FileExplorerRow[]>([]);
  const [showConnectModal, setShowConnectModal] = React.useState(true);

  const handleRowClick = (rowData: FileExplorerRow) => {
    if (rowData.file_type === "directory") {
      invoke("change_directory", { directory: rowData.file_name })
        .then((res) => {
          const sortedFiles = sortFilesByType(sortFilesByName(res as FileExplorerRow[]));
          sortedFiles.unshift({ file_name: "..", file_type: "directory", date: "", size: "0" } as FileExplorerRow);
          setFiles(sortedFiles);
        })
        .catch((err) => console.error(err));
    }
  };

  const handleOnConnect = (files: FileExplorerRow[]) => {
    setFiles(files);
    setShowConnectModal(false);
  };

  const handleTitleBarClick = (item) => {
    console.log(showConnectModal);
    if (!showConnectModal) setShowConnectModal(item === "connect");
  };

  return (
    <main className="bg-primary-foreground pr-2">
      <Titlebar onMenuClickItem={handleTitleBarClick} />

      <section id="content" className="h-full flex flex-col relative">
        {/* <MenuBar /> */}

        <ConnectModal show={showConnectModal} onConnected={handleOnConnect} onOpenChange={setShowConnectModal} />

        {/* Explorer */}
        <div className="flex-1 m-2">
          <FileExplorer data={files} onRowClick={handleRowClick} />
        </div>
      </section>
    </main>
  );
}

export default App;
