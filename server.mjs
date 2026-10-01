import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import AdmZip from "adm-zip";
import express from "express";

const app = express();
const port = Number(process.env.PORT || 8080);
const siteRoot = path.join(os.tmpdir(), "freehotels-site");

function prepareSite() {
  fs.rmSync(siteRoot, { recursive: true, force: true });
  fs.mkdirSync(siteRoot, { recursive: true });

  const b64 = fs.readFileSync(new URL("./site.b64", import.meta.url), "utf8").replace(/\s+/g, "");
  const zipBuffer = Buffer.from(b64, "base64");
  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(siteRoot, true);

  const index = path.join(siteRoot, "index.html");
  if (!fs.existsSync(index)) {
    throw new Error("FREEHOTELS_BOOT_FAIL: extracted site has no index.html");
  }
}

prepareSite();

app.get("/health", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

app.use(express.static(siteRoot, {
  index: "index.html",
  extensions: ["html"],
  fallthrough: true,
  maxAge: "1h"
}));

app.use((req, res) => {
  const notFound = path.join(siteRoot, "404.html");
  if (fs.existsSync(notFound)) return res.status(404).sendFile(notFound);
  return res.status(404).type("text/plain").send("Not found");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`FREEHOTELS_READY port=${port} siteRoot=${siteRoot}`);
});
