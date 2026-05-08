import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const isVulnerable = searchParams.get('isVulnerable');
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '20');
  const skip = (page - 1) * limit;

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
          ],
        }
      : {}),
    ...(isVulnerable !== null ? { isVulnerable: isVulnerable === 'true' } : {}),
  };

  const [patients, total] = await prisma.$transaction([
    prisma.patient.findMany({
      where,
      include: { _count: { select: { appointments: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.patient.count({ where }),
  ]);

  return NextResponse.json({ patients, total, page, limit });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const { name, birthDate, phone, email, insuranceType, insuranceName } = await request.json();

  const existing = await prisma.patient.findUnique({ where: { phone } });
  if (existing)
    return NextResponse.json({ error: 'Telefone já cadastrado' }, { status: 409 });

  const patient = await prisma.patient.create({
    data: {
      name,
      birthDate: new Date(birthDate),
      phone,
      email,
      insuranceType,
      insuranceName,
      consentGiven: true,
      consentDate: new Date(),
    },
  });

  return NextResponse.json(patient, { status: 201 });
}
