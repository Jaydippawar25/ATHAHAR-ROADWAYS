---
description: Automatically stage, commit, and push all code changes to GitHub after every edit or modification.
---
# Auto Push to GitHub Rule

Whenever you modify, create, or edit any code files in this workspace, you MUST automatically run:
```powershell
git add -A; git commit -m "<descriptive message>"; git push
```
at the end of your task without waiting for the user to ask to push to GitHub.
