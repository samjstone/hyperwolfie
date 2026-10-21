export const formatDateTime = (date: Date): string => {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatMonthDay = (date: Date): string => {
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
};
