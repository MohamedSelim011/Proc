'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

export default function EditServiceRequisition() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    // For now, redirect to detail page with a message
    // TODO: Implement full edit functionality
    showToast('info', 'Edit functionality is coming soon. For now, you can create a new requisition.');
    router.push(`/procurement/services/requisitions/${params.id}`);
  }, [params.id, router, showToast]);

  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wujha-primary"></div>
    </div>
  );
}

