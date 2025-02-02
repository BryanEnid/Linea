import React from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileExplorerRow } from "./types";
import { sortFilesByName, sortFilesByType } from "@/utils";
import { FileExplorer } from "@/components/FileExplorer";
import { Titlebar } from "./components/Titlebar";
import { ConnectModal } from "./components/ConnectModal";
import { useConnectStore } from "./store/connectStore";
import { useDirectoryStore } from "./store/directoryStore";
import "./Global.css";

function App() {
  // const [files, setFiles] = React.useState<FileExplorerRow[]>([]);
  const [showConnectModal, setShowConnectModal] = React.useState(true);
  const { connected } = useConnectStore();
  const { files, setFiles } = useDirectoryStore();

  React.useEffect(() => {
    if (!connected && files.length > 0) setFiles([]);
  }, [connected]);

  const handleRowClick = (rowData: FileExplorerRow) => {
    if (rowData.file_type === "directory") {
      invoke("change_directory", { directory: rowData.file_name })
        .then(setFiles)
        .catch((err) => console.error(err));
    }
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

        <ConnectModal show={showConnectModal} onConnected={() => setShowConnectModal(false)} onOpenChange={setShowConnectModal} />

        {/* Explorer */}
        <div className="flex-1 m-2">
          <FileExplorer data={files} onRowClick={handleRowClick} />
        </div>
      </section>
    </main>
  );
}

export default App;
