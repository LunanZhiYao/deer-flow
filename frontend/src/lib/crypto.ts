import crypto from "crypto";

// AES 加密配置
const AES_PUBLIC_KEY = "5efd3f6060e20330";
const AES_PRIVATE_KEY = "625202f9149e0611";

// JWT 验证密钥
const JWT_KEY = "lunanzhiyao";

/**
 * AES-128-CBC 解密函数
 * @param workCode - Base64 编码的加密数据
 * @returns 解密后的字符串
 */
export function decryptWorkCode(workCode: string): string {
  try {
    const decipher = crypto.createDecipheriv(
      "aes-128-cbc",
      Buffer.from(AES_PUBLIC_KEY, "utf8"),
      Buffer.from(AES_PRIVATE_KEY, "utf8")
    );

    const decodedWorkCode = decodeURIComponent(workCode);
    const encryptedBuffer = Buffer.from(decodedWorkCode, "base64");

    let decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);

    // 移除 PKCS7 padding
    const padding = decrypted[decrypted.length - 1];
    if (padding > 0 && padding <= 16) {
      decrypted = decrypted.slice(0, -padding);
    }

    return decrypted.toString("utf8");
  } catch (error) {
    console.error("AES 解密失败:", error);
    throw new Error("解密失败");
  }
}

/**
 * JWT 验证函数
 * @param token - JWT token 字符串
 * @param key - 验证密钥
 * @returns 解析后的 payload 或 false
 */
export function verifyJWT(
  token: string,
  key: string = JWT_KEY
): Record<string, unknown> | false {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }

    const [header, payload, signature] = parts;

    // 计算期望的签名
    const md5Key = crypto.createHash("md5").update(key).digest();
    const expectedSignature = crypto
      .createHmac("sha256", md5Key)
      .update(`${header}.${payload}`)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return false;
    }

    // 解析 payload
    const payloadJson = JSON.parse(
      Buffer.from(payload, "base64").toString("utf8")
    );
    return payloadJson;
  } catch (error) {
    console.error("JWT 验证失败:", error);
    return false;
  }
}

/**
 * 验证时间戳是否在有效期内
 * @param timestamp - 时间戳（秒）
 * @param maxAge - 最大有效期（秒），默认 3600 秒（1小时）
 * @returns 是否有效
 */
export function validateTimestamp(
  timestamp: number,
  maxAge: number = 3600
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - timestamp);
  return diff <= maxAge;
}

/**
 * 解析 workCode 并获取用户信息
 * @param workCode - 加密的 workCode
 * @returns 用户 ID 或 null
 */
export function parseWorkCode(workCode: string): string | null {
  try {
    // 解密 workCode
    const decryptedJson = decryptWorkCode(workCode);
    const tokenInfo = JSON.parse(decryptedJson);

    if (!tokenInfo || !tokenInfo.time || !tokenInfo.content) {
      console.error("workCode 格式无效");
      return null;
    }

    // 验证时间戳
    const sendTime = parseInt(tokenInfo.time.toString().substring(0, 10), 10);
    if (!validateTimestamp(sendTime)) {
      console.error("workCode 已过期");
      return null;
    }

    // 验证 JWT token
    const jwtPayload = verifyJWT(tokenInfo.content);
    if (!jwtPayload) {
      console.error("JWT 验证失败");
      return null;
    }

    // 返回用户 ID
    const userId = (jwtPayload as Record<string, unknown>).user_id;
    if (typeof userId === "string" || typeof userId === "number") {
      return String(userId);
    }

    return null;
  } catch (error) {
    console.error("解析 workCode 失败:", error);
    return null;
  }
}
