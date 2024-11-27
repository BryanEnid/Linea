# Contributing Guide

Thank you for contributing to this project! To make the process smooth and organized, please follow the guidelines below.

---

## Branching Strategy

We use a simple and clean branching strategy to keep our codebase organized and stable:

- **`main`**: This branch contains the latest stable, production-ready code.
- **Feature Branches (`feature/<name>`)**:
  - For each new feature or bug fix, create a branch off `main`.
  - Use the naming convention `feature/<feature-name>`.
  - Example: `feature/add-dark-mode`.

---

## Workflow

### 1. Creating a Feature Branch

- Start by creating a new branch from `main`:

  ```bash
  git checkout -b feature/<feature-name>
  ```

- Make your changes, write tests, and commit them:
  ```bash
  git commit -m "Add feature description here"
  ```

### 2. Creating a Pull Request (PR)

- Push your branch to the remote repository:

  ```bash
  git push origin feature/<feature-name>
  ```

- Open a pull request from your feature branch into `main`.

- Before merging:
  - Ensure all tests pass (automated via GitHub Actions).
  - Your code should have been reviewed and approved by at least one collaborator.

### 3. Merging Changes

- After your PR is approved:
  - Use GitHub’s **Squash and Merge** option to combine your commits into a single commit.
  - Ensure the commit message is clear and concise (GitHub will use your PR title as the commit message by default).

### 4. Releasing

- When `main` is ready for release:

  - Tag the release commit with the version:
    ```bash
    git tag vX.Y.Z
    git push origin vX.Y.Z
    ```

- GitHub Actions will automatically handle building and packaging the desktop app for distribution.

---

## Pull Request Guidelines

When submitting a PR, please make sure to include:

- A clear and descriptive PR title.
- A brief summary of the changes.
- Testing instructions if applicable.
- References to any related issues (e.g., `Closes #123`).

---

## Additional Resources

- For more details on submitting PRs, check the [Pull Request Template](./.github/PULL_REQUEST_TEMPLATE.md).
- For questions or clarifications, feel free to open an issue in the repository!

---

We appreciate your contributions to this project and look forward to your help in making it better!

---

### Key Highlights:

1. **Branching Strategy**:
   - Clear explanation of using `main` and `feature/<name>` branches.
2. **Workflow**:

   - Steps to create a feature branch, open a PR, and merge changes.
   - Releasing and tagging instructions.

3. **PR Guidelines**:
   - Ensure your PR has a clear title, description, and testing steps.
