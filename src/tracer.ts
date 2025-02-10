import tracer from "dd-trace";
import { env } from "./shared/utils/env.js";

if (env.DD_TRACER_ACTIVATED) {
  tracer.init(); // initialized in a different file to avoid hoisting.
}

export default tracer;
