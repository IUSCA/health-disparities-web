<template>
  <!-- https://github.com/Sitronik/vue3-beautiful-chat -->
  <beautiful-chat
    id="chat"
    :participants="participants"
    :titleImageUrl="titleImageUrl"
    :onMessageWasSent="onMessageWasSent"
    :messageList="messageList"
    :newMessagesCount="newMessagesCount"
    :isOpen="visible"
    :close="closeChat"
    :open="openChat"
    :showEmoji="false"
    :showFile="false"
    :showEdition="false"
    :showDeletion="true"
    :deletionConfirmation="true"
    :showTypingIndicator="showTypingIndicator"
    :showLauncher="true"
    :showCloseButton="true"
    :colors="colors"
    :alwaysScrollToBottom="false"
    :disableUserListToggle="true"
    :messageStyling="true"
  >
    <template v-slot:header> Chat with an AI </template>

    <template v-slot:text-message-body="{ message }">
      <div v-if="message.author === 'bot' && message?.data?.meta === 'init'">
        <p>
          Hello, you can describe your cohort and I will help you create it. To
          get started, try on of the following:
        </p>
        <br />
        <div class="flex flex-col gap-3">
          <p v-for="(msg, idx) in exampleMessages" :key="idx">
            <a
              @click="addUserMessage(msg)"
              href="#"
              class="va-link hover:underline"
            >
              {{ msg }}
            </a>
          </p>
        </div>
      </div>

      <div v-else>
        {{ message?.data?.text }}
      </div>
    </template>
  </beautiful-chat>
</template>

<script setup>
const visible = defineModel("visible", { type: Boolean, default: false });
// const props = defineProps({});

const emit = defineEmits(["message"]);
defineExpose({ addBotMessage });

const participants = ref([
  {
    id: "bot",
    name: "Bot",
    imageUrl: "/icons8-bot-100.png",
  },
]);

const titleImageUrl = "/icons8-bot-50.png";

const messageList = ref([
  {
    type: "text",
    author: "bot",
    data: { text: "Hello. How can I help you?", meta: "init" },
  },
]);

const newMessagesCount = ref(0);
const showTypingIndicator = ref("");

const colors = {
  header: {
    bg: "#4e8cff",
    text: "#ffffff",
  },
  launcher: {
    bg: "#4e8cff",
  },
  messageList: {
    bg: "#ffffff",
  },
  sentMessage: {
    bg: "#4e8cff",
    text: "#ffffff",
  },
  receivedMessage: {
    bg: "#eaeaea",
    text: "#222222",
  },
  userInput: {
    bg: "#f4f7f9",
    text: "#565867",
  },
};

const exampleMessages = [
  "Create a cohort of female patients over 50 years old",
  // "Create a cohort of patients with diabetes and hypertension and age above 50.",
  // "Patients between 18 and 65 years old with diabetes but without hypertension.",
];

function addBotMessage(text) {
  if (text.length > 0) {
    newMessagesCount.value = visible.value
      ? newMessagesCount.value
      : newMessagesCount.value + 1;
    onMessageWasSent({ author: "bot", type: "text", data: { text } });
  }
}

function addUserMessage(text) {
  onMessageWasSent({ author: "me", type: "text", data: { text } });
}

function onMessageWasSent(message) {
  messageList.value = [...messageList.value, message];
}

function openChat() {
  visible.value = true;
  newMessagesCount.value = 0;
}

function closeChat() {
  visible.value = false;
}

watch(messageList, () => {
  // console.log("messageList", messageList.value);
  const lastMessage = messageList.value[messageList.value.length - 1];
  if (lastMessage.author === "me") {
    showTypingIndicator.value = "bot";
    emit("message", lastMessage.data.text);
  } else {
    showTypingIndicator.value = "";
  }
});
</script>

<style>
#chat .sc-header {
  min-height: unset;
  padding: 5px;
}

#chat .sc-chat-window {
  height: calc(100vh - 330px);
}

#chat .sc-typing-indicator {
  padding: 1px 20px;
}

#chat .sc-typing-indicator span {
  height: 5px;
  width: 5px;
}

#chat .sc-message-list {
  padding: 20px 0px;
}

#chat .sc-message {
  width: 330px;
}

#chat .sc-header--img {
  padding: 10px;
  height: 50px;
}
</style>
