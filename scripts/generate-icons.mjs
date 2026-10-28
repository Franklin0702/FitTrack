import sharp from "sharp";
import { readFile } from "node:fs/promises";
const source = await readFile(new URL("../assets/brand.svg", import.meta.url));
await sharp(source).resize(1024).png().toFile("assets/icon.png");
await sharp(source).resize(64).png().toFile("assets/favicon.png");
const leaf = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><g fill="none" stroke="white" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"><path d="M680 335C448 294 315 398 355 565s372 166 325-230Z"/><path d="M367 676 574 468M450 593V510"/></g></svg>',
);
await sharp(leaf).png().toFile("assets/adaptive-icon.png");
