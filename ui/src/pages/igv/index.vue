<script setup>
// import igv from "https://cdn.jsdelivr.net/npm/igv@2.15.10/dist/igv.esm.min.js"
import { useNavStore } from "@/stores/nav";
import igv from "../../../node_modules/igv/dist/igv.esm.min.js";
const nav = useNavStore();
nav.setNavItems([
  {
    label: `Analysis`,
  },
]);
var igvDiv = document.getElementById("igv-div");
var options = {
  // genome: "hg38",
  // locus: "chr8:127,736,588-127,739,371",
  // tracks: [
  //     {
  //         "name": "HG00103",
  //         "url": "https://s3.amazonaws.com/1000genomes/data/HG00103/alignment/HG00103.alt_bwamem_GRCh38DH.20150718.GBR.low_coverage.cram",
  //         "indexURL": "https://s3.amazonaws.com/1000genomes/data/HG00103/alignment/HG00103.alt_bwamem_GRCh38DH.20150718.GBR.low_coverage.cram.crai",
  //         "format": "cram"
  //     }
  // ]
};
onMounted(() => {
  igv.createBrowser(igvDiv, options).then(function () {
    console.log("Created IGV browser");
  });
});
</script>

<template>
  <div ref="igvDiv" id="igvDiv"></div>
</template>
