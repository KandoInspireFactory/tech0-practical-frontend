# Frontend Deployment Knowledge Base (Next.js 15 on Azure App Service)

**Date:** 2025-12-07
**Project:** LinkFastAPINext_Practical (Frontend)
**Target:** Azure App Service (Linux / Node.js 20)

## Overview
This document summarizes the challenges faced and solutions implemented during the deployment of a Next.js 15 application to Azure App Service via GitHub Actions.

## 1. Next.js 15 Compatibility Issues
### Problem: Build Failures with `searchParams`
Next.js 15 introduced breaking changes where `params` and `searchParams` in Page components are now **Promises**. Accessing them synchronously caused build errors.
*   **Error:** `TypeError: Cannot destructure property 'id' of 'e' as it is undefined.`
*   **Error:** `useSearchParams() should be wrapped in a suspense boundary...`

### Solution:
1.  **Async/Await for Params:** Updated page components to await `searchParams` before accessing properties.
    ```javascript
    // Before
    export default function Page({ searchParams }) { const id = searchParams.id; ... }
    
    // After
    export default async function Page({ searchParams }) {
      const resolvedParams = await searchParams;
      const id = resolvedParams.id;
      ...
    }
    ```
2.  **Suspense Boundary:** Components using `useSearchParams` (Client Components) must be wrapped in `<Suspense>` during static generation. Refactored logic into a child component and wrapped it in the parent page.
    ```javascript
    export default function Page() {
      return (
        <Suspense fallback={<div>Loading...</div>}>
          <ContentComponent />
        </Suspense>
      );
    }
    ```

## 2. Azure App Service Deployment Strategy
### Problem: "Could not find a production build in the './.next' directory"
Standard deployments failed to locate the `.next` build directory on Azure, or the directory structure was corrupted during upload/extraction.

### Solution: Next.js Standalone Mode + Zip Deployment
We adopted the **Standalone Mode** which bundles only necessary files for production.

1.  **Enable Standalone Mode:**
    Updated `next.config.js`:
    ```javascript
    const nextConfig = {
        output: 'standalone',
        // ...
    }
    ```

2.  **GitHub Actions Workflow Optimization:**
    *   **Zip Artifact:** Instead of uploading loose files (which caused issues with hidden `.next` folders), we explicitly zip the `standalone` directory content.
    *   **Static Assets:** Copied `.next/static` to `.next/standalone/.next/static` to ensure static assets are served correctly.
    *   **Startup Command:** Explicitly defined `startup-command: node server.js` in the `azure/webapps-deploy` action to override Azure's default behavior.

## 3. Conflict with Azure Oryx Build
### Problem: Azure Overwriting Deployed Files
Azure App Service (Linux) often attempts to build the project again (Oryx build) upon deployment, generating `node_modules.tar.gz` and `oryx-manifest.toml`. This process sometimes wiped out our pre-built `.next` folder or conflicted with our deployment.

### Solution:
1.  **Disable Azure Build:**
    Set the Application Setting in Azure Portal:
    *   `SCM_DO_BUILD_DURING_DEPLOYMENT = false`
2.  **Clean Up:**
    Manually removed residual build files (`node_modules.tar.gz`, etc.) via SSH to stop Azure from detecting a previous build state.

## 4. Final GitHub Actions Workflow (Key Snippet)
```yaml
      - name: Prepare standalone build
        run: |
          mkdir -p .next/standalone/.next/static
          cp -r .next/static/* .next/standalone/.next/static
          # public folder copy removed as it didn't exist in this project

      - name: Zip artifact for deployment
        run: |
          cd .next/standalone
          zip -r ../../release.zip .

      - name: Upload artifact for deployment job
        uses: actions/upload-artifact@v4
        with:
          name: node-app
          path: release.zip

  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: 'Deploy to Azure Web App'
        uses: azure/webapps-deploy@v3
        with:
          app-name: 'tech0-gen-11-step3-2-node-17'
          package: release.zip
          startup-command: node server.js
```

## Summary of Success
*   **Backend:** SSL certificate included in git (with `.gitignore` adjustment) fixed DB connection.
*   **Frontend:** Next.js 15 fixes applied, Standalone mode enabled, and Zip deployment configured to preserve folder structure.
*   **Result:** Application successfully starts with `node server.js` and connects to the backend.
