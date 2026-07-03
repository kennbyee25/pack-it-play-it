import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import './instrumentation/otel';

createRoot(document.getElementById("root")!).render(<App />);
