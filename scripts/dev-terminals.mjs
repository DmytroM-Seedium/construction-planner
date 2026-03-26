import { spawn } from "node:child_process";

function runInNewPowerShellWindow(title, command) {
  // Opens a new PowerShell window and keeps it open (`-NoExit`) for logs.
  // Use `cmd /c start` for reliability across different terminal setups.
  const psArgs = ["powershell", "-NoExit", "-Command", command];
  spawn("cmd.exe", ["/c", "start", `"${title}"`, ...psArgs], {
    stdio: "inherit",
    windowsVerbatimArguments: true,
  });
}

const web = "npm -w @construction-planner/web run dev";
const server = "npm -w @construction-planner/server run dev";

if (process.platform !== "win32") {
  console.error("This dev launcher is currently Windows-only.");
  console.error(`Run these instead:\n- ${web}\n- ${server}`);
  process.exit(1);
}

runInNewPowerShellWindow("web", web);
runInNewPowerShellWindow("server", server);

