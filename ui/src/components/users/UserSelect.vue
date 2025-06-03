<template>
  <!-- cSpell: ignore 𝑒mail -->
  <!-- 
       Using Mathematical Italic: 𝑒mail instead of ASCII 'email' 
       to prevent the browser from interpreting this field as an email and showing autofill suggestions. 
       Attempts to set different values for the name, autocomplete, 
       and type attributes on va-input in AutoComplete component were unsuccessful in preventing autofill. 
  -->
  <AutoCompleteStatic
    v-model:search-text="searchText"
    :data="users"
    :filter-fn="filterFn"
    placeholder="Search users by name, username, or 𝑒mail"
  >
    <template #filtered="{ item }">
      <span> {{ item.name }} </span>
      <span class="va-text-secondary pl-3 text-sm"> {{ item.email }} </span>
    </template>
  </AutoCompleteStatic>
</template>

<script setup>
import userService from "@/services/user";

// const emit = defineEmits(["select"]);

const users = ref([]);
const searchText = ref("");

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
