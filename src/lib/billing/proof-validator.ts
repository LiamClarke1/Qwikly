import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

export interface ProofValidationResult {
  status: "verified" | "mismatch" | "invalid" | "error";
  extracted: {
    amount_zar: number | null;
    date: string | null;          // ISO yyyy-mm-dd if Claude could parse it
    reference: string | null;
    recipient: string | null;
    bank_name: string | null;
  };
  is_payment_proof: boolean;
  confidence: "high" | "medium" | "low";
  notes: string;
}

const SYSTEM_PROMPT = `You are validating a customer-uploaded proof of payment. The file is an image or PDF.

Your job is to extract structured data from the file and decide whether it actually IS a payment proof, not a random image, blank document, or unrelated screenshot.

Return ONLY a JSON object matching this exact schema, no other text:

{
  "is_payment_proof": boolean,
  "amount_zar": number or null,
  "date": "YYYY-MM-DD" or null,
  "reference": string or null,
  "recipient": string or null,
  "bank_name": string or null,
  "looks_legitimate": boolean,
  "confidence": "high" | "medium" | "low",
  "notes": string (one or two sentences explaining your verdict)
}

Look for:
- A bank or payment service name (FNB, Standard Bank, Capitec, Nedbank, Absa, Discovery Bank, TymeBank, PayFast, Yoco, Stitch, etc.)
- A transaction amount in ZAR (look for R, ZAR, or numeric amount with two decimals)
- A transaction date
- A reference field (might be labelled "Beneficiary reference", "Their reference", "Reference", "Description")
- A recipient name (the person or business being paid)
- Indicators that the payment was successful ("Payment successful", "Confirmed", "Sent", "Completed", green check icons, etc.)

Set is_payment_proof to false if:
- The image is blank, a meme, an unrelated screenshot
- It's clearly a different type of document (e.g. a flyer, receipt for groceries, tax form)
- It's a payment REQUEST or invoice rather than a proof of payment SENT

Set looks_legitimate to false if:
- The image looks heavily edited or photoshopped
- The amount, date, or reference look manually altered
- The bank logo doesn't match the formatting of the rest of the receipt`;

export async function validateProofOfPayment(args: {
  fileBytes: Uint8Array;
  mimeType: string;
  expectedAmountZar: number;
  expectedReference: string | null;
}): Promise<ProofValidationResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      status: "error",
      extracted: { amount_zar: null, date: null, reference: null, recipient: null, bank_name: null },
      is_payment_proof: false,
      confidence: "low",
      notes: "ANTHROPIC_API_KEY not configured, validation skipped.",
    };
  }

  const supportedImage = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const isImage = supportedImage.includes(args.mimeType);
  const isPdf = args.mimeType === "application/pdf";
  if (!isImage && !isPdf) {
    return {
      status: "error",
      extracted: { amount_zar: null, date: null, reference: null, recipient: null, bank_name: null },
      is_payment_proof: false,
      confidence: "low",
      notes: `Unsupported mime type for validation: ${args.mimeType}`,
    };
  }

  // Convert bytes to base64
  const base64 = Buffer.from(args.fileBytes).toString("base64");

  // Build content block per Anthropic SDK shape. Image uses "image" type,
  // PDFs use "document" type with media_type "application/pdf".
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fileBlock: any = isImage
    ? {
        type: "image",
        source: { type: "base64", media_type: args.mimeType, data: base64 },
      }
    : {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      };

  let raw: string;
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text: `Validate this proof of payment. Expected amount: R${args.expectedAmountZar.toFixed(2)}. Expected reference (optional): ${args.expectedReference ?? "any"}.`,
            },
          ],
        },
      ],
    });
    raw = msg.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("\n")
      .trim();
  } catch (err) {
    return {
      status: "error",
      extracted: { amount_zar: null, date: null, reference: null, recipient: null, bank_name: null },
      is_payment_proof: false,
      confidence: "low",
      notes: `Validator call failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Parse the JSON response. Strip any code fences Claude might wrap with.
  const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  let parsed: {
    is_payment_proof: boolean;
    amount_zar: number | null;
    date: string | null;
    reference: string | null;
    recipient: string | null;
    bank_name: string | null;
    looks_legitimate: boolean;
    confidence: "high" | "medium" | "low";
    notes: string;
  };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      status: "error",
      extracted: { amount_zar: null, date: null, reference: null, recipient: null, bank_name: null },
      is_payment_proof: false,
      confidence: "low",
      notes: `Validator returned non-JSON: ${jsonText.slice(0, 200)}`,
    };
  }

  const extracted = {
    amount_zar: parsed.amount_zar,
    date: parsed.date,
    reference: parsed.reference,
    recipient: parsed.recipient,
    bank_name: parsed.bank_name,
  };

  if (!parsed.is_payment_proof) {
    return {
      status: "invalid",
      extracted,
      is_payment_proof: false,
      confidence: parsed.confidence,
      notes: parsed.notes || "File is not a recognised payment proof.",
    };
  }

  if (!parsed.looks_legitimate) {
    return {
      status: "invalid",
      extracted,
      is_payment_proof: true,
      confidence: parsed.confidence,
      notes: parsed.notes || "File looks like a payment proof but appears edited or suspicious.",
    };
  }

  // Compare amount within R0.50 tolerance.
  const amountOk = parsed.amount_zar !== null
    && Math.abs(parsed.amount_zar - args.expectedAmountZar) <= 0.5;

  if (!amountOk) {
    return {
      status: "mismatch",
      extracted,
      is_payment_proof: true,
      confidence: parsed.confidence,
      notes: parsed.amount_zar === null
        ? "Could not read an amount from the proof."
        : `Proof amount R${parsed.amount_zar.toFixed(2)} does not match invoice R${args.expectedAmountZar.toFixed(2)}.`,
    };
  }

  return {
    status: "verified",
    extracted,
    is_payment_proof: true,
    confidence: parsed.confidence,
    notes: parsed.notes || "Proof of payment matches invoice amount.",
  };
}
