import React, { useState } from "react";

interface PowerHourFormProps {
  addClip: (url: string) => Promise<void>;
  isLoading: boolean;
}

export const PowerHourForm: React.FC<PowerHourFormProps> = ({
  addClip,
  isLoading,
}) => {
  const [input, setInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await addClip(input.trim());
    setInput("");
  };

  return (
    <form className="ph-form" onSubmit={handleSubmit}>
      <input
        className="ph-input"
        type="text"
        placeholder="Paste YouTube URL or search..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isLoading}
      />
      <button className="ph-btn" type="submit" disabled={isLoading}>
        {isLoading ? "Adding..." : "Add Clip"}
      </button>
    </form>
  );
};