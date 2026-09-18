
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, UserRole } from "@shared/schema";
import { sendOtp, verifyOtp, getOtpServiceStatus, normalizePhone, isPlaceholderCredential } from "./otpService";

export function sanitizeUser(user: SelectUser) {
  const { password, ...safeUser } = user;
  return safeUser;
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);
import { FirestoreSessionStore } from "./firebase";

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET is required");
  }

  console.log("SESSION_SECRET configured: true");

  app.use(session({
    name: "bgs.sid",
    secret: sessionSecret,
    store: new FirestoreSessionStore(),
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user: any, done) => {
    if (!user?.id) {
      return done(new Error("Cannot serialize user without id"));
    }

    return done(null, user.id);
  });

  passport.deserializeUser(async (id: any, done) => {
    try {
      console.log("[Passport] deserializeUser", {
        id,
        idType: typeof id
      });

      const parsedId = Number(id);
      if (isNaN(parsedId)) {
        console.error("[Passport] deserializeUser received invalid NaN id", { id });
        return done(null, false);
      }

      const user = await storage.getUser(parsedId);

      console.log("[Passport] deserialize result", {
        found: !!user,
        userId: user?.id ?? null
      });

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      console.error("[Passport] deserialize error", error);
      return done(error);
    }
  });

  // === TWILIO OTP ENDPOINTS ===
  app.get("/api/auth/otp/status", (_req, res) => {
    res.json(getOtpServiceStatus());
  });

  app.get("/api/auth/otp/enabled", (_req, res) => {
    const status = getOtpServiceStatus();
    res.json({ enabled: true, mode: status.mode, configured: status.configured });
  });

  const handleSendOtp = async (req: any, res: any) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, message: "Please enter a valid phone number." });
      }

      const result = await sendOtp(phone, "login");
      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("send-otp error:", err);
      const statusCode = err.statusCode || (err.message?.includes("Invalid") ? 400 : 500);
      return res.status(statusCode).json({
        success: false,
        message: err.message || "Failed to send OTP. Please try again.",
        code: err.code
      });
    }
  };

  app.post("/api/auth/send-otp", handleSendOtp);
  app.post("/api/send-otp", handleSendOtp);

  const handleVerifyOtp = async (req: any, res: any) => {
    try {
      const { phone, code } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, message: "Phone number is required." });
      }
      if (!code || !/^\d{6}$/.test(code.toString().trim())) {
        return res.status(400).json({ success: false, message: "Invalid OTP code. Please enter the 6-digit verification code." });
      }

      const formattedPhone = normalizePhone(phone);
      const verification = await verifyOtp(formattedPhone, code.toString().trim());

      console.log("[OTP Login] Twilio verification status:", verification.ok ? "approved" : "failed");

      if (!verification.ok) {
        return res.status(verification.statusCode || 401).json({
          success: false,
          message: verification.message || "Invalid or expired OTP code. Please check and try again.",
          code: verification.statusCode === 429 ? 60202 : undefined
        });
      }

      let user = await storage.getUserByPhone(formattedPhone);
      let isNewUser = false;

      console.log("[OTP Auth] Verification approved");

      if (!user) {
        const randomSuffix = randomBytes(4).toString("hex");
        const username = `phone_${formattedPhone.replace("+", "")}_${randomSuffix}`;
        const placeholderPassword = await hashPassword(randomBytes(32).toString("hex"));

        try {
          user = await storage.createUser({
            username,
            password: placeholderPassword,
            name: `Customer`,
            email: null,
            phone: formattedPhone,
            role: UserRole.CUSTOMER,
            isActive: true,
          });
          isNewUser = true;
        } catch (createErr: any) {
          // If a race condition occurred and the user was created concurrently, look them up again
          user = await storage.getUserByPhone(formattedPhone);
          if (!user) {
            throw createErr;
          }
        }
      }

      console.log(`[OTP Auth] Existing user: ${!isNewUser}`);
      console.log(`[OTP Auth] New customer created: ${isNewUser}`);

      console.log("[OTP Auth] User after lookup/create:", {
        exists: !!user,
        id: user?.id ?? null,
        phone: user?.phone ?? null,
        role: user?.role ?? null
      });

      if (!user) {
        throw new Error(
          "User creation succeeded but no user object was returned"
        );
      }

      if (!user.id) {
        throw new Error(
          "User object exists but does not contain an id"
        );
      }

      const userId = user.id;

      await new Promise<void>((resolve, reject) => {
        req.logIn(user, (err: any) => (err ? reject(err) : resolve()));
      });

      console.log("[OTP Auth] Login completed", {
        authenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        userId: req.user?.id ?? null,
        passportUser: req.session?.passport?.user ?? null
      });

      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => (err ? reject(err) : resolve()));
      });

      console.log("[OTP Auth] Session persisted", {
        sessionID: req.sessionID,
        authenticated: req.isAuthenticated(),
        passportUser: req.session?.passport?.user ?? null
      });

      return res.status(200).json({
        success: true,
        authenticated: true,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          name: user.name || null
        }
      });
    } catch (err: any) {
      console.error("verify-otp error:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Verification failed. Please try again.",
        code: err.code
      });
    }
  };

  app.post("/api/auth/verify-otp", handleVerifyOtp);
  app.post("/api/verify-otp", handleVerifyOtp);

  app.post("/api/auth/login-after-verify", async (req, res) => {
    try {
      const { phone, secret } = req.body;
      const expectedSecret = process.env.TWILIO_AUTH_TOKEN?.trim();

      if (!secret || !expectedSecret || secret !== expectedSecret) {
        return res.status(403).json({ success: false, message: "Unauthorized internal login request." });
      }

      const formattedPhone = normalizePhone(phone);
      let user = await storage.getUserByPhone(formattedPhone);
      let isNewUser = false;

      console.log("[OTP Auth] Verification approved");

      if (!user) {
        const randomSuffix = randomBytes(4).toString("hex");
        const username = `phone_${formattedPhone.replace("+", "")}_${randomSuffix}`;
        const placeholderPassword = await hashPassword(randomBytes(32).toString("hex"));

        try {
          user = await storage.createUser({
            username,
            password: placeholderPassword,
            name: `Customer`,
            email: null,
            phone: formattedPhone,
            role: UserRole.CUSTOMER,
            isActive: true,
          });
          isNewUser = true;
        } catch (createErr: any) {
          user = await storage.getUserByPhone(formattedPhone);
          if (!user) {
            throw createErr;
          }
        }
      }

      console.log(`[OTP Auth] Existing user: ${!isNewUser}`);
      console.log(`[OTP Auth] New customer created: ${isNewUser}`);

      console.log("[OTP Auth] User after lookup/create:", {
        exists: !!user,
        id: user?.id ?? null,
        phone: user?.phone ?? null,
        role: user?.role ?? null
      });

      if (!user) {
        throw new Error(
          "User creation succeeded but no user object was returned"
        );
      }

      if (!user.id) {
        throw new Error(
          "User object exists but does not contain an id"
        );
      }

      const userId = user.id;

      await new Promise<void>((resolve, reject) => {
        req.logIn(user, (err: any) => (err ? reject(err) : resolve()));
      });

      console.log("[OTP Auth] Login completed", {
        authenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        userId: req.user?.id ?? null,
        passportUser: req.session?.passport?.user ?? null
      });

      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => (err ? reject(err) : resolve()));
      });

      console.log("[OTP Auth] Session persisted", {
        sessionID: req.sessionID,
        authenticated: req.isAuthenticated(),
        passportUser: req.session?.passport?.user ?? null
      });

      return res.status(200).json({
        success: true,
        authenticated: true,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          name: user.name || null
        }
      });
    } catch (err: any) {
      console.error("login-after-verify error:", err);
      res.status(500).json({ success: false, message: err.message || "Internal verification sync failed." });
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(sanitizeUser(user));
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(sanitizeUser(req.user!));
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("[Session Debug] /api/user", {
      hasCookieHeader: !!req.headers.cookie,
      sessionID: req.sessionID ?? null,
      passportUser: req.session?.passport?.user ?? null,
      authenticated: req.isAuthenticated?.() ?? false,
      hasUser: !!req.user,
      userId: req.user?.id ?? null
    });

    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const sanitized = sanitizeUser(req.user);
    return res.status(200).json({
      ...sanitized,
      success: true,
      user: sanitized
    });
  });

  app.post("/api/log-diagnostic", (req, res) => {
    try {
      const { level, message, data } = req.body;
      const cleanData = JSON.parse(JSON.stringify(data || {}));
      
      const redact = (obj: any) => {
        for (const key in obj) {
          if (typeof obj[key] === "object" && obj[key] !== null) {
            redact(obj[key]);
          } else if (typeof key === "string" && /code|otp|secret|token|password|auth|key/i.test(key)) {
            obj[key] = "[REDACTED]";
          }
        }
      };
      redact(cleanData);

      const levelStr = String(level || "info").toUpperCase();
      const outputMsg = `[Client-Diagnostic] [${levelStr}] ${message}`;
      
      if (level === "error") {
        console.error(outputMsg, cleanData);
      } else if (level === "warn") {
        console.warn(outputMsg, cleanData);
      } else {
        console.log(outputMsg, cleanData);
      }
    } catch (e) {
      console.warn("Error processing client diagnostic log request:", e);
    }
    res.json({ success: true });
  });

  app.get("/api/otp-health", (req, res) => {
    res.json({
      working: true,
      accountSidConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID?.trim() && !isPlaceholderCredential(process.env.TWILIO_ACCOUNT_SID)),
      authTokenConfigured: Boolean(process.env.TWILIO_AUTH_TOKEN?.trim() && !isPlaceholderCredential(process.env.TWILIO_AUTH_TOKEN)),
      verifyServiceConfigured: Boolean(process.env.TWILIO_VERIFY_SERVICE_SID?.trim() && !isPlaceholderCredential(process.env.TWILIO_VERIFY_SERVICE_SID)),
    });
  });

  app.get("/api/health", (req, res) => {
    const hasDb = Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("@host:"));
    const hasTwilio = Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() && !isPlaceholderCredential(process.env.TWILIO_ACCOUNT_SID) &&
      process.env.TWILIO_AUTH_TOKEN?.trim() && !isPlaceholderCredential(process.env.TWILIO_AUTH_TOKEN) &&
      process.env.TWILIO_VERIFY_SERVICE_SID?.trim() && !isPlaceholderCredential(process.env.TWILIO_VERIFY_SERVICE_SID)
    );
    res.json({
      success: true,
      environment: "production",
      databaseConfigured: hasDb,
      twilioConfigured: hasTwilio
    });
  });

  app.get("/api/auth/otp-health", (req, res) => {
    res.json({
      working: true,
      accountSidConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID?.trim() && !isPlaceholderCredential(process.env.TWILIO_ACCOUNT_SID)),
      authTokenConfigured: Boolean(process.env.TWILIO_AUTH_TOKEN?.trim() && !isPlaceholderCredential(process.env.TWILIO_AUTH_TOKEN)),
      verifyServiceConfigured: Boolean(process.env.TWILIO_VERIFY_SERVICE_SID?.trim() && !isPlaceholderCredential(process.env.TWILIO_VERIFY_SERVICE_SID)),
    });
  });
}
