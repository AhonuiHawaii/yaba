<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card rounded="sm" elevation="2" class="mb-3">
          <v-card-item class="pa-4 pb-0">
            <template #prepend>
              <v-icon color="primary" size="20" :opacity="0.7">mdi-shield-lock-outline</v-icon>
            </template>
            <v-card-title class="text-h6 font-weight-bold pl-2">Privacy Policy</v-card-title>
          </v-card-item>

          <v-card-text class="pt-3 text-body-2" style="line-height: 1.7">
            <v-alert
              type="success"
              variant="flat"
              icon="mdi-lan-disconnect"
              class="mb-4"
              border="start"
            >
              <div class="font-weight-bold mb-1">Your data never leaves this device.</div>
              <div class="text-body-2">
                YABA does not transmit, sync, or upload any of your financial data to any server,
                website, cloud, or third party. There are no accounts, no telemetry, and no
                analytics.
              </div>
            </v-alert>

            <p class="mb-1 text-caption text-medium-emphasis">
              Effective Date: May 22, 2026 &middot; Last Updated: May 22, 2026
            </p>

            <p class="font-weight-bold text-body-1 mt-3 mb-2">1. Introduction</p>
            <p class="mb-3">
              This Privacy Policy describes the data practices of YABA ("Yet Another Budget App,"
              "the Application," "we," "us," or "our"). YABA is a locally installed desktop
              application designed for personal financial management. By using the Application, you
              acknowledge that you have read and understood this Privacy Policy.
            </p>

            <p class="font-weight-bold text-body-1 mb-2">2. Data Collection</p>
            <p class="mb-3">
              <strong>We do not collect any personal data.</strong> The Application does not gather,
              record, store on remote servers, or otherwise process any personally identifiable
              information ("PII"), financial data, usage statistics, telemetry, diagnostics, or
              metadata of any kind. No user accounts, registrations, or sign-ins are required to
              operate the Application.
            </p>

            <p class="font-weight-bold text-body-1 mb-2">3. No Remote Servers or Cloud Services</p>
            <p class="mb-3">
              The Application operates entirely offline on your local device. It does not connect
              to, communicate with, or transmit data to any remote server, cloud infrastructure, or
              backend service operated by us or any third party. There are no APIs, webhooks,
              synchronization services, or network requests initiated by the Application.
            </p>

            <p class="font-weight-bold text-body-1 mb-2">
              4. No Third-Party Services or Integrations
            </p>
            <p class="mb-3">
              The Application does not integrate with, connect to, or share data with any
              third-party services, advertising networks, analytics platforms, social media
              providers, payment processors, or data brokers. No third-party SDKs, tracking pixels,
              cookies, or similar technologies are embedded in or utilized by the Application.
            </p>

            <p class="font-weight-bold text-body-1 mb-2">5. Local Data Storage</p>
            <p class="mb-3">
              All data you enter into the Application — including but not limited to transaction
              records, budgets, categories, and preferences — is stored exclusively on your local
              device in an encrypted database. You retain sole custody and control over your data at
              all times. We have no ability to access, view, retrieve, or recover your data under
              any circumstances.
            </p>

            <v-alert
              type="success"
              variant="flat"
              icon="mdi-shield-check"
              class="mb-3"
              border="start"
            >
              <div class="font-weight-bold mb-1">6. Data Security</div>
              <div class="text-body-2">
                The local database is encrypted using AES-256 encryption. The encryption key is
                sealed to your operating-system user profile via the platform's native credential
                storage (e.g., DPAPI on Windows). Other users on this computer cannot open your
                data. Backup exports are encrypted with AES-256-GCM using a passphrase of your
                choosing and are stored wherever you save them — never uploaded. Despite these
                security measures, you are solely responsible for maintaining the security of your
                device and any exported backup files.
              </div>
            </v-alert>

            <p class="font-weight-bold text-body-1 mb-2">7. Financial Data Import</p>
            <p class="mb-3">
              YABA reads only the OFX/QFX files you select manually from your local file system. The
              Application never contacts your bank or any financial institution. No credentials for
              external financial services are requested, stored, or transmitted.
            </p>

            <p class="font-weight-bold text-body-1 mb-2">8. Children's Privacy</p>
            <p class="mb-3">
              Because the Application does not collect any data whatsoever, no special provisions
              under the Children's Online Privacy Protection Act ("COPPA"), the General Data
              Protection Regulation ("GDPR"), or similar legislation are applicable. The Application
              is safe for use by individuals of all ages.
            </p>

            <p class="font-weight-bold text-body-1 mb-2">9. Your Rights</p>
            <p class="mb-3">
              Since no personal data is collected, transmitted, or stored by us, data subject rights
              under applicable privacy laws — including but not limited to the right of access,
              rectification, erasure, portability, and the right to object — are not applicable to
              our operations. All data resides on your device and is under your exclusive control.
              You may delete all Application data at any time by uninstalling the Application or
              removing its local data files.
            </p>

            <p class="font-weight-bold text-body-1 mb-2">10. Changes to This Policy</p>
            <p class="mb-3">
              We reserve the right to update this Privacy Policy at any time. Any changes will be
              reflected in the "Last Updated" date above and will be made available within the
              Application. Your continued use of the Application following any modifications
              constitutes your acceptance of the revised Privacy Policy.
            </p>

            <p class="font-weight-bold text-body-1 mb-2">11. Contact</p>
            <p class="mb-1">
              If you have questions or concerns about this Privacy Policy, you may reach us at the
              project's GitHub repository.
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
