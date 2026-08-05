const dateInputValue = (date) => date.toISOString().slice(0, 10);

const birthdayBound = (years) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return dateInputValue(date);
};

export const isValidBirthDate = (value) => {
  if (!value) return true;
  const date = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || dateInputValue(parsed) !== date) return false;
  return date >= birthdayBound(80) && date <= birthdayBound(13);
};

export const BIRTH_DATE_ERROR = "Ngày sinh phải tương ứng độ tuổi từ 13 đến 80.";
