# Setup notes

How this repo and its GitHub Pages site were set up the first time (September 2026). This is kept for
reference; none of it needs repeating to use or develop the app.

## 1. Create the GitHub repository

1. At github.com, click **+ > New repository** and name it `poetapp`. The name becomes part of the site's URL.
2. Choose **Public**, because GitHub Pages is free only for public repos on free accounts. Poems are not
   stored in the repo, only the code.
3. Leave "Add a README", `.gitignore` and license unchecked, so the repo starts empty.

The repository root is this `app/` folder.

## 2. Make a token for `git push`

GitHub doesn't accept an account password for pushing.

1. Go to **Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token**.
2. Set repository access to **Only select repositories** and pick `poetapp`.
3. Under repository permissions, set **Contents** and **Workflows** to **Read and write**. Workflows is needed
   to push `.github/workflows/deploy.yml`.
4. Copy the token right away; GitHub shows it only once.

## 3. Push

From `app/`:

```sh
git remote add origin https://github.com/andyharless/poetapp.git
git push -u origin main
```

Enter the GitHub username, then paste the token as the password. `git config --global credential.helper store`
saves it for later pushes, in plain text in `~/.git-credentials`.

## 4. Turn on Pages

In the repo, go to **Settings > Pages** and set **Source** to **GitHub Actions**. The "Deploy to GitHub
Pages" workflow then publishes to <https://andyharless.github.io/poetapp/> on every push to `main`.

If a deploy fails, re-run only the failed job rather than all jobs. Re-running all jobs once caused a
"Multiple artifacts" error, which is why the workflow has separate build and deploy jobs.
