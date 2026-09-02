export const formatMovieTitle = (title) =>
  typeof title === "string" ? title.toLocaleUpperCase("vi-VN") : title;
