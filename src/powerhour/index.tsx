import React from "react";
import { createRoot } from "react-dom/client";
import PowerHourHome from "./pages/PowerHourHome";
import "./App.css";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<PowerHourHome />);
}