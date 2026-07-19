import { prisma } from "./db";

export class InsufficientCreditsError extends Error {
  constructor(public required: number, public available: number) {
    super(`Insufficient credits: need ${required}, have ${available}`);
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Atomically deduct credits and write a ledger row in ONE transaction.
 * Never optimistic: the balance is re-read inside the transaction and the
 * spend is rejected if funds are insufficient. Returns the new balance.
 */
export async function spendCredits(
  userId: string,
  amount: number,
  reason: string,
  ref?: string,
): Promise<number> {
  if (amount <= 0) throw new Error("spend amount must be positive");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true, role: true },
    });
    if (!user) throw new Error("user not found");
    // Admins have unlimited credits: never decrement, never write a ledger row.
    if (user.role === "admin") return user.credits;
    if (user.credits < amount) {
      throw new InsufficientCreditsError(amount, user.credits);
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
      select: { credits: true },
    });

    await tx.creditLedger.create({
      data: { userId, delta: -amount, balance: updated.credits, reason, ref },
    });

    return updated.credits;
  });
}

/** Whether a user has the admin role (unlimited credits). */
export async function userIsAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "admin";
}

/** Grant credits (purchase, monthly refill, admin) transactionally. */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: string,
  ref?: string,
): Promise<number> {
  if (amount <= 0) throw new Error("grant amount must be positive");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });
    await tx.creditLedger.create({
      data: { userId, delta: amount, balance: updated.credits, reason, ref },
    });
    return updated.credits;
  });
}
