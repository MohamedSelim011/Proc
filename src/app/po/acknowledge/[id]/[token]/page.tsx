'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, FileText, Calendar, Package, Building } from 'lucide-react';

interface POData {
  poNumber: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount: number;
  currency: string;
  paymentTerms: string;
  vendor: {
    name: string;
    email: string;
  };
  items: Array<{
    itemCode: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  prNumber?: string;
}

export default function POAcknowledgmentPage() {
  const params = useParams();
  const router = useRouter();
  const poId = params.id as string;
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);
  const [poData, setPoData] = useState<POData | null>(null);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorEmail, setVendorEmail] = useState('');

  useEffect(() => {
    fetchPODetails();
  }, [poId, token]);

  const fetchPODetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/purchase-orders/${poId}/acknowledge?token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setPoData(data.po);
        setIsAcknowledged(data.isAcknowledged);
        setVendorEmail(data.po.vendor.email);
      } else {
        setError(data.error || 'Failed to load Purchase Order details');
      }
    } catch (err) {
      setError('An error occurred while loading Purchase Order details');
      console.error('Error fetching PO details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    try {
      setAcknowledging(true);
      const response = await fetch(`/api/purchase-orders/${poId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          vendorEmail: vendorEmail || poData?.vendor.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsAcknowledged(true);
      } else {
        setError(data.error || 'Failed to acknowledge Purchase Order');
      }
    } catch (err) {
      setError('An error occurred while acknowledging the Purchase Order');
      console.error('Error acknowledging PO:', err);
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-wujha-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading Purchase Order...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-wujha-primary text-white rounded-lg hover:bg-wujha-primary-hover"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!poData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-wujha-primary to-wujha-primary-hover text-white px-8 py-6">
            <h1 className="text-3xl font-bold mb-2">Purchase Order Acknowledgment</h1>
            <p className="text-white/90">Wujha Procurement System</p>
          </div>

          {/* Content */}
          <div className="p-8">
            {isAcknowledged ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Purchase Order Acknowledged</h2>
                <p className="text-gray-600 mb-6">
                  Thank you for acknowledging Purchase Order <strong>{poData.poNumber}</strong>.
                </p>
                <p className="text-sm text-gray-500">
                  You will receive a confirmation email shortly.
                </p>
              </div>
            ) : (
              <>
                {/* PO Details */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{poData.poNumber}</h2>
                      <p className="text-gray-600 mt-1">Purchase Order Details</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="text-2xl font-bold text-wujha-primary">
                        {poData.currency} {Number(poData.totalAmount).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-5 w-5" />
                      <span className="text-sm">
                        <strong>Order Date:</strong> {new Date(poData.orderDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-5 w-5" />
                      <span className="text-sm">
                        <strong>Delivery Date:</strong> {new Date(poData.deliveryDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building className="h-5 w-5" />
                      <span className="text-sm">
                        <strong>Vendor:</strong> {poData.vendor.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <FileText className="h-5 w-5" />
                      <span className="text-sm">
                        <strong>Payment Terms:</strong> {poData.paymentTerms}
                      </span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Items Ordered</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quantity</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {poData.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.itemCode}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{item.name}</td>
                              <td className="px-4 py-3 text-sm text-center text-gray-900">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">
                                {poData.currency} {Number(item.unitPrice).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                {poData.currency} {Number(item.totalPrice).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-900">
                              Grand Total:
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-lg text-wujha-primary">
                              {poData.currency} {Number(poData.totalAmount).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Acknowledgment Section */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Confirm Your Email</h3>
                  <input
                    type="email"
                    value={vendorEmail}
                    onChange={(e) => setVendorEmail(e.target.value)}
                    placeholder={poData.vendor.email}
                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-4"
                  />
                  <p className="text-sm text-green-800">
                    Please confirm your email address above, then click the button below to acknowledge this Purchase Order.
                  </p>
                </div>

                {/* Action Button */}
                <div className="text-center">
                  <button
                    onClick={handleAcknowledge}
                    disabled={acknowledging}
                    className="px-8 py-4 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    {acknowledging ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Acknowledging...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Acknowledge Purchase Order
                      </>
                    )}
                  </button>
                  <p className="text-sm text-gray-500 mt-4">
                    By clicking this button, you confirm that you have received and reviewed this Purchase Order.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

