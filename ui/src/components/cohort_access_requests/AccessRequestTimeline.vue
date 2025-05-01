<template>
  <ProgressTimeline :items="timelineItems" />
</template>

<script setup>
import * as datetime from "@/services/datetime";
const props = defineProps({ request: { type: Object, required: true } });

const timelineItems = computed(() => {
  const stages = props.request?.stages || [];
  let prevStatus = null;
  let currtStatus = null;
  let isTerminated = false;
  return stages.map((stage) => {
    // set status
    // A step is in "current" status if the previous step is "completed" and the current step is "upcoming"
    // or if its the first step and is "upcoming"

    const status = stage.status;
    if (status === "APPROVED") {
      currtStatus = "completed";
    } else if (status === "REJECTED") {
      currtStatus = "terminated";
      isTerminated = true;
    } else {
      currtStatus = "upcoming";
    }

    if (prevStatus === "completed" && currtStatus === "upcoming") {
      currtStatus = "current";
    }
    if (prevStatus === null && currtStatus === "upcoming") {
      currtStatus = "current";
    }

    prevStatus = currtStatus;

    // set label and description
    // for completed and terminated steps, show status and date
    // for current and upcoming steps, set description to "Pending"
    // for steps after the terminated step, set description to empty
    let label = "";
    let description = "";
    if (status === "APPROVED") {
      label = `${stage.name}`; // ✓
      description = stage.decision_date
        ? `Approved on ${datetime.date(stage.decision_date)}`
        : "Approved";
    } else if (status === "REJECTED") {
      label = `${stage.name}`; // ✗
      description = stage.decision_date
        ? `Rejected on ${datetime.date(stage.decision_date)}`
        : "Rejected";
    } else if (status === "APPROVED_WITH_REVISIONS") {
      label = `${stage.name}`; // ✗
      description = stage.decision_date
        ? `Approved with revisions on ${datetime.date(stage.decision_date)}`
        : "Rejected";
    } else {
      label = stage.name;
      description = isTerminated ? "" : "Pending";
    }

    return {
      label,
      description,
      status: currtStatus,
    };
  });
});
</script>
