import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

function Root() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return <App />;
}

createRoot(document.getElementById("root")!).render(<Root />);
