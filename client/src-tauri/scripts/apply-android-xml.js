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

const appType = process.argv[2] || "flomo";

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
  console.log("✅ AndroidManifest.xml networkSecurityConfig modified");
}

const deepLinkIntent = `
        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="${appType}" android:host="oidc" android:path="/callback" />
        </intent-filter>
    </activity>`;

if (!manifest.includes(`android:scheme="${appType}"`)) {
  // find the last occurrence of </activity> that is associated with the main activity
  // and inject the deep link intent-filter before it
  // usually the main activity is the one that contains the intent filter with action MAIN
  if (manifest.includes("android.intent.action.MAIN")) {
    manifest = manifest.replace("</activity>", deepLinkIntent);
    writeFileSync(manifestPath, manifest);
    console.log(
      `✅ Deep Link (${appType}://) injected into AndroidManifest.xml`,
    );
  } else {
    console.error("❌ Could not find MainActivity to inject Deep Link");
  }
}
