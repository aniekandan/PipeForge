# SignPath.io Free Code Signing Setup Guide

This guide walks through configuring free open-source Windows code signing for PipeForge using **SignPath.io** and **GitHub Actions**.

---

## Overview

When releasing PipeForge desktop builds, code signing attaches a trusted digital signature to your Windows `.exe` installer. This eliminates Windows SmartScreen warnings and displays **PipeForge** as a **Verified Publisher**.

---

## Step 1: Sign Up for SignPath Foundation (Free Open-Source Plan)

1. Go to [https://signpath.org/](https://signpath.org/) (or [https://signpath.io/](https://signpath.io/)).
2. Click **Get Started** or **Apply for Open-Source Signing**.
3. Sign in using your **GitHub account**.
4. **Requirements:**
   - The GitHub repository must be **public**.
   - The repository must have an open-source license (e.g., Apache-2.0 or MIT).

---

## Step 2: Retrieve Your `SIGNPATH_ORGANIZATION_ID`

1. Once logged in, click your **Organization name** in the top navigation bar or go to **Organization Settings**.
2. Look under the **General** or **Organization Details** tab.
3. Copy the **Organization ID** (a UUID such as `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
4. Save this value for: `SIGNPATH_ORGANIZATION_ID`.

---

## Step 3: Create a Project & Get `SIGNPATH_PROJECT_SLUG`

1. Inside your SignPath organization dashboard, click **Projects** > **Add Project**.
2. Set the Project Name: `PipeForge`.
3. Set the **Slug** to `pipeforge`.
4. Link it to your GitHub repository (e.g., `your-username/pipeforge`).
5. Set the **Artifact Configuration**:
   - Choose **Zip with binaries** (our GitHub Actions workflow packages the installer into `release-unsigned.zip`).
   - Leave the artifact configuration slug as `initial` (or note what you set).
6. Save the project.
7. Save this value for: `SIGNPATH_PROJECT_SLUG` (default: `pipeforge`).

---

## Step 4: Create a Signing Policy & Get `SIGNPATH_SIGNING_POLICY_SLUG`

1. In your project, go to the **Signing Policies** tab.
2. Click **Add Signing Policy**.
3. Select **Release Signing** (or **Test Signing**).
4. Choose Certificate:
   - Select **SignPath Foundation Open Source Code Signing Certificate**.
5. Set the **Slug** to `release-signing`.
6. Set the allowed build source to your GitHub repository's `main` branch and release tags.
7. Save the policy.
8. Save this value for: `SIGNPATH_SIGNING_POLICY_SLUG` (default: `release-signing`).

---

## Step 5: Generate the `SIGNPATH_API_TOKEN`

1. In SignPath, click your **Profile / User Icon** in the top-right corner > **API Tokens** (or **Organization Settings** > **API Tokens**).
2. Click **Generate New Token**.
3. Name it descriptively (e.g., `GitHub Actions CI PipeForge`).
4. Grant permissions for the `pipeforge` project and your `release-signing` policy.
5. Copy the generated API token immediately (it will only be shown once).
6. Save this value for: `SIGNPATH_API_TOKEN`.

---

## Step 6: Add Secrets to GitHub Repository

1. Open your GitHub repository in your browser.
2. Go to **Settings** > **Secrets and variables** > **Actions**.
3. Under **Repository secrets**, click **New repository secret** and add the following 4 secrets:

| Secret Name | Example / Expected Value | Description |
| :--- | :--- | :--- |
| `SIGNPATH_API_TOKEN` | `sp_token_...` | API Token generated in Step 5 |
| `SIGNPATH_ORGANIZATION_ID` | `1a2b3c4d-5678-4321-9abc-0123456789ab` | Organization GUID from Step 2 |
| `SIGNPATH_PROJECT_SLUG` | `pipeforge` | Project slug from Step 3 |
| `SIGNPATH_SIGNING_POLICY_SLUG` | `release-signing` | Policy slug from Step 4 |

---

## Step 7: Trigger Automated Build & Signing

1. Push a release tag or commit to `main`:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
2. Navigate to the **Actions** tab in GitHub to watch the `Build/Release PipeForge` workflow.
3. The workflow will:
   - Build the Windows `.exe` installer.
   - Automatically submit it to SignPath.io.
   - Receive the signed `.exe` bearing your verified publisher certificate.
   - Publish the verified installer to GitHub Releases and upload workflow artifacts.
