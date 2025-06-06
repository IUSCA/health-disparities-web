import config from "./config";

const exports = {
  sidebar: {
    user_items: [
      // {
      //   icon: "solar:chart-bold",
      //   title: "Categories",
      //   path: "/categories/data",
      // },
      {
        icon: "mdi-table-search",
        title: "Data Browser",
        path: "/data_browser",
      },
      {
        icon: "mdi:account-multiple",
        title: "Cohort Builder",
        path: "/cohorts",
      },

      {
        icon: "mdi:chart-sankey-variant", //"mdi:puzzle",
        title: "Variant Xplorer",
        path: "/variantXplorer",
      },
      {
        icon: "material-symbols:person",
        title: "Participants",
        path: "/participants",
        feature_key: "participantDetails",
      },
      {
        icon: "mdi-folder-plus-outline",
        title: "Create Dataset",
        test_id: "sidebar-create-dataset",
        children: [
          {
            feature_key: "ingestion",
            icon: "mdi-file-cog-outline",
            title: "Ingest",
            path: "/datasets/ingest",
          },
          {
            feature_key: "uploads",
            icon: "mdi:folder-upload",
            title: "Upload",
            path: "/datasetUpload",
          },
        ],
      },
    ],
    operator_items: [
      {
        icon: "mdi-monitor-dashboard",
        title: "Dashboard",
        path: "/dashboard",
        test_id: "sidebar-dashboard",
      },
      // {
      //   icon: "mdi-file-lock",
      //   title: "Data Products",
      //   path: "/dataproducts",
      // },
      // {
      //   icon: "mdi-transition",
      //   title: "Conversions",
      //   path: "/conversions",
      // },
      // {
      //   icon: "mdi-folder-upload",
      //   title: "Data Uploader",
      //   path: "/datauploader",  // cspell: disable-line
      // },
      // {
      //   icon: "mdi-dna",
      //   title: "Raw Data",
      //   path: "/rawdata",
      //   test_id: "sidebar-raw-data",
      // },
      {
        icon: "mdi-package-variant-closed",
        title: "Data Products",
        path: "/dataproducts",
        test_id: "sidebar-data-products",
      },
      {
        icon: "mdi-table-account",
        title: "User Management",
        path: "/users",
        test_id: "sidebar-user-management",
      },
      {
        icon: "mdi-format-list-bulleted",
        title: "Stats/Tracking",
        path: "/stats",
        test_id: "sidebar-stats-tracking",
      },
      {
        icon: "mdi:map-marker-path",
        title: "Workflows",
        path: "/workflows",
        test_id: "sidebar-workflows",
      },
      {
        icon: "mdi-account-multiple",
        title: "Protocols",
        path: "/protocols",
      },
      {
        icon: "mdi:camera",
        title: "Data Snapshots",
        path: "/snapshots",
      },
      // {
      //   icon: 'mdi-delete-empty-outline',
      //   title: 'Data Cleanup',
      //   path: '/clean',
      // },
    ],
    bottom_items: [
      {
        icon: "mdi-approval",
        title: "Access Requests",
        path: "/cohort_access_requests",
      },
      {
        icon: "mdi-information",
        title: "About",
        path: "/about",
        test_id: "sidebar-about",
      },
      {
        icon: "mdi-account-details",
        title: "Profile",
        path: "/profile",
        test_id: "sidebar-profile",
      },
      {
        icon: "mdi-logout-variant",
        title: "Logout",
        path: "/auth/logout",
        test_id: "sidebar-logout",
      },
    ],
    admin_items: [
      ...(config.enabledFeatures?.accessKeys
        ? [
            {
              icon: "mdi-key",
              title: "Access Keys",
              path: "/keys",
            },
            {
              icon: "mdi-security",
              title: "Scopes",
              path: "/scopes",
            },
            {
              icon: "mdi-file-chart-outline",
              title: "API Audit Logs",
              path: "/audit_logs",
            },
          ]
        : []),
    ],
  },
  UPLOAD_STATUSES: {
    // Statuses that only appear in the UI
    UNINITIATED: "UNINITIATED",
    COMPUTING_CHECKSUMS: "COMPUTING_CHECKSUMS",
    CHECKSUM_COMPUTATION_FAILED: "CHECKSUM_COMPUTATION_FAILED",
    // Statuses that appear in the UI and are also persisted to the database
    UPLOADING: "UPLOADING",
    UPLOAD_FAILED: "UPLOAD_FAILED",
    UPLOADED: "UPLOADED",
    PROCESSING: "PROCESSING",
    PROCESSING_FAILED: "PROCESSING_FAILED",
    COMPLETE: "COMPLETE",
  },
  DATASET_CREATE_METHODS: {
    UPLOAD: "UPLOAD",
    IMPORT: "IMPORT",
    SCAN: "SCAN",
  },
  auth: {
    verify: {
      response: {
        status: {
          SUCCESS: "success",
          SIGNUP_REQUIRED: "signup_required",
          NOT_A_USER: "not_a_user",
        },
      },
    },
  },
};

export default exports;
