// Useful links:
// https://stackoverflow.com/a/68621282/5318303
// https://github.com/nodejs/loaders-test/blob/main/typescript-loader/loader.js
// https://github.com/nodejs/loaders-test/blob/main/commonjs-extension-resolution-loader/loader.js

import { transform } from "esbuild";
import { readFile } from "node:fs/promises";
import { isBuiltin, register } from "node:module";
import {
  dirname,
  extname,
  posix,
  relative,
  resolve as resolvePath,
  sep,
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// 💡 It's probably a good idea to put this loader near the end of the chain.
register(import.meta.url, pathToFileURL("./")); // Register this file, itself.

// noinspection JSUnusedGlobalSymbols
export async function resolve(specifier, context, nextResolve) {
  if (isBuiltin(specifier)) return nextResolve(specifier, context);

  const defaultResolutionTry = nextResolve(specifier, context);
  const { data: defaultResolutionResult } = await defaultResolutionTry.then(
    (data) => ({ data }),
    (error) => ({ error }), // ERR_MODULE_NOT_FOUND | ERR_UNSUPPORTED_DIR_IMPORT | ... (?)
  );

  // If module found and its format successfully detected use: `defaultResolutionResult`
  if (
    defaultResolutionResult &&
    !("format" in defaultResolutionResult && !defaultResolutionResult.format)
  )
    return defaultResolutionResult;

  if (specifier.startsWith("@/")) {
    specifier =
      "./" +
      posix.join(
        toPosix(
          relative(
            dirname(fileURLToPath(context.parentURL)),
            resolvePath("src"),
          ),
        ), // TODO: Do this according to project's "tsconfig.json"
        posix.relative("@", specifier),
      );
    // Retry default-resolution with new resolved `specifier`:
    const defaultResolutionResult = await nextResolve(specifier, context).catch(
      () => {},
    );
    // If module found and its format successfully detected use: `defaultResolutionResult`
    if (
      defaultResolutionResult &&
      !("format" in defaultResolutionResult && !defaultResolutionResult.format)
    )
      return defaultResolutionResult;
  }

  const originalExt = extname(specifier);
  let resolvedExt = "";

  // Let's try to resolve the module:
  const generalTries = () =>
    nextResolve(specifier + (resolvedExt = ".js"), context)
      .catch(() => nextResolve(specifier + (resolvedExt = ".jsx"), context))
      .catch(() => nextResolve(specifier + (resolvedExt = ".ts"), context))
      .catch(() => nextResolve(specifier + (resolvedExt = ".tsx"), context))
      .catch(() =>
        nextResolve(specifier + "/index" + (resolvedExt = ".js"), context),
      )
      .catch(() =>
        nextResolve(specifier + "/index" + (resolvedExt = ".jsx"), context),
      )
      .catch(() =>
        nextResolve(specifier + "/index" + (resolvedExt = ".ts"), context),
      )
      .catch(() =>
        nextResolve(specifier + "/index" + (resolvedExt = ".tsx"), context),
      )
      .catch(() => defaultResolutionTry); // If our tries to resolve the module failed, return `defaultResolutionTry` promise.

  const nextResolverResult = [".js", ".jsx"].includes(originalExt)
    ? // 1. Special case: First replace ".jsx?" extension with ".tsx?":
      await nextResolve(
        specifier.slice(0, -originalExt.length) + // Cut ".jsx?"
          (resolvedExt = originalExt.replace("j", "t")), // Append ".tsx?"
        context,
      ).catch(generalTries) // If the above special-try failed, continue to `generalTries` ...
    : await generalTries(); // 2. General cases: Just do `generalTries` ...

  return EXTENSIONS.has(resolvedExt)
    ? {
        format: resolvedExt, // Provide a signal to `load()`
        shortCircuit: true,
        url: nextResolverResult.url,
      }
    : nextResolverResult;
}

// noinspection JSUnusedGlobalSymbols
export async function load(url, context, nextLoad) {
  if (context.format === "json")
    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${await readFile(fileURLToPath(url), "utf-8")}`,
    };

  const nextLoaderResult = await nextLoad(url, {
    format: "module",
    ...context,
  });

  if (!EXTENSIONS.has(context.format)) return nextLoaderResult;

  const rawSource = nextLoaderResult.source.toString();

  const { code: transpiledSource } = await transform(rawSource, {
    loader: "tsx", // https://esbuild.github.io/content-types/#typescript + https://esbuild.github.io/content-types/#jsx
    sourcemap: "inline",
    target: "esnext",
  });

  return {
    format: "module",
    shortCircuit: true,
    source: transpiledSource,
  };
}

const EXTENSIONS = new Set([".jsx", ".tsx", ".ts"]);

/** Convert **relative-path** to posix format. */
const toPosix = (relativePath) => relativePath.replaceAll(sep, posix.sep);
