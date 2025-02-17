const exports = {
  mode: "development",
  // vite server redirects traffic on starting with apiBaseURL
  // to http://${config.apiHost}:${config.apiPort} in dev environment
  apiBasePath: "/api",
  casReturn: import.meta.env.VITE_CAS_RETURN || "https://localhost/auth/iucas",
  googleReturn:
    import.meta.env.VITE_GOOGLE_RETURN || "https://localhost/auth/google",
  cilogonReturn:
    import.meta.env.VITE_CILOGON_RETURN || "https://localhost/auth/cil",
  refreshTokenTMinusSeconds: 300,
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
    enable_downloads: true,
    cache_busting_id: "fe09b01", // any random string different from the previous value will work
  },
  enable_delete_archive: true,
  dataset: {
    types: {
      RAW_DATA: {
        label: "Raw Data",
        collection_path: "rawdata",
        icon: "mdi-dna",
      },
      DATA_PRODUCT: {
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
    apiKeys: true,
  },
  phenotype_data: {
    cache_busting_id: "41e81ff",
  },
  apiKeys: {
    generation: {
      enabledInProfile: false,
    },
  },
};

export default exports;
