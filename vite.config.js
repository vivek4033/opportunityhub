import fs from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Employers page reads /directory.json, generated from scan/sources.json (the same list the daily scan uses),
// so there's one list to maintain.
const FIELDS = ["slug", "name", "track", "subcategory", "url", "recruitment_url", "location", "offices", "fresher_program"];
// Notes written for the scanner (blocked pages, things to re-check) aren't shown to friends.
const INTERNAL = /block|robots|fetch|could ?n[o']t|not (be )?read|readable|verif|carried over|this run|general knowledge|captcha|JS[- ]|javascript|search/i;
const directory = () => {
  const { sources } = JSON.parse(fs.readFileSync("scan/sources.json", "utf8"));
  return JSON.stringify({
    organisations: sources.map((s) => {
      const o = Object.fromEntries(FIELDS.filter((k) => s[k] != null && s[k] !== "" && !(Array.isArray(s[k]) && !s[k].length)).map((k) => [k, s[k]]));
      if (o.notes && INTERNAL.test(o.notes)) delete o.notes;
      return o;
    }),
  });
};
const directoryPlugin = {
  name: "directory-json",
  configureServer(server) {
    server.middlewares.use("/directory.json", (_req, res) => { res.setHeader("Content-Type", "application/json"); res.end(directory()); });
  },
  generateBundle() { this.emitFile({ type: "asset", fileName: "directory.json", source: directory() }); },
};

export default defineConfig({ plugins: [react(), directoryPlugin], server: { port: 5173 } });
