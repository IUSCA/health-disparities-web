import config from "@/config";
import axios from "axios";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";
import _ from "lodash";

function formatBytes(bytes, decimals = 2) {
  bytes = parseInt(bytes);
  if (bytes === 0) return "0 Bytes";
  if (!bytes) return "";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function difference(setA, setB) {
  const _difference = new Set(setA);
  for (const elem of setB) _difference.delete(elem);

  return _difference;
}

function union(setA, setB) {
  const _union = new Set(setA);
  for (const elem of setB) _union.add(elem);

  return _union;
}

function setIntersection(setA, setB) {
  const _setA = new Set(setA);
  const _setB = new Set(setB);
  const _intersection = new Set();
  // eslint-disable-next-line no-restricted-syntax
  for (const elem of _setA) {
    if (_setB.has(elem)) _intersection.add(elem);
  }

  return _intersection;
}

// https://stackoverflow.com/questions/27194359/javascript-pluralize-an-english-string
function maybePluralize(count, noun, suffix = "s", showCount = true) {
  return (showCount ? `${count} ` : "") + `${noun}${count !== 1 ? suffix : ""}`;
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

const capitalize = (s) => (s && s[0].toUpperCase() + s.slice(1)) || "";

function isLiveToken(jwt) {
  if (jwt) {
    try {
      // console.log("isLiveToken", jwt);
      // const payload_enc = jwt.split(".")[1];
      // const payload_str = window.atob(payload_enc);
      // const payload = JSON.parse(payload_str);
      const payload = jwtDecode(jwt);
      const expiresAt = new Date(payload.exp * 1000);
      console.log("current token expires at", expiresAt);
      if (new Date() < expiresAt) {
        // valid
        return true;
      }
    } catch (err) {
      console.error("Errored trying to decode access token", err);
    }
  }
  return false;
}

function lxor(a, b) {
  // logical XOR
  return (a || b) && !(a && b);
}

function cmp(a, b) {
  // treats null as less than everything else
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function caseInsensitiveIncludes(str, searchValue) {
  /**
   * const text = "Hello, World!";
   * f(text, "hello")); // true
   * f(text, "WORLD")); // true
   * f(text, "Hi"));    // false
   * f(text, null));    // false
   * f(null, null));    // true
   */

  // Handle undefined and / or null values separately
  if (str == null || searchValue == null) {
    return str === searchValue;
  }

  // Convert both strings to lowercase for case-insensitive comparison
  const lowerStr = str.toLowerCase();
  const lowerSearchValue = searchValue.toLowerCase();

  return lowerStr.includes(lowerSearchValue);
}

function getFileNameFromUrl(fileUrl) {
  // Extract the filename from the URL by splitting on '/'
  const url = new URL(fileUrl);
  const parts = url.pathname.split("/");
  return parts[parts.length - 1];
}

function downloadFile({ url, filename = null }) {
  const anchor = document.createElement("a");
  anchor.style.display = "none";
  anchor.href = url;
  anchor.target = "_blank";

  // Set the file name (you can extract it from the URL or hardcode it)
  anchor.download = filename || getFileNameFromUrl(url);

  // Append the anchor to the DOM
  document.body.appendChild(anchor);

  // Trigger a click on the anchor to initiate the download
  anchor.click();

  // Clean up: remove the anchor from the DOM
  document.body.removeChild(anchor);
}

function initials(name) {
  const parts = (name || "").trim().split(" ");
  if (parts.length == 1) return parts[0][0];
  else {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`;
  }
}

function arrayEquals(array1, array2) {
  return (
    array1.length === array2.length &&
    array1.every((value, index) => value === array2[index])
  );
}

function mapValues(obj, fn) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[key] = fn(key, value);
    return acc;
  }, {});
}

function filterByValues(obj, pred) {
  return Object.entries(obj)
    .filter(([k, v]) => {
      return pred(k, v);
    })
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
}

function groupBy(key) {
  return (data) => {
    return data.reduce((acc, curr) => {
      const groupKeyValue = curr[key];
      acc[groupKeyValue] = (acc[groupKeyValue] || []).concat(curr);
      return acc;
    }, {});
  };
}

/**
 * Given an array, groups the elements of the array based on the grouping
 * function provided, aggregates values from the grouped elements by calling
 * the aggregation function provided on the collection of grouped elements,
 * and returns an array, every element of which contains the aggregated values
 * produced from each grouping as well as the value used for producing said
 * groupings. The order of grouped values is determined by the order they occur
 * in the array provided.
 *
 * Example usage:
 * groupByAndAggregate(
 *   [1, 1, 2, 2, 2],
 *   "groupedBy",
 *   "aggregatedValue",
 *   (groupedValues) => (
 *     groupedValues
 *       .reduce((accumulator, currentVal) => accumulator + currentVal)
 *   ),
 * );
 * // => [{ "groupedBy": "1", "aggregatedValue": 2 }, { "groupedBy": "2", "aggregatedValue": 6 }]
 *
 * @param {[*]} arr                                    The array whose elements are to be grouped
 *                                                     and aggregated
 * @param {string} groupedByKey                        The key used for representing the values
 *                                                     (in the returned array)
 *                                                     by which elements in arr
 *                                                     will be grouped
 * @param {string} aggregatedResultKey                 The key used for representing the aggregation
 *                                                     results (in the returned
 *                                                     array) per grouping
 * @param {Function} aggregationFn                     Callback used for aggregating the results in
 *                                                     each grouping
 * @param {Function} [groupByFn = (e) => e]            Optional callback used to group the elements
 *                                                     of arr
 * @param {Function} [groupedByValFormatFn = (e) => e] Optional callback used to format the values
 *                                                     (in the returned array)
 *                                                     by which groupings are
 *                                                     produced
 * @returns                                            An array, every element of which contains the
 *                                                     aggregated values
 *                                                     produced from each
 *                                                     grouping as well as the
 *                                                     values used for
 *                                                     producing said
 *                                                     groupings.
 */
function groupByAndAggregate(
  arr,
  groupedByKey,
  aggregatedResultKey,
  aggregationFn,
  groupByFn = (e) => e,
  groupedByValFormatFn = (e) => e,
) {
  const grouped = _.groupBy(arr, groupByFn);
  const ret = [];
  Object.entries(grouped).forEach(([groupedKey, groupedValues]) => {
    ret.push({
      [groupedByKey]: groupedByValFormatFn(groupedKey),
      [aggregatedResultKey]: aggregationFn(groupedValues),
    });
  });
  return ret;
}

/**
 * Reads the contents of a text file and returns a promise that resolves with the file's contents.
 *
 * @param {File} file - The file to be read. A File object.
 * @returns {Promise<string>} A promise that resolves with the contents of the file as a string.
 */
function readTextFile(file) {
  const reader = new FileReader();

  reader.readAsText(file);

  return new Promise((resolve, reject) => {
    reader.onload = (event) => {
      const contents = event.target.result;
      resolve(contents);
    };
    reader.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

/**
 * Returns whether the given feature is enabled for any of the given roles or
 * not.
 *
 * @param featureKey the key of the feature. Defined in config.js, under `enabled_features`
 * @param hasRole function that returns true if the user has the given role.
 // * @param roles the roles of the user whose access to this feature is to be determined.
 */
function isFeatureEnabled({ featureKey, hasRole = () => false } = {}) {
  if (!featureKey) {
    return true;
  }

  const featureEnabled = config.enabledFeatures[featureKey];
  if (featureEnabled == null) {
    // feature's enabled status is not present in the config
    return true;
  } else if (typeof featureEnabled === "boolean") {
    // feature is either enabled or disabled for all roles
    return featureEnabled;
  } else if (
    Array.isArray(featureEnabled.enabledForRoles) &&
    featureEnabled.enabledForRoles.length > 0
  ) {
    // feature is enabled for certain roles
    return featureEnabled.enabledForRoles.some((role) => hasRole(role));
  } else {
    // invalid config found for feature's enabled status
    return false;
  }
}

/**
 * A class representing a Least Recently Used (LRU) Cache.
 * This cache has a fixed limit on the number of items it can store.
 * When the limit is reached, the least recently used item is evicted to make room for new items.
 */
class LRUCache {
  /**
   * Creates an instance of LRUCache.
   * @param {number} [limit=10000] - The maximum number of items the cache can hold.
   */
  constructor(limit = 10000) {
    this.limit = limit; // Maximum capacity of the cache
    this.cache = new Map();
  }

  /**
   * Checks if a key exists in the cache.
   * @param {string} key - The key to check for existence.
   * @returns {boolean} - Returns `true` if the key exists, otherwise `false`.
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Retrieves the value associated with a key from the cache.
   * If the key exists, it is marked as recently used.
   * @param {string} key - The key to retrieve the value for.
   * @returns {*} - The value associated with the key, or `null` if the key does not exist.
   */
  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);

    // Move the accessed key to the end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * Adds a key-value pair to the cache.
   * If the key already exists, it updates the value and marks it as recently used.
   * If the cache exceeds its limit, the least recently used item is evicted.
   * @param {string} key - The key to add or update in the cache.
   * @param {*} value - The value to associate with the key.
   */
  set(key, value) {
    // console.log("Setting key", key);
    if (this.cache.has(key)) {
      // If the key exists, delete it so it can be added at the end
      this.cache.delete(key);
    } else if (this.cache.size >= this.limit) {
      // Evict the least recently used item (first item in the Map)
      const lruKey = this.cache.keys().next().value;
      this.cache.delete(lruKey);
    }

    // Insert the new key-value pair
    this.cache.set(key, value);
  }
}

/**
 * Memoizes an asynchronous function, caching its results based on the arguments provided.
 * Uses an LRU (Least Recently Used) cache to store results, ensuring efficient memory usage.
 *
 * @param {Function} fn - The asynchronous function to be memoized.
 * @returns {Function} A memoized version of the input function that caches results.
 */
function memoize(fn) {
  const cache = new LRUCache();
  return async function (...args) {
    const key = JSON.stringify(args);
    // console.log({ key, args, cache: cache.cache });
    if (cache.has(key)) {
      // console.log("Fetching from cache");
      return cache.get(key);
    }
    // console.log("Calculating result");
    const result = await fn(...args);
    if (result != null) cache.set(key, result);
    return result;
  };
}

function isHTTPError(code) {
  return (error) => axios.isAxiosError(error) && error.response.status === code;
}

const is404 = isHTTPError(404);
const is403 = isHTTPError(403);

function getURL(path, params, relative = true) {
  const base = relative ? "http://placeholder" : window.location.origin;
  const url = new URL(path, base);
  Object.keys(params).forEach((key) =>
    url.searchParams.append(key, params[key]),
  );
  return relative ? url.pathname + url.search : url.href;
}

function navigateBackSafely(router, fallback = "/") {
  const from = router.currentRoute.value.fullPath;

  window.history.back();

  setTimeout(() => {
    const to = router.currentRoute.value.fullPath;
    if (to === from) {
      router.replace(fallback);
    }
  }, 300);
}

export {
  arrayEquals,
  capitalize,
  caseInsensitiveIncludes,
  cmp,
  dayjs,
  difference,
  downloadFile,
  filterByValues,
  formatBytes,
  getURL,
  groupBy,
  groupByAndAggregate,
  initials,
  is403,
  is404,
  isFeatureEnabled,
  isHTTPError,
  isLiveToken,
  LRUCache,
  lxor,
  mapValues,
  maybePluralize,
  memoize,
  navigateBackSafely,
  readTextFile,
  setIntersection,
  union,
  validateEmail
};

