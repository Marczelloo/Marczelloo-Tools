import { spawn, type ChildProcess, type SpawnOptions } from "child_process";

export class YtdlpUnavailableError extends Error {
  constructor() {
    super(
      "yt-dlp is not installed. Install it with `python -m pip install yt-dlp`, or set YTDLP_PATH to its executable."
    );
    this.name = "YtdlpUnavailableError";
  }
}

interface YtdlpCommand {
  executable: string;
  prefixArgs: string[];
}

let resolvedCommand: Promise<YtdlpCommand> | null = null;

function getCandidates(): YtdlpCommand[] {
  const configuredPath = process.env.YTDLP_PATH?.trim();

  if (configuredPath) {
    return [{ executable: configuredPath, prefixArgs: [] }];
  }

  const candidates: YtdlpCommand[] = [
    { executable: "yt-dlp", prefixArgs: [] },
  ];

  if (process.platform === "win32") {
    candidates.push(
      { executable: "py", prefixArgs: ["-m", "yt_dlp"] },
      { executable: "python", prefixArgs: ["-m", "yt_dlp"] },
    );
  } else {
    candidates.push(
      { executable: "python3", prefixArgs: ["-m", "yt_dlp"] },
      { executable: "python", prefixArgs: ["-m", "yt_dlp"] },
    );
  }

  return candidates;
}

function probeCommand(command: YtdlpCommand): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = spawn(command.executable, [...command.prefixArgs, "--version"], {
      stdio: "ignore",
      shell: false,
    });

    probe.once("error", () => resolve(false));
    probe.once("close", (code) => resolve(code === 0));
  });
}

async function resolveCommand(): Promise<YtdlpCommand> {
  for (const candidate of getCandidates()) {
    if (await probeCommand(candidate)) {
      return candidate;
    }
  }

  throw new YtdlpUnavailableError();
}

export function resolveYtdlpCommand(): Promise<YtdlpCommand> {
  resolvedCommand ??= resolveCommand();
  return resolvedCommand;
}

export async function spawnYtdlp(
  args: string[],
  options: SpawnOptions = {},
): Promise<ChildProcess> {
  const command = await resolveYtdlpCommand();

  return spawn(command.executable, [...command.prefixArgs, ...args], {
    ...options,
    shell: false,
  });
}

export function resetYtdlpCommandCache(): void {
  resolvedCommand = null;
}
