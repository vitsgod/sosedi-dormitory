import { AppError } from "../../lib/security";
export function validateBooking(
  start: Date,
  duration: number,
  now = new Date(),
) {
  if (
    !Number.isFinite(start.getTime()) ||
    start < now ||
    start.getTime() > now.getTime() + 86400000
  )
    throw new AppError("Выберите время в ближайшие 24 часа");
  if (
    !Number.isInteger(duration) ||
    duration < 15 ||
    duration > 180 ||
    duration % 5
  )
    throw new AppError("Длительность: от 15 до 180 минут, шаг 5 минут");
  const end = new Date(start.getTime() + (duration + 10) * 60000);
  const localStart = new Date(start.getTime() + 10800000),
    localEnd = new Date(end.getTime() + 10800000);
  for (
    let t = Date.UTC(
      localStart.getUTCFullYear(),
      localStart.getUTCMonth(),
      localStart.getUTCDate(),
    );
    t < localEnd.getTime();
    t += 86400000
  ) {
    const day = new Date(t).getUTCDay();
    if (
      day === 1 &&
      localStart.getTime() < t + 86400000 &&
      localEnd.getTime() > t
    )
      throw new AppError("По понедельникам прачечная закрыта");
    if (
      localStart.getTime() < t + 8 * 3600000 &&
      localEnd.getTime() > t + 7 * 3600000
    )
      throw new AppError(
        "С 07:00 до 08:00 уборка. Учтите 10 минут на выгрузку",
      );
  }
  return end;
}
