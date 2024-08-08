import tracer from "dd-trace";
import { env } from "./env";

if (env.DD_TRACER_ACTIVATED) {
  tracer.init(); // initialized in a different file to avoid hoisting.
}

export default tracer;
