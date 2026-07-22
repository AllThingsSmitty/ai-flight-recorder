import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");
const minify = process.argv.includes("--minify");
const shared = { bundle: true, minify, sourcemap: !minify };

const ctxHost = await esbuild.context({
  ...shared,
  entryPoints: ["src/extension.ts"],
  outfile: "out/extension.js",
  platform: "node",
  format: "cjs",
  external: ["vscode"],
});

const ctxWebview = await esbuild.context({
  ...shared,
  entryPoints: ["src/webview/main.ts"],
  outfile: "out/webview.js",
  platform: "browser",
});

if (watch) {
  await ctxHost.watch();
  await ctxWebview.watch();
  console.log("Watching…");
} else {
  await ctxHost.rebuild();
  await ctxWebview.rebuild();
  await ctxHost.dispose();
  await ctxWebview.dispose();
}
