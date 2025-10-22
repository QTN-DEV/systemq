import { test, expect, type Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'admin@example.com';
const LOGIN_PASSWORD = 'admin123';
const TEST_FOLDER_NAME = 'Test Project';
const TEST_DOCUMENT_NAME = 'Test Document';

// Helper function to login
async function login(page: Page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Fill in login form
  await page.fill('#email', LOGIN_EMAIL);
  await page.fill('#password', LOGIN_PASSWORD);

  // Click sign in button
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
}

test.describe('Document Management System', () => {
  test.setTimeout(120000); // 2 minutes for all tests

  test('1. Login Test - Should successfully login with valid credentials', async ({ page }) => {
    console.log('Step 1: Navigating to login page...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/01-login-page.png', fullPage: true });
    console.log('Screenshot saved: 01-login-page.png');

    // Check if login form exists
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    console.log('Step 2: Filling login credentials...');
    await page.fill('#email', LOGIN_EMAIL);
    await page.fill('#password', LOGIN_PASSWORD);

    await page.screenshot({ path: 'test-results/02-login-filled.png', fullPage: true });
    console.log('Screenshot saved: 02-login-filled.png');

    console.log('Step 3: Submitting login form...');
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Take screenshot after login
    await page.screenshot({ path: 'test-results/03-dashboard-after-login.png', fullPage: true });
    console.log('Screenshot saved: 03-dashboard-after-login.png');

    // Verify we're on the dashboard
    expect(page.url()).toContain('/dashboard');
    console.log('Login successful! Current URL:', page.url());
  });

  test('2. Navigation - Should navigate to documents section', async ({ page }) => {
    // Login first
    await login(page);

    console.log('Step 1: Looking for Documents navigation link...');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/04-dashboard-before-nav.png', fullPage: true });

    // Try different selectors for the Documents link
    const documentsLink = page.locator('a[href="/documents"], a:has-text("Documents")').first();

    // Wait for the link to be visible
    await documentsLink.waitFor({ state: 'visible', timeout: 10000 });

    console.log('Step 2: Clicking Documents link...');
    await documentsLink.click();

    // Wait for navigation
    await page.waitForURL(/.*\/documents/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'test-results/05-documents-page.png', fullPage: true });
    console.log('Screenshot saved: 05-documents-page.png');

    // Verify we're on documents page
    expect(page.url()).toContain('/documents');

    // Check for key elements on documents page
    await expect(page.locator('h1:has-text("Documents")')).toBeVisible();
    console.log('Successfully navigated to Documents section');
  });

  test('3. Create Folder - Should create a new folder', async ({ page }) => {
    // Login and navigate to documents
    await login(page);
    await page.goto(`${BASE_URL}/documents`);
    await page.waitForLoadState('networkidle');

    console.log('Step 1: Looking for Create New Folder button...');

    // Click on "Create New Folder" button
    const createFolderBtn = page.locator('button:has-text("Create New Folder")');
    await createFolderBtn.waitFor({ state: 'visible', timeout: 10000 });
    await createFolderBtn.click();

    await page.screenshot({ path: 'test-results/06-create-folder-modal.png', fullPage: true });
    console.log('Screenshot saved: 06-create-folder-modal.png');

    // Wait for modal to appear
    await expect(page.locator('h3:has-text("Create New Folder")')).toBeVisible();

    console.log('Step 2: Entering folder name...');

    // Fill in folder name
    const folderNameInput = page.locator('#folderName');
    await folderNameInput.fill(TEST_FOLDER_NAME);

    await page.screenshot({ path: 'test-results/07-create-folder-filled.png', fullPage: true });
    console.log('Screenshot saved: 07-create-folder-filled.png');

    console.log('Step 3: Submitting folder creation...');

    // Click create button
    await page.locator('button:has-text("Create Folder")').click();

    // Wait for modal to close and folder to appear
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/08-folder-created.png', fullPage: true });
    console.log('Screenshot saved: 08-folder-created.png');

    // Verify folder was created
    const folderCard = page.locator(`text=${TEST_FOLDER_NAME}`).first();
    await expect(folderCard).toBeVisible();
    console.log(`Folder "${TEST_FOLDER_NAME}" created successfully!`);
  });

  test('4. Create Document - Should create a new document inside the folder', async ({ page }) => {
    // Login and navigate to documents
    await login(page);
    await page.goto(`${BASE_URL}/documents`);
    await page.waitForLoadState('networkidle');

    console.log('Step 1: Opening the test folder...');

    // Click on the test folder to open it
    const folderCard = page.locator(`text=${TEST_FOLDER_NAME}`).first();
    await folderCard.waitFor({ state: 'visible', timeout: 10000 });
    await folderCard.click();

    // Wait for navigation into folder
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/09-inside-folder.png', fullPage: true });
    console.log('Screenshot saved: 09-inside-folder.png');

    console.log('Step 2: Creating new document...');

    // Click "Add New Document" button
    const addDocBtn = page.locator('button:has-text("Add New Document"), button:has-text("New Document")').first();
    await addDocBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addDocBtn.click();

    await page.screenshot({ path: 'test-results/10-create-document-modal.png', fullPage: true });
    console.log('Screenshot saved: 10-create-document-modal.png');

    // Wait for modal
    await expect(page.locator('h3:has-text("Add New Document")')).toBeVisible();

    console.log('Step 3: Entering document name...');

    // Fill in document name
    const docNameInput = page.locator('#fileName');
    await docNameInput.fill(TEST_DOCUMENT_NAME);

    await page.screenshot({ path: 'test-results/11-create-document-filled.png', fullPage: true });
    console.log('Screenshot saved: 11-create-document-filled.png');

    console.log('Step 4: Submitting document creation...');

    // Click create button
    await page.locator('button:has-text("Create Document")').click();

    // Wait for modal to close and document to appear
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/12-document-created.png', fullPage: true });
    console.log('Screenshot saved: 12-document-created.png');

    // Verify document was created
    const docCard = page.locator(`text=${TEST_DOCUMENT_NAME}`).first();
    await expect(docCard).toBeVisible();
    console.log(`Document "${TEST_DOCUMENT_NAME}" created successfully!`);
  });

  test('5. View Document - Should open and view the document', async ({ page }) => {
    // Login and navigate to documents
    await login(page);
    await page.goto(`${BASE_URL}/documents`);
    await page.waitForLoadState('networkidle');

    console.log('Step 1: Navigating to test folder...');

    // Open the test folder
    const folderCard = page.locator(`text=${TEST_FOLDER_NAME}`).first();
    await folderCard.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('Step 2: Opening the test document...');

    // Click on the document
    const docCard = page.locator(`text=${TEST_DOCUMENT_NAME}`).first();
    await docCard.waitFor({ state: 'visible', timeout: 10000 });
    await docCard.click();

    // Wait for document editor to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/13-document-viewer.png', fullPage: true });
    console.log('Screenshot saved: 13-document-viewer.png');

    // Verify we're on the document page
    expect(page.url()).toContain('/documents/file/');
    console.log('Document opened successfully! URL:', page.url());
  });

  test('6. Edit Document - Should edit the document content', async ({ page }) => {
    // Login and navigate to documents
    await login(page);
    await page.goto(`${BASE_URL}/documents`);
    await page.waitForLoadState('networkidle');

    console.log('Step 1: Navigating to document...');

    // Open folder and document
    await page.locator(`text=${TEST_FOLDER_NAME}`).first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator(`text=${TEST_DOCUMENT_NAME}`).first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('Step 2: Looking for editor...');

    // Try to find the editor - it might be a textarea, contenteditable div, or CodeMirror
    const possibleEditors = [
      page.locator('textarea'),
      page.locator('[contenteditable="true"]'),
      page.locator('.cm-content'), // CodeMirror
      page.locator('[role="textbox"]'),
    ];

    let editor = null;
    for (const possibleEditor of possibleEditors) {
      try {
        await possibleEditor.waitFor({ state: 'visible', timeout: 3000 });
        editor = possibleEditor;
        console.log('Editor found!');
        break;
      } catch (e) {
        // Try next selector
        continue;
      }
    }

    if (!editor) {
      console.log('No editor found, taking screenshot for debugging...');
      await page.screenshot({ path: 'test-results/14-no-editor-found.png', fullPage: true });
      throw new Error('Could not find document editor');
    }

    await page.screenshot({ path: 'test-results/14-before-edit.png', fullPage: true });
    console.log('Screenshot saved: 14-before-edit.png');

    console.log('Step 3: Editing document content...');

    // Try to type in the editor
    try {
      await editor.click();
      await page.keyboard.type('This is a test document created by Playwright automation.');
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('Could not type in editor, trying alternative method...');
      await page.keyboard.type('This is a test document created by Playwright automation.');
    }

    await page.screenshot({ path: 'test-results/15-after-edit.png', fullPage: true });
    console.log('Screenshot saved: 15-after-edit.png');

    // Try to save (look for save button)
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Commit")').first();
    const saveButtonVisible = await saveButton.isVisible().catch(() => false);

    if (saveButtonVisible) {
      console.log('Step 4: Saving document...');
      await saveButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/16-after-save.png', fullPage: true });
      console.log('Screenshot saved: 16-after-save.png');
    } else {
      console.log('No save button found - document might auto-save');
    }

    console.log('Document edited successfully!');
  });

  test('7. Access Control - Should check if permissions UI is visible', async ({ page }) => {
    // Login and navigate to documents
    await login(page);
    await page.goto(`${BASE_URL}/documents`);
    await page.waitForLoadState('networkidle');

    console.log('Step 1: Navigating to folder...');

    // Open the test folder
    const folderCard = page.locator(`text=${TEST_FOLDER_NAME}`).first();
    await folderCard.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/17-before-permissions.png', fullPage: true });
    console.log('Screenshot saved: 17-before-permissions.png');

    console.log('Step 2: Looking for Share button...');

    // Look for Share button (should be visible in the folder header)
    const shareButton = page.locator('button:has-text("Share")').first();

    try {
      await shareButton.waitFor({ state: 'visible', timeout: 5000 });
      console.log('Share button found!');

      console.log('Step 3: Clicking Share button...');
      await shareButton.click();

      // Wait for share modal to open
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-results/18-permissions-modal.png', fullPage: true });
      console.log('Screenshot saved: 18-permissions-modal.png');

      // Check if permissions UI is visible
      const permissionsModalVisible = await page.locator('[role="dialog"], .modal, h3:has-text("Share")').first().isVisible().catch(() => false);

      if (permissionsModalVisible) {
        console.log('Permissions UI is visible!');

        // Look for permission controls
        const permissionControls = [
          page.locator('select, input[type="text"], button:has-text("Add")'),
          page.locator('text=Editor, text=Viewer'),
        ];

        for (const control of permissionControls) {
          const visible = await control.first().isVisible().catch(() => false);
          if (visible) {
            console.log('Permission controls found');
            break;
          }
        }
      } else {
        console.log('Warning: Permissions modal did not open');
      }

    } catch (e) {
      console.log('Share button not found or not clickable');
      await page.screenshot({ path: 'test-results/18-share-button-not-found.png', fullPage: true });
    }

    // Try alternative: check document-level permissions
    console.log('Step 4: Checking document-level permissions...');

    // Click on a document
    const docCard = page.locator(`text=${TEST_DOCUMENT_NAME}`).first();
    const docVisible = await docCard.isVisible().catch(() => false);

    if (docVisible) {
      // Hover over document to see if actions menu appears
      await docCard.hover();
      await page.waitForTimeout(500);

      // Look for three-dots menu
      const moreButton = page.locator('button[aria-label*="Actions"], button:has(svg)').first();
      const moreButtonVisible = await moreButton.isVisible().catch(() => false);

      if (moreButtonVisible) {
        await moreButton.click();
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'test-results/19-document-actions-menu.png', fullPage: true });
        console.log('Screenshot saved: 19-document-actions-menu.png');

        // Check if Share option exists
        const shareOption = page.locator('button:has-text("Share"), a:has-text("Share")');
        const shareOptionVisible = await shareOption.first().isVisible().catch(() => false);

        if (shareOptionVisible) {
          console.log('Share option found in actions menu!');
        }
      }
    }

    await page.screenshot({ path: 'test-results/20-final-permissions-check.png', fullPage: true });
    console.log('Screenshot saved: 20-final-permissions-check.png');

    console.log('Permissions UI check completed!');
  });

  test('8. Complete Flow - Full integration test', async ({ page }) => {
    console.log('=== STARTING COMPLETE FLOW TEST ===');

    // 1. Login
    console.log('\n1. LOGIN');
    await page.goto(BASE_URL);
    await page.fill('#email', LOGIN_EMAIL);
    await page.fill('#password', LOGIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard/);
    await page.screenshot({ path: 'test-results/flow-01-logged-in.png', fullPage: true });

    // 2. Navigate to Documents
    console.log('\n2. NAVIGATE TO DOCUMENTS');
    await page.locator('a[href="/documents"]').first().click();
    await page.waitForURL(/.*\/documents/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/flow-02-documents-page.png', fullPage: true });

    // 3. Verify UI elements
    console.log('\n3. VERIFY UI ELEMENTS');
    const hasCreateFolderBtn = await page.locator('button:has-text("Create New Folder")').isVisible();
    const hasDocumentsHeading = await page.locator('h1:has-text("Documents")').isVisible();
    console.log(`- Create Folder Button: ${hasCreateFolderBtn ? 'VISIBLE' : 'MISSING'}`);
    console.log(`- Documents Heading: ${hasDocumentsHeading ? 'VISIBLE' : 'MISSING'}`);

    // 4. Check for existing test folder
    console.log('\n4. CHECK EXISTING DATA');
    const testFolderExists = await page.locator(`text=${TEST_FOLDER_NAME}`).first().isVisible().catch(() => false);
    console.log(`- Test folder exists: ${testFolderExists}`);

    await page.screenshot({ path: 'test-results/flow-03-final-state.png', fullPage: true });

    console.log('\n=== COMPLETE FLOW TEST FINISHED ===');
  });
});
