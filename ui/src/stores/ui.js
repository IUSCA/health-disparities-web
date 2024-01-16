import { defineStore } from "pinia";
import { ref } from "vue";

export const useUIStore = defineStore("UI", () => {
  const isMobileView = ref(false);
  const isSidebarCollapsed = ref(false);

  function setMobileView(value) {
    isMobileView.value = value;
  }

  function setSidebarCollapsed(value) {
    isSidebarCollapsed.value = value;
  }

  return {
    isMobileView,
    setMobileView,
    isSidebarCollapsed,
    setSidebarCollapsed,
  };
});
