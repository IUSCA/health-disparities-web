import cohortService from "@/services/cohort2";
import {
  isQueryEmpty,
  transformQueryForApi,
} from "./queryBuilder/cohortQueryBuilder";

export default function useCohortQuery(cohort) {
  const query2 = ref(null);

  // watch the cohort query and transform it for the API
  watchDebounced(
    () => {
      query2.value = transformQueryForApi(cohort.value.query);
    },
    {
      deep: true,
      immediate: true,
      debounce: 500,
    },
  );

  // watch the transformed query and fetch participants
  // when the query changes and is not empty and not the same as the previous query
  watch(
    query2,
    (oldQuery, newQuery) => {
      if (
        !isQueryEmpty(newQuery) &&
        JSON.stringify(oldQuery) !== JSON.stringify(newQuery)
      ) {
        cohortService
          .searchParticipants(newQuery)
          .then((response) => {
            cohort.value.participants = response.data;
          })
          .catch((error) => {
            console.error("Error fetching participants", error);
          });
      }
    },
    {
      deep: true,
      immediate: true,
    },
  );
}
