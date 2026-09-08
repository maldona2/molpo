// Ids que dejó la siembra, para que los specs no los adivinen.
import { readFileSync } from "node:fs";

export const tickets: { completo: number; pelado: number; ajeno: number } = JSON.parse(
  readFileSync("e2e/.estado/tickets.json", "utf8"),
);
