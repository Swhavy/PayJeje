// scripts/enable-totp.js
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf8"),
);

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();

async function enableTOTP() {
  await auth.projectConfigManager().updateProjectConfig({
    multiFactorConfig: {
      providerConfigs: [
        {
          state: "ENABLED",
          totpProviderConfig: {
            adjacentIntervals: 5,
          },
        },
      ],
    },
  });

  console.log("✅ TOTP MFA enabled on Firebase project");
}

enableTOTP().catch(console.error);
