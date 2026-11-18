import { win32 as path } from "node:path";
import { randomUUID } from "node:crypto";

export type RunningProcess = { pid: number; path: string };
export type Runtime = {
  platform: string;
  root: string;
  exists: (file: string) => Promise<boolean>;
  listProcesses: () => Promise<RunningProcess[]>;
  launch: (file: string, cwd: string) => Promise<number>;
  stop: (process: RunningProcess) => Promise<void>;
  wait: (ms: number) => Promise<void>;
};

const definitions = [
  { id: "goddess", name: "Goddess", role: "Dữ liệu nhân vật", folder: "goddess", file: "GD.exe", aliases: ["kg_goddessd.exe"] },
  { id: "logserver", name: "LogServer", role: "Nhật ký hệ thống", folder: "logserver", file: "LS.exe", aliases: ["kg_cslogserverd.exe"] },
  { id: "bishop", name: "Bishop", role: "Cổng kết nối", folder: "bishop", file: "Bishop.exe", aliases: ["KG_BishopD.exe"] },
  { id: "gamecenter", name: "GameCenter", role: "Điều phối thế giới", folder: "gamecenter", file: "gamecenter.exe", aliases: ["GC.exe"] },
  ...[1, 2, 3, 4].map((number) => ({ id: `gs${number}`, name: `GameServer ${number}`, role: "Máy chủ trò chơi", folder: "gameserver", file: `GS${number}.exe`, aliases: [] as string[] })),
];

export const processNames = definitions.flatMap(({ file, aliases }) => [file, ...aliases]);
export type ServerAction = "start" | "restart" | "stop";
type Definition = (typeof definitions)[number] & { path: string; paths: string[] };
export type StartupJob = {
  id: string;
  target: string;
  action: ServerAction;
  status: "starting" | "completed" | "failed";
  currentId: string | null;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
};
export type LauncherEvent = { id: number; time: string; level: "info" | "success" | "error"; message: string };
export type ServerState = {
  id: string;
  name: string;
  role: string;
  file: string;
  path: string;
  order: number;
  exists: boolean;
  status: "running" | "starting" | "stopping" | "restarting" | "stopped" | "missing" | "error";
  pid: number | null;
  error: string | null;
};
export type LauncherState = {
  servers: ServerState[];
  job: StartupJob | null;
  events: LauncherEvent[];
  platform: string;
  root: string;
};

const normalized = (file: string) => path.normalize(file).toLowerCase();
const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error);

export class ServerManager {
  private runtime: Runtime;
  private servers: Definition[];
  private errors = new Map<string, string>();
  private events: LauncherEvent[] = [];
  private eventId = 0;
  job: StartupJob | null = null;
  private databaseMaintenance = false;

  constructor(runtime: Runtime) {
    this.runtime = runtime;
    this.servers = definitions.map((server) => ({
      ...server,
      path: path.join(runtime.root, server.folder, server.file),
      paths: [server.file, ...server.aliases].map((file) => normalized(path.join(runtime.root, server.folder, file))),
    }));
  }

  private find(server: Definition, processes: RunningProcess[]) {
    return processes.find((process) => server.paths.includes(normalized(process.path)));
  }

  private event(level: LauncherEvent["level"], message: string) {
    this.events.push({ id: ++this.eventId, time: new Date().toISOString(), level, message });
    this.events = this.events.slice(-60);
  }

  activity() {
    return { job: this.job ? { ...this.job } : null, events: [...this.events] };
  }

  async snapshot(): Promise<LauncherState> {
    const processes = await this.runtime.listProcesses();
    const servers = await Promise.all(this.servers.map(async (server, index): Promise<ServerState> => {
      const running = this.find(server, processes);
      const exists = await this.runtime.exists(server.path);
      const error = running ? null : this.errors.get(server.id) ?? null;
      const starting = this.job?.status === "starting" && this.job.currentId === server.id;
      const pending = this.job?.action === "stop" ? "stopping" : this.job?.action === "restart" ? "restarting" : "starting";
      return {
        id: server.id, name: server.name, role: server.role, file: server.file, path: server.path,
        order: index + 1, exists, pid: running?.pid ?? null, error,
        status: starting ? pending : running ? "running" : !exists ? "missing" : error ? "error" : "stopped",
      };
    }));
    return { servers, ...this.activity(), platform: this.runtime.platform, root: this.runtime.root };
  }

  start(target: string): { accepted: boolean; jobId: string; completion: Promise<void> } {
    return this.control(target, "start");
  }

  async withMaintenance<T>(run: () => Promise<T>, requireStopped: boolean): Promise<T> {
    if (this.databaseMaintenance) throw new Error("Đang có tác vụ Database.");
    if (this.job?.status === "starting") throw new Error("Đang có thao tác server; hãy chờ hoàn tất trước khi dùng Database.");
    this.databaseMaintenance = true;
    try {
      if (requireStopped) {
        const state = await this.snapshot();
        if (state.servers.some((server) => server.pid !== null)) throw new Error("Hãy dừng tất cả server game trước khi import Database.");
      }
      return await run();
    } finally { this.databaseMaintenance = false; }
  }

  control(target: string, action: ServerAction): { accepted: boolean; jobId: string; completion: Promise<void> } {
    if (this.databaseMaintenance) throw new Error("Đang xử lý Database; hãy chờ hoàn tất trước khi điều khiển server.");
    if (!["start", "stop", "restart"].includes(action) || (target === "all" ? action === "restart" : !this.servers.some((server) => server.id === target))) {
      throw new Error("Server không hợp lệ.");
    }
    if (this.job?.status === "starting") {
      return { accepted: false, jobId: this.job.id, completion: Promise.resolve() };
    }
    const job: StartupJob = {
      id: randomUUID(), target, action, status: "starting", currentId: null,
      startedAt: new Date().toISOString(), finishedAt: null, error: null,
    };
    this.job = job;
    const selected = target === "all" ? [...this.servers] : this.servers.filter((server) => server.id === target);
    if (action === "stop") selected.reverse();
    for (const server of selected) this.errors.delete(server.id);
    return { accepted: true, jobId: job.id, completion: this.run(job, selected) };
  }

  private async run(job: StartupJob, selected: Definition[]) {
    const launched: Definition[] = [];
    const confirmed: Definition[] = [];
    let current: Definition | undefined;
    try {
      if (this.runtime.platform !== "win32") throw new Error("Chức năng này cần chạy trực tiếp trên Windows.");
      if (job.action !== "start") {
        for (const server of selected) {
          current = server;
          job.currentId = server.id;
          if (job.action === "restart" && !await this.runtime.exists(server.path)) {
            throw new Error(`Không tìm thấy file: ${server.path}`);
          }
          this.event("info", `${job.action === "restart" ? "Đang restart" : "Đang tắt"} ${server.name}…`);
          const processes = await this.runtime.listProcesses();
          const matching = processes.filter((process) => server.paths.includes(normalized(process.path)));
          for (const process of matching) await this.runtime.stop(process);
          for (let attempt = 0; ; attempt++) {
            if (!this.find(server, await this.runtime.listProcesses())) break;
            if (attempt >= 10) throw new Error(`${server.name} vẫn đang chạy; không mở thêm tiến trình mới.`);
            await this.runtime.wait(200);
          }
          this.event("success", `${server.name} đã tắt.`);
        }
        if (job.action === "stop") {
          job.status = "completed";
          if (job.target === "all") this.event("success", "Đã tắt tất cả server.");
          return;
        }
        await this.runtime.wait(500);
      }
      this.event("info", job.target === "all" ? "Bắt đầu khởi động 8 server." : `Bắt đầu khởi động ${selected[0].name}.`);
      // Fail closed: inventory must be readable before any process is created.
      let processes = await this.runtime.listProcesses();
      for (const server of selected) {
        if (!this.find(server, processes) && !await this.runtime.exists(server.path)) {
          current = server;
          throw new Error(`Không tìm thấy file: ${server.path}`);
        }
      }
      for (const server of selected) {
        current = server;
        job.currentId = server.id;
        processes = await this.runtime.listProcesses();
        this.assertStillRunning(confirmed, processes);
        if (this.find(server, processes)) {
          confirmed.push(server);
          this.event("info", `${server.name} đang chạy, bỏ qua để tránh mở trùng.`);
          continue;
        }
        if (launched.length) {
          this.event("info", `Chờ 10 giây trước khi bật ${server.name}.`);
          await this.runtime.wait(10_000);
          processes = await this.runtime.listProcesses();
          this.assertStillRunning(confirmed, processes);
          // Recheck after the delay in case another launcher opened this server.
          if (this.find(server, processes)) {
            confirmed.push(server);
            this.event("info", `${server.name} đã được mở, bỏ qua.`);
            continue;
          }
        }
        this.event("info", `Đang mở ${server.name}…`);
        const pid = await this.runtime.launch(server.path, path.dirname(server.path));
        await this.runtime.wait(2_000);
        processes = await this.runtime.listProcesses();
        if (!processes.some((process) => process.pid === pid && server.paths.includes(normalized(process.path)))) {
          throw new Error(`${server.name} đã thoát ngay sau khi mở. Kiểm tra cấu hình, database và nhật ký của server.`);
        }
        launched.push(server);
        confirmed.push(server);
        this.event("success", `${server.name} đã chạy · PID ${pid}.`);
      }
      this.assertStillRunning(selected, await this.runtime.listProcesses());
      job.status = "completed";
      this.event("success", job.target === "all" ? "Đã bật đủ 8 tiến trình server." : `${selected[0].name} đang chạy.`);
    } catch (error) {
      job.status = "failed";
      job.error = messageOf(error);
      if (current && !selected.some((server) => this.errors.get(server.id) === job.error)) {
        this.errors.set(current.id, job.error);
      }
      this.event("error", job.error);
    } finally {
      job.currentId = null;
      job.finishedAt = new Date().toISOString();
    }
  }

  private assertStillRunning(servers: Definition[], processes: RunningProcess[]) {
    for (const server of servers) {
      if (!this.find(server, processes)) {
        const error = `${server.name} đã dừng trong lúc khởi động. Kiểm tra nhật ký của server trước khi thử lại.`;
        this.errors.set(server.id, error);
        throw new Error(error);
      }
    }
  }
}
