import { NextResponse } from "next/server";
import { clickhouseClient } from "@/lib/clickhouse";
import { config } from "@/lib/config";

export async function GET() {
  try {
    const table = `${config.clickhouse.database}.users`;
    const query = `SELECT id, username, email, user_role, status, country, balance FROM ${table}`;
    const result = await clickhouseClient.query({ query, format: "JSONEachRow" });
    const users = await result.json();

    return NextResponse.json({ users });
  } catch (err) {
    console.error("Error fetching users:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}