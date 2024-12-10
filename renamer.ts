import fs from "fs";
import path from "path";

// Convert camelCase to kebab-case
function toKebabCase(filename: string): string {
  return filename.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

// Iteratively process files and directories
function processFilesAndFolders(rootDir: string) {
  const queue: string[] = [rootDir];

  while (queue.length > 0) {
    const currentPath = queue.pop()!;
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // Handle directories first
      if (entry.isDirectory()) {
        const newName = toKebabCase(entry.name);
        if (newName !== entry.name) {
          const newPath = path.join(currentPath, newName);

          if (fs.existsSync(newPath)) {
            console.error(
              `Conflict: ${newPath} already exists. Skipping ${fullPath}`,
            );
            continue;
          }

          console.log(`Renaming directory: ${fullPath} -> ${newPath}`);
          fs.renameSync(fullPath, newPath);

          // Update imports after renaming
          updateImports(fullPath, newPath);

          // Add the renamed directory back to the queue for further processing
          queue.push(newPath);
        } else {
          queue.push(fullPath); // If no renaming, continue processing the directory
        }
      } else {
        // Handle files
        const newName = toKebabCase(entry.name);
        if (newName !== entry.name) {
          const newPath = path.join(currentPath, newName);

          if (fs.existsSync(newPath)) {
            console.error(
              `Conflict: ${newPath} already exists. Skipping ${fullPath}`,
            );
            continue;
          }

          console.log(`Renaming file: ${fullPath} -> ${newPath}`);
          fs.renameSync(fullPath, newPath);

          // Update imports after renaming
          updateImports(fullPath, newPath);
        }
      }
    }
  }
}

// Corrected `updateImports` function
function updateImports(oldPath: string, newPath: string) {
  const projectRoot = path.resolve("./"); // Adjust project root if needed
  const allFiles = getAllFiles(projectRoot, /\.(ts|js|tsx|jsx)$/);

  const normalizedOldPath = normalizePath(oldPath);
  const normalizedNewPath = normalizePath(newPath);

  for (const file of allFiles) {
    let content = fs.readFileSync(file, "utf-8");

    const relativeOldPath = normalizePath(
      formatRelativePath(file, normalizedOldPath),
    );
    const relativeNewPath = normalizePath(
      formatRelativePath(file, normalizedNewPath),
    );

    const importRegex = new RegExp(
      `(['"\`])(${escapeRegex(relativeOldPath)})(['"\`])`,
      "g",
    );

    if (importRegex.test(content)) {
      const updatedContent = content.replace(
        importRegex,
        `$1${relativeNewPath}$3`,
      );
      fs.writeFileSync(file, updatedContent, "utf-8");
      console.log(`Updated imports in: ${file}`);
    }
  }
}

// Normalize file paths for consistent imports
function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/\.[tj]sx?$/, ""); // Ensure forward slashes and remove extensions
}

// Format paths as relative imports
function formatRelativePath(from: string, to: string): string {
  const relativePath = path.relative(path.dirname(from), to);
  return normalizePath(
    relativePath.startsWith(".") ? relativePath : `./${relativePath}`,
  ); // Ensure ./ prefix
}

// Escape special regex characters in paths
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Get all project files iteratively
function getAllFiles(rootDir: string, extensions: RegExp): string[] {
  const result: string[] = [];
  const stack: string[] = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop()!;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        stack.push(fullPath);
      } else if (extensions.test(entry.name)) {
        result.push(fullPath);
      }
    }
  }

  return result;
}

// Run the script
const projectRoot = path.resolve("./src/worker"); // Change as needed
processFilesAndFolders(projectRoot);
