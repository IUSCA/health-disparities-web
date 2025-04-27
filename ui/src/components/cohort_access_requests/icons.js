export function getIcon(status) {
  const icons = {
    INITIATED: "mdi-hourglass-empty",
    PENDING: "mdi-hourglass",
    APPROVED: "mdi-check-circle",
    REJECTED: "mdi-close-circle",
    CANCELED: "mdi-cancel",
    EXPIRED: "mdi-clock-alert",
  };
  return icons[status] || "mdi-hexagon-outline";
}
