const toDateInputValue = (date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const shiftYears = (years) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() + years);
  return toDateInputValue(date);
};

// Bounds are derived at render/validation time, so they remain correct each day.
export const getBirthDateBounds = () => ({
  min: shiftYears(-80),
  max: shiftYears(-13),
});

export const isValidBirthDate = (value) => {
  if (!value) return true;
  const { min, max } = getBirthDateBounds();
  return value >= min && value <= max;
};

export const BIRTH_DATE_ERROR = "Ngày sinh phải tương ứng độ tuổi từ 13 đến 80.";
