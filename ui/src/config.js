const exports = {
  mode: "development",
  // vite server redirects traffic on URLs starting with apiBaseURL
  // to http://${config.apiHost}:${config.apiPort} in dev environment
  apiBasePath: "/api",
  uploadApiBasePath:
    import.meta.env.VITE_UPLOAD_API_BASE_PATH || "https://localhost",
  casReturn: import.meta.env.VITE_CAS_RETURN || "https://localhost/auth/iucas",
  googleReturn:
    import.meta.env.VITE_GOOGLE_RETURN || "https://localhost/auth/google",
  cilogonReturn:
    import.meta.env.VITE_CILOGON_RETURN || "https://localhost/auth/cil",
  microsoftReturn:
    import.meta.env.VITE_MICROSOFT_RETURN || "https://localhost/auth/microsoft",
  refreshTokenTMinusSeconds: {
    appToken: 300,
    uploadToken: 20,
  },
  analyticsId: "G-FOO",
  appTitle: "Biobank",
  contact: {
    app_admin: "bioloop-ops-l@list.iu.edu",
  },
  dataset_polling_interval: 10000,
  paths: {
    download: "/N/scratch/biobank/production/download",
  },
  file_browser: {
    cache_busting_id: "fe09b01", // any random string different from the previous value will work
  },
  enable_delete_archive: true,
  dataset: {
    types: {
      RAW_DATA: {
        key: "RAW_DATA",
        label: "Raw Data",
        collection_path: "rawdata",
        icon: "mdi-dna",
      },
      DATA_PRODUCT: {
        key: "DATA_PRODUCT",
        label: "Data Product",
        collection_path: "dataproducts",
        icon: "mdi-package-variant-closed",
      },
    },
  },
  download_types: {
    SLATE_SCRATCH: "SLATE_SCRATCH",
    BROWSER: "BROWSER",
  },
  metric_measurements: {
    SDA: "sda",
    SLATE_SCRATCH: "/N/scratch",
    SLATE_SCRATCH_FILES: "/N/scratch files",
  },
  auth_enabled: {
    google: false,
    cilogon: false,
    microsoft: true,
  },
  dashboard: {
    active_tasks: {
      steps: [
        "await stability",
        "inspect",
        "archive",
        "stage",
        "validate",
        "setup download",
        "delete source",
      ],
      refresh_interval_ms: 10000,
    },
  },
  cohort: {
    schema: {
      phenotype: {
        name: "phenotype",
        namespace: "edu.iu.sca.biobank",
        version: "1.0.0",
      },
      combination: {
        name: "combination",
        namespace: "edu.iu.sca.biobank",
        version: "1.0.0",
      },
      genotype: {
        name: "genotype",
        namespace: "edu.iu.sca.biobank",
        version: "1.0.0",
      },
    },
    genome_build: "hg38",
    max_regions_bed_file: 10000,
    genai: {
      defaults: {
        enableTitleGeneration: true,
        enableChatbot: true,
      },
    },
  },
  debounce_ms: 300,
  alertForEnvironments: ["ci"],
  enabledFeatures: {
    genomeBrowser: false,
    notifications: {
      enabledForRoles: [],
    },
    ingestion: {
      enabledForRoles: [],
    },
    downloads: true,
    signup: false,
    uploads: {
      enabledForRoles: [],
    },
    accessKeys: true,
  },
  notifications: {
    pollingInterval: 5000, // milliseconds
  },
  filesystem_search_spaces: [
    {
      slateScratch: {
        base_path:
          import.meta.env.VITE_SCRATCH_BASE_DIR || "/bioloop/scratch/space",
        mount_path:
          import.meta.env.VITE_SCRATCH_MOUNT_DIR ||
          "/bioloop/user/scratch/mount/dir",
        key: "slateScratch",
        label: "Slate-Scratch",
      },
    },
  ],
  restricted_ingestion_dirs: {
    slateScratch: {
      paths:
        import.meta.env.VITE_SCRATCH_INGESTION_RESTRICTED_DIRS ||
        "/scratch/space/restricted",
      key: "scratch",
    },
  },
  upload: {
    scope_prefix: "upload_file:",
  },
  phenotype_data: {
    cache_busting_id: "41e81ff",
  },
  accessKeys: {
    generation: {
      enabledInProfile: false,
    },
  },
  redcap: {
    survey_id: "LN8PWD7JA3HKCDNE",
    survey_base_url: "https://redcap.uits.iu.edu/surveys/",
  },
};

export default exports;
