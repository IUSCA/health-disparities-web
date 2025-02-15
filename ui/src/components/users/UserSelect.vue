<template>
  <!-- 
       Using Mathematical Italic: 𝑒𝑚𝑎𝑖𝑙 instead of ASCII 'email' 
       to prevent the browser from interpreting this field as an email and showing autofill suggestions. 
       Attempts to set different values for the name, autocomplete, 
       and type attributes on va-input in AutoComplete component were unsuccessful in preventing autofill. 
  -->
  <AutoComplete
    :data="users"
    :filter-fn="filterFn"
    placeholder="Search users by name, username, or 𝑒𝑚𝑎𝑖𝑙"
  >
    <template #filtered="{ item }">
      <span> {{ item.name }} </span>
      <span class="va-text-secondary pl-3 text-sm"> {{ item.email }} </span>
    </template>
  </AutoComplete>
</template>

<script setup>
import userService from "@/services/user";

// const emit = defineEmits(["select"]);

const users = ref([]);

const filterFn = (text) => (user) => {
  const _text = text.toLowerCase();
  return (
    user.name.toLowerCase().includes(_text) ||
    user.username.toLowerCase().includes(_text) ||
    user.email.toLowerCase().includes(_text)
  );
};

userService.getAll().then((data) => {
  users.value = data.users;
});
</script>
