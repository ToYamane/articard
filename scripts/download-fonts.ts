import { writeFileSync, statSync } from "fs";
import { join } from "path";

const FONTS_DIR = join(__dirname, "..", "fonts");

interface FontEntry {
  // Direct URL to the TTF file on GitHub (google/fonts repository)
  url: string;
  filename: string;
}

// These URLs point to the actual TTF files in the google/fonts GitHub repository.
// This is the canonical source for full, non-subsetted TTF files.
const FONTS: FontEntry[] = [
  {
    url: "https://github.com/google/fonts/raw/main/ofl/delagothicone/DelaGothicOne-Regular.ttf",
    filename: "DelaGothicOne-Regular.ttf",
  },
  {
    url: "https://github.com/google/fonts/raw/main/ofl/dotgothic16/DotGothic16-Regular.ttf",
    filename: "DotGothic16-Regular.ttf",
  },
  {
    url: "https://github.com/google/fonts/raw/main/ofl/hachimarupop/HachiMaruPop-Regular.ttf",
    filename: "HachiMaruPop-Regular.ttf",
  },
  {
    url: "https://github.com/google/fonts/raw/main/ofl/kaiseitokumin/KaiseiTokumin-Bold.ttf",
    filename: "KaiseiTokumin-Bold.ttf",
  },
  {
    url: "https://github.com/google/fonts/raw/main/ofl/kiwimaru/KiwiMaru-Medium.ttf",
    filename: "KiwiMaru-Medium.ttf",
  },
  {
    url: "https://github.com/google/fonts/raw/main/ofl/reggaeone/ReggaeOne-Regular.ttf",
    filename: "ReggaeOne-Regular.ttf",
  },
  {
    url: "https://github.com/google/fonts/raw/main/ofl/stick/Stick-Regular.ttf",
    filename: "Stick-Regular.ttf",
  },
  {
    url: "https://github.com/google/fonts/raw/main/ofl/yujisyuku/YujiSyuku-Regular.ttf",
    filename: "YujiSyuku-Regular.ttf",
  },
];

async function downloadFont(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function validateTtf(buf: Buffer, filename: string): void {
  if (buf.length < 100) {
    throw new Error(`File too small: ${buf.length} bytes`);
  }

  // Check for HTML content (indicates we got a web page instead of font)
  const start = buf.toString("utf8", 0, Math.min(100, buf.length));
  if (start.includes("<!DOCTYPE") || start.includes("<html") || start.includes("<HTML")) {
    throw new Error(`Downloaded HTML instead of font data`);
  }

  // Check TTF magic bytes
  const head = buf.readUInt32BE(0);
  const isTtf =
    head === 0x00010000 || // TrueType
    head === 0x74727565 || // "true" (Apple TrueType)
    head === 0x4f54544f;   // "OTTO" (OpenType/CFF)

  if (!isTtf) {
    throw new Error(
      `Invalid TTF header: 0x${head.toString(16).padStart(8, "0")} (expected 0x00010000, "true", or "OTTO")`
    );
  }

  // Japanese fonts should be at least 1MB
  if (buf.length < 500_000) {
    console.warn(
      `  WARNING: ${filename} is only ${(buf.length / 1024).toFixed(0)} KB - expected > 1 MB for Japanese font`
    );
  }
}

async function main() {
  console.log("Downloading fonts from google/fonts GitHub repository...\n");

  let successCount = 0;

  for (const font of FONTS) {
    try {
      console.log(`[${font.filename}] Downloading...`);
      console.log(`  URL: ${font.url}`);

      const data = await downloadFont(font.url);
      validateTtf(data, font.filename);

      const outPath = join(FONTS_DIR, font.filename);
      writeFileSync(outPath, data);

      const size = statSync(outPath).size;
      const sizeMB = (size / 1024 / 1024).toFixed(2);
      console.log(`  Saved: ${sizeMB} MB (${size.toLocaleString()} bytes)`);
      console.log(`  OK`);
      console.log("");
      successCount++;
    } catch (err) {
      console.error(`  ERROR: ${err}`);
      console.log("");
    }
  }

  console.log(
    `\nResult: ${successCount}/${FONTS.length} fonts downloaded successfully.`
  );

  if (successCount < FONTS.length) {
    process.exit(1);
  }
}

main();
