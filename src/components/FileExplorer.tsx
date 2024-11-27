// import React from "react";

import { Table, Column, AutoSizer } from "react-virtualized";
import { File } from "@/types";
import { NerdFontIcon } from "@/components/Icons";
import { sizeFormatter, dateFormatter } from "@/utils";
// import "react-virtualized/styles.css";
import "./FileExplorer.css";

export const FileExplorer = ({ data, onRowClick }: { data: File[]; onRowClick: (file: File) => void }) => {
  return (
    <AutoSizer>
      {({ height, width }: any) => (
        <Table
          width={width}
          height={height}
          headerHeight={50}
          rowHeight={30}
          rowCount={data.length}
          onRowDoubleClick={({ rowData }) => onRowClick(rowData)}
          rowGetter={({ index }: any) => data[index]}>
          <Column
            dataKey="file_type"
            width={30}
            flexShrink={1}
            cellRenderer={({ cellData }: any) => <NerdFontIcon unicode={cellData === "directory" ? "f07b" : "f4a5"} />}
          />
          <Column label="File Name" dataKey="file_name" width={300} flexGrow={1} />
          <Column
            cellRenderer={({ cellData }: any) => (cellData === "directory" ? "" : cellData.toLowerCase() + " file")}
            label="File Type"
            dataKey="file_type"
            width={100}
          />
          <Column
            cellRenderer={({ cellData }: any) => (cellData === "directory" ? "" : sizeFormatter(cellData))}
            label="Size"
            dataKey="size"
            width={100}
          />
          <Column cellRenderer={({ cellData }: any) => dateFormatter(cellData)} label="Date" dataKey="date" width={150} />
        </Table>
      )}
    </AutoSizer>
  );
};
