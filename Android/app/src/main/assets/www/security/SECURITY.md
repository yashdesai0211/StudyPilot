# Security notes

This is a static, local-first PWA. It has no login, API keys, backend, or network data submission. Security scope is therefore smaller than a cloud application, but not zero.

- Keep browser and operating system updated.
- Avoid storing sensitive personal information in notes.
- Do not import backup files from unknown sources.
- Do not add third-party scripts without reviewing their source and purpose.
- Keep the app on HTTPS when deployed.
- Review any future dependencies and content licences.
- Re-test data export/import, deletion, and offline behaviour after changes.
- IndexedDB is not encrypted by this app; rely on device-level access controls.
- The current Google Fonts stylesheet import can make a network request for typography. Remove it for a no-third-party-request first load; the app's functionality remains intact.
