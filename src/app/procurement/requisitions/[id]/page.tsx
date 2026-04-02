import { redirect } from 'next/navigation';

export default async function LegacyRequisitionDetailsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/procurement/services/material-requests/${id}`);
}

