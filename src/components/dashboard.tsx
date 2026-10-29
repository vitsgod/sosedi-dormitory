"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  WashingMachine,
  Wrench,
  MessageSquareText,
  Megaphone,
  Users,
  Bell,
  LogOut,
  ArrowUpRight,
  ArrowRight,
  Plus,
  X,
  Check,
  Clock3,
  ChevronRight,
  LoaderCircle,
  Pin,
  CalendarDays,
  Menu,
  Settings2,
} from "lucide-react";
import { AppearanceSettings, ThemeMenu } from "./theme-provider";
import { Brand } from "./brand";
import { DemoButtons } from "./demo-buttons";
import type { getDashboard } from "../lib/dashboard";
type Serialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;
type Data = Serialized<Awaited<ReturnType<typeof getDashboard>>>;
const labels: Record<string, string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  DONE: "Выполнена",
  RECEIVED: "Получена",
  REVIEWING: "На рассмотрении",
  RESOLVED: "Решена",
  BOOKED: "Забронировано",
  RUNNING: "Идёт стирка",
  CANCELLED: "Отменено",
  EXPIRED: "Бронь истекла",
  APPROVED: "Подтверждён",
  PENDING: "Ожидает",
  REJECTED: "Отклонён",
  DISABLED: "Заблокирован",
};
const specialties: Record<string, string> = {
  PLUMBER: "Сантехник",
  ELECTRICIAN: "Электрик",
  LOCKSMITH: "Слесарь",
};
const roles: Record<string, string> = {
  RESIDENT: "Жилец",
  MASTER: "Мастер",
  ADMIN: "Администратор",
};
const fmt = (
  s: string | Date,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  },
) =>
  new Intl.DateTimeFormat("ru-RU", {
    ...options,
    timeZone: "Europe/Moscow",
  }).format(new Date(s));
const time = (s: string | Date) =>
  fmt(s, { hour: "2-digit", minute: "2-digit" });
function Badge({ status }: { status: string }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      {labels[status] || status}
    </span>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      className="modal"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-content">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={close} aria-label="Закрыть">
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function Dashboard({ initial }: { initial: Data }) {
  const [isMobile, setIsMobile] = useState(false);
  const [noticeFilter, setNoticeFilter] = useState("active");
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(
    null,
  );
  const [modal, setModal] = useState("");
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width:680px)");
    const update = () => setIsMobile(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  const search = useSearchParams(),
    router = useRouter();
  const tab = search.get("tab") || "overview";
  const u = data.user;
  const resident = u.role === "RESIDENT",
    admin = u.role === "ADMIN",
    master = u.role === "MASTER";
  const mine = data.bookings.filter(
    (b) => b.userId === u.id && ["BOOKED", "RUNNING"].includes(b.status),
  );
  const unread = data.notifications.filter((n) => !n.read).length;
  const nav = [
    { id: "overview", label: "Мой дом", icon: Home },
    ...(resident
      ? [{ id: "laundry", label: "Прачечная", icon: WashingMachine }]
      : []),
    {
      id: "requests",
      label: master ? "Заявки на ремонт" : "Помощь мастера",
      icon: Wrench,
    },
    ...(!master
      ? [
          {
            id: "complaints",
            label: admin ? "Жалобы жильцов" : "Мои обращения",
            icon: MessageSquareText,
          },
        ]
      : []),
    { id: "announcements", label: "Объявления", icon: Megaphone },
    ...(admin
      ? [
          { id: "users", label: "Жильцы и доступ", icon: Users },
          { id: "machines", label: "Стиральные машины", icon: WashingMachine },
        ]
      : []),
    { id: "settings", label: "Настройки", icon: Settings2 },
  ];
  function go(id: string) {
    router.push(`/app?tab=${id}`);
    setMenu(false);
  }
  async function refresh() {
    const r = await fetch("/api/data");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setData(d);
  }
  useEffect(() => {
    const id = setInterval(() => {
      refresh().catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(id);
  }, [toast]);
  async function action(payload: Record<string, unknown>, success = "Готово") {
    setBusy(true);
    try {
      const r = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      await refresh();
      setToast({ text: success });
      setModal("");
      return true;
    } catch (e) {
      setToast({
        text: e instanceof Error ? e.message : "Не удалось выполнить действие",
        error: true,
      });
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      const r = await fetch("/api/auth/logout", { method: "POST" });
      if (!r.ok) throw new Error("Не удалось выйти");
      window.location.href = "/";
    } catch {
      setToast({ text: "Не удалось выйти. Попробуйте ещё раз.", error: true });
      setBusy(false);
    }
  }
  const sectionTitle =
    tab === "notifications"
      ? "Уведомления"
      : nav.find((n) => n.id === tab)?.label || "Мой дом";
  return (
    <div className="app-shell">
      <aside
        inert={isMobile && !menu}
        className={`sidebar ${menu ? "mobile-open" : ""}`}
      >
        <Brand compact />
        <button
          className="mobile-close icon-button"
          aria-label="Закрыть меню"
          onClick={() => setMenu(false)}
        >
          <X />
        </button>
        <div className="workspace-label">
          <span className="live-dot" />
          Общежитие № 4<span>РОСБИОТЕХ</span>
        </div>
        <nav aria-label="Личный кабинет">
          {nav.map((n) => (
            <Link
              key={n.id}
              href={`/app?tab=${n.id}`}
              aria-current={tab === n.id ? "page" : undefined}
              className={`nav-item ${tab === n.id ? "active" : ""}`}
              onClick={() => setMenu(false)}
            >
              <n.icon size={19} />
              {n.label}
              {n.id === "requests" &&
                data.requests.filter((r) => r.status !== "DONE").length > 0 && (
                  <span className="nav-count">
                    {data.requests.filter((r) => r.status !== "DONE").length}
                  </span>
                )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-item" href="/" target="_blank">
            <ArrowUpRight size={19} />
            Открытая главная
          </a>
          <div className="user-block">
            <span className="avatar">{u.name[0]}</span>
            <div>
              <strong>{u.name}</strong>
              <span>
                {roles[u.role]}
                {u.room ? ` · комната ${u.room}` : ""}
              </span>
            </div>
            <button
              className="icon-button"
              disabled={busy}
              onClick={logout}
              aria-label="Выйти"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-top">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMenu(!menu)}
            aria-label="Открыть меню"
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Общежитие № 4 <ChevronRight size={14} />
            <span>{sectionTitle}</span>
          </div>
          <div className="header-actions">
            <ThemeMenu />
            <Link
              className={`notification-button ${tab === "notifications" ? "selected" : ""}`}
              href="/app?tab=notifications"
              aria-label={`Уведомления: ${unread} непрочитанных`}
            >
              <Bell size={20} />
              {unread > 0 && <span>{unread}</span>}
            </Link>
          </div>
        </header>
        <main className="app-main" id="main-content" tabIndex={-1}>
          {u.isDemo && (
            <div className="demo-banner">
              <span>
                <span className="live-dot" />
                Деморежим{" "}
                <span className="demo-banner-note">
                  · Ваши изменения видны только в этом пространстве
                </span>
              </span>
              <details>
                <summary>
                  Сменить роль <ChevronRight size={14} />
                </summary>
                <div className="role-popover">
                  <DemoButtons compact />
                </div>
              </details>
            </div>
          )}
          <div className="page-title">
            <div>
              <h1>
                {tab === "overview"
                  ? resident
                    ? `Привет, ${u.name.split(" ")[0]}`
                    : master
                      ? "Работа по дому"
                      : "Всё под контролем"
                  : sectionTitle}
              </h1>
              <p>
                {tab === "overview"
                  ? fmt(new Date(), {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : tab === "laundry"
                    ? "Запись на ближайшие 24 часа · время московское"
                    : tab === "requests"
                      ? master
                        ? "Заявки по вашей специальности и назначенные работы"
                        : "Опишите поломку — заявка попадёт нужному специалисту"
                      : tab === "complaints"
                        ? "Личные обращения. Без публичного обсуждения."
                        : tab === "users"
                          ? "Подтверждение заявок и назначение ролей"
                          : tab === "announcements"
                            ? "Важное о жизни общежития"
                            : ""}
              </p>
            </div>
            {resident && ["requests", "complaints"].includes(tab) && (
              <button
                className="button primary"
                onClick={() =>
                  setModal(tab === "requests" ? "request" : "complaint")
                }
              >
                <Plus size={18} />
                {tab === "requests" ? "Вызвать мастера" : "Написать обращение"}
              </button>
            )}
            {admin && tab === "announcements" && (
              <button
                className="button primary"
                onClick={() => setModal("announcement")}
              >
                <Plus size={18} />
                Объявление
              </button>
            )}
          </div>
          {tab === "overview" && (
            <>
              <div className="overview-grid">
                <section className="panel home-actions">
                  <div className="panel-title">
                    <h2>
                      {resident
                        ? "Домашние дела"
                        : master
                          ? "Ваша очередь"
                          : "Требует внимания"}
                    </h2>
                    <span className="quiet-tag">
                      {resident
                        ? "Всё под рукой"
                        : master
                          ? specialties[u.specialty || ""]
                          : "Сегодня"}
                    </span>
                  </div>
                  {resident ? (
                    <>
                      <Link className="primary-job" href="/app?tab=laundry">
                        <WashingMachine size={33} strokeWidth={1.4} />
                        <div>
                          <h3>
                            Большая стирка —<br />
                            маленькое дело.
                          </h3>
                          <p>5 машинок. Без очереди с корзиной.</p>
                        </div>
                        <ArrowUpRight size={24} />
                      </Link>
                      <div className="quick-actions">
                        <button onClick={() => setModal("request")}>
                          <Wrench size={21} />
                          <span>Вызвать мастера</span>
                          <Plus size={18} />
                        </button>
                        <button onClick={() => setModal("complaint")}>
                          <MessageSquareText size={21} />
                          <span>Написать обращение</span>
                          <Plus size={18} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="staff-summary">
                      <div>
                        <strong>
                          {master
                            ? data.requests.filter((r) => r.status === "NEW")
                                .length
                            : data.users.filter((x) => x.status === "PENDING")
                                .length}
                        </strong>
                        <span>
                          {master ? "свободных заявок" : "заявок на проживание"}
                        </span>
                        <button
                          className="text-link"
                          onClick={() => go(master ? "requests" : "users")}
                        >
                          Посмотреть <ArrowRight size={16} />
                        </button>
                      </div>
                      <div>
                        <strong>
                          {master
                            ? data.requests.filter(
                                (r) => r.status === "IN_PROGRESS",
                              ).length
                            : data.complaints.filter(
                                (c) => c.status !== "RESOLVED",
                              ).length}
                        </strong>
                        <span>
                          {master ? "в работе" : "открытых обращений"}
                        </span>
                        <button
                          className="text-link"
                          onClick={() => go(master ? "requests" : "complaints")}
                        >
                          Открыть <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </section>
                <section className="panel next-wash">
                  <div className="panel-title">
                    <h2>{resident ? "Ближайшая стирка" : "Порядок работы"}</h2>
                    <Clock3 size={18} />
                  </div>
                  {resident ? (
                    mine.length ? (
                      <>
                        <span className="big-time">
                          {time(mine[0].startsAt)}
                        </span>
                        <p>
                          Машинка № {mine[0].machine.number} ·{" "}
                          {mine[0].durationMinutes} мин
                        </p>
                        <Badge status={mine[0].status} />
                        <Link className="text-link" href="/app?tab=laundry">
                          Мои записи <ArrowRight size={16} />
                        </Link>
                      </>
                    ) : (
                      <>
                        <div className="laundry-line-art">
                          <WashingMachine size={66} strokeWidth={1} />
                        </div>
                        <h3>Планы на чистое</h3>
                        <p>
                          У вас пока нет записей.
                          <br />
                          Самое время выбрать сеанс.
                        </p>
                        <Link className="text-link" href="/app?tab=laundry">
                          Записаться <ArrowRight size={16} />
                        </Link>
                      </>
                    )
                  ) : (
                    <>
                      <h3>
                        {master
                          ? "От заявки до результата"
                          : "Дом начинается с людей"}
                      </h3>
                      <p>
                        {master
                          ? "Возьмите заявку из очереди, выполните работу и отметьте результат. Жилец получит уведомление."
                          : "Подтверждайте проживание, назначайте мастеров и держите жильцов в курсе событий."}
                      </p>
                    </>
                  )}
                </section>
              </div>
              <div className="overview-bottom">
                <section className="panel">
                  <div className="panel-title">
                    <h2>
                      {master
                        ? "Последние заявки"
                        : admin
                          ? "Заявки жильцов"
                          : "Мои заявки"}
                    </h2>
                    <Link className="text-link" href="/app?tab=requests">
                      Все <ArrowRight size={15} />
                    </Link>
                  </div>
                  <RequestList
                    items={data.requests.slice(0, 3)}
                    master={master}
                    busy={busy}
                    onAction={action}
                  />
                </section>
                <section className="panel">
                  <div className="panel-title">
                    <h2>Новости дома</h2>
                    <Link className="text-link" href="/app?tab=announcements">
                      Все <ArrowRight size={15} />
                    </Link>
                  </div>
                  {data.announcements.slice(0, 3).map((a) => (
                    <Link
                      key={a.id}
                      className="mini-notice"
                      href="/app?tab=announcements"
                    >
                      <span
                        className={`notice-dot ${a.category.toLowerCase()}`}
                      />
                      <div>
                        <strong>{a.title}</strong>
                        <span>
                          До {fmt(a.endsAt, { day: "numeric", month: "long" })}
                        </span>
                      </div>
                      {a.pinned ? (
                        <Pin size={15} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </Link>
                  ))}
                  {!data.announcements.length && (
                    <Empty text="Новых объявлений пока нет." />
                  )}
                </section>
              </div>
            </>
          )}
          {tab === "laundry" && resident && (
            <Laundry data={data} busy={busy} onAction={action} />
          )}
          {tab === "requests" && (
            <section className="panel">
              <RequestList
                items={data.requests}
                master={master}
                busy={busy}
                onAction={action}
              />
            </section>
          )}
          {tab === "complaints" && !master && (
            <section className="panel">
              {data.complaints.length ? (
                data.complaints.map((c) => (
                  <article className="detail-row" key={c.id}>
                    <div className="row-heading">
                      <div>
                        <h3>{c.title}</h3>
                        <p className="small-muted">
                          {fmt(c.createdAt)}
                          {admin
                            ? ` · ${c.author.name} · комната ${c.author.room}`
                            : ""}
                        </p>
                      </div>
                      <Badge status={c.status} />
                    </div>
                    <p className="body-copy">{c.description}</p>
                    <Attachments ids={c.attachments} />
                    <div className="history-line">
                      {c.history.map((h, i) => (
                        <span key={h.id}>
                          {i > 0 && <ChevronRight size={12} />}
                          <span>{labels[h.status]}</span>
                        </span>
                      ))}
                    </div>
                    {admin && (
                      <div className="row-actions">
                        {["RECEIVED", "REVIEWING", "RESOLVED"]
                          .filter((s) => s !== c.status)
                          .map((s) => (
                            <button
                              className="button small secondary"
                              disabled={busy}
                              key={s}
                              onClick={() =>
                                action(
                                  {
                                    action: "complaint-status",
                                    id: c.id,
                                    status: s,
                                  },
                                  "Статус обновлён",
                                )
                              }
                            >
                              {labels[s]}
                            </button>
                          ))}
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <Empty text="Обращений пока нет. Здесь появятся ваши жалобы и их статусы." />
              )}
            </section>
          )}
          {tab === "announcements" && (
            <>
              <div className="announcement-filters">
                {admin &&
                  ["active", "scheduled", "archive"].map((f, i) => (
                    <button
                      key={f}
                      className={noticeFilter === f ? "filter-active" : ""}
                      onClick={() => setNoticeFilter(f)}
                    >
                      {["Актуальные", "Запланированные", "Архив"][i]}
                    </button>
                  ))}
              </div>
              <div className="app-announcements">
                {(admin
                  ? data.managedAnnouncements.filter((a) =>
                      noticeFilter === "archive"
                        ? new Date(a.endsAt) <= new Date()
                        : noticeFilter === "scheduled"
                          ? new Date(a.startsAt) > new Date()
                          : new Date(a.startsAt) <= new Date() &&
                            new Date(a.endsAt) > new Date(),
                    )
                  : data.announcements
                ).map((a) => (
                  <article
                    className={`panel full-notice ${a.pinned ? "pinned" : ""}`}
                    key={a.id}
                  >
                    <div className="notice-meta">
                      <span
                        className={`category category-${a.category.toLowerCase()}`}
                      >
                        {
                          {
                            MEETING: "Собрание",
                            WORKS: "Технические работы",
                            INFO: "Полезное",
                          }[a.category]
                        }
                      </span>
                      {a.pinned && <Pin size={17} />}
                    </div>
                    <h2>{a.title}</h2>
                    <p className="body-copy">{a.body}</p>
                    <div className="notice-bottom">
                      <CalendarDays size={15} />
                      До {fmt(a.endsAt)}
                      {admin && (
                        <button
                          className="text-link danger"
                          disabled={busy}
                          onClick={() =>
                            action(
                              { action: "archive", id: a.id },
                              "Объявление снято с публикации",
                            )
                          }
                        >
                          Снять с публикации
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                {!(
                  admin
                    ? data.managedAnnouncements.filter((a) =>
                        noticeFilter === "archive"
                          ? new Date(a.endsAt) <= new Date()
                          : noticeFilter === "scheduled"
                            ? new Date(a.startsAt) > new Date()
                            : new Date(a.startsAt) <= new Date() &&
                              new Date(a.endsAt) > new Date(),
                      )
                    : data.announcements
                ).length && (
                  <Empty text="В этом разделе пока нет объявлений." />
                )}
              </div>
            </>
          )}
          {tab === "notifications" && (
            <section className="panel">
              <div className="panel-title">
                <h2>Все события</h2>
                <button
                  className="text-link"
                  disabled={busy || !unread}
                  onClick={() =>
                    action({ action: "read" }, "Уведомления прочитаны")
                  }
                >
                  <Check size={15} />
                  Прочитать все
                </button>
              </div>
              {data.notifications.map((n) => (
                <article
                  key={n.id}
                  className={`notification-row ${n.read ? "" : "unread"}`}
                >
                  <span className="notice-dot" />
                  <div>
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                    <span className="small-muted">{fmt(n.createdAt)}</span>
                  </div>
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label="Открыть событие"
                    onClick={async () => {
                      if (
                        await action({ action: "read", id: n.id }, "Прочитано")
                      )
                        router.push(n.href);
                    }}
                  >
                    <ArrowUpRight size={19} />
                  </button>
                </article>
              ))}
              {!data.notifications.length && (
                <Empty text="Пока тихо. Новые события появятся здесь." />
              )}
            </section>
          )}
          {tab === "users" && admin && (
            <section className="panel users-panel">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Жилец</th>
                      <th>Комната</th>
                      <th>Доступ</th>
                      <th>Роль</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((person) => (
                      <tr key={person.id}>
                        <td>
                          <strong>{person.name}</strong>
                          <span className="cell-sub">{person.email}</span>
                        </td>
                        <td>{person.room || "—"}</td>
                        <td>
                          <Badge status={person.status} />
                        </td>
                        <td>
                          {roles[person.role]}
                          {person.specialty && (
                            <span className="cell-sub">
                              {specialties[person.specialty]}
                            </span>
                          )}
                        </td>
                        <td>
                          {person.isDemo ? (
                            <span className="small-muted">Демопрофиль</span>
                          ) : person.id === u.id ? (
                            <span className="small-muted">Это вы</span>
                          ) : (
                            <div className="row-actions">
                              {person.status === "PENDING" ? (
                                <>
                                  <button
                                    disabled={busy}
                                    className="button small primary"
                                    onClick={() =>
                                      action(
                                        {
                                          action: "approve",
                                          id: person.id,
                                          status: "APPROVED",
                                        },
                                        "Доступ подтверждён",
                                      )
                                    }
                                  >
                                    Подтвердить
                                  </button>
                                  <button
                                    disabled={busy}
                                    className="button small secondary"
                                    onClick={() =>
                                      action({
                                        action: "approve",
                                        id: person.id,
                                        status: "REJECTED",
                                      })
                                    }
                                  >
                                    Отклонить
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="button small secondary"
                                    onClick={() =>
                                      setModal(`role:${person.id}`)
                                    }
                                  >
                                    Изменить роль
                                  </button>
                                  <button
                                    disabled={busy}
                                    className="text-link danger"
                                    onClick={() =>
                                      action({
                                        action: "approve",
                                        id: person.id,
                                        status:
                                          person.status === "APPROVED"
                                            ? "DISABLED"
                                            : "APPROVED",
                                      })
                                    }
                                  >
                                    {person.status === "APPROVED"
                                      ? "Закрыть доступ"
                                      : "Открыть доступ"}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === "settings" && <AppearanceSettings />}
          {tab === "machines" && admin && (
            <section className="panel">
              {data.machines.map((m) => (
                <div key={m.id} className="machine-admin">
                  <WashingMachine size={28} />
                  <div>
                    <h3>Машинка № {m.number}</h3>
                    <p>
                      {m.active
                        ? "Принимает новые записи"
                        : "Недоступна для новых записей"}
                    </p>
                  </div>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      action({ action: "machine", id: m.id, active: !m.active })
                    }
                  >
                    {m.active ? "Отключить" : "Включить"}
                  </button>
                </div>
              ))}
              <p className="small-muted">
                Отключение не отменяет существующие записи.
              </p>
              {data.bookings
                .filter((b) => ["BOOKED", "RUNNING"].includes(b.status))
                .map((b) => (
                  <div className="compact-booking" key={b.id}>
                    № {b.machine.number} · {fmt(b.startsAt)} — {time(b.endsAt)}{" "}
                    <Badge status={b.status} />
                  </div>
                ))}
            </section>
          )}
          <footer className="app-footer">
            <span>Соседи · Общежитие № 4</span>
            <span>Время московское · Учебный проект</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div
          className={`toast ${toast.error ? "toast-error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <X size={18} /> : <Check size={18} />}
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            aria-label="Закрыть уведомление"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {["request", "complaint"].includes(modal) && (
        <Modal
          title={modal === "request" ? "Вызвать мастера" : "Личное обращение"}
          close={() => setModal("")}
        >
          <IssueForm kind={modal} room={u.room} busy={busy} submit={action} />
        </Modal>
      )}
      {modal === "announcement" && (
        <Modal title="Новое объявление" close={() => setModal("")}>
          <AnnouncementForm busy={busy} submit={action} />
        </Modal>
      )}
      {modal.startsWith("role:") && (
        <Modal title="Роль и специальность" close={() => setModal("")}>
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              action(
                {
                  action: "role",
                  id: modal.split(":")[1],
                  role: f.get("role"),
                  specialty: f.get("specialty"),
                },
                "Роль обновлена",
              );
            }}
          >
            <label>
              Роль
              <select name="role" defaultValue="MASTER">
                <option value="RESIDENT">Жилец</option>
                <option value="MASTER">Мастер</option>
                <option value="ADMIN">Администратор</option>
              </select>
            </label>
            <label>
              Специальность мастера
              <select name="specialty">
                {Object.entries(specialties).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary" disabled={busy}>
              Сохранить
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
type Action = (
  payload: Record<string, unknown>,
  success?: string,
) => Promise<boolean>;
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <span className="empty-line" />
      <p>{text}</p>
    </div>
  );
}
function Attachments({ ids }: { ids: { id: string }[] }) {
  return ids.length ? (
    <div className="attachments">
      {ids.map((f) => (
        <a
          key={f.id}
          href={`/api/files/${f.id}`}
          target="_blank"
          rel="noreferrer"
        >
          <img
            loading="lazy"
            src={`/api/files/${f.id}`}
            width="96"
            height="72"
            alt="Фото к обращению"
          />
        </a>
      ))}
    </div>
  ) : null;
}
function RequestList({
  items,
  master,
  busy,
  onAction,
}: {
  items: Data["requests"];
  master: boolean;
  busy: boolean;
  onAction: Action;
}) {
  return items.length ? (
    <div className="request-list">
      {items.map((r) => (
        <article className="detail-row" key={r.id}>
          <div className="row-heading">
            <div>
              <span className="specialty-label">
                {specialties[r.specialty]} · комната {r.room}
              </span>
              <h3>{r.title}</h3>
            </div>
            <Badge status={r.status} />
          </div>
          <p className="body-copy">{r.description}</p>
          <Attachments ids={r.attachments} />
          <div className="request-foot">
            <span>
              {fmt(r.createdAt)}
              {r.assignee ? ` · ${r.assignee.name}` : ""}
            </span>
            {master && r.status === "NEW" && (
              <button
                disabled={busy}
                className="button small primary"
                onClick={() =>
                  onAction(
                    { action: "claim", id: r.id },
                    "Заявка закреплена за вами",
                  )
                }
              >
                Взять в работу <ArrowRight size={14} />
              </button>
            )}
            {master && r.status === "IN_PROGRESS" && (
              <button
                disabled={busy}
                className="button small primary"
                onClick={() =>
                  onAction({ action: "complete", id: r.id }, "Работа завершена")
                }
              >
                <Check size={15} />
                Выполнено
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  ) : (
    <Empty text="Заявок пока нет. Когда появится задача, она будет здесь." />
  );
}
function Laundry({
  data,
  busy,
  onAction,
}: {
  data: Data;
  busy: boolean;
  onAction: Action;
}) {
  const [selected, setSelected] = useState(
    data.machines.find((m) => m.active)?.id || "",
  );
  const [duration, setDuration] = useState(60);
  const [start, setStart] = useState("");
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const slots = Array.from(
    { length: 96 },
    (_, i) =>
      new Date(
        Math.ceil((now.getTime() + 60000) / 900000) * 900000 + i * 900000,
      ),
  ).filter((d) => d.getTime() <= now.getTime() + 86400000);
  const bookings = data.bookings.filter((b) =>
    ["BOOKED", "RUNNING"].includes(b.status),
  );
  function available(d: Date) {
    const end = new Date(d.getTime() + (duration + 10) * 60000);
    for (let t = d.getTime(); t < end.getTime(); t += 60000) {
      const l = new Date(t + 10800000);
      if (l.getUTCDay() === 1 || l.getUTCHours() === 7) return false;
    }
    return !bookings.some(
      (b) =>
        b.machineId === selected &&
        new Date(b.startsAt) < end &&
        new Date(b.endsAt) > d,
    );
  }
  const freeSlots = slots.filter(available);
  const chosen = freeSlots.some((s) => s.toISOString() === start)
    ? start
    : freeSlots[0]?.toISOString() || "";
  const mine = data.bookings.filter(
    (b) =>
      b.userId === data.user.id && ["BOOKED", "RUNNING"].includes(b.status),
  );
  const startAxis = new Date(Math.floor(now.getTime() / 3600000) * 3600000);
  const axisEnd = startAxis.getTime() + 12 * 3600000;
  return (
    <>
      <div className="laundry-layout">
        <section className="panel schedule-panel">
          <div className="panel-title">
            <h2>Расписание машинок</h2>
            <span className="small-muted">Ближайшие 12 часов</span>
          </div>
          <div className="schedule-scroll">
            <div className="schedule">
              <div className="schedule-axis">
                <span>Машинка</span>
                <div>
                  {Array.from({ length: 7 }, (_, i) => (
                    <span key={i}>
                      {time(new Date(startAxis.getTime() + i * 2 * 3600000))}
                    </span>
                  ))}
                </div>
              </div>
              {data.machines.map((m) => (
                <div
                  key={m.id}
                  className={`schedule-row ${m.id === selected ? "selected-machine" : ""}`}
                >
                  <button
                    onClick={() => setSelected(m.id)}
                    disabled={!m.active}
                  >
                    <WashingMachine size={20} />
                    <span>№ {m.number}</span>
                    {m.id === selected && <Check size={14} />}
                  </button>
                  <div className="schedule-track">
                    {Array.from({ length: 12 }, (_, i) => {
                      const local = new Date(
                        startAxis.getTime() + i * 3600000 + 10800000,
                      );
                      return local.getUTCDay() === 1 ||
                        local.getUTCHours() === 7 ? (
                        <span
                          key={i}
                          className="closed-hour"
                          style={{
                            left: `${(i / 12) * 100}%`,
                            width: `${100 / 12}%`,
                          }}
                          title="Прачечная закрыта"
                        />
                      ) : null;
                    })}
                    {bookings
                      .filter(
                        (b) =>
                          b.machineId === m.id &&
                          new Date(b.startsAt).getTime() < axisEnd &&
                          new Date(b.endsAt) > startAxis,
                      )
                      .map((b) => {
                        const left = Math.max(
                          0,
                          ((new Date(b.startsAt).getTime() -
                            startAxis.getTime()) /
                            (12 * 3600000)) *
                            100,
                        );
                        const right = Math.min(
                          100,
                          ((new Date(b.endsAt).getTime() -
                            startAxis.getTime()) /
                            (12 * 3600000)) *
                            100,
                        );
                        return (
                          <span
                            className={`booking-bar ${b.userId === data.user.id ? "own" : ""}`}
                            key={b.id}
                            style={{
                              left: `${left}%`,
                              width: `${right - left}%`,
                            }}
                            title={`${time(b.startsAt)}–${time(b.endsAt)}${b.userId === data.user.id ? " · Ваша запись" : ""}`}
                          >
                            {right - left > 9
                              ? b.userId === data.user.id
                                ? "Ваша"
                                : "Занято"
                              : ""}
                          </span>
                        );
                      })}
                    {!m.active && (
                      <span className="machine-off">Не принимает записи</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="schedule-legend">
            <span>
              <i className="legend-own" />
              Ваша запись
            </span>
            <span>
              <i className="legend-other" />
              Занято
            </span>
            <span>
              <i className="legend-closed" />
              Закрыто / уборка
            </span>
          </div>
          <div className="laundry-note">
            <Clock3 size={18} />
            <p>
              Пн — выходной. Ежедневно 07:00–08:00 — уборка.
              <br />
              После программы добавляем 10 минут на выгрузку.
            </p>
          </div>
        </section>
        <section className="panel booking-form-panel">
          <h2>Записаться на стирку</h2>
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              onAction(
                {
                  action: "book",
                  machineId: selected,
                  startsAt: chosen,
                  durationMinutes: duration,
                },
                "Вы записаны на стирку",
              );
            }}
          >
            <label>
              Машинка
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {data.machines.map((m) => (
                  <option key={m.id} value={m.id} disabled={!m.active}>
                    № {m.number}
                    {m.active ? "" : " · недоступна"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Длительность программы
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {Array.from({ length: 34 }, (_, i) => 15 + i * 5).map((d) => (
                  <option value={d} key={d}>
                    {d} минут
                  </option>
                ))}
              </select>
            </label>
            <label>
              Начало сеанса
              <select
                value={chosen}
                onChange={(e) => setStart(e.target.value)}
                required
                disabled={!freeSlots.length}
              >
                {freeSlots.length ? (
                  freeSlots.map((d) => (
                    <option key={d.toISOString()} value={d.toISOString()}>
                      {fmt(d)}
                    </option>
                  ))
                ) : (
                  <option value="">Нет свободных сеансов</option>
                )}
              </select>
            </label>
            {chosen && (
              <p className="booking-total">
                До{" "}
                {time(
                  new Date(
                    new Date(chosen).getTime() + (duration + 10) * 60000,
                  ),
                )}
                <span>включая выгрузку белья</span>
              </p>
            )}
            <button className="button primary" disabled={busy || !chosen}>
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <Plus size={17} />
              )}
              Забронировать
            </button>
            <small>
              До 3 машинок одновременно. Подтвердите начало в течение 10 минут.
            </small>
          </form>
        </section>
      </div>
      <section className="panel my-bookings">
        <div className="panel-title">
          <h2>Мои записи</h2>
          <span className="quiet-tag">{mine.length}</span>
        </div>
        {mine.length ? (
          mine.map((b) => (
            <article className="my-booking" key={b.id}>
              <WashingMachine size={25} />
              <div>
                <h3>Машинка № {b.machine.number}</h3>
                <p>
                  {fmt(b.startsAt)} — {time(b.endsAt)} · программа{" "}
                  {b.durationMinutes} мин
                </p>
              </div>
              <Badge status={b.status} />
              {b.status === "BOOKED" &&
                (new Date(b.startsAt) <= now ? (
                  <button
                    className="button small primary"
                    disabled={busy}
                    onClick={() =>
                      onAction({ action: "start", id: b.id }, "Стирка началась")
                    }
                  >
                    Начать стирку
                  </button>
                ) : (
                  <button
                    className="button small secondary"
                    disabled={busy}
                    onClick={() =>
                      onAction(
                        { action: "cancel", id: b.id },
                        "Запись отменена",
                      )
                    }
                  >
                    Отменить
                  </button>
                ))}
            </article>
          ))
        ) : (
          <Empty text="Пока нет активных записей. Выберите машинку и время выше." />
        )}
      </section>
    </>
  );
}
function IssueForm({
  kind,
  room,
  busy,
  submit,
}: {
  kind: string;
  room: string;
  busy: boolean;
  submit: Action;
}) {
  const [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setError("");
    setUploading(true);
    try {
      const files = f
        .getAll("photos")
        .filter((x) => x instanceof File && x.size > 0) as File[];
      if (files.length > 3) throw new Error("Можно приложить до 3 фотографий");
      const ids = [];
      for (const file of files) {
        const fd = new FormData();
        fd.set("file", file);
        const r = await fetch("/api/files", { method: "POST", body: fd });
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        ids.push(body.id);
      }
      await submit(
        {
          action: kind,
          title: f.get("title"),
          description: f.get("description"),
          room: f.get("room"),
          specialty: f.get("specialty"),
          attachmentIds: ids,
        },
        kind === "request"
          ? "Заявка передана мастерам"
          : "Обращение отправлено",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }
  return (
    <form className="stack-form" onSubmit={send}>
      {kind === "request" && (
        <div className="form-pair">
          <label>
            Кто нужен
            <select name="specialty">
              {Object.entries(specialties).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Комната
            <input name="room" required defaultValue={room} maxLength={12} />
          </label>
        </div>
      )}
      <label>
        Тема
        <input
          name="title"
          required
          minLength={3}
          maxLength={120}
          placeholder={
            kind === "request"
              ? "Например, подтекает кран"
              : "Коротко о проблеме"
          }
        />
      </label>
      <label>
        Что случилось
        <textarea
          name="description"
          rows={4}
          required
          minLength={10}
          maxLength={3000}
          placeholder="Расскажите подробнее, чтобы мы могли помочь"
        />
      </label>
      <label>
        Фотографии <span className="optional">· необязательно</span>
        <input
          name="photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          aria-describedby="photo-hint"
        />
        <small id="photo-hint">
          До 3 фото в формате JPEG, PNG или WebP. До 5 МБ каждое.
        </small>
      </label>
      {kind === "complaint" && (
        <p className="privacy-note">
          Обращение увидят только вы и администрация.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy || uploading}>
        {uploading || busy ? (
          <LoaderCircle size={17} className="spin" />
        ) : (
          <ArrowRight size={17} />
        )}
        Отправить
      </button>
    </form>
  );
}
function AnnouncementForm({ busy, submit }: { busy: boolean; submit: Action }) {
  const local = (d: Date) =>
    new Date(d.getTime() + 10800000).toISOString().slice(0, 16);
  return (
    <form
      className="stack-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        submit(
          {
            action: "announcement",
            title: f.get("title"),
            body: f.get("body"),
            category: f.get("category"),
            pinned: f.get("pinned") === "on",
            startsAt: new Date(`${f.get("startsAt")}:00+03:00`).toISOString(),
            endsAt: new Date(`${f.get("endsAt")}:00+03:00`).toISOString(),
          },
          "Объявление опубликовано",
        );
      }}
    >
      <label>
        Заголовок
        <input name="title" required minLength={3} maxLength={120} />
      </label>
      <label>
        Категория
        <select name="category">
          <option value="INFO">Информация</option>
          <option value="MEETING">Собрание</option>
          <option value="WORKS">Технические работы</option>
        </select>
      </label>
      <label>
        Текст
        <textarea
          rows={4}
          name="body"
          required
          minLength={10}
          maxLength={3000}
        />
      </label>
      <div className="form-pair">
        <label>
          Показать с · МСК
          <input
            type="datetime-local"
            name="startsAt"
            required
            defaultValue={local(new Date())}
          />
        </label>
        <label>
          Актуально до · МСК
          <input
            type="datetime-local"
            name="endsAt"
            required
            defaultValue={local(new Date(Date.now() + 86400000))}
          />
        </label>
      </div>
      <label className="checkbox-label">
        <input type="checkbox" name="pinned" />
        Закрепить как важное
      </label>
      <button className="button primary" disabled={busy}>
        Опубликовать <ArrowUpRight size={16} />
      </button>
    </form>
  );
}
