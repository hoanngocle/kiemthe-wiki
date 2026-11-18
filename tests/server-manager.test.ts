import assert from "node:assert/strict";
import { test } from "node:test";
import { win32 as path } from "node:path";
import { ServerManager, type Runtime, type RunningProcess } from "../lib/server-manager.ts";

test("database maintenance prevents starting servers and always releases its lock", async () => {
  const f = fixture();
  const manager = new ServerManager(f.runtime);
  await assert.rejects(manager.withMaintenance(async () => {
    assert.throws(() => manager.start("all"), /Database/);
    await assert.rejects(manager.withMaintenance(async () => undefined, true), /Database/);
    throw new Error("disk failure");
  }, true), /disk failure/);
  const job = manager.start("goddess");
  assert.equal(job.accepted, true);
  await job.completion;
});

test("import maintenance rejects running game servers and active launcher jobs", async () => {
  const f = fixture();
  const manager = new ServerManager(f.runtime);
  f.setProcesses([{ pid: 32, path: "C:\\Game\\Sever\\goddess\\GD.exe" }]);
  await assert.rejects(manager.withMaintenance(async () => assert.fail("must not restore"), true), /dừng/);
  f.setProcesses([]);
  const job = manager.start("all");
  await assert.rejects(manager.withMaintenance(async () => assert.fail("must not restore"), true), /server/);
  await job.completion;
});

function fixture() {
  let processes: RunningProcess[] = [];
  const launched: string[] = [];
  const stopped: number[] = [];
  const waits: number[] = [];
  const runtime: Runtime = {
    platform: "win32",
    root: "C:\\Game\\Sever",
    exists: async () => true,
    listProcesses: async () => processes,
    stop: async (process) => {
      stopped.push(process.pid);
      processes = processes.filter((item) => item.pid !== process.pid);
    },
    launch: async (file, cwd) => {
      assert.equal(cwd, path.dirname(file));
      launched.push(path.basename(file));
      const pid = 100 + launched.length;
      processes = [...processes, { pid, path: file }];
      return pid;
    },
    wait: async (ms) => { waits.push(ms); },
  };
  return { runtime, launched, stopped, waits, setProcesses: (value: RunningProcess[]) => { processes = value; } };
}

test("launches eight processes in order with their own working directories", async () => {
  const f = fixture();
  const manager = new ServerManager(f.runtime);
  const job = manager.start("all");
  assert.equal(manager.start("gs1").accepted, false);
  assert.equal(job.accepted, true);
  await job.completion;
  assert.deepEqual(f.launched, ["GD.exe", "LS.exe", "Bishop.exe", "gamecenter.exe", "GS1.exe", "GS2.exe", "GS3.exe", "GS4.exe"]);
  assert.equal(f.waits.filter((ms) => ms === 10_000).length, 7);
  const state = await manager.snapshot();
  assert.equal(state.servers.filter((server) => server.status === "running").length, 8);
  assert.equal(state.job?.status, "completed");
});

test("recognizes an alias in the same installation and skips an existing server", async () => {
  const f = fixture();
  f.setProcesses([{ pid: 32, path: "c:\\game\\sever\\Goddess\\kg_goddessd.exe" }]);
  const manager = new ServerManager(f.runtime);
  await manager.start("goddess").completion;
  assert.deepEqual(f.launched, []);
  assert.equal((await manager.snapshot()).servers[0].pid, 32);
});

test("does not mistake another installation for this server", async () => {
  const f = fixture();
  f.setProcesses([{ pid: 32, path: "C:\\Other\\goddess\\GD.exe" }]);
  const manager = new ServerManager(f.runtime);
  await manager.start("goddess").completion;
  assert.deepEqual(f.launched, ["GD.exe"]);
});

test("preflights all files before launching any server", async () => {
  const f = fixture();
  f.runtime.exists = async (file) => !file.endsWith("GS4.exe");
  const manager = new ServerManager(f.runtime);
  await manager.start("all").completion;
  assert.deepEqual(f.launched, []);
  const state = await manager.snapshot();
  assert.equal(state.job?.status, "failed");
  assert.match(state.job?.error ?? "", /GS4.exe/);
});

test("never launches when Windows process inventory fails", async () => {
  const f = fixture();
  f.runtime.listProcesses = async () => { throw new Error("CIM unavailable"); };
  const manager = new ServerManager(f.runtime);
  await manager.start("all").completion;
  assert.deepEqual(f.launched, []);
  assert.equal(manager.job?.status, "failed");
  await assert.rejects(manager.snapshot(), /CIM unavailable/);
});

test("stops the sequence when a process exits during startup", async () => {
  const f = fixture();
  f.runtime.wait = async () => { f.setProcesses([]); };
  const manager = new ServerManager(f.runtime);
  await manager.start("all").completion;
  assert.deepEqual(f.launched, ["GD.exe"]);
  assert.equal(manager.job?.status, "failed");
  assert.match(manager.job?.error ?? "", /Goddess/);
});

test("rejects arbitrary IDs and unsupported platforms", async () => {
  const f = fixture();
  const manager = new ServerManager(f.runtime);
  assert.throws(() => manager.start("../../cmd.exe"), /không hợp lệ/);
  f.runtime.platform = "linux";
  await manager.start("all").completion;
  assert.deepEqual(f.launched, []);
  assert.equal(manager.job?.status, "failed");
});

test("stops before launching dependents if a previously running server exits", async () => {
  const f = fixture();
  f.setProcesses([{ pid: 32, path: "C:\\Game\\Sever\\goddess\\GD.exe" }]);
  f.runtime.wait = async (ms) => {
    if (ms === 10_000) f.setProcesses([{ pid: 101, path: "C:\\Game\\Sever\\logserver\\LS.exe" }]);
  };
  const manager = new ServerManager(f.runtime);
  await manager.start("all").completion;
  assert.deepEqual(f.launched, ["LS.exe"]);
  assert.equal(manager.job?.status, "failed");
  assert.match(manager.job?.error ?? "", /Goddess/);
});

test("releases startup lock after a launch failure so the user can retry", async () => {
  const f = fixture();
  const launch = f.runtime.launch;
  f.runtime.launch = async () => { throw new Error("Access denied"); };
  const manager = new ServerManager(f.runtime);
  await manager.start("goddess").completion;
  assert.equal(manager.job?.status, "failed");
  f.runtime.launch = launch;
  const retry = manager.start("goddess");
  assert.equal(retry.accepted, true);
  await retry.completion;
  assert.equal(manager.job?.status, "completed");
});

test("stops only matching server paths, including duplicate aliases", async () => {
  const f = fixture();
  f.setProcesses([
    { pid: 31, path: "C:\\Game\\Sever\\goddess\\GD.exe" },
    { pid: 32, path: "C:\\Game\\Sever\\goddess\\kg_goddessd.exe" },
    { pid: 33, path: "C:\\Other\\goddess\\GD.exe" },
    { pid: 34, path: "C:\\Game\\Sever\\logserver\\LS.exe" },
  ]);
  const manager = new ServerManager(f.runtime);
  await manager.control("goddess", "stop").completion;
  assert.deepEqual(f.stopped, [31, 32]);
  assert.deepEqual(f.launched, []);
  const state = await manager.snapshot();
  assert.equal(state.servers[0].status, "stopped");
  assert.equal(state.servers[1].pid, 34);
  assert.equal(state.job?.status, "completed");
});

test("restarts by stopping the existing process before launching once", async () => {
  const f = fixture();
  f.setProcesses([{ pid: 31, path: "C:\\Game\\Sever\\gameserver\\GS1.exe" }]);
  const launch = f.runtime.launch;
  f.runtime.launch = async (file, cwd) => {
    assert.deepEqual(f.stopped, [31]);
    return launch(file, cwd);
  };
  const manager = new ServerManager(f.runtime);
  await manager.control("gs1", "restart").completion;
  assert.deepEqual(f.launched, ["GS1.exe"]);
  assert.equal((await manager.snapshot()).servers[4].status, "running");
});

test("a failed stop prevents restart and releases the operation lock", async () => {
  const f = fixture();
  f.setProcesses([{ pid: 31, path: "C:\\Game\\Sever\\gameserver\\GS1.exe" }]);
  f.runtime.stop = async () => { throw new Error("Access denied"); };
  const manager = new ServerManager(f.runtime);
  const restart = manager.control("gs1", "restart");
  assert.equal(manager.start("all").accepted, false);
  assert.equal(manager.control("gs2", "stop").accepted, false);
  await restart.completion;
  assert.deepEqual(f.launched, []);
  assert.equal(manager.job?.status, "failed");
  assert.match(manager.job?.error ?? "", /Access denied/);
  assert.equal(manager.start("goddess").accepted, true);
});

test("restart checks the binary exists before stopping any process", async () => {
  const f = fixture();
  f.setProcesses([{ pid: 31, path: "C:\\Game\\Sever\\gameserver\\GS1.exe" }]);
  f.runtime.exists = async () => false;
  const manager = new ServerManager(f.runtime);
  await manager.control("gs1", "restart").completion;
  assert.deepEqual(f.stopped, []);
  assert.deepEqual(f.launched, []);
  assert.equal(manager.job?.status, "failed");
});

test("does not restart while the old process is still present", async () => {
  const f = fixture();
  f.setProcesses([{ pid: 31, path: "C:\\Game\\Sever\\gameserver\\GS1.exe" }]);
  f.runtime.stop = async () => {};
  const manager = new ServerManager(f.runtime);
  await manager.control("gs1", "restart").completion;
  assert.deepEqual(f.launched, []);
  assert.equal(manager.job?.status, "failed");
});

test("stop is idempotent and rejects invalid targets and all-server restart", async () => {
  const f = fixture();
  const manager = new ServerManager(f.runtime);
  assert.throws(() => manager.control("all", "restart"), /không hợp lệ/);
  assert.throws(() => manager.control("cmd.exe", "restart"), /không hợp lệ/);
  await manager.control("gs1", "stop").completion;
  assert.deepEqual(f.stopped, []);
  assert.deepEqual(f.launched, []);
  assert.equal(manager.job?.status, "completed");
});

test("stops all servers in reverse order, including aliases and duplicate processes, only in this installation", async () => {
  const f = fixture();
  const manager = new ServerManager(f.runtime);
  await manager.start("all").completion;
  f.setProcesses([
    ...(await manager.snapshot()).servers.map((server) => ({ pid: server.pid!, path: server.path })),
    { pid: 201, path: "C:\\Game\\Sever\\goddess\\kg_goddessd.exe" },
    { pid: 999, path: "C:\\Other\\gameserver\\GS1.exe" },
  ]);
  const job = manager.control("all", "stop");
  assert.equal(job.accepted, true);
  assert.equal(manager.start("all").accepted, false);
  await job.completion;
  assert.deepEqual(f.stopped, [108, 107, 106, 105, 104, 103, 102, 101, 201]);
  assert.equal((await manager.snapshot()).servers.every((server) => server.pid === null), true);
  assert.equal(manager.job?.status, "completed");
  await manager.control("all", "stop").completion;
  assert.equal(f.stopped.length, 9);
  assert.equal(f.launched.length, 8);
});

test("all-server stop fails before stopping dependencies when a server remains running", async () => {
  const f = fixture();
  f.setProcesses([
    { pid: 31, path: "C:\\Game\\Sever\\gameserver\\GS4.exe" },
    { pid: 32, path: "C:\\Game\\Sever\\goddess\\GD.exe" },
  ]);
  f.runtime.stop = async () => {};
  const manager = new ServerManager(f.runtime);
  await manager.control("all", "stop").completion;
  assert.equal(manager.job?.status, "failed");
  assert.match(manager.job?.error ?? "", /GameServer 4/);
  assert.equal((await manager.snapshot()).servers[0].pid, 32);
  assert.deepEqual(f.launched, []);
  assert.equal(manager.control("gs1", "stop").accepted, true);
});
