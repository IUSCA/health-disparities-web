export const filters = [
  {
    label: "Demographics",
    key: "demographic",
    icon: "mdi-human-male-female",
    filters: [
      {
        key: "gender",
        type: "select",
        label: "Gender",
        info: null,
      },
      {
        key: "age",
        type: "number",
        label: "Age",
        info: null,
      },
      {
        key: "race",
        type: "select",
        label: "Race",
        info: null,
      },
      {
        key: "ethnicity",
        type: "select",
        label: "Ethnicity",
        info: null,
      },
      {
        key: "max_enc_date",
        type: "date",
        label: "Max Enc. Date",
        info: null,
      },
      {
        key: "enroll_date",
        type: "date",
        label: "Enrollment Date",
        info: null,
      },
    ],
  },
  {
    label: "Lab Results",
    key: "lab",
    icon: "mdi-test-tube",
    filters: [
      {
        key: "name",
        type: "select",
        label: "Name",
        info: null,
      },
      {
        key: "date",
        type: "date",
        label: "Date",
        info: null,
      },
      {
        key: "category",
        type: "select",
        label: "Category",
        info: null,
      },
      {
        key: "result",
        type: "number",
        label: "Result",
        info: null,
      },
      {
        key: "unit",
        type: "select",
        label: "Unit",
        info: null,
      },
    ],
  },
  {
    label: "Diagnoses",
    key: "dx",
    icon: "mdi-stethoscope",
    filters: [
      {
        key: "name",
        type: "select",
        label: "Name",
        info: null,
      },
      {
        key: "code",
        type: "asyncSelect",
        label: "Code",
        info: null,
      },
      {
        key: "date",
        type: "date",
        label: "Date",
        info: null,
      },
      {
        key: "code_system",
        type: "select",
        label: "Code System",
        info: null,
      },
    ],
  },
  {
    label: "Medications",
    key: "medication",
    icon: "mdi-pill",
    filters: [
      {
        key: "name",
        type: "select",
        label: "Name",
        info: null,
      },
      {
        key: "category",
        type: "select",
        label: "Category",
        info: null,
      },
      {
        key: "start_date",
        type: "date",
        label: "Start Date",
        info: null,
      },
      {
        key: "dispense_qty",
        type: "number",
        label: "Dispense Quantity",
        info: null,
      },
      {
        key: "dispense_qty_unit",
        type: "select",
        label: "Dispense Quantity Unit",
        info: null,
      },
      {
        key: "nbr_refills",
        type: "number",
        label: "Number of Refills",
        info: null,
      },
      {
        key: "strength_dose",
        type: "number",
        label: "Strength Dose",
        info: null,
      },
      {
        key: "strength_dose_unit",
        type: "select",
        label: "Strength Dose Unit",
        info: null,
      },
    ],
  },
  {
    label: "Hospitalizations",
    key: "hospital",
    icon: "mdi-hospital-box",
    filters: [
      {
        key: "admit_date",
        type: "date",
        label: "Admit Date",
        info: null,
      },
      {
        key: "discharge_date",
        type: "date",
        label: "Discharge Date",
        info: null,
      },
      {
        key: "dx_code",
        type: "asyncSelect",
        label: "DX Code",
        info: null,
      },
      {
        key: "dx_code_system",
        type: "select",
        label: "DX Code System",
        info: null,
      },
    ],
  },
  {
    label: "COVID Tests",
    key: "covid_test",
    icon: "mdi-virus",
    filters: [
      {
        key: "test_date",
        type: "date",
        label: "Test Date",
        info: null,
      },
      {
        key: "result",
        type: "select",
        label: "Result",
        info: null,
      },
      {
        key: "name",
        type: "select",
        label: "Name",
        info: null,
      },
    ],
  },
  {
    label: "COVID Vaccinations",
    key: "covid_vax",
    icon: "mdi-needle",
    filters: [
      {
        key: "name",
        type: "select",
        label: "Name",
        info: null,
      },
      {
        key: "date",
        type: "date",
        label: "Date",
        info: null,
      },
      {
        key: "manufacturer",
        type: "select",
        label: "Manufacturer",
        info: null,
      },
      {
        key: "dose_number",
        type: "number",
        label: "Dose Number",
        info: null,
      },
      {
        key: "series_doses",
        type: "number",
        label: "Series Doses",
        info: null,
      },
      {
        key: "is_booster",
        type: "select",
        label: "Is Booster",
        info: null,
      },
    ],
  },
];

export const operators = [
  {
    identifier: "select",
    options: [
      {
        key: "in",
        label: "is one of",
      },
      {
        key: "not_in",
        label: "is none of",
      },
      {
        key: "is_null",
        label: "is null",
      },
      {
        key: "is_not_null",
        label: "is not null",
      },
    ],
  },
  {
    identifier: "asyncSelect",
    options: [
      {
        key: "in",
        label: "is one of",
      },
      {
        key: "not_in",
        label: "is none of",
      },
      {
        key: "is_null",
        label: "is null",
      },
      {
        key: "is_not_null",
        label: "is not null",
      },
    ],
  },
  {
    identifier: "number",
    options: [
      {
        key: "eq",
        label: "=",
      },
      {
        key: "neq",
        label: "!=",
      },
      {
        key: "gt",
        label: ">",
      },
      {
        key: "lt",
        label: "<",
      },
      {
        key: "gte",
        label: ">=",
      },
      {
        key: "lte",
        label: "<=",
      },
      {
        key: "between",
        label: "between",
      },
      {
        key: "is_null",
        label: "is null",
      },
      {
        key: "is_not_null",
        label: "is not null",
      },
    ],
  },
  {
    identifier: "text",
    options: [
      {
        key: "eq",
        label: "is",
      },
      {
        key: "neq",
        label: "is not",
      },
      {
        key: "contains",
        label: "contains",
      },
      {
        key: "not_contains",
        label: "not contains",
      },
      {
        key: "starts_with",
        label: "starts with",
      },
      {
        key: "ends_with",
        label: "ends with",
      },
      {
        key: "is_null",
        label: "is null",
      },
      {
        key: "is_not_null",
        label: "is not null",
      },
    ],
  },
  {
    identifier: "date",
    options: [
      {
        key: "eq",
        label: "is",
      },
      {
        key: "neq",
        label: "is not",
      },
      {
        key: "gt",
        label: "after",
      },
      {
        key: "lt",
        label: "before",
      },
      {
        key: "gte",
        label: "on or after",
      },
      {
        key: "lte",
        label: "on or before",
      },
      {
        key: "between",
        label: "between",
      },
      {
        key: "is_null",
        label: "is null",
      },
      {
        key: "is_not_null",
        label: "is not null",
      },
    ],
  },
];

export function filterId(category, name) {
  return `${category}.${name}`;
}

export function flatten(filters) {
  return filters.flatMap((category) =>
    category.filters.map((filter) => {
      return {
        ...filter,
        category: category.key,
        id: filterId(category.key, filter.key),
      };
    }),
  );
}
