# StudyPilot 1.0.0

**Created by Yash Desai**

StudyPilot is an offline-first academic organiser. This is the existing 1.0.0 application with its feature set preserved and its visual identity refined. The same HTML/CSS/JavaScript application is packaged for the website, Android and Windows desktop.

## Existing features retained

- Subject and chapter organiser
- Learning-status tracking and revision queue
- Student-created multiple-choice quizzes and attempt history
- Academic progress summaries
- Personal notes
- Focus timer and session history
- Local preferences, JSON export/import and delete-all-data control
- About, privacy and terms information
- No login, external AI APIs, advertising SDKs or analytics trackers

## Project layout

- Root: canonical website/PWA source. Keep these files as the source of truth.
- `core/`: academic, revision and analytics logic.
- `storage/`: IndexedDB persistence and backup logic.
- `security/`: input validation helpers.
- `Android/`: Android Studio project. Its `app/src/main/assets/www/` folder is a packaged copy of the root web app.
- `Windows/`: Python desktop launcher and PyInstaller build requirements.
- `.github/workflows/`: automatic GitHub Pages deployment and release build workflows.
- `scripts/prepare-android-assets.py`: refreshes Android's packaged web assets after root web changes.

## 1. Test locally

From this folder run:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. Use localhost or HTTPS; do not use `file://` for website testing.

## 2. Publish the website on GitHub Pages

1. Create a GitHub repository and upload the **contents** of this folder to its `main` branch.
2. Open repository **Settings → Pages**.
3. Under Build and deployment, select **GitHub Actions**.
4. The workflow `.github/workflows/pages.yml` deploys the root website after a push to `main`.
5. GitHub displays the public HTTPS address under Settings → Pages.

The workflow deploys the website source from the repository root. Do not move `index.html` into a nested folder.

## 3. Android APK

1. Install Android Studio and a compatible Android SDK (API 35).
2. Open the `Android` folder in Android Studio and allow Gradle sync.
3. To keep the Android package in sync after editing the root website, run from the repository root:

   ```bash
   python scripts/prepare-android-assets.py
   ```
4. In Android Studio choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
5. The installable debug APK is generated at `Android/app/build/outputs/apk/debug/app-debug.apk`.

For GitHub-hosted builds, open **Actions → Build Android APK and Windows EXE → Run workflow**. Download the `StudyPilot-Android-APK` artifact when the workflow succeeds. A tag such as `v1.0.0` also triggers a GitHub Release and attaches both platform downloads.

The automated APK is a debug-signed distribution build suitable for testing/direct sharing, not a Play Store production release. A Play Store release needs a separately managed signing key, store listing and current policy review. Never commit signing keys or passwords to GitHub.

## 4. Windows EXE with PyInstaller

On Windows, install Python 3.10+ and run:

```bat
Windows\build.bat
```

The script installs the pinned `pywebview` and `pyinstaller` packages and creates `dist\StudyPilot.exe`. The desktop window uses the existing web application locally; it does not require a hosted website. Windows WebView2 Runtime is required on the target computer (it is commonly present on current Windows 10/11 systems).

You can also run the same Windows build in GitHub Actions and download the `StudyPilot-Windows-EXE` artifact. The EXE is unsigned; Windows SmartScreen may show an unknown-publisher warning until the application has a trusted code-signing certificate.

## 5. Keep platform copies synchronized

The root folder is the canonical web app. After changing `index.html`, `styles.css`, `app.js`, `assets/`, `core/`, `storage/`, `security/` or related web files, run:

```bash
python scripts/prepare-android-assets.py
```

Then commit both the root changes and the refreshed Android assets. Windows packaging reads the root files directly.

## Data and privacy

StudyPilot stores study records in local IndexedDB on each platform/device. There is no cloud sync or account recovery. Data does not automatically move between website, Android and Windows; use the built-in export/import backup to transfer it. Clearing app/browser storage or losing a device can make unexported records unavailable. IndexedDB records are not encrypted by this application. Avoid storing passwords or highly sensitive information.

`PRIVACY.md` and `TERMS.md` are starter policy documents, not legal advice or a certification of legal compliance. Before a public commercial launch, obtain qualified review of Indian privacy, consumer, accessibility, intellectual-property and platform-store requirements, particularly because students may include minors.

## Content and ownership

StudyPilot does not ship official textbook chapters or reproduce textbook material. Users create their own subjects, chapters, questions and notes. It is not affiliated with any school, education board or government body.

**Created by Yash Desai.**
