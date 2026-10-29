import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  WashingMachine,
  Wrench,
  MessageSquareText,
  MapPin,
  Clock3,
  Pin,
  Users,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "../components/brand";
import { DemoButtons } from "../components/demo-buttons";
import { Building } from "../components/building";
import { getPublicAnnouncements } from "../lib/dashboard";
export const dynamic = "force-dynamic";
const categories: Record<string, string> = {
  MEETING: "Собрание",
  WORKS: "Технические работы",
  INFO: "Полезное",
};
export default async function Home() {
  const announcements = await getPublicAnnouncements();
  return (
    <>
      <header className="public-header">
        <div className="wide header-inner">
          <Brand />
          <nav aria-label="Основная навигация">
            <a href="#announcements">Объявления</a>
            <a href="#services">Сервисы</a>
            <a href="#about">Об общежитии</a>
          </nav>
          <Link href="/login" className="button secondary">
            Войти <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>
      <main className="wide public-main">
        <section className="hero">
          <div className="hero-copy">
            <div className="location-line">
              <span className="live-dot" />
              РОСБИОТЕХ · Общежитие № 4
            </div>
            <h1>
              Жить вместе.
              <br />
              Решать проще.
            </h1>
            <p>
              Записаться на стирку, вызвать мастера и узнать новости дома. Всё
              нужное — в одном месте.
            </p>
            <div className="hero-buttons">
              <Link className="button primary" href="/register">
                Стать соседом <ArrowRight size={18} />
              </Link>
              <a className="text-link" href="#demo">
                Попробовать демо <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="hero-foot">
              <MapPin size={15} /> Москва, ул. Панфилова, 16
            </div>
          </div>
          <div className="hero-art">
            <Building />
            <div className="art-caption">
              <span>Наш общий дом</span>
              <span>Иллюстрация</span>
            </div>
          </div>
        </section>
        <section
          id="services"
          className="services-strip"
          aria-label="Сервисы общежития"
        >
          {[
            {
              icon: WashingMachine,
              title: "Стирка без очереди",
              text: "Выберите машинку и удобное время",
              href: "/app?tab=laundry",
            },
            {
              icon: Wrench,
              title: "Помощь мастера",
              text: "Сантехник, электрик или слесарь",
              href: "/app?tab=requests",
            },
            {
              icon: MessageSquareText,
              title: "Личное обращение",
              text: "Напрямую администрации",
              href: "/app?tab=complaints",
            },
          ].map(({ icon: Icon, ...s }) => (
            <Link href={s.href} className="service-link" key={s.title}>
              <Icon size={26} strokeWidth={1.6} />
              <div>
                <h2>{s.title}</h2>
                <p>{s.text}</p>
              </div>
              <ArrowUpRight size={19} />
            </Link>
          ))}
        </section>
        <section id="announcements" className="announcement-section">
          <div className="section-heading">
            <div>
              <h2>Что нового в доме</h2>
              <p>Объявления, которые стоит знать.</p>
            </div>
            <span className="quiet-tag">Демонстрационные данные</span>
          </div>
          <div className="announcements-grid">
            {announcements.map((a, i) => (
              <article
                key={a.id}
                className={`announcement-card ${i === 0 ? "pinned" : ""}`}
              >
                <div className="notice-meta">
                  <span
                    className={`category category-${a.category.toLowerCase()}`}
                  >
                    {categories[a.category]}
                  </span>
                  {a.pinned ? (
                    <Pin size={16} />
                  ) : (
                    <span>
                      {new Intl.DateTimeFormat("ru", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Europe/Moscow",
                      }).format(a.startsAt)}
                    </span>
                  )}
                </div>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
                <div className="notice-bottom">
                  <CalendarDays size={15} />
                  <span>
                    Актуально до{" "}
                    {new Intl.DateTimeFormat("ru", {
                      day: "numeric",
                      month: "long",
                      timeZone: "Europe/Moscow",
                    }).format(a.endsAt)}
                  </span>
                </div>
              </article>
            ))}
            {announcements.length === 0 && (
              <p className="empty">Пока нет актуальных объявлений.</p>
            )}
          </div>
        </section>
        <section id="demo" className="demo-section">
          <div>
            <h2>
              Посмотрите,
              <br />
              как всё устроено.
            </h2>
            <p>
              Это проект для портфолио. Выберите роль и попробуйте сервис:
              данные сохраняются в вашем отдельном демопространстве.
            </p>
            <DemoButtons />
          </div>
          <div className="demo-explainer">
            <div>
              <Users size={22} />
              <section>
                <h3>Три роли. Один сервис.</h3>
                <p>
                  Жилец отправляет заявку, мастер выполняет работу,
                  администратор управляет домом.
                </p>
              </section>
            </div>
            <div>
              <ShieldCheck size={22} />
              <section>
                <h3>Можно смело пробовать</h3>
                <p>
                  Только вымышленные данные. Переключайтесь между ролями и
                  проверяйте весь путь заявки.
                </p>
              </section>
            </div>
            <div>
              <Clock3 size={22} />
              <section>
                <h3>Без регистрации</h3>
                <p>
                  Демо откроется сразу. Для обычного аккаунта нужна заявка и
                  подтверждение администратора.
                </p>
              </section>
            </div>
          </div>
        </section>
        <section id="about" className="about-section">
          <div>
            <h2>Место, где мы живём</h2>
            <p>
              Студенческое общежитие № 4 РОСБИОТЕХа.
              <br />
              Москва, улица Панфилова, 16.
            </p>
            <a
              className="text-link"
              href="https://yandex.ru/maps/org/rosbiotekh_studencheskoye_obshchezhitiye_4/130647140465/"
              target="_blank"
              rel="noreferrer"
            >
              Маршрут в Яндекс Картах <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="about-hours">
            <h3>Прачечная</h3>
            <p>
              Вторник — воскресенье <strong>Круглосуточно</strong>
            </p>
            <p>
              Уборка <strong>07:00–08:00</strong>
            </p>
            <p>
              Понедельник <strong>Выходной</strong>
            </p>
            <span>Время московское · 5 стиральных машин</span>
          </div>
        </section>
      </main>
      <footer className="public-footer wide">
        <Brand compact />
        <p>Учебный проект. Не является официальным сайтом РОСБИОТЕХа.</p>
        <a href="https://rosbiotech.ru/" target="_blank" rel="noreferrer">
          Сайт университета <ArrowUpRight size={14} />
        </a>
      </footer>
    </>
  );
}
