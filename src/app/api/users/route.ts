import { NextRequest, NextResponse } from "next/server";
import { clickhouseClient } from "@/lib/clickhouse";
import { config } from "@/lib/config";
import bcrypt from "bcryptjs";
import { signAuthToken } from "@/lib/auth";

// GET: giriş işlemi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const password = searchParams.get("password");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const table = `${config.clickhouse.database}.users`;

    const query = `
      SELECT * FROM ${table}
      WHERE email = {email:String}
      LIMIT 1
    `;
    const result = await clickhouseClient.query({
      query,
      query_params: { email },
      format: "JSONEachRow",
    });

    const users = (await result.json()) as Array<{
      id: string;
      username: string;
      email: string;
      password_hash: string;
      country: string | null;
      balance: number;
      status: string;
      user_role: "user" | "admin";
    }>;

    if (!users.length) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    const token = await signAuthToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.user_role,
    });

    const res = NextResponse.json({
      success: true,
      message: `Welcome back, ${user.username}!`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        country: user.country,
        balance: user.balance,
        status: user.status,
        role: user.user_role,
      },
    });

    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("Error logging in:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

// POST: kayıt işlemi
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const requiredFields = ["username", "email", "password"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Eksik alan: ${field}` },
          { status: 400 }
        );
      }
    }

    const table = `${config.clickhouse.database}.users`;

    const checkQuery = `
      SELECT COUNT(*) AS count FROM ${table} WHERE email = {email:String}
    `;
    const checkRes = await clickhouseClient.query({
      query: checkQuery,
      query_params: { email: body.email },
      format: "JSONEachRow",
    });

    const countResult = (await checkRes.json()) as Array<{ count: number }>;
    const exists = countResult[0]?.count > 0;
    if (exists) {
      return NextResponse.json(
        { error: "This email is already registered." },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    const now = new Date().toISOString().replace("T", " ").replace("Z", "");
    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      username: body.username,
      email: body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
      status: "active",
      country: body.country || null,
      balance: body.balance ?? 0,
    };

    await clickhouseClient.insert({
      table,
      values: [user],
      format: "JSONEachRow",
    });

    return NextResponse.json({
      success: true,
      message: "User created successfully.",
      user: { username: user.username, email: user.email },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "User could not be created", details: "Unknown error" },
      { status: 500 }
    );
  }
}

