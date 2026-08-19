const OMISE_API_BASE = "https://api.omise.co";

function getAuthHeader(): string {
  const secretKey = process.env.OMISE_SECRET_KEY;
  if (!secretKey) throw new Error("OMISE_SECRET_KEY is not set");
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export type CreateChargeParams = {
  amount: number; // in satang (smallest currency unit)
  currency: string;
  source?: string;
  card?: string;
  description?: string;
  metadata?: Record<string, string>;
  return_uri?: string;
};

export async function createCharge(params: CreateChargeParams) {
  const response = await fetch(`${OMISE_API_BASE}/charges`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Omise charge failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function retrieveCharge(chargeId: string) {
  const response = await fetch(`${OMISE_API_BASE}/charges/${chargeId}`, {
    headers: { Authorization: getAuthHeader() },
  });

  if (!response.ok) {
    throw new Error(`Failed to retrieve charge: ${chargeId}`);
  }

  return response.json();
}
