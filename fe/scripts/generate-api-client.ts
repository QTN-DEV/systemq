// @ts-nocheck
import { createClient } from "@hey-api/openapi-ts";

createClient({
  input: "http://localhost:47430/openapi.json",
  output: "src/api/__generated__",
  plugins: ["@tanstack/react-query"],
  dryRun: false,
});
