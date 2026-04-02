import { redirect } from 'next/navigation';

export default async function PurchaseOrderApproveRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/procurement/purchase-orders/${id}`);
}
