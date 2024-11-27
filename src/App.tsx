import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { File } from "./types";
import { sortFilesByName } from "@/utils";
import { FileExplorer } from "@/components/FileExplorer";
import "./App.css";

const appWindow = getCurrentWindow();

const Titlebar = () => {
  return (
    <>
      <div data-tauri-drag-region className="titlebar">
        <div className="titlebar-button" id="titlebar-minimize" onClick={() => appWindow.minimize()}>
          <img src="https://api.iconify.design/mdi:window-minimize.svg" alt="minimize" />
        </div>
        <div className="titlebar-button" id="titlebar-maximize" onClick={() => appWindow.toggleMaximize()}>
          <img src="https://api.iconify.design/mdi:window-maximize.svg" alt="maximize" />
        </div>
        <div className="titlebar-button" id="titlebar-close" onClick={() => appWindow.close()}>
          <img src="https://api.iconify.design/mdi:close.svg" alt="close" />
        </div>
      </div>
      <div style={{ height: "50px" }}></div>
    </>
  );
};

function App() {
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isConnected) {
      handleConnect(e);
    } else {
      handleDisconnect();
    }
  };

  const handleConnect = (e: React.FormEvent<HTMLFormElement>) => {
    const address = e.currentTarget.address.value + ":" + (e.currentTarget.port.value || "21");

    invoke("connect_ftp_server", {
      address: address,
      username: e.currentTarget.username.value,
      password: e.currentTarget.password.value,
    })
      .then((res) => {
        const sortedFiles = sortFilesByName(res as File[]);
        sortedFiles.unshift({ file_name: "..", file_type: "directory", date: "", size: "0" } as File);

        setIsConnected(true);
        setError("");
        setFiles(sortedFiles);
      })
      .catch(setError);
  };

  const handleDisconnect = () => {
    invoke("disconnect_ftp_server")
      .then(() => {
        setIsConnected(false);
        setFiles([]);
        setError("");
      })
      .catch((err) => console.error(err));
  };

  const handleRowClick = (rowData: File) => {
    if (rowData.file_type === "directory") {
      invoke("change_directory", { directory: rowData.file_name })
        .then((res) => {
          const sortedFiles = sortFilesByName(res as File[]);
          sortedFiles.unshift({ file_name: "..", file_type: "directory", date: "", size: "0" } as File);
          setFiles(sortedFiles);
        })
        .catch((err) => console.error(err));
    }
  };

  return (
    <main>
      <section id="content">
        <Titlebar />

        <form onSubmit={handleSubmit}>
          <h1>Linea</h1>
          <div>
            <div>
              <label>Address</label>
              <input name="address" type="text" placeholder="address" required defaultValue={"10.0.0.220"} />
              :
              <input style={{ width: "50px" }} name="port" type="text" placeholder="port" required defaultValue={"5000"} />
            </div>
            <div>
              <label>Username</label>
              <input name="username" type="text" placeholder="username" required defaultValue={"bt"} />
            </div>
            <div>
              <label>Password</label>
              <input name="password" type="password" placeholder="password" required defaultValue={"bt"} />
            </div>
          </div>

          <div>
            <button type="submit">{isConnected ? "Disconnect" : "Connect"}</button>
          </div>
        </form>

        {error && <p>{error}</p>}

        {/* Explorer */}
        <div id="explorer">
          <FileExplorer data={files} onRowClick={handleRowClick} />
        </div>
      </section>
    </main>
  );
}

export default App;
