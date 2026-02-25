const { EventEmitter } = require("node:events");
const childProcess = require("node:child_process");

if (process.platform === "win32") {
  const originalExec = childProcess.exec;

  childProcess.exec = function patchedExec(command, options, callback) {
    const normalized = typeof command === "string" ? command.trim().toLowerCase() : "";

    // Vite calls `net use` on Windows to optimize realpath resolution.
    // In restricted environments this can fail with spawn EPERM before tests even start.
    if (normalized === "net use") {
      const cb = typeof options === "function" ? options : callback;
      const child = new EventEmitter();
      child.stdout = null;
      child.stderr = null;
      child.stdin = null;
      child.pid = 0;
      child.kill = () => true;

      process.nextTick(() => {
        if (typeof cb === "function") cb(null, "", "");
        child.emit("exit", 0, null);
        child.emit("close", 0, null);
      });

      return child;
    }

    return originalExec.apply(this, arguments);
  };
}
