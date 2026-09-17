import crypto from "crypto";

export function encrypt(plainText: string, workingKey: string): string {
  const key = crypto.createHash("md5").update(workingKey).digest();
  const iv = Buffer.from([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
  ]);
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  let encoded = cipher.update(plainText, "utf8", "hex");
  encoded += cipher.final("hex");
  return encoded;
}

export function decrypt(encryptedText: string, workingKey: string): string {
  const key = crypto.createHash("md5").update(workingKey).digest();
  const iv = Buffer.from([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
  ]);
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  let decoded = decipher.update(encryptedText, "hex", "utf8");
  decoded += decipher.final("utf8");
  return decoded;
}

export function computeConvenienceFee(
  baseAmountPaise: number,
  feePercent: number,
  roundingMode: string
): { convenienceFeeAmountPaise: number; totalAmountPaise: number } {
  const feeRaw = baseAmountPaise * (feePercent / 100);

  let convenienceFeeAmountPaise: number;
  if (roundingMode === "ROUND_UP_TO_RUPEE") {
    convenienceFeeAmountPaise = Math.ceil(feeRaw / 100) * 100;
  } else {
    convenienceFeeAmountPaise = Math.round(feeRaw);
  }

  const totalAmountPaise = baseAmountPaise + convenienceFeeAmountPaise;
  return { convenienceFeeAmountPaise, totalAmountPaise };
}

export function generateMerchantTxnId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString("hex");
  return `BGS_${timestamp}_${random}`.toUpperCase();
}

export function parseCallbackResponse(encResp: string, workingKey: string): Record<string, string> {
  const decrypted = decrypt(encResp, workingKey);
  const params: Record<string, string> = {};
  decrypted.split("&").forEach((pair) => {
    const [key, ...valParts] = pair.split("=");
    if (key) {
      params[key] = valParts.join("=");
    }
  });
  return params;
}
