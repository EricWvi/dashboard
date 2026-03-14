import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const genDir = join(__dirname, "../gen/android");
const manifestPath = join(genDir, "app/src/main/AndroidManifest.xml");
const resXmlDir = join(genDir, "app/src/main/res/xml");
const patchFilePath = join(
  __dirname,
  "../android-patches/network_security_config.xml",
);
const targetFilePath = join(resXmlDir, "network_security_config.xml");

if (!existsSync(resXmlDir)) {
  mkdirSync(resXmlDir, { recursive: true });
}
copyFileSync(patchFilePath, targetFilePath);
console.log("✅ network_security_config.xml injected");

// read and modify AndroidManifest.xml
let manifest = readFileSync(manifestPath, "utf8");

// check if the manifest already includes the networkSecurityConfig attribute
if (!manifest.includes("android:networkSecurityConfig")) {
  // append at the end of <application tag
  manifest = manifest.replace(
    "<application",
    '<application\n        android:networkSecurityConfig="@xml/network_security_config"',
  );
  writeFileSync(manifestPath, manifest);
  console.log("✅ AndroidManifest.xml modified");
}
