import { BrowserRouter, Routes as ReactRoutes, Route } from "react-router";
import App from "@/App";

export const Routes = () => {
  return (
    <BrowserRouter>
      <ReactRoutes>
        <Route path="/" element={<App />} />
      </ReactRoutes>
    </BrowserRouter>
  );
};
