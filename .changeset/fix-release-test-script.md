---
"@octalmesh/seagull": patch
---

Fix the `release` script referencing the nonexistent `test:run` npm script;
it now runs the repository's actual `test` script before publishing.
