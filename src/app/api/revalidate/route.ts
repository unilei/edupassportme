import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { path } = await request.json();
    if (path) {
      revalidatePath(path);
    } else {
      revalidatePath("/");
      revalidatePath("/category");
      revalidatePath("/tag");
    }
    return NextResponse.json({ revalidated: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to revalidate" },
      { status: 500 }
    );
  }
}
