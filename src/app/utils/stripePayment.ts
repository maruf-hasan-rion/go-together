import { stripe } from "../helper/stripe";

interface IPaymentPayload {
    amount: number;
    eventTitle: string;
    paymentId: string;
    userId: string;
    eventId: string;
    successUrl: string;
    cancelUrl: string;
}

export const createStripeCheckoutSession = async ({
    amount,
    eventTitle,
    paymentId,
    userId,
    eventId,
    successUrl,
    cancelUrl,
}: IPaymentPayload) => {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],

        line_items: [
            {
                price_data: {
                    currency: "bdt",
                    product_data: {
                        name: eventTitle,
                    },
                    unit_amount: amount * 100, // Stripe uses cents/paisa
                },
                quantity: 1,
            },
        ],

        mode: "payment",

        metadata: {
            paymentId,
            userId,
            eventId,
        },

        success_url: successUrl,
        cancel_url: cancelUrl,
    });

    return session;
};
