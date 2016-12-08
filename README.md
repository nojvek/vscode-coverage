# vscode-coverage
VSCode Coverage Extension for line, branch and function coverage from istanbul coverage.json

It shows the hits right besides the code and watch the coverage file for changes. This means if you're writing unit tests, it will update live.

It has a built in merger and source mapper, so it can merge multiple coverage.json files and source map them to source files.

In the future this will also work with Chrome's *.cpuprofile files and show perf info right inside the editor.

# How to build locally

* `npm run compile` to start the compiler in watch mode
* open this folder in VS Code and press `F5`