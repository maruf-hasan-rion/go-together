import Stripe from "stripe";
import config from "../../config/index.js";

/** Single shared Stripe client — import this instead of constructing new ones. */
export const stripe = new Stripe(config.stripe_secret_key);
