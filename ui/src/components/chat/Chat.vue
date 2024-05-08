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
    <template v-slot:header> Chat with a Bot </template>
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
  { type: "text", author: "me", data: { text: "Say yes!" } },
  { type: "text", author: "bot", data: { text: "No." } },
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

function addBotMessage(text) {
  if (text.length > 0) {
    newMessagesCount.value = visible.value
      ? newMessagesCount.value
      : newMessagesCount.value + 1;
    onMessageWasSent({ author: "bot", type: "text", data: { text } });
  }
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
  height: calc(100vh - 300px);
}

#chat .sc-typing-indicator {
  padding: 1px 20px;
}

#chat .sc-typing-indicator span {
  height: 5px;
  width: 5px;
}
</style>
