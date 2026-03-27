
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PAYPAL_API = process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ PayPal credentials not found in .env");
    process.exit(1);
}

// 1. Get Access Token
async function getAccessToken() {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description);
    return data.access_token;
}

// 2. Create Product (If needed)
async function createProduct(accessToken) {
    const response = await fetch(`${PAYPAL_API}/v1/catalogs/products`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            name: "Choonsim AI Chatbot Service",
            description: "AI Chatbot subscription service",
            type: "SERVICE",
            category: "SOFTWARE",
        })
    });

    const data = await response.json();
    console.log(`✅ Product Created: ${data.id}`);
    return data.id;
}

// 3. Create Plan
async function createPlan(accessToken, productId, planData) {
    const response = await fetch(`${PAYPAL_API}/v1/billing/plans`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            product_id: productId,
            name: planData.name,
            description: planData.description,
            status: "ACTIVE",
            billing_cycles: [
                {
                    frequency: {
                        interval_unit: "MONTH",
                        interval_count: 1
                    },
                    tenure_type: "REGULAR",
                    sequence: 1,
                    total_cycles: 0, // Infinite
                    pricing_scheme: {
                        fixed_price: {
                            value: planData.price.toString(),
                            currency_code: "USD"
                        }
                    }
                }
            ],
            payment_preferences: {
                auto_bill_outstanding: true,
                setup_fee: {
                    value: "0",
                    currency_code: "USD"
                },
                setup_fee_failure_action: "CONTINUE",
                payment_failure_threshold: 3
            },
        })
    });

    const data = await response.json();
    console.log(`✅ Plan Created [${planData.tier}]: ${data.id}`);
    return data.id;
}

async function main() {
    try {
        console.log("🚀 Starting PayPal Plan Creation...");
        const accessToken = await getAccessToken();
        console.log("🔑 Access Token acquired.");

        // Create one product for all plans
        const productId = await createProduct(accessToken);

        // Define Plans
        const plans = [
            {
                tier: "BASIC",
                name: "Basic Fan Plan",
                description: "Monthly subscription for Basic Fan",
                price: 4.99
            },
            {
                tier: "PREMIUM",
                name: "Premium Lover Plan",
                description: "Monthly subscription for Premium Lover",
                price: 14.99
            },
            {
                tier: "ULTIMATE",
                name: "Ultimate Soulmate Plan",
                description: "Monthly subscription for Ultimate Soulmate",
                price: 29.99
            }
        ];

        const results = {};
        for (const plan of plans) {
            results[plan.tier] = await createPlan(accessToken, productId, plan);
        }

        console.log("\n🎉 All Plans Created Successfully!");
        console.log("-----------------------------------------");
        console.log(JSON.stringify(results, null, 2));
        console.log("-----------------------------------------");
        console.log("👉 Please copy these IDs to 'app/lib/subscription-plans.ts'");

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
