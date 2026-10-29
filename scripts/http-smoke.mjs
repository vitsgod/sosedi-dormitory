import assert from "node:assert/strict";
const base = process.env.APP_ORIGIN || "http://localhost:3000";
let cookie = "";
async function post(path, body, origin = base) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const set = r.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return { status: r.status, body: await r.json() };
}
async function data() {
  const r = await fetch(base + "/api/data", { headers: { Cookie: cookie } });
  assert.equal(r.status, 200);
  return r.json();
}
assert.equal((await fetch(base)).status, 200);
assert.equal((await fetch(base + "/api/data")).status, 401);
assert.equal(
  (await post("/api/auth/demo", { role: "ADMIN" }, "https://different.invalid"))
    .status,
  403,
);
assert.equal((await post("/api/auth/demo", { role: "RESIDENT" })).status, 200);
const resident = await data();
assert.equal(resident.user.role, "RESIDENT");
assert.equal(resident.machines.length, 5);
assert.ok(!("passwordHash" in resident.user));
assert.equal(resident.users.length, 0);
const r = await post("/api/actions", {
  action: "request",
  title: "Проверка через HTTP",
  description: "Демонстрационная проверка полного пути заявки",
  room: "412",
  specialty: "PLUMBER",
  attachmentIds: [],
});
assert.equal(r.status, 200);
const requestId = r.body.result.id;
assert.equal(
  (
    await post("/api/actions", {
      action: "approve",
      id: resident.user.id,
      status: "APPROVED",
    })
  ).status,
  403,
);
assert.equal((await post("/api/auth/demo", { role: "MASTER" })).status, 200);
const master = await data();
assert.equal(master.complaints.length, 0);
assert.ok(master.requests.some((x) => x.id === requestId));
assert.equal(
  (await post("/api/actions", { action: "claim", id: requestId })).status,
  200,
);
assert.equal(
  (await post("/api/actions", { action: "complete", id: requestId })).status,
  200,
);
assert.equal((await post("/api/auth/demo", { role: "RESIDENT" })).status, 200);
const after = await data();
assert.equal(after.user.id, resident.user.id);
assert.equal(after.requests.find((x) => x.id === requestId).status, "DONE");
assert.ok(after.notifications.some((n) => n.title === "Работы выполнены"));
assert.equal((await post("/api/auth/logout", {})).status, 200);
assert.equal(
  (await fetch(base + "/api/data", { headers: { Cookie: cookie } })).status,
  401,
);
console.log(
  "HTTP smoke: PASS (public, sessions, CSRF, roles, request workflow, notifications, logout).",
);
