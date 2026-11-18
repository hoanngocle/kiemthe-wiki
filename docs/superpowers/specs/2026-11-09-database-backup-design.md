# Database backup and restore

User selected the proposed approach on 2026-11-09: a Database menu exporting one package containing all five game databases, and importing that package after saving a safety backup and stopping game servers.

Databases: `91jx_gamecenter`, `91jx_goddess`, `91jx_statlog`, `global_logserver`, `jxaccount`.

Approaches: five individually selected SQL files would allow mixing snapshots; one compressed package keeps all five together and is the selected approach. The implementation uses a versioned gzip JSON manifest containing five standard mysqldump SQL documents, SHA-256 checksums, and a timestamp. This packaging detail is the implementer's choice.

Use the existing localhost-only admin and .env connection. Detect installed MySQL clients matching the server major version; allow explicit tool paths in .env. Export uses a global read lock while capturing all five schemas, including binary blobs, routines, events, and triggers. Import validates the entire package before any database write, requires stopped servers, blocks admin server control, persists a complete safety backup, then replaces each database in order. Show per-database results and retain the backup path if import fails. MySQL DDL cannot make all five replacements atomic; stop on the first failure and explicitly report partial restoration. Do not automatically restart servers.

Long operations run as a polled in-process job; closing the tab does not cancel them. Admin restart interrupts jobs. Store backups under the admin .database-backups folder. Add no dependencies. Verify with fake dump/restore operations and normal project checks; never restore the user's live databases during development.
