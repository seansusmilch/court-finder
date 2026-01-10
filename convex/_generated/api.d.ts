/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as actions_password from "../actions/password.js";
import type * as auth from "../auth.js";
import type * as courts from "../courts.js";
import type * as feedback_submissions from "../feedback_submissions.js";
import type * as geocoding from "../geocoding.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as inference_predictions from "../inference_predictions.js";
import type * as inferences from "../inferences.js";
import type * as internal_accounts from "../internal/accounts.js";
import type * as internal_sessions from "../internal/sessions.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_createml from "../lib/createml.js";
import type * as lib_geocoding from "../lib/geocoding.js";
import type * as lib_index from "../lib/index.js";
import type * as lib_roboflow from "../lib/roboflow.js";
import type * as lib_spatial from "../lib/spatial.js";
import type * as lib_tiles from "../lib/tiles.js";
import type * as lib_types from "../lib/types.js";
import type * as migrations from "../migrations.js";
import type * as scanResults from "../scanResults.js";
import type * as scans from "../scans.js";
import type * as scans_x_tiles from "../scans_x_tiles.js";
import type * as tiles from "../tiles.js";
import type * as upload_batches from "../upload_batches.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  "actions/password": typeof actions_password;
  auth: typeof auth;
  courts: typeof courts;
  feedback_submissions: typeof feedback_submissions;
  geocoding: typeof geocoding;
  healthCheck: typeof healthCheck;
  http: typeof http;
  inference_predictions: typeof inference_predictions;
  inferences: typeof inferences;
  "internal/accounts": typeof internal_accounts;
  "internal/sessions": typeof internal_sessions;
  "lib/constants": typeof lib_constants;
  "lib/createml": typeof lib_createml;
  "lib/geocoding": typeof lib_geocoding;
  "lib/index": typeof lib_index;
  "lib/roboflow": typeof lib_roboflow;
  "lib/spatial": typeof lib_spatial;
  "lib/tiles": typeof lib_tiles;
  "lib/types": typeof lib_types;
  migrations: typeof migrations;
  scanResults: typeof scanResults;
  scans: typeof scans;
  scans_x_tiles: typeof scans_x_tiles;
  tiles: typeof tiles;
  upload_batches: typeof upload_batches;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
          oneBatchOnly?: boolean;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
};
