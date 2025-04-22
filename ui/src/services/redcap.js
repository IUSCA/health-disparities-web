import config from "@/config";
import cohortService from "@/services/cohorts";

const insitution_types = {
  Commercial: 1,
  "External Academic": 2,
  "Internal Academic": 3,
  "Non-profit": 4,
  Other: 5,
};

function _buildREDCapSurveyUrl({
  firstName,
  lastName,
  institution,
  institutionType,
  email,
  cohortId,
  cohortName,
  cohortSize,
  cohortDescription,
  cohortUrl,
  request_id,
}) {
  const url = new URL(config.redcap.survey_base_url);

  const institution_type = insitution_types[institutionType] || 5;

  const cohortText = `Name: ${cohortName}
Size: ${cohortSize}
Description: ${cohortDescription}
URL: ${cohortUrl}
`;

  const queryParams = {
    s: config.redcap.survey_id,
    first_name: firstName,
    last_name: lastName,
    institution,
    institution_type,
    email,
    cohort_identifier: cohortId,
    cohort_of_interest: cohortText,
    request_id,
  };
  Object.keys(queryParams).forEach((key) => {
    if (queryParams[key] != null) {
      url.searchParams.set(key, queryParams[key]);
    }
  });
  return url.toString();
}

function buildREDCapSurveyUrl({ user, cohort, request_id }) {
  // console.log({ user, cohort });
  const name_parts = user.name.split(" ");
  const firstName = name_parts[0];
  const lastName = name_parts.slice(1).join(" ");

  return _buildREDCapSurveyUrl({
    firstName,
    lastName,
    institution: user.metadata?.institution || "Indiana University", // TODO: get this from the user
    institutionType: user.metadata?.institutionType || "Internal Academic", // TODO: get this from the user
    email: user.email,
    cohortId: cohort.id,
    cohortName: cohort.name,
    cohortSize: cohort.size,
    cohortDescription: cohort.description,
    cohortUrl: cohortService.getCohortURL({ id: cohort.id }, false),
    request_id,
  });
}

export { buildREDCapSurveyUrl };
