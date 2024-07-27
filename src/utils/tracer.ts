import tracer from "dd-trace";
import {env} from "./env";

if (env.DD_TRACER_ACTIVATED) {
  tracer.init(); // initialized in a different file to avoid hoisting.
} else {
  console.info("DD_TRACER_ACTIVATED is not activated");
}

export default tracer;
